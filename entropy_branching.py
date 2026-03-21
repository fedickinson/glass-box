from __future__ import annotations

import inspect
from dataclasses import dataclass, field
from typing import Any, Optional

import torch


@dataclass
class EntropyBranchingConfig:
    max_live_branches: int = 4
    split_width: int = 2
    real_choice_trigger: bool = True
    choice_min_thought_tokens: int = 12
    choice_top1_max_prob: float = 0.60
    choice_top2_min_prob: float = 0.15
    choice_max_margin: float = 0.20
    choice_entropy_floor: float = 1.0
    choice_window: int = 32
    choice_percentile: float = 0.85
    entropy_threshold: float = 2.5
    entropy_floor: float = 1.5
    adaptive_trigger: bool = True
    adaptive_min_thought_tokens: int = 12
    adaptive_window: int = 32
    adaptive_z: float = 1.0
    max_splits_per_branch: int = 3
    split_cooldown_tokens: int = 4
    temperature: float = 0.7
    top_p: float = 0.95
    max_new_tokens: int = 1024
    num_return_sequences: int = 2
    length_penalty_alpha: float = 0.7
    thought_start_text: str = "<think>"
    thought_end_text: str = "</think>"
    seed: Optional[int] = None


@dataclass
class BranchRecord:
    branch_id: int
    parent_id: Optional[int]
    generated_ids: list[int]
    cum_logprob: float
    normalized_score: float
    entropy_trace: list[float]
    thought_entropy_trace: list[float]
    choice_score_trace: list[float]
    adaptive_threshold_trace: list[Optional[float]]
    top1_prob_trace: list[float]
    top2_prob_trace: list[float]
    top_margin_trace: list[float]
    token_logprobs: list[float]
    split_count: int
    trigger_step_indices: list[int]
    trigger_thought_indices: list[int]
    thought_state: bool
    finished: bool
    finish_reason: str


@dataclass
class BranchingResult:
    prompt_ids: list[int]
    best_texts: list[str]
    best_branches: list[BranchRecord]
    completed_branches: list[BranchRecord]
    live_branches: list[BranchRecord]
    pruned_branches: list[BranchRecord]
    split_branches: list[BranchRecord]
    all_branches: list[BranchRecord]
    lineage: dict[int, Optional[int]]
    entropy_traces: dict[int, list[float]]


@dataclass
class _ThoughtState:
    inside_thought: bool = False
    token_buffer: list[int] = field(default_factory=list)
    text_buffer: str = ""


@dataclass
class _BranchState:
    branch_id: int
    parent_id: Optional[int]
    generated_ids: list[int]
    past_key_values: Any
    attention_mask: torch.Tensor
    next_logits: torch.Tensor
    cum_logprob: float
    normalized_score: float
    entropy_trace: list[float]
    thought_entropy_trace: list[float]
    choice_score_trace: list[float]
    adaptive_threshold_trace: list[Optional[float]]
    top1_prob_trace: list[float]
    top2_prob_trace: list[float]
    top_margin_trace: list[float]
    token_logprobs: list[float]
    thought_state: _ThoughtState
    split_count: int
    trigger_step_indices: list[int]
    trigger_thought_indices: list[int]
    cooldown_left: int
    finished: bool
    finish_reason: str


