from __future__ import annotations

from types import SimpleNamespace

import torch

from entropy_branching import EntropyBranchingConfig, entropy_branch_generate
from multibeam_search import build_discrete_branch_graph


VOCAB_SIZE = 128
PROMPT_ID = 0
THINK_START = (10, 11)
THINK_END = (12, 13)
EOS_ID = 99


def _logits(token_scores: dict[int, float]) -> torch.Tensor:
    logits = torch.full((VOCAB_SIZE,), float("-inf"))
    for token_id, score in token_scores.items():
        logits[token_id] = score
    return logits


class ScriptedCausalLM(torch.nn.Module):
    def __init__(self, transitions: dict[tuple[int, ...], torch.Tensor]) -> None:
        super().__init__()
        self.transitions = transitions
        self.generation_config = SimpleNamespace(eos_token_id=EOS_ID)

    def forward(
        self,
        input_ids: torch.Tensor,
        attention_mask: torch.Tensor | None = None,
        past_key_values: tuple[int, ...] | None = None,
        use_cache: bool = True,
        return_dict: bool = True,
        cache_position: torch.Tensor | None = None,
    ) -> SimpleNamespace:
        del attention_mask, use_cache, return_dict, cache_position

        if past_key_values is None:
            prefix = tuple(input_ids[0].tolist())
        else:
            prefix = tuple(past_key_values) + tuple(input_ids[0].tolist())

        if prefix not in self.transitions:
            raise KeyError(f"Missing scripted logits for prefix {prefix}")

        logits = torch.zeros((1, input_ids.size(1), VOCAB_SIZE), dtype=torch.float32)
        logits[:, -1, :] = self.transitions[prefix]
        return SimpleNamespace(logits=logits, past_key_values=prefix)


class SimpleTokenizer:
    eos_token_id = EOS_ID

    def __init__(self) -> None:
        self.marker_map = {
            "<think>": list(THINK_START),
            "</think>": list(THINK_END),
        }
        self.id_to_text = {
            PROMPT_ID: "<prompt>",
            THINK_START[0]: "<think",
            THINK_START[1]: ">",
            THINK_END[0]: "</think",
            THINK_END[1]: ">",
            20: "A",
            21: "B",
            22: "C",
            23: "D",
            30: "X",
            31: "Y",
            32: "M",
            33: "N",
            40: "P",
            41: "Q",
            EOS_ID: "<eos>",
        }

    def encode(self, text: str, add_special_tokens: bool = False) -> list[int]:
        del add_special_tokens
        return list(self.marker_map.get(text, []))

    def decode(self, token_ids, skip_special_tokens: bool = False) -> str:
        if isinstance(token_ids, int):
            token_ids = [token_ids]

        pieces: list[str] = []
        for token_id in token_ids:
            if skip_special_tokens and token_id == self.eos_token_id:
                continue
            pieces.append(self.id_to_text.get(token_id, f"<{token_id}>"))
        return "".join(pieces)


def _base_config(**overrides) -> EntropyBranchingConfig:
    config = EntropyBranchingConfig(
        max_live_branches=4,
        split_width=2,
        real_choice_trigger=False,
        choice_min_thought_tokens=2,
        choice_top1_max_prob=0.60,
        choice_top2_min_prob=0.15,
        choice_max_margin=0.20,
        choice_entropy_floor=0.5,
        choice_window=2,
        choice_percentile=0.85,
        adaptive_trigger=False,
        entropy_threshold=0.5,
        entropy_floor=0.5,
        adaptive_min_thought_tokens=2,
        adaptive_window=2,
        adaptive_z=1.0,
        max_splits_per_branch=3,
        split_cooldown_tokens=0,
        temperature=1.0,
        top_p=1.0,
        max_new_tokens=8,
        num_return_sequences=4,
        length_penalty_alpha=0.0,
        seed=0,
    )
    for key, value in overrides.items():
        setattr(config, key, value)
    return config


