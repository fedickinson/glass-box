from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

import matplotlib.pyplot as plt
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer

from entropy_branching import BranchRecord, EntropyBranchingConfig, entropy_branch_generate


DEFAULT_MODEL_ID = "deepseek-ai/DeepSeek-R1-Distill-Qwen-1.5B"
DEFAULT_MESSAGES = [
    {
        "role": "system",
        "content": "You are a helpful medical assistant. After thinking, answer each question with just the corresponding option's single letter",
    },
    {
        "role": "user",
        "content": """In pediatric patients, which of the following complications has been documented to occur in association with lateral condyle fracture nonunion?

Options:
A. Lateral elbow pain
B. Progressive cubitus valgus
C. Elbow instability
D. Growth plate arrest
E. Cubitus varus
F. Radial nerve palsy
G. Median nerve entrapment
H. Posterolateral rotatory instability
I. Radial nerve compression
J. Ulnar nerve palsy""",
    },
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Run online entropy-triggered thought branching outside the notebook.",
    )
    parser.add_argument("--model-id", default=DEFAULT_MODEL_ID, help="Hugging Face model id to load.")
    parser.add_argument(
        "--device",
        default=None,
        help="Torch device to run on. Defaults to cuda when available, otherwise cpu.",
    )
    parser.add_argument("--max-live-branches", type=int, default=4)
    parser.add_argument("--split-width", type=int, default=2)
    parser.add_argument(
        "--disable-real-choice-trigger",
        action="store_true",
        help="Use the legacy entropy-based trigger instead of real-choice branching.",
    )
    parser.add_argument("--choice-min-thought-tokens", type=int, default=12)
    parser.add_argument("--choice-top1-max-prob", type=float, default=0.60)
    parser.add_argument("--choice-top2-min-prob", type=float, default=0.15)
    parser.add_argument("--choice-max-margin", type=float, default=0.20)
    parser.add_argument("--choice-entropy-floor", type=float, default=1.0)
    parser.add_argument("--choice-window", type=int, default=32)
    parser.add_argument("--choice-percentile", type=float, default=0.85)
    parser.add_argument("--entropy-threshold", type=float, default=2.5)
    parser.add_argument("--entropy-floor", type=float, default=1.5)
    parser.add_argument(
        "--disable-adaptive-trigger",
        action="store_true",
        help="Use the fixed entropy threshold instead of the adaptive trigger.",
    )
    parser.add_argument("--adaptive-min-thought-tokens", type=int, default=12)
    parser.add_argument("--adaptive-window", type=int, default=32)
    parser.add_argument("--adaptive-z", type=float, default=1.0)
    parser.add_argument("--max-splits-per-branch", type=int, default=3)
    parser.add_argument("--split-cooldown-tokens", type=int, default=2)
    parser.add_argument("--temperature", type=float, default=0.8)
    parser.add_argument("--top-p", type=float, default=0.98)
    parser.add_argument("--max-new-tokens", type=int, default=256)
    parser.add_argument("--num-return-sequences", type=int, default=2)
    parser.add_argument("--length-penalty-alpha", type=float, default=0.7)
    parser.add_argument("--seed", type=int, default=7)
    parser.add_argument(
        "--save-plot",
        type=Path,
        default=None,
        help="Optional output path for the branch graph. If omitted, the plot is shown interactively.",
    )
    parser.add_argument(
        "--no-plot",
        action="store_true",
        help="Skip plotting entirely and only print branch summaries.",
    )
    return parser.parse_args()


def resolve_device(device_arg: str | None) -> torch.device:
    if device_arg:
        return torch.device(device_arg)
    return torch.device("cuda" if torch.cuda.is_available() else "cpu")