def entropy_branch_generate(
    model: Any,
    tokenizer: Any,
    input_ids: Any,
    attention_mask: Optional[torch.Tensor] = None,
    config: Optional[EntropyBranchingConfig] = None,
) -> BranchingResult:
    config = config or EntropyBranchingConfig()
    input_ids, attention_mask = _normalize_model_inputs(input_ids, attention_mask)

    if input_ids.dim() == 1:
        input_ids = input_ids.unsqueeze(0)
    if input_ids.size(0) != 1:
        raise ValueError("entropy_branch_generate currently supports exactly one prompt at a time.")

    device = input_ids.device
    if attention_mask is None:
        attention_mask = torch.ones_like(input_ids, dtype=torch.long, device=device)
    elif attention_mask.dim() == 1:
        attention_mask = attention_mask.unsqueeze(0)

    marker_start_ids = tuple(tokenizer.encode(config.thought_start_text, add_special_tokens=False))
    marker_end_ids = tuple(tokenizer.encode(config.thought_end_text, add_special_tokens=False))
    marker_window_size = max(len(marker_start_ids), len(marker_end_ids), 1)
    text_window_size = max(len(config.thought_start_text), len(config.thought_end_text), 1)
    eos_token_ids = _resolve_eos_token_ids(model, tokenizer)
    supports_cache_position = _supports_cache_position(model)
    generator = _make_generator(device, config.seed)

    with torch.no_grad():
        prefill_kwargs = {
            "input_ids": input_ids,
            "attention_mask": attention_mask,
            "use_cache": True,
            "return_dict": True,
        }
        if supports_cache_position:
            prefill_kwargs["cache_position"] = torch.arange(input_ids.size(1), device=device)
        prefill_outputs = model(**prefill_kwargs)

    initial_thought_state = _scan_thought_state(
        tokenizer=tokenizer,
        token_ids=input_ids[0].tolist(),
        marker_start_ids=marker_start_ids,
        marker_end_ids=marker_end_ids,
        marker_window_size=marker_window_size,
        text_window_size=text_window_size,
        start_text=config.thought_start_text,
        end_text=config.thought_end_text,
    )

    live_states = [
        _BranchState(
            branch_id=0,
            parent_id=None,
            generated_ids=[],
            past_key_values=prefill_outputs.past_key_values,
            attention_mask=attention_mask.clone(),
            next_logits=prefill_outputs.logits[:, -1, :].squeeze(0),
            cum_logprob=0.0,
            normalized_score=0.0,
            entropy_trace=[],
            thought_entropy_trace=[],
            choice_score_trace=[],
            adaptive_threshold_trace=[],
            top1_prob_trace=[],
            top2_prob_trace=[],
            top_margin_trace=[],
            token_logprobs=[],
            thought_state=initial_thought_state,
            split_count=0,
            trigger_step_indices=[],
            trigger_thought_indices=[],
            cooldown_left=0,
            finished=False,
            finish_reason="active",
        )
    ]

    next_branch_id = 1
    split_records: list[BranchRecord] = []
    pruned_records: list[BranchRecord] = []
    completed_records: list[BranchRecord] = []
    lineage: dict[int, Optional[int]] = {0: None}

    for step_index in range(config.max_new_tokens):
        if not live_states:
            break

        successor_states: list[_BranchState] = []

        for branch in live_states:
            entropy = _calculate_entropy(branch.next_logits, config.temperature)
            log_probs, probs = _prepare_sampling_distribution(
                branch.next_logits,
                config.temperature,
                config.top_p,
            )
            choice_score = _calculate_distribution_entropy(probs)
            top1_prob, top2_prob = _top_two_probabilities(probs)
            top_margin = top1_prob - top2_prob
            threshold = None
            trigger_fired = False
            if branch.thought_state.inside_thought:
                if config.real_choice_trigger:
                    threshold = _calculate_choice_threshold(
                        branch.choice_score_trace,
                        config,
                    )
                    trigger_fired = (
                        threshold is not None
                        and choice_score >= threshold
                        and top1_prob <= config.choice_top1_max_prob
                        and top2_prob >= config.choice_top2_min_prob
                        and top_margin <= config.choice_max_margin
                    )
                else:
                    threshold = _calculate_split_threshold(
                        branch.thought_entropy_trace,
                        config,
                    )
                    trigger_fired = threshold is not None and entropy >= threshold

            split_eligible = (
                trigger_fired
                and branch.split_count < config.max_splits_per_branch
                and branch.cooldown_left == 0
            )

            requested_children = config.split_width if split_eligible else 1
            sampled_token_ids, sampled_logprobs = _sample_prepared_distribution(
                probs,
                log_probs,
                requested_children,
                generator=generator,
            )

            did_split = split_eligible and len(sampled_token_ids) > 1
            if did_split:
                split_records.append(_freeze_branch(branch, finish_reason="split"))

            for index, token_id in enumerate(sampled_token_ids):
                child_branch_id = next_branch_id if did_split else branch.branch_id
                if did_split:
                    next_branch_id += 1
                    lineage[child_branch_id] = branch.branch_id

                child_parent_id = branch.branch_id if did_split else branch.parent_id
                child_finished = token_id in eos_token_ids
                child_finish_reason = "eos_token" if child_finished else "active"

                child_thought_state = _advance_thought_state(
                    tokenizer=tokenizer,
                    prior_state=branch.thought_state,
                    token_id=token_id,
                    marker_start_ids=marker_start_ids,
                    marker_end_ids=marker_end_ids,
                    marker_window_size=marker_window_size,
                    text_window_size=text_window_size,
                    start_text=config.thought_start_text,
                    end_text=config.thought_end_text,
                )

                new_generated_ids = branch.generated_ids + [token_id]
                new_token_logprobs = branch.token_logprobs + [sampled_logprobs[index]]
                new_entropy_trace = branch.entropy_trace + [entropy]
                new_thought_entropy_trace = list(branch.thought_entropy_trace)
                new_choice_score_trace = list(branch.choice_score_trace)
                new_adaptive_threshold_trace = list(branch.adaptive_threshold_trace)
                new_top1_prob_trace = list(branch.top1_prob_trace)
                new_top2_prob_trace = list(branch.top2_prob_trace)
                new_top_margin_trace = list(branch.top_margin_trace)
                new_trigger_step_indices = list(branch.trigger_step_indices)
                new_trigger_thought_indices = list(branch.trigger_thought_indices)
                if branch.thought_state.inside_thought:
                    new_thought_entropy_trace.append(entropy)
                    new_choice_score_trace.append(choice_score)
                    new_adaptive_threshold_trace.append(threshold)
                    new_top1_prob_trace.append(top1_prob)
                    new_top2_prob_trace.append(top2_prob)
                    new_top_margin_trace.append(top_margin)
                    if trigger_fired:
                        new_trigger_step_indices.append(len(branch.generated_ids))
                        new_trigger_thought_indices.append(len(branch.choice_score_trace))
                new_cum_logprob = branch.cum_logprob + sampled_logprobs[index]
                new_normalized_score = _normalize_score(
                    new_cum_logprob,
                    len(new_generated_ids),
                    config.length_penalty_alpha,
                )

                if child_finished or step_index + 1 >= config.max_new_tokens:
                    next_logits = branch.next_logits
                    past_key_values = branch.past_key_values
                    new_attention_mask = branch.attention_mask
                else:
                    token_tensor = torch.tensor([[token_id]], dtype=input_ids.dtype, device=device)
                    new_attention_mask = torch.cat(
                        [
                            branch.attention_mask,
                            torch.ones((1, 1), dtype=branch.attention_mask.dtype, device=device),
                        ],
                        dim=1,
                    )
                    decode_kwargs = {
                        "input_ids": token_tensor,
                        "attention_mask": new_attention_mask,
                        "past_key_values": branch.past_key_values,
                        "use_cache": True,
                        "return_dict": True,
                    }
                    if supports_cache_position:
                        decode_kwargs["cache_position"] = torch.tensor(
                            [branch.attention_mask.size(1)],
                            device=device,
                        )
                    with torch.no_grad():
                        decode_outputs = model(**decode_kwargs)
                    next_logits = decode_outputs.logits[:, -1, :].squeeze(0)
                    past_key_values = decode_outputs.past_key_values

                child_state = _BranchState(
                    branch_id=child_branch_id,
                    parent_id=child_parent_id,
                    generated_ids=new_generated_ids,
                    past_key_values=past_key_values,
                    attention_mask=new_attention_mask,
                    next_logits=next_logits,
                    cum_logprob=new_cum_logprob,
                    normalized_score=new_normalized_score,
                    entropy_trace=new_entropy_trace,
                    thought_entropy_trace=new_thought_entropy_trace,
                    choice_score_trace=new_choice_score_trace,
                    adaptive_threshold_trace=new_adaptive_threshold_trace,
                    top1_prob_trace=new_top1_prob_trace,
                    top2_prob_trace=new_top2_prob_trace,
                    top_margin_trace=new_top_margin_trace,
                    token_logprobs=new_token_logprobs,
                    thought_state=child_thought_state,
                    split_count=branch.split_count + (1 if did_split else 0),
                    trigger_step_indices=new_trigger_step_indices,
                    trigger_thought_indices=new_trigger_thought_indices,
                    cooldown_left=config.split_cooldown_tokens if did_split else max(branch.cooldown_left - 1, 0),
                    finished=child_finished,
                    finish_reason=child_finish_reason,
                )

                if child_finished:
                    completed_records.append(_freeze_branch(child_state, finish_reason=child_finish_reason))
                else:
                    successor_states.append(child_state)

        live_states, pruned = _prune_to_cap(
            successor_states,
            config.max_live_branches,
        )
        pruned_records.extend(_freeze_branch(branch, finish_reason="pruned") for branch in pruned)

    live_records = [_freeze_branch(branch, finish_reason="active") for branch in live_states]
    completed_records = _sorted_records(completed_records)
    live_records = _sorted_records(live_records)
    pruned_records = _sorted_records(pruned_records)
    split_records = _sorted_records(split_records)

    ranking_pool = completed_records if completed_records else live_records
    best_branches = ranking_pool[: config.num_return_sequences]
    prompt_ids = input_ids[0].tolist()
    best_texts = [
        tokenizer.decode(prompt_ids + branch.generated_ids, skip_special_tokens=False)
        for branch in best_branches
    ]

    all_branches = _sorted_records(completed_records + live_records + pruned_records + split_records)
    entropy_traces = {branch.branch_id: branch.entropy_trace for branch in all_branches}

    return BranchingResult(
        prompt_ids=prompt_ids,
        best_texts=best_texts,
        best_branches=best_branches,
        completed_branches=completed_records,
        live_branches=live_records,
        pruned_branches=pruned_records,
        split_branches=split_records,
        all_branches=all_branches,
        lineage=lineage,
        entropy_traces=entropy_traces,
    )