def _run(transitions: dict[tuple[int, ...], torch.Tensor], **config_overrides):
    model = ScriptedCausalLM(transitions)
    tokenizer = SimpleTokenizer()
    input_ids = torch.tensor([[PROMPT_ID]], dtype=torch.long)
    return entropy_branch_generate(
        model=model,
        tokenizer=tokenizer,
        input_ids=input_ids,
        config=_base_config(**config_overrides),
    )


def _run_with_prompt(
    prompt_ids: list[int],
    transitions: dict[tuple[int, ...], torch.Tensor],
    **config_overrides,
):
    model = ScriptedCausalLM(transitions)
    tokenizer = SimpleTokenizer()
    input_ids = torch.tensor([prompt_ids], dtype=torch.long)
    return entropy_branch_generate(
        model=model,
        tokenizer=tokenizer,
        input_ids=input_ids,
        config=_base_config(**config_overrides),
    )


def test_prompt_that_already_ends_inside_thought_can_split_immediately() -> None:
    transitions = {
        (PROMPT_ID, THINK_START[0], THINK_START[1]): _logits({20: 0.0, 21: 0.0}),
        (PROMPT_ID, THINK_START[0], THINK_START[1], 20): _logits({EOS_ID: 0.0}),
        (PROMPT_ID, THINK_START[0], THINK_START[1], 21): _logits({EOS_ID: 0.0}),
    }

    model = ScriptedCausalLM(transitions)
    tokenizer = SimpleTokenizer()
    input_ids = torch.tensor([[PROMPT_ID, THINK_START[0], THINK_START[1]]], dtype=torch.long)
    result = entropy_branch_generate(
        model=model,
        tokenizer=tokenizer,
        input_ids=input_ids,
        config=_base_config(max_new_tokens=2, num_return_sequences=2),
    )

    assert len(result.split_branches) == 1
    assert len(result.completed_branches) == 2
    assert {branch.generated_ids[0] for branch in result.completed_branches} == {20, 21}


def test_real_choice_trigger_splits_on_two_close_options() -> None:
    transitions = {
        (PROMPT_ID, THINK_START[0], THINK_START[1]): _logits({20: 0.0, 21: -8.0}),
        (PROMPT_ID, THINK_START[0], THINK_START[1], 20): _logits({22: 0.0, 23: -8.0}),
        (PROMPT_ID, THINK_START[0], THINK_START[1], 20, 22): _logits({30: 0.0, 31: -0.1, 40: -3.0}),
        (PROMPT_ID, THINK_START[0], THINK_START[1], 20, 22, 30): _logits({EOS_ID: 0.0}),
        (PROMPT_ID, THINK_START[0], THINK_START[1], 20, 22, 31): _logits({EOS_ID: 0.0}),
    }

    result = _run_with_prompt(
        [PROMPT_ID, THINK_START[0], THINK_START[1]],
        transitions,
        real_choice_trigger=True,
        choice_min_thought_tokens=2,
        choice_top1_max_prob=0.60,
        choice_top2_min_prob=0.15,
        choice_max_margin=0.20,
        choice_entropy_floor=0.5,
        choice_window=2,
        choice_percentile=0.85,
        max_new_tokens=4,
        num_return_sequences=2,
    )

    assert len(result.split_branches) == 1
    assert len(result.completed_branches) == 2
    assert all(branch.trigger_step_indices == [2] for branch in result.completed_branches)
    assert all(max(branch.top2_prob_trace) >= 0.15 for branch in result.completed_branches)
    assert all(min(branch.top_margin_trace) <= 0.20 for branch in result.completed_branches)


def test_real_choice_trigger_blocks_single_dominant_option() -> None:
    transitions = {
        (PROMPT_ID, THINK_START[0], THINK_START[1]): _logits({20: 0.0, 21: -8.0}),
        (PROMPT_ID, THINK_START[0], THINK_START[1], 20): _logits({22: 0.0, 23: -8.0}),
        (PROMPT_ID, THINK_START[0], THINK_START[1], 20, 22): _logits({30: 0.0, 31: -2.4, 40: -2.6}),
        (PROMPT_ID, THINK_START[0], THINK_START[1], 20, 22, 30): _logits({EOS_ID: 0.0}),
    }

    result = _run_with_prompt(
        [PROMPT_ID, THINK_START[0], THINK_START[1]],
        transitions,
        real_choice_trigger=True,
        choice_min_thought_tokens=2,
        choice_top1_max_prob=0.60,
        choice_top2_min_prob=0.15,
        choice_max_margin=0.20,
        choice_entropy_floor=0.5,
        choice_window=2,
        choice_percentile=0.85,
        max_new_tokens=4,
        num_return_sequences=1,
    )

    assert result.split_branches == []
    assert len(result.completed_branches) == 1
    branch = result.completed_branches[0]
    assert branch.trigger_step_indices == []
    assert branch.top1_prob_trace[2] > 0.60