def build_branching_config(args: argparse.Namespace) -> EntropyBranchingConfig:
    return EntropyBranchingConfig(
        max_live_branches=args.max_live_branches,
        split_width=args.split_width,
        real_choice_trigger=not args.disable_real_choice_trigger,
        choice_min_thought_tokens=args.choice_min_thought_tokens,
        choice_top1_max_prob=args.choice_top1_max_prob,
        choice_top2_min_prob=args.choice_top2_min_prob,
        choice_max_margin=args.choice_max_margin,
        choice_entropy_floor=args.choice_entropy_floor,
        choice_window=args.choice_window,
        choice_percentile=args.choice_percentile,
        entropy_threshold=args.entropy_threshold,
        entropy_floor=args.entropy_floor,
        adaptive_trigger=not args.disable_adaptive_trigger,
        adaptive_min_thought_tokens=args.adaptive_min_thought_tokens,
        adaptive_window=args.adaptive_window,
        adaptive_z=args.adaptive_z,
        max_splits_per_branch=args.max_splits_per_branch,
        split_cooldown_tokens=args.split_cooldown_tokens,
        temperature=args.temperature,
        top_p=args.top_p,
        max_new_tokens=args.max_new_tokens,
        num_return_sequences=args.num_return_sequences,
        length_penalty_alpha=args.length_penalty_alpha,
        seed=args.seed,
    )


def select_branches_to_show(result) -> list[BranchRecord]:
    branches = result.best_branches or result.completed_branches or result.live_branches
    if not branches:
        raise RuntimeError("No branches were returned by entropy_branch_generate.")
    return branches


def print_branch_summary(result, tokenizer, branches_to_show: list[BranchRecord]) -> None:
    print(
        f"completed={len(result.completed_branches)} "
        f"live={len(result.live_branches)} "
        f"pruned={len(result.pruned_branches)} "
        f"split_nodes={len(result.split_branches)}"
    )

    for branch in branches_to_show:
        peak_choice_score = max(branch.choice_score_trace) if branch.choice_score_trace else None
        highest_threshold = max(
            (threshold for threshold in branch.adaptive_threshold_trace if threshold is not None),
            default=None,
        )
        first_trigger_step = branch.trigger_step_indices[0] if branch.trigger_step_indices else None
        best_top2_prob = max(branch.top2_prob_trace) if branch.top2_prob_trace else None
        lowest_margin = min(branch.top_margin_trace) if branch.top_margin_trace else None
        print(
            f"branch_id={branch.branch_id} "
            f"parent_id={branch.parent_id} "
            f"score={branch.normalized_score:.4f} "
            f"splits={branch.split_count} "
            f"reason={branch.finish_reason} "
            f"peak_choice_score={_format_optional_float(peak_choice_score)} "
            f"first_trigger_step={_format_optional_int(first_trigger_step)} "
            f"highest_trigger_threshold={_format_optional_float(highest_threshold)} "
            f"best_top2_prob={_format_optional_float(best_top2_prob)} "
            f"lowest_margin={_format_optional_float(lowest_margin)}"
        )
        print(tokenizer.decode(result.prompt_ids + branch.generated_ids, skip_special_tokens=False))
        print("-" * 80)

    print("lineage:", result.lineage)
    if not result.split_branches and branches_to_show:
        branch = branches_to_show[0]
        peak_choice_score = max(branch.choice_score_trace) if branch.choice_score_trace else None
        highest_threshold = max(
            (threshold for threshold in branch.adaptive_threshold_trace if threshold is not None),
            default=None,
        )
        best_top2_prob = max(branch.top2_prob_trace) if branch.top2_prob_trace else None
        lowest_margin = min(branch.top_margin_trace) if branch.top_margin_trace else None
        print(
            "no choice-point split fired: "
            f"peak_choice_score={_format_optional_float(peak_choice_score)} "
            f"highest_trigger_threshold={_format_optional_float(highest_threshold)} "
            f"best_top2_prob={_format_optional_float(best_top2_prob)} "
            f"lowest_margin={_format_optional_float(lowest_margin)}"
        )


def _format_optional_float(value: float | None) -> str:
    if value is None:
        return "n/a"
    return f"{value:.4f}"


def _format_optional_int(value: int | None) -> str:
    if value is None:
        return "n/a"
    return str(value)


GraphNode = dict[str, object]
GraphEdge = dict[str, object]