def _normalize_model_inputs(
    input_ids: Any,
    attention_mask: Optional[torch.Tensor],
) -> tuple[torch.Tensor, Optional[torch.Tensor]]:
    if hasattr(input_ids, "data") and hasattr(input_ids, "keys"):
        input_mapping = input_ids
        if "input_ids" not in input_mapping:
            raise ValueError("Expected `input_ids` to contain an `input_ids` field.")
        if attention_mask is None and "attention_mask" in input_mapping:
            attention_mask = input_mapping["attention_mask"]
        input_ids = input_mapping["input_ids"]
    elif isinstance(input_ids, dict):
        if "input_ids" not in input_ids:
            raise ValueError("Expected `input_ids` dict to contain an `input_ids` field.")
        if attention_mask is None:
            attention_mask = input_ids.get("attention_mask")
        input_ids = input_ids["input_ids"]

    if not torch.is_tensor(input_ids):
        raise TypeError("`input_ids` must be a tensor or a mapping containing an `input_ids` tensor.")
    if attention_mask is not None and not torch.is_tensor(attention_mask):
        raise TypeError("`attention_mask` must be a tensor when provided.")

    return input_ids, attention_mask


def _calculate_entropy(logits: torch.Tensor, temperature: float) -> float:
    scaled_logits = logits / max(temperature, 1e-5)
    probs = torch.softmax(scaled_logits, dim=-1)
    entropy = -(probs * torch.log(probs.clamp_min(1e-10))).sum()
    return float(entropy.item())