def test_real_choice_trigger_blocks_wide_margin_choice() -> None:
    transitions = {
        (PROMPT_ID, THINK_START[0], THINK_START[1]): _logits({20: 0.0, 21: -8.0}),
        (PROMPT_ID, THINK_START[0], THINK_START[1], 20): _logits({22: 0.0, 23: -8.0}),
        (PROMPT_ID, THINK_START[0], THINK_START[1], 20, 22): _logits({30: 0.0, 31: -0.5, 40: -1.5}),
        (PROMPT_ID, THINK_START[0], THINK_START[1], 20, 22, 30): _logits({EOS_ID: 0.0}),
    }

    result = _run_with_prompt(
        [PROMPT_ID, THINK_START[0], THINK_START[1]],
        transitions,
        real_choice_trigger=True,
        choice_min_thought_tokens=2,
        choice_top1_max_prob=0.60,
        choice_top2_min_prob=0.15,
        choice_max_margin=0.20,
        choice_entropy_floor=0.5,
        choice_window=2,
        choice_percentile=0.85,
        max_new_tokens=4,
        num_return_sequences=1,
    )

    assert result.split_branches == []
    assert len(result.completed_branches) == 1
    branch = result.completed_branches[0]
    assert branch.trigger_step_indices == []
    assert branch.top1_prob_trace[2] <= 0.60
    assert branch.top2_prob_trace[2] >= 0.15
    assert branch.top_margin_trace[2] > 0.20


def test_adaptive_trigger_does_not_split_on_low_flat_entropy() -> None:
    transitions = {
        (PROMPT_ID, THINK_START[0], THINK_START[1]): _logits({20: 0.0, 21: -8.0}),
        (PROMPT_ID, THINK_START[0], THINK_START[1], 20): _logits({22: 0.0, 23: -8.0}),
        (PROMPT_ID, THINK_START[0], THINK_START[1], 20, 22): _logits({30: 0.0, 31: -8.0}),
        (PROMPT_ID, THINK_START[0], THINK_START[1], 20, 22, 30): _logits({EOS_ID: 0.0}),
    }

    result = _run_with_prompt(
        [PROMPT_ID, THINK_START[0], THINK_START[1]],
        transitions,
        adaptive_trigger=True,
        entropy_floor=1.5,
        adaptive_min_thought_tokens=2,
        adaptive_window=2,
        adaptive_z=1.0,
        max_new_tokens=4,
        num_return_sequences=1,
    )

    assert result.split_branches == []
    assert len(result.completed_branches) == 1
    branch = result.completed_branches[0]
    assert branch.trigger_step_indices == []
    assert max(branch.thought_entropy_trace) < 1.5
    assert all(threshold is None or threshold >= 1.5 for threshold in branch.adaptive_threshold_trace)