def _build_plot_graph_from_simple_tree(items: list[dict[str, Any]]) -> tuple[list[GraphNode], list[GraphEdge]]:
    by_id: dict[object, dict[str, Any]] = {}
    children_by_parent: dict[object, list[object]] = {}

    for item in items:
        if not isinstance(item, dict):
            raise ValueError("Each simplified tree item must be an object.")
        if "id" not in item or "parent_id" not in item or "content" not in item or "call-type" not in item:
            raise ValueError("Each simplified tree item must contain `id`, `parent_id`, `call-type`, and `content`.")
        if item["call-type"] not in {"thought", "tool", "citation"}:
            raise ValueError("Simplified tree `call-type` must be one of: thought, tool, citation.")
        item_id = item["id"]
        by_id[item_id] = item
        parent_id = item["parent_id"]
        if parent_id is not None:
            children_by_parent.setdefault(parent_id, []).append(item_id)

    root_ids = [item["id"] for item in items if item["parent_id"] is None]
    if len(root_ids) != 1:
        raise ValueError("Expected exactly one root item in simplified tree payload.")
    root_id = root_ids[0]

    for parent_id in children_by_parent:
        if parent_id not in by_id:
            raise ValueError(f"Simplified tree parent `{parent_id}` was not found in the payload.")

    depths: dict[object, int] = {}

    def assign_depth(node_id: object, depth: int) -> None:
        depths[node_id] = depth
        for child_id in children_by_parent.get(node_id, []):
            assign_depth(child_id, depth + 1)

    assign_depth(root_id, 0)

    y_positions: dict[object, float] = {}
    next_lane = 0

    def assign_y(node_id: object) -> float:
        nonlocal next_lane
        children = children_by_parent.get(node_id, [])
        if not children:
            y = -float(next_lane)
            next_lane += 1
        else:
            child_positions = [assign_y(child_id) for child_id in children]
            y = sum(child_positions) / len(child_positions)
        y_positions[node_id] = y
        return y

    assign_y(root_id)

    split_ids = [item["id"] for item in items if item["id"] != root_id and len(children_by_parent.get(item["id"], [])) > 1]
    split_order = {node_id: index + 1 for index, node_id in enumerate(sorted(split_ids, key=lambda node_id: (depths[node_id], str(node_id))))}

    plot_nodes: list[GraphNode] = []
    plot_edges: list[GraphEdge] = []

    for item in items:
        node_id = item["id"]
        parent_id = item["parent_id"]
        content = str(item["content"])
        call_type = str(item["call-type"])
        children = children_by_parent.get(node_id, [])

        if parent_id is None:
            kind = "root"
            label = "R"
        elif not children:
            kind = "leaf"
            label = f"{node_id}  {content}"
        elif len(children) == 1:
            kind = "thought"
            label = str(node_id)
        else:
            kind = "split"
            label = f"S{split_order[node_id]}"

        plot_nodes.append(
            {
                "id": node_id,
                "parent_id": parent_id,
                "kind": kind,
                "x": -0.5 if parent_id is None else (depths[node_id] * 3.2) - 0.5,
                "y": y_positions[node_id],
                "label": label,
                "snippet": f"[{call_type}] {content}",
                "call_type": call_type,
                "status": "root" if kind == "root" else ("split" if kind == "split" else ("completed" if kind == "leaf" else "linear")),
                "is_best": False,
            }
        )

        if parent_id is not None:
            edge_status = "split" if kind == "split" else ("completed" if kind == "leaf" else "linear")
            plot_edges.append(
                {
                    "source": parent_id,
                    "target": node_id,
                    "status": edge_status,
                    "is_best": False,
                }
            )

    return plot_nodes, plot_edges


def load_branch_graph_json(graph_path: Path) -> tuple[dict[str, Any], list[GraphNode], list[GraphEdge]]:
    payload = json.loads(graph_path.read_text())
    if isinstance(payload, list):
        title = graph_path.stem.replace("_", " ").title()
        nodes, edges = _build_plot_graph_from_simple_tree(payload)
        return {"title": title}, nodes, edges
    nodes = payload.get("nodes")
    edges = payload.get("edges")
    if not isinstance(nodes, list) or not isinstance(edges, list):
        raise ValueError("Expected graph JSON to contain `nodes` and `edges` lists.")
    meta = payload.get("meta", {})
    if not isinstance(meta, dict):
        raise ValueError("Expected graph JSON `meta` to be an object when present.")
    return meta, nodes, edges