def _prepare_sampling_distribution(
    logits: torch.Tensor,
    temperature: float,
    top_p: float,
) -> tuple[torch.Tensor, torch.Tensor]:
    scaled_logits = logits / max(temperature, 1e-5)
    filtered_logits = _apply_top_p(scaled_logits, top_p)
    log_probs = torch.log_softmax(filtered_logits, dim=-1)
    probs = log_probs.exp()
    return log_probs, probs


def _calculate_distribution_entropy(probs: torch.Tensor) -> float:
    entropy = -(probs * torch.log(probs.clamp_min(1e-10))).sum()
    return float(entropy.item())


def _top_two_probabilities(probs: torch.Tensor) -> tuple[float, float]:
    topk = min(2, probs.numel())
    if topk == 0:
        return 0.0, 0.0
    top_values = torch.topk(probs, k=topk).values.tolist()
    if topk == 1:
        return float(top_values[0]), 0.0
    return float(top_values[0]), float(top_values[1])


def _calculate_choice_threshold(
    choice_score_trace: list[float],
    config: EntropyBranchingConfig,
) -> Optional[float]:
    if len(choice_score_trace) < config.choice_min_thought_tokens:
        return None

    window = choice_score_trace[-config.choice_window :]
    percentile = _calculate_quantile(window, config.choice_percentile)
    return max(config.choice_entropy_floor, percentile)