def test_adaptive_trigger_splits_on_entropy_spike() -> None:
    transitions = {
        (PROMPT_ID, THINK_START[0], THINK_START[1]): _logits({20: 0.0, 21: -8.0}),
        (PROMPT_ID, THINK_START[0], THINK_START[1], 20): _logits({22: 0.0, 23: -8.0}),
        (PROMPT_ID, THINK_START[0], THINK_START[1], 20, 22): _logits({30: 0.0, 31: 0.0}),
        (PROMPT_ID, THINK_START[0], THINK_START[1], 20, 22, 30): _logits({EOS_ID: 0.0}),
        (PROMPT_ID, THINK_START[0], THINK_START[1], 20, 22, 31): _logits({EOS_ID: 0.0}),
    }

    result = _run_with_prompt(
        [PROMPT_ID, THINK_START[0], THINK_START[1]],
        transitions,
        adaptive_trigger=True,
        entropy_floor=0.5,
        adaptive_min_thought_tokens=2,
        adaptive_window=2,
        adaptive_z=1.0,
        max_new_tokens=4,
        num_return_sequences=2,
    )

    assert len(result.split_branches) == 1
    assert len(result.completed_branches) == 2
    assert {branch.generated_ids[:3][-1] for branch in result.completed_branches} == {30, 31}
    assert all(branch.trigger_step_indices == [2] for branch in result.completed_branches)


def test_entropy_floor_blocks_tiny_relative_spike() -> None:
    transitions = {
        (PROMPT_ID, THINK_START[0], THINK_START[1]): _logits({20: 0.0, 21: -8.0}),
        (PROMPT_ID, THINK_START[0], THINK_START[1], 20): _logits({22: 0.0, 23: -8.0}),
        (PROMPT_ID, THINK_START[0], THINK_START[1], 20, 22): _logits({30: 0.0, 31: -2.0}),
        (PROMPT_ID, THINK_START[0], THINK_START[1], 20, 22, 30): _logits({EOS_ID: 0.0}),
    }

    result = _run_with_prompt(
        [PROMPT_ID, THINK_START[0], THINK_START[1]],
        transitions,
        adaptive_trigger=True,
        entropy_floor=0.5,
        adaptive_min_thought_tokens=2,
        adaptive_window=2,
        adaptive_z=1.0,
        max_new_tokens=4,
        num_return_sequences=1,
    )

    assert result.split_branches == []
    assert len(result.completed_branches) == 1
    branch = result.completed_branches[0]
    assert branch.trigger_step_indices == []
    assert branch.adaptive_threshold_trace[2] == 0.5
    assert branch.thought_entropy_trace[2] < branch.adaptive_threshold_trace[2]


def test_splits_inside_thought_with_multitoken_markers() -> None:
    transitions = {
        (PROMPT_ID,): _logits({THINK_START[0]: 0.0}),
        (PROMPT_ID, THINK_START[0]): _logits({THINK_START[1]: 0.0}),
        (PROMPT_ID, THINK_START[0], THINK_START[1]): _logits({20: 0.0, 21: 0.0}),
        (PROMPT_ID, THINK_START[0], THINK_START[1], 20): _logits({THINK_END[0]: 0.0}),
        (PROMPT_ID, THINK_START[0], THINK_START[1], 21): _logits({THINK_END[0]: 0.0}),
        (PROMPT_ID, THINK_START[0], THINK_START[1], 20, THINK_END[0]): _logits({THINK_END[1]: 0.0}),
        (PROMPT_ID, THINK_START[0], THINK_START[1], 21, THINK_END[0]): _logits({THINK_END[1]: 0.0}),
        (PROMPT_ID, THINK_START[0], THINK_START[1], 20, THINK_END[0], THINK_END[1]): _logits({EOS_ID: 0.0}),
        (PROMPT_ID, THINK_START[0], THINK_START[1], 21, THINK_END[0], THINK_END[1]): _logits({EOS_ID: 0.0}),
    }

    result = _run(transitions, max_new_tokens=6, num_return_sequences=2)

    assert len(result.completed_branches) == 2
    assert len(result.split_branches) == 1
    assert {tuple(branch.generated_ids) for branch in result.completed_branches} == {
        (THINK_START[0], THINK_START[1], 20, THINK_END[0], THINK_END[1], EOS_ID),
        (THINK_START[0], THINK_START[1], 21, THINK_END[0], THINK_END[1], EOS_ID),
    }
    assert all(branch.parent_id == 0 for branch in result.completed_branches)
    assert all(len(branch.entropy_trace) == 6 for branch in result.completed_branches)
    assert all(not branch.thought_state for branch in result.completed_branches)