def build_discrete_branch_graph(result, tokenizer) -> tuple[list[GraphNode], list[GraphEdge]]:
    split_records = {branch.branch_id: branch for branch in result.split_branches}
    leaf_records: dict[int, BranchRecord] = {}
    leaf_statuses: dict[int, str] = {}
    for status, branches in (
        ("completed", result.completed_branches),
        ("live", result.live_branches),
        ("pruned", result.pruned_branches),
    ):
        for branch in branches:
            leaf_records[branch.branch_id] = branch
            leaf_statuses[branch.branch_id] = status

    if 0 not in split_records and 0 not in leaf_records:
        raise RuntimeError("Expected branch graph data to include root branch 0.")

    child_ids_by_parent: dict[int, list[int]] = {}
    for child_id, parent_id in result.lineage.items():
        if parent_id is None:
            continue
        if child_id not in split_records and child_id not in leaf_records:
            continue
        child_ids_by_parent.setdefault(parent_id, []).append(child_id)

    best_branch_id = result.best_branches[0].branch_id if result.best_branches else None
    best_path_ids: set[int] = set()
    current_id = best_branch_id
    while current_id is not None:
        best_path_ids.add(current_id)
        current_id = result.lineage.get(current_id)

    split_order = {
        branch_id: index + 1
        for index, branch_id in enumerate(
            sorted(
                split_records,
                key=lambda candidate_id: (len(split_records[candidate_id].generated_ids), candidate_id),
            )
        )
    }

    score_cache: dict[int, float] = {}

    def descendant_score(branch_id: int) -> float:
        cached = score_cache.get(branch_id)
        if cached is not None:
            return cached

        if branch_id in leaf_records:
            score = leaf_records[branch_id].normalized_score
        else:
            children = child_ids_by_parent.get(branch_id, [])
            if not children:
                score = split_records[branch_id].normalized_score
            else:
                score = max(descendant_score(child_id) for child_id in children)

        score_cache[branch_id] = score
        return score

    def sort_children(parent_id: int) -> list[int]:
        return sorted(
            child_ids_by_parent.get(parent_id, []),
            key=lambda child_id: (-descendant_score(child_id), child_id),
        )

    y_positions: dict[int, float] = {}
    next_lane = 0

    def assign_y(branch_id: int) -> float:
        nonlocal next_lane

        if branch_id in y_positions:
            return y_positions[branch_id]

        children = sort_children(branch_id)
        if not children:
            y = -float(next_lane)
            next_lane += 1
        else:
            child_positions = [assign_y(child_id) for child_id in children]
            y = sum(child_positions) / len(child_positions)

        y_positions[branch_id] = y
        return y

    assign_y(0)

    def branch_x(branch_id: int) -> float:
        if branch_id in split_records:
            return float(len(split_records[branch_id].generated_ids))
        return float(len(leaf_records[branch_id].generated_ids))

    def branch_record(branch_id: int) -> BranchRecord:
        if branch_id in split_records:
            return split_records[branch_id]
        return leaf_records[branch_id]

    def decode_token_slice(token_ids: list[int]) -> str:
        eos_token_id = getattr(tokenizer, "eos_token_id", None)
        visible_token_ids = [token_id for token_id in token_ids if token_id != eos_token_id]
        if not visible_token_ids:
            return "(no new tokens)"
        decoded = tokenizer.decode(visible_token_ids, skip_special_tokens=False).strip()
        compact = " ".join(decoded.split())
        return compact or "(no new tokens)"

    def divergence_snippet(branch_id: int, *, max_tokens: int = 6) -> str:
        branch = branch_record(branch_id)
        parent_id = result.lineage.get(branch_id)
        parent_prefix_len = 0
        if parent_id is not None:
            parent_prefix_len = len(branch_record(parent_id).generated_ids)
        token_slice = branch.generated_ids[parent_prefix_len : parent_prefix_len + max_tokens]
        return decode_token_slice(token_slice)

    def final_answer_text(branch: BranchRecord) -> str:
        eos_token_id = getattr(tokenizer, "eos_token_id", None)
        non_eos_ids = [token_id for token_id in branch.generated_ids if token_id != eos_token_id]
        if not non_eos_ids:
            return "(empty)"

        decoded = tokenizer.decode(non_eos_ids, skip_special_tokens=False).strip()
        if "</think>" in decoded:
            decoded = decoded.rsplit("</think>", 1)[-1].strip()
        if not decoded:
            decoded = tokenizer.decode([non_eos_ids[-1]], skip_special_tokens=False).strip()
        compact = " ".join(decoded.split())
        return compact or "(empty)"

    def leaf_label(branch: BranchRecord) -> str:
        snippet = divergence_snippet(branch.branch_id)
        if len(snippet) > 24:
            snippet = f"{snippet[:21]}..."
        return f"B{branch.branch_id}  {snippet}\nscore={branch.normalized_score:.3f}"

    nodes: list[GraphNode] = [
        {
            "id": "root",
            "parent_id": None,
            "kind": "root",
            "x": -0.5,
            "y": y_positions[0],
            "label": "R",
            "status": "root",
            "is_best": best_branch_id == 0,
        }
    ]
    edges: list[GraphEdge] = []

    def add_branch_node(branch_id: int, parent_id: str | int) -> None:
        is_split = branch_id in split_records
        is_best = branch_id in best_path_ids
        if is_split:
            node = {
                "id": branch_id,
                "parent_id": parent_id,
                "kind": "split",
                "x": branch_x(branch_id),
                "y": y_positions[branch_id],
                "label": f"S{split_order[branch_id]}",
                "snippet": divergence_snippet(branch_id),
                "status": "split",
                "is_best": is_best,
            }
            edge_status = "split"
        else:
            branch = leaf_records[branch_id]
            edge_status = leaf_statuses[branch_id]
            node = {
                "id": branch_id,
                "parent_id": parent_id,
                "kind": "leaf",
                "x": branch_x(branch_id),
                "y": y_positions[branch_id],
                "label": leaf_label(branch),
                "snippet": divergence_snippet(branch_id),
                "answer": final_answer_text(branch),
                "status": edge_status,
                "is_best": is_best,
            }

        nodes.append(node)
        edges.append(
            {
                "source": parent_id,
                "target": branch_id,
                "status": edge_status,
                "is_best": is_best,
            }
        )

        for child_id in sort_children(branch_id):
            add_branch_node(child_id, branch_id)

    add_branch_node(0, "root")
    return nodes, edges


