"""
Visualization API
Returns deterministic step-by-step animation data for DSA algorithms.
Zero LLM cost — pure Python logic.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Any, Optional

router = APIRouter(prefix="/visualize", tags=["Visualize"])


class VisualizeRequest(BaseModel):
    problem_slug: str
    algorithm_type: str  # array, sliding_window, linked_list, binary_tree, binary_search, sorting
    input_data: Optional[Any] = None  # optional custom input


# ─── Generators ───────────────────────────────────────────────

def gen_array_steps(arr: list) -> list:
    steps = []
    steps.append({"step": 0, "type": "init", "array": arr[:], "highlight": [], "message": "Initial array"})
    for i in range(len(arr)):
        steps.append({
            "step": i + 1,
            "type": "visit",
            "array": arr[:],
            "highlight": [i],
            "message": f"Visiting index {i}, value = {arr[i]}",
            "pointer": {"i": i},
        })
    return steps


def gen_sliding_window_steps(arr: list, k: int = 3) -> list:
    steps = []
    n = len(arr)
    k = min(k, n)
    window_sum = sum(arr[:k])
    steps.append({"step": 0, "type": "init", "array": arr[:], "window": [0, k - 1], "sum": window_sum,
                  "message": f"Initialize window [0..{k-1}], sum={window_sum}"})
    max_sum = window_sum
    for i in range(1, n - k + 1):
        window_sum = window_sum - arr[i - 1] + arr[i + k - 1]
        max_sum = max(max_sum, window_sum)
        steps.append({
            "step": i,
            "type": "slide",
            "array": arr[:],
            "window": [i, i + k - 1],
            "sum": window_sum,
            "max_sum": max_sum,
            "removed": arr[i - 1],
            "added": arr[i + k - 1],
            "message": f"Slide: remove {arr[i-1]}, add {arr[i+k-1]}, sum={window_sum}",
        })
    steps.append({"step": len(steps), "type": "done", "array": arr[:],
                  "max_sum": max_sum, "message": f"Done! Max sum = {max_sum}"})
    return steps


def gen_binary_search_steps(arr: list, target: int) -> list:
    steps = []
    lo, hi = 0, len(arr) - 1
    step = 0
    while lo <= hi:
        mid = (lo + hi) // 2
        steps.append({
            "step": step,
            "type": "compare",
            "array": arr[:],
            "lo": lo,
            "hi": hi,
            "mid": mid,
            "target": target,
            "highlight": [mid],
            "range": list(range(lo, hi + 1)),
            "message": f"lo={lo}, hi={hi}, mid={mid}, arr[mid]={arr[mid]}",
        })
        if arr[mid] == target:
            steps.append({"step": step + 1, "type": "found", "array": arr[:],
                          "index": mid, "highlight": [mid],
                          "message": f"Found {target} at index {mid}!"})
            return steps
        elif arr[mid] < target:
            lo = mid + 1
            steps[-1]["message"] += f" → go right"
        else:
            hi = mid - 1
            steps[-1]["message"] += f" → go left"
        step += 1
    steps.append({"step": step, "type": "not_found", "message": f"{target} not found in array"})
    return steps


def gen_bubble_sort_steps(arr: list) -> list:
    steps = []
    a = arr[:]
    n = len(a)
    for i in range(n):
        for j in range(0, n - i - 1):
            steps.append({
                "step": len(steps),
                "type": "compare",
                "array": a[:],
                "comparing": [j, j + 1],
                "sorted_boundary": n - i,
                "message": f"Compare a[{j}]={a[j]} and a[{j+1}]={a[j+1]}",
            })
            if a[j] > a[j + 1]:
                a[j], a[j + 1] = a[j + 1], a[j]
                steps.append({
                    "step": len(steps),
                    "type": "swap",
                    "array": a[:],
                    "swapped": [j, j + 1],
                    "message": f"Swap → {a[j+1]} > {a[j]}",
                })
    steps.append({"step": len(steps), "type": "done", "array": a[:], "message": "Array sorted!"})
    return steps


def gen_linked_list_steps(values: list) -> list:
    steps = []
    steps.append({"step": 0, "type": "init", "nodes": values, "current": 0, "message": "Initialize linked list"})
    for i, v in enumerate(values):
        steps.append({
            "step": i + 1,
            "type": "traverse",
            "nodes": values,
            "current": i,
            "next": i + 1 if i + 1 < len(values) else None,
            "message": f"Visit node {i}: value={v}" + (" → next" if i + 1 < len(values) else " → null"),
        })
    steps.append({"step": len(steps), "type": "done", "nodes": values, "message": "Traversal complete"})
    return steps


def gen_binary_tree_steps(values: list) -> list:
    """BFS level-order traversal visualization"""
    steps = []
    steps.append({"step": 0, "type": "init", "nodes": values, "visited": [], "queue": [0], "message": "Start BFS from root"})
    from collections import deque
    queue = deque([0])
    visited = []
    step = 1
    while queue:
        idx = queue.popleft()
        if idx >= len(values) or values[idx] is None:
            continue
        visited.append(idx)
        left = 2 * idx + 1
        right = 2 * idx + 2
        children = []
        if left < len(values) and values[left] is not None:
            queue.append(left)
            children.append(left)
        if right < len(values) and values[right] is not None:
            queue.append(right)
            children.append(right)
        steps.append({
            "step": step,
            "type": "visit",
            "nodes": values,
            "current": idx,
            "visited": visited[:],
            "queue": list(queue),
            "children_added": children,
            "message": f"Visit node {idx} (val={values[idx]})" + (f", enqueue children {[values[c] for c in children]}" if children else ""),
        })
        step += 1
    steps.append({"step": step, "type": "done", "nodes": values, "visited": visited, "message": "BFS complete!"})
    return steps


# ─── Default inputs per algorithm ─────────────────────────────
DEFAULTS = {
    "array":          [4, 2, 7, 1, 9, 3, 6, 5],
    "sliding_window": [1, 4, 2, 9, 5, 3, 7, 2],
    "binary_search":  [1, 3, 5, 7, 9, 11, 13, 15],
    "bubble_sort":    [64, 34, 25, 12, 22, 11, 90],
    "linked_list":    [1, 2, 3, 4, 5],
    "binary_tree":    [1, 2, 3, 4, 5, 6, 7],
}

TARGET_DEFAULTS = {
    "binary_search": 7,
}


@router.post("")
async def generate_visualization(body: VisualizeRequest):
    """
    Generate deterministic animation steps for a given algorithm type.
    Frontend renders these steps as animated frames.
    """
    algo = body.algorithm_type.lower().replace("-", "_").replace(" ", "_")
    data = body.input_data

    try:
        if algo == "array":
            arr = data if isinstance(data, list) else DEFAULTS["array"]
            return {"type": algo, "steps": gen_array_steps(arr)}

        elif algo in ("sliding_window", "sliding-window"):
            arr = data.get("array", DEFAULTS["sliding_window"]) if isinstance(data, dict) else DEFAULTS["sliding_window"]
            k = data.get("k", 3) if isinstance(data, dict) else 3
            return {"type": algo, "steps": gen_sliding_window_steps(arr, k)}

        elif algo in ("binary_search", "binary-search"):
            arr = data.get("array", DEFAULTS["binary_search"]) if isinstance(data, dict) else DEFAULTS["binary_search"]
            target = data.get("target", TARGET_DEFAULTS["binary_search"]) if isinstance(data, dict) else 7
            return {"type": algo, "steps": gen_binary_search_steps(arr, target)}

        elif algo in ("bubble_sort", "sorting", "sort"):
            arr = data if isinstance(data, list) else DEFAULTS["bubble_sort"]
            return {"type": "bubble_sort", "steps": gen_bubble_sort_steps(arr)}

        elif algo in ("linked_list", "linked-list"):
            nodes = data if isinstance(data, list) else DEFAULTS["linked_list"]
            return {"type": algo, "steps": gen_linked_list_steps(nodes)}

        elif algo in ("binary_tree", "binary-tree", "tree", "bfs"):
            nodes = data if isinstance(data, list) else DEFAULTS["binary_tree"]
            return {"type": "binary_tree", "steps": gen_binary_tree_steps(nodes)}

        else:
            raise HTTPException(status_code=400, detail=f"Unknown algorithm type: '{algo}'. Supported: array, sliding_window, binary_search, bubble_sort, linked_list, binary_tree")

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/types")
async def get_algorithm_types():
    return {
        "types": [
            {"id": "array", "label": "Array Traversal", "description": "Linear scan with pointer"},
            {"id": "sliding_window", "label": "Sliding Window", "description": "Fixed-size window moving across array"},
            {"id": "binary_search", "label": "Binary Search", "description": "Divide and conquer search"},
            {"id": "bubble_sort", "label": "Bubble Sort", "description": "Classic comparison sort"},
            {"id": "linked_list", "label": "Linked List Traversal", "description": "Node-by-node traversal"},
            {"id": "binary_tree", "label": "Binary Tree BFS", "description": "Level-order tree traversal"},
        ]
    }