def test_no_split_when_entropy_stays_below_threshold() -> None:
    transitions = {
        (PROMPT_ID,): _logits({THINK_START[0]: 0.0}),
        (PROMPT_ID, THINK_START[0]): _logits({THINK_START[1]: 0.0}),
        (PROMPT_ID, THINK_START[0], THINK_START[1]): _logits({20: 0.0, 21: 0.0}),
        (PROMPT_ID, THINK_START[0], THINK_START[1], 20): _logits({EOS_ID: 0.0}),
        (PROMPT_ID, THINK_START[0], THINK_START[1], 21): _logits({EOS_ID: 0.0}),
    }

    result = _run(transitions, entropy_threshold=1.0, max_new_tokens=4, num_return_sequences=1)

    assert len(result.completed_branches) == 1
    assert result.split_branches == []
    assert result.completed_branches[0].branch_id == 0
    assert result.completed_branches[0].split_count == 0


def test_high_entropy_outside_thought_does_not_split() -> None:
    transitions = {
        (PROMPT_ID,): _logits({30: 0.0, 31: 0.0}),
        (PROMPT_ID, 30): _logits({EOS_ID: 0.0}),
        (PROMPT_ID, 31): _logits({EOS_ID: 0.0}),
    }

    result = _run(transitions, max_new_tokens=2, num_return_sequences=1)

    assert len(result.completed_branches) == 1
    assert result.split_branches == []
    assert result.completed_branches[0].split_count == 0


def test_prunes_to_live_cap_after_simultaneous_splits() -> None:
    transitions = {
        (PROMPT_ID,): _logits({THINK_START[0]: 0.0}),
        (PROMPT_ID, THINK_START[0]): _logits({THINK_START[1]: 0.0}),
        (PROMPT_ID, THINK_START[0], THINK_START[1]): _logits({20: 0.0, 21: -0.2}),
        (PROMPT_ID, THINK_START[0], THINK_START[1], 20): _logits({30: 0.0, 31: -0.1}),
        (PROMPT_ID, THINK_START[0], THINK_START[1], 21): _logits({32: 0.0, 33: -0.4}),
        (PROMPT_ID, THINK_START[0], THINK_START[1], 20, 30): _logits({EOS_ID: 0.0}),
        (PROMPT_ID, THINK_START[0], THINK_START[1], 20, 31): _logits({EOS_ID: 0.0}),
        (PROMPT_ID, THINK_START[0], THINK_START[1], 21, 32): _logits({EOS_ID: 0.0}),
        (PROMPT_ID, THINK_START[0], THINK_START[1], 21, 33): _logits({EOS_ID: 0.0}),
    }

    result = _run(transitions, max_live_branches=3, max_new_tokens=4, num_return_sequences=3)

    assert len(result.live_branches) == 3
    assert len(result.pruned_branches) == 1
    assert {branch.generated_ids[-1] for branch in result.live_branches} == {30, 31, 32}
    assert {branch.parent_id for branch in result.live_branches} == {1, 2}
    assert all(not branch.finished for branch in result.live_branches)


def test_split_cooldown_blocks_immediate_resplit() -> None:
    transitions = {
        (PROMPT_ID,): _logits({THINK_START[0]: 0.0}),
        (PROMPT_ID, THINK_START[0]): _logits({THINK_START[1]: 0.0}),
        (PROMPT_ID, THINK_START[0], THINK_START[1]): _logits({20: 0.0, 21: 0.0}),
        (PROMPT_ID, THINK_START[0], THINK_START[1], 20): _logits({30: 0.0, 31: 0.0}),
        (PROMPT_ID, THINK_START[0], THINK_START[1], 21): _logits({32: 0.0, 33: 0.0}),
        (PROMPT_ID, THINK_START[0], THINK_START[1], 20, 30): _logits({EOS_ID: 0.0}),
        (PROMPT_ID, THINK_START[0], THINK_START[1], 20, 31): _logits({EOS_ID: 0.0}),
        (PROMPT_ID, THINK_START[0], THINK_START[1], 21, 32): _logits({EOS_ID: 0.0}),
        (PROMPT_ID, THINK_START[0], THINK_START[1], 21, 33): _logits({EOS_ID: 0.0}),
    }

    result = _run(transitions, split_cooldown_tokens=1, max_new_tokens=5, num_return_sequences=2)

    assert len(result.completed_branches) == 2
    assert len(result.split_branches) == 1
    assert all(branch.split_count == 1 for branch in result.completed_branches)