def plot_branch_graph_data(
    nodes: list[GraphNode],
    edges: list[GraphEdge],
    save_path: Path | None = None,
    *,
    ax: Any | None = None,
    title: str = "Discrete Reasoning Branches",
) -> Any:
    node_map = {node["id"]: node for node in nodes}
    leaf_count = max(1, sum(1 for node in nodes if node["kind"] == "leaf"))
    x_values = [float(node["x"]) for node in nodes]
    y_values = [float(node["y"]) for node in nodes]
    x_span = max(x_values) - min(x_values)

    created_figure = ax is None
    if created_figure:
        fig_height = max(3.8, 1.3 * leaf_count + 1.5)
        fig_width = max(12.0, 5.5 + 0.34 * x_span)
        fig, ax = plt.subplots(figsize=(fig_width, fig_height))
    else:
        fig = ax.figure

    palette = {
        "best": "#15847d",
        "linear": "#94a3b8",
        "completed": "#49627a",
        "live": "#b07a2a",
        "pruned": "#c76c64",
        "split": "#6b7280",
        "thought": "#94a3b8",
        "root": "#1f2933",
    }

    for edge in edges:
        parent = node_map[edge["source"]]
        child = node_map[edge["target"]]
        is_best = bool(edge["is_best"])
        status = str(edge["status"])
        color = palette["best"] if is_best else palette.get(status, palette["split"])
        linewidth = 2.8 if is_best else 1.8
        linestyle = "--" if status == "pruned" else "-"
        alpha = 1.0 if is_best else (0.55 if status == "pruned" else 0.9)
        ax.plot(
            [parent["x"], child["x"], child["x"]],
            [parent["y"], parent["y"], child["y"]],
            color=color,
            linewidth=linewidth,
            linestyle=linestyle,
            alpha=alpha,
            solid_capstyle="round",
            zorder=1,
        )

    for node in nodes:
        kind = str(node["kind"])
        is_best = bool(node["is_best"])
        x = float(node["x"])
        y = float(node["y"])

        if kind == "root":
            ax.scatter([x], [y], s=260, color=palette["root"], edgecolors="white", linewidths=1.2, zorder=3)
            ax.text(x, y, str(node["label"]), color="white", ha="center", va="center", fontsize=9, zorder=4)
            continue

        if kind == "split":
            ax.scatter([x], [y], s=180, color=palette["split"], edgecolors="white", linewidths=1.0, zorder=3)
            ax.text(x, y, str(node["label"]), color="white", ha="center", va="center", fontsize=8, zorder=4)
            ax.text(
                x + 0.32,
                y,
                str(node["snippet"]),
                ha="left",
                va="center",
                fontsize=8,
                color="#374151",
                bbox={
                    "boxstyle": "round,pad=0.22,rounding_size=0.16",
                    "facecolor": "#f3f4f6",
                    "edgecolor": "#d1d5db",
                    "linewidth": 0.8,
                    "alpha": 0.95,
                },
                zorder=2,
            )
            continue

        if kind == "thought":
            ax.scatter(
                [x],
                [y],
                s=70,
                color=palette["best"] if is_best else palette["thought"],
                edgecolors="white",
                linewidths=0.9,
                alpha=0.95 if is_best else 0.85,
                zorder=3,
            )
            ax.text(
                x + 0.24,
                y,
                str(node.get("snippet", node.get("label", "..."))),
                ha="left",
                va="center",
                fontsize=7.5,
                color="#475569",
                bbox={
                    "boxstyle": "round,pad=0.18,rounding_size=0.14",
                    "facecolor": "#f8fafc",
                    "edgecolor": "#cbd5e1",
                    "linewidth": 0.8,
                    "alpha": 0.92,
                },
                zorder=2,
            )
            continue

        status = str(node["status"])
        facecolor = palette["best"] if is_best else palette.get(status, palette["completed"])
        edgecolor = "#0f5c56" if is_best else ("#8e4b46" if status == "pruned" else "#dbe3ec")
        alpha = 1.0 if is_best else (0.72 if status == "pruned" else 0.95)
        ax.text(
            x,
            y,
            str(node["label"]),
            ha="left",
            va="center",
            fontsize=9,
            color="white",
            bbox={
                "boxstyle": "round,pad=0.35,rounding_size=0.2",
                "facecolor": facecolor,
                "edgecolor": edgecolor,
                "linewidth": 1.2 if is_best else 1.0,
                "alpha": alpha,
            },
            zorder=4,
        )

    ax.set_xlim(min(x_values) - 0.7, max(x_values) + 2.6)
    ax.set_ylim(min(y_values) - 0.8, max(y_values) + 0.8)
    ax.set_yticks([])
    ax.set_xlabel("Reasoning step")
    ax.set_title(title)
    ax.grid(axis="x", linestyle=":", alpha=0.25)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.spines["left"].set_visible(False)

    if save_path is not None:
        save_path.parent.mkdir(parents=True, exist_ok=True)
        fig.savefig(save_path, dpi=200, bbox_inches="tight")
        print(f"saved plot to {save_path}")
        if created_figure:
            plt.close(fig)
    elif created_figure:
        plt.show()

    return ax


