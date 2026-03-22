from __future__ import annotations

import json
from pathlib import Path
from typing import Any


CALL_TYPES = frozenset({"thought", "tool", "citation"})
GraphNode = dict[str, object]
GraphEdge = dict[str, object]
_REQUIRED_KEYS = frozenset({"id", "parent_id", "call-type", "content"})
_TOOL_FIELDS = ("tool_call", "tool_output")
_CITATION_FIELDS = ("citation_url",)


def _normalize_item(item: dict[str, Any]) -> dict[str, Any]:
    normalized_item = dict(item)
    normalized_item["content"] = str(item["content"])
    normalized_item["call-type"] = str(item["call-type"])

    call_type = normalized_item["call-type"]
    if call_type == "tool":
        for field_name in _TOOL_FIELDS:
            normalized_item[field_name] = str(item.get(field_name, ""))
        for field_name in _CITATION_FIELDS:
            normalized_item.pop(field_name, None)
    elif call_type == "citation":
        for field_name in _CITATION_FIELDS:
            normalized_item[field_name] = str(item.get(field_name, ""))
        for field_name in _TOOL_FIELDS:
            normalized_item.pop(field_name, None)
    else:
        for field_name in _TOOL_FIELDS + _CITATION_FIELDS:
            normalized_item.pop(field_name, None)

    return normalized_item


def validate_simple_tree(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    if not isinstance(items, list) or not items:
        raise ValueError("Expected simplified tree payload to be a non-empty list.")

    normalized_items: list[dict[str, Any]] = []
    by_id: dict[object, dict[str, Any]] = {}
    children_by_parent: dict[object, list[object]] = {}

    for index, item in enumerate(items):
        if not isinstance(item, dict):
            raise ValueError(f"Tree item at index {index} must be an object.")

        missing = _REQUIRED_KEYS.difference(item)
        if missing:
            missing_text = ", ".join(sorted(missing))
            raise ValueError(f"Tree item at index {index} is missing required keys: {missing_text}.")

        call_type = item["call-type"]
        if call_type not in CALL_TYPES:
            raise ValueError("Simplified tree `call-type` must be one of: thought, tool, citation.")

        item_id = item["id"]
        if item_id in by_id:
            raise ValueError(f"Simplified tree item id `{item_id}` is duplicated.")

        normalized_item = _normalize_item(item)
        normalized_items.append(normalized_item)
        by_id[item_id] = normalized_item

    root_ids = [item["id"] for item in normalized_items if item["parent_id"] is None]
    if len(root_ids) != 1:
        raise ValueError("Expected exactly one root item in simplified tree payload.")

    for item in normalized_items:
        item_id = item["id"]
        parent_id = item["parent_id"]

        if parent_id is None:
            continue
        if parent_id == item_id:
            raise ValueError(f"Simplified tree item `{item_id}` cannot be its own parent.")
        if parent_id not in by_id:
            raise ValueError(f"Simplified tree parent `{parent_id}` was not found in the payload.")

        children_by_parent.setdefault(parent_id, []).append(item_id)

    visited: set[object] = set()
    active_stack: set[object] = set()

    def walk(node_id: object) -> None:
        if node_id in active_stack:
            raise ValueError(f"Simplified tree contains a cycle at `{node_id}`.")
        if node_id in visited:
            return

        active_stack.add(node_id)
        for child_id in children_by_parent.get(node_id, []):
            walk(child_id)
        active_stack.remove(node_id)
        visited.add(node_id)

    walk(root_ids[0])

    if len(visited) != len(normalized_items):
        unseen_ids = [item["id"] for item in normalized_items if item["id"] not in visited]
        raise ValueError(f"Simplified tree contains unreachable nodes: {unseen_ids}.")

    return normalized_items


def read_simple_tree(tree_path: Path) -> list[dict[str, Any]]:
    payload = json.loads(tree_path.read_text())
    if not isinstance(payload, list):
        raise ValueError("Expected simplified tree file to contain a top-level list.")
    return validate_simple_tree(payload)


def write_simple_tree(tree_path: Path, items: list[dict[str, Any]]) -> None:
    normalized_items = validate_simple_tree(items)
    tree_path.write_text(json.dumps(normalized_items, indent=2) + "\n")


def build_plot_graph_from_simple_tree(items: list[dict[str, Any]]) -> tuple[list[GraphNode], list[GraphEdge]]:
    normalized_items = validate_simple_tree(items)
    by_id = {item["id"]: item for item in normalized_items}
    children_by_parent: dict[object, list[object]] = {}

    for item in normalized_items:
        parent_id = item["parent_id"]
        if parent_id is not None:
            children_by_parent.setdefault(parent_id, []).append(item["id"])

    root_id = next(item["id"] for item in normalized_items if item["parent_id"] is None)

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

    split_ids = [
        item["id"]
        for item in normalized_items
        if item["id"] != root_id and len(children_by_parent.get(item["id"], [])) > 1
    ]
    split_order = {
        node_id: index + 1
        for index, node_id in enumerate(sorted(split_ids, key=lambda candidate_id: (depths[candidate_id], str(candidate_id))))
    }

    plot_nodes: list[GraphNode] = []
    plot_edges: list[GraphEdge] = []

    for item in normalized_items:
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