def test_max_splits_per_branch_blocks_later_resplit() -> None:
    transitions = {
        (PROMPT_ID,): _logits({THINK_START[0]: 0.0}),
        (PROMPT_ID, THINK_START[0]): _logits({THINK_START[1]: 0.0}),
        (PROMPT_ID, THINK_START[0], THINK_START[1]): _logits({20: 0.0, 21: 0.0}),
        (PROMPT_ID, THINK_START[0], THINK_START[1], 20): _logits({22: 0.0, 23: 0.0}),
        (PROMPT_ID, THINK_START[0], THINK_START[1], 21): _logits({22: 0.0, 23: 0.0}),
        (PROMPT_ID, THINK_START[0], THINK_START[1], 20, 22): _logits({EOS_ID: 0.0}),
        (PROMPT_ID, THINK_START[0], THINK_START[1], 20, 23): _logits({EOS_ID: 0.0}),
        (PROMPT_ID, THINK_START[0], THINK_START[1], 21, 22): _logits({EOS_ID: 0.0}),
        (PROMPT_ID, THINK_START[0], THINK_START[1], 21, 23): _logits({EOS_ID: 0.0}),
    }

    result = _run(transitions, max_splits_per_branch=1, max_new_tokens=5, num_return_sequences=2)

    assert len(result.completed_branches) == 2
    assert len(result.split_branches) == 1
    assert all(branch.split_count == 1 for branch in result.completed_branches)
    assert result.live_branches == []


def test_discrete_branch_graph_no_split_renders_single_leaf() -> None:
    transitions = {
        (PROMPT_ID,): _logits({THINK_START[0]: 0.0}),
        (PROMPT_ID, THINK_START[0]): _logits({THINK_START[1]: 0.0}),
        (PROMPT_ID, THINK_START[0], THINK_START[1]): _logits({20: 0.0, 21: 0.0}),
        (PROMPT_ID, THINK_START[0], THINK_START[1], 20): _logits({EOS_ID: 0.0}),
        (PROMPT_ID, THINK_START[0], THINK_START[1], 21): _logits({EOS_ID: 0.0}),
    }

    result = _run(transitions, entropy_threshold=1.0, max_new_tokens=4, num_return_sequences=1)
    nodes, edges = build_discrete_branch_graph(result, SimpleTokenizer())
    node_by_id = {node["id"]: node for node in nodes}

    assert set(node_by_id) == {"root", 0}
    assert node_by_id["root"]["kind"] == "root"
    assert node_by_id[0]["kind"] == "leaf"
    assert node_by_id[0]["status"] == "completed"
    assert edges == [
        {
            "source": "root",
            "target": 0,
            "status": "completed",
            "is_best": True,
        }
    ]


def test_discrete_branch_graph_single_split_creates_split_node_and_leaf_labels() -> None:
    transitions = {
        (PROMPT_ID, THINK_START[0], THINK_START[1]): _logits({20: 0.0, 21: 0.0}),
        (PROMPT_ID, THINK_START[0], THINK_START[1], 20): _logits({EOS_ID: 0.0}),
        (PROMPT_ID, THINK_START[0], THINK_START[1], 21): _logits({EOS_ID: 0.0}),
    }

    model = ScriptedCausalLM(transitions)
    tokenizer = SimpleTokenizer()
    input_ids = torch.tensor([[PROMPT_ID, THINK_START[0], THINK_START[1]]], dtype=torch.long)
    result = entropy_branch_generate(
        model=model,
        tokenizer=tokenizer,
        input_ids=input_ids,
        config=_base_config(max_new_tokens=2, num_return_sequences=2),
    )

    nodes, edges = build_discrete_branch_graph(result, tokenizer)
    node_by_id = {node["id"]: node for node in nodes}
    leaf_nodes = [node for node in nodes if node["kind"] == "leaf"]

    assert node_by_id[0]["kind"] == "split"
    assert node_by_id[0]["label"] == "S1"
    assert {node["id"] for node in leaf_nodes} == {1, 2}
    assert all(node["parent_id"] == 0 for node in leaf_nodes)
    assert all(str(node["label"]).startswith(f"B{node['id']}") for node in leaf_nodes)
    assert {node["snippet"] for node in leaf_nodes} == {"A", "B"}
    assert len(edges) == 3
    assert abs(float(node_by_id[1]["y"]) - float(node_by_id[2]["y"])) == 1.0