def plot_discrete_branch_graph(
    result,
    tokenizer,
    save_path: Path | None = None,
    *,
    ax: Any | None = None,
) -> Any:
    nodes, edges = build_discrete_branch_graph(result, tokenizer)
    return plot_branch_graph_data(nodes, edges, save_path, ax=ax)


def plot_branch_graph_json(
    graph_path: Path,
    save_path: Path | None = None,
    *,
    ax: Any | None = None,
) -> Any:
    meta, nodes, edges = load_branch_graph_json(graph_path)
    title = str(meta.get("title", "Discrete Reasoning Branches"))
    return plot_branch_graph_data(nodes, edges, save_path, ax=ax, title=title)


def main() -> None:
    args = parse_args()
    device = resolve_device(args.device)
    branching_config = build_branching_config(args)

    print(f"loading model {args.model_id} on {device}...")
    model = AutoModelForCausalLM.from_pretrained(args.model_id).to(device)
    tokenizer = AutoTokenizer.from_pretrained(args.model_id)

    model_inputs = tokenizer.apply_chat_template(
        DEFAULT_MESSAGES,
        return_tensors="pt",
        return_dict=True,
        add_generation_prompt=True,
    ).to(device)
    result = entropy_branch_generate(
        model=model,
        tokenizer=tokenizer,
        input_ids=model_inputs["input_ids"],
        attention_mask=model_inputs.get("attention_mask"),
        config=branching_config,
    )
    branches_to_show = select_branches_to_show(result)

    print_branch_summary(result, tokenizer, branches_to_show)

    if not args.no_plot:
        plot_discrete_branch_graph(result, tokenizer, args.save_plot)


if __name__ == "__main__":
    main()