def _calculate_split_threshold(
    thought_entropy_trace: list[float],
    config: EntropyBranchingConfig,
) -> Optional[float]:
    if not config.adaptive_trigger:
        return config.entropy_threshold

    if len(thought_entropy_trace) < config.adaptive_min_thought_tokens:
        return None

    window = thought_entropy_trace[-config.adaptive_window :]
    mean = sum(window) / len(window)
    variance = sum((value - mean) ** 2 for value in window) / len(window)
    std = variance**0.5
    return max(config.entropy_floor, mean + config.adaptive_z * std)


def _calculate_quantile(values: list[float], quantile: float) -> float:
    if not values:
        raise ValueError("Cannot compute a quantile over an empty list.")

    clipped = min(max(quantile, 0.0), 1.0)
    sorted_values = sorted(values)
    if len(sorted_values) == 1:
        return float(sorted_values[0])

    position = clipped * (len(sorted_values) - 1)
    lower_index = int(position)
    upper_index = min(lower_index + 1, len(sorted_values) - 1)
    weight = position - lower_index
    lower_value = sorted_values[lower_index]
    upper_value = sorted_values[upper_index]
    return float(lower_value + weight * (upper_value - lower_value))


def _sample_prepared_distribution(
    probs: torch.Tensor,
    log_probs: torch.Tensor,
    num_samples: int,
    generator: torch.Generator,
) -> tuple[list[int], list[float]]:
    available = int((probs > 0).sum().item())
    take = max(1, min(num_samples, available))
    sampled = torch.multinomial(probs, num_samples=take, replacement=False, generator=generator)
    sampled_token_ids = sampled.tolist()
    sampled_logprobs = log_probs[sampled].tolist()
    return sampled_token_ids, sampled_logprobs


def _apply_top_p(logits: torch.Tensor, top_p: float) -> torch.Tensor:
    if top_p >= 1.0:
        return logits

    sorted_logits, sorted_indices = torch.sort(logits, descending=True)
    sorted_probs = torch.softmax(sorted_logits, dim=-1)
    cumulative_probs = torch.cumsum(sorted_probs, dim=-1)

    sorted_mask = cumulative_probs > top_p
    if sorted_mask.numel() > 1:
        sorted_mask[1:] = sorted_mask[:-1].clone()
    sorted_mask[0] = False

    mask = torch.zeros_like(sorted_mask, dtype=torch.bool)
    mask = mask.scatter(0, sorted_indices, sorted_mask)
    return logits.masked_fill(mask, float("-inf"))


def _advance_thought_state(
    tokenizer: Any,
    prior_state: _ThoughtState,
    token_id: int,
    marker_start_ids: tuple[int, ...],
    marker_end_ids: tuple[int, ...],
    marker_window_size: int,
    text_window_size: int,
    start_text: str,
    end_text: str,
) -> _ThoughtState:
    token_buffer = (prior_state.token_buffer + [token_id])[-marker_window_size:]
    text_buffer = (prior_state.text_buffer + tokenizer.decode([token_id], skip_special_tokens=False))[-text_window_size:]
    inside_thought = prior_state.inside_thought

    if marker_start_ids and tuple(token_buffer[-len(marker_start_ids) :]) == marker_start_ids:
        inside_thought = True
    if marker_end_ids and tuple(token_buffer[-len(marker_end_ids) :]) == marker_end_ids:
        inside_thought = False

    if not marker_start_ids and text_buffer.endswith(start_text):
        inside_thought = True
    if not marker_end_ids and text_buffer.endswith(end_text):
        inside_thought = False

    return _ThoughtState(
        inside_thought=inside_thought,
        token_buffer=token_buffer,
        text_buffer=text_buffer,
    )