def test_discrete_branch_graph_marks_pruned_edges() -> None:
    transitions = {
        (PROMPT_ID,): _logits({THINK_START[0]: 0.0}),
        (PROMPT_ID, THINK_START[0]): _logits({THINK_START[1]: 0.0}),
        (PROMPT_ID, THINK_START[0], THINK_START[1]): _logits({20: 0.0, 21: -0.2}),
        (PROMPT_ID, THINK_START[0], THINK_START[1], 20): _logits({30: 0.0, 31: -0.1}),
        (PROMPT_ID, THINK_START[0], THINK_START[1], 21): _logits({32: 0.0, 33: -0.4}),
        (PROMPT_ID, THINK_START[0], THINK_START[1], 20, 30): _logits({EOS_ID: 0.0}),
        (PROMPT_ID, THINK_START[0], THINK_START[1], 20, 31): _logits({EOS_ID: 0.0}),
        (PROMPT_ID, THINK_START[0], THINK_START[1], 21, 32): _logits({EOS_ID: 0.0}),
        (PROMPT_ID, THINK_START[0], THINK_START[1], 21, 33): _logits({EOS_ID: 0.0}),
    }

    result = _run(transitions, max_live_branches=3, max_new_tokens=4, num_return_sequences=3)
    nodes, edges = build_discrete_branch_graph(result, SimpleTokenizer())
    node_by_id = {node["id"]: node for node in nodes}
    pruned_edges = [edge for edge in edges if edge["status"] == "pruned"]

    assert len(pruned_edges) == 1
    assert node_by_id[pruned_edges[0]["target"]]["status"] == "pruned"


def test_discrete_branch_graph_keeps_multisplit_siblings_adjacent() -> None:
    transitions = {
        (PROMPT_ID,): _logits({THINK_START[0]: 0.0}),
        (PROMPT_ID, THINK_START[0]): _logits({THINK_START[1]: 0.0}),
        (PROMPT_ID, THINK_START[0], THINK_START[1]): _logits({20: 0.0, 21: 0.0}),
        (PROMPT_ID, THINK_START[0], THINK_START[1], 20): _logits({22: 0.0, 23: 0.0}),
        (PROMPT_ID, THINK_START[0], THINK_START[1], 21): _logits({EOS_ID: 0.0}),
        (PROMPT_ID, THINK_START[0], THINK_START[1], 20, 22): _logits({EOS_ID: 0.0}),
        (PROMPT_ID, THINK_START[0], THINK_START[1], 20, 23): _logits({EOS_ID: 0.0}),
    }

    result = _run(transitions, max_new_tokens=5, num_return_sequences=3)
    nodes, _ = build_discrete_branch_graph(result, SimpleTokenizer())
    node_by_id = {node["id"]: node for node in nodes}
    root_children = [node for node in nodes if node["parent_id"] == 0]
    nested_splits = [node for node in root_children if node["kind"] == "split"]

    assert node_by_id[0]["kind"] == "split"
    assert len(root_children) == 2
    assert len(nested_splits) == 1

    child_split = nested_splits[0]
    split_children = [node for node in nodes if node["parent_id"] == child_split["id"]]

    assert len(split_children) == 2
    assert all(node["kind"] == "leaf" for node in split_children)
    assert {node["snippet"] for node in split_children} == {"C", "D"}
    assert float(child_split["y"]) == (
        float(split_children[0]["y"]) + float(split_children[1]["y"])
    ) / 2.0
    assert abs(float(split_children[0]["y"]) - float(split_children[1]["y"])) == 1.0