def _scan_thought_state(
    tokenizer: Any,
    token_ids: list[int],
    marker_start_ids: tuple[int, ...],
    marker_end_ids: tuple[int, ...],
    marker_window_size: int,
    text_window_size: int,
    start_text: str,
    end_text: str,
) -> _ThoughtState:
    state = _ThoughtState()
    for token_id in token_ids:
        state = _advance_thought_state(
            tokenizer=tokenizer,
            prior_state=state,
            token_id=token_id,
            marker_start_ids=marker_start_ids,
            marker_end_ids=marker_end_ids,
            marker_window_size=marker_window_size,
            text_window_size=text_window_size,
            start_text=start_text,
            end_text=end_text,
        )
    return state


def _normalize_score(cum_logprob: float, generated_len: int, alpha: float) -> float:
    denominator = float(max(generated_len, 1) ** alpha)
    return cum_logprob / denominator


def _prune_to_cap(branches: list[_BranchState], cap: int) -> tuple[list[_BranchState], list[_BranchState]]:
    ranked = sorted(
        branches,
        key=lambda branch: (branch.normalized_score, -branch.branch_id),
        reverse=True,
    )
    survivors = ranked[:cap]
    pruned = ranked[cap:]
    return survivors, pruned


def _freeze_branch(branch: _BranchState, finish_reason: str) -> BranchRecord:
    return BranchRecord(
        branch_id=branch.branch_id,
        parent_id=branch.parent_id,
        generated_ids=list(branch.generated_ids),
        cum_logprob=branch.cum_logprob,
        normalized_score=branch.normalized_score,
        entropy_trace=list(branch.entropy_trace),
        thought_entropy_trace=list(branch.thought_entropy_trace),
        choice_score_trace=list(branch.choice_score_trace),
        adaptive_threshold_trace=list(branch.adaptive_threshold_trace),
        top1_prob_trace=list(branch.top1_prob_trace),
        top2_prob_trace=list(branch.top2_prob_trace),
        top_margin_trace=list(branch.top_margin_trace),
        token_logprobs=list(branch.token_logprobs),
        split_count=branch.split_count,
        trigger_step_indices=list(branch.trigger_step_indices),
        trigger_thought_indices=list(branch.trigger_thought_indices),
        thought_state=branch.thought_state.inside_thought,
        finished=branch.finished,
        finish_reason=finish_reason,
    )


def _sorted_records(records: list[BranchRecord]) -> list[BranchRecord]:
    return sorted(
        records,
        key=lambda branch: (branch.normalized_score, -branch.branch_id),
        reverse=True,
    )


def _resolve_eos_token_ids(model: Any, tokenizer: Any) -> set[int]:
    eos_token_id = getattr(getattr(model, "generation_config", None), "eos_token_id", None)
    if eos_token_id is None:
        eos_token_id = getattr(tokenizer, "eos_token_id", None)

    if eos_token_id is None:
        return set()
    if isinstance(eos_token_id, int):
        return {eos_token_id}
    return {int(token_id) for token_id in eos_token_id}


def _supports_cache_position(model: Any) -> bool:
    try:
        parameters = inspect.signature(model.forward).parameters
    except (TypeError, ValueError):
        return False
    return "cache_position" in parameters


def _make_generator(device: torch.device, seed: Optional[int]) -> torch.Generator:
    generator_device = "cpu" if device.type == "mps" else device.type
    generator = torch.Generator(device=generator_device)
    if seed is not None:
        generator.manual_seed(seed)
    return generator


__all__ = [
    "BranchRecord",
    "BranchingResult",
    "EntropyBranchingConfig",
    "entropy_branch_generate",
]
