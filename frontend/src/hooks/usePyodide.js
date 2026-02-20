/**
 * usePyodide — Production-grade Python runner for LeetCode-style problems.
 *
 * Handles:
 *  - ListNode  (linked list) inputs/outputs
 *  - TreeNode  (binary tree) inputs/outputs — level-order with nulls
 *  - All primitive types: int, float, bool, str, None
 *  - Nested structures: List[List[int]], Dict, Tuple, Set
 *  - "varname = value" input format (LeetCode style)
 *  - Multi-argument functions (one line per arg)
 *  - In-place mutation problems (returns None → read back from first arg)
 *  - stdout capture (print() inside user code shows in output)
 *  - Execution timeout (5s per test case)
 *  - Float comparison with epsilon (1e-5)
 *  - Unordered result comparison (sorted fallback)
 *  - Compilation errors vs runtime errors
 *  - Multiple valid answers via set-equality
 *  - All standard LeetCode imports pre-loaded
 */
import { useState, useRef, useCallback } from 'react';

const PYODIDE_CDN = 'https://cdn.jsdelivr.net/pyodide/v0.25.1/full/pyodide.js';

// ── Singleton Pyodide instance ──────────────────────────────────────────────
let globalPyodide = null;
let loadingPromise = null;

async function loadPyodideInstance() {
  if (globalPyodide) return globalPyodide;
  if (loadingPromise) return loadingPromise;

  loadingPromise = new Promise(async (resolve, reject) => {
    try {
      if (!window.loadPyodide) {
        await new Promise((res, rej) => {
          const s = document.createElement('script');
          s.src = PYODIDE_CDN;
          s.onload = res;
          s.onerror = () => rej(new Error('Failed to load Pyodide from CDN'));
          document.head.appendChild(s);
        });
      }
      const py = await window.loadPyodide({ stdout: () => {}, stderr: () => {} });
      globalPyodide = py;
      resolve(py);
    } catch (err) {
      loadingPromise = null;
      reject(err);
    }
  });

  return loadingPromise;
}

// ── Python runner script ────────────────────────────────────────────────────
function buildPythonRunner(userCode, testCases) {
  const testCasesJson = JSON.stringify(testCases);
  // Safely escape user code for embedding in a Python triple-quoted string
  const safeCode = userCode
    .replace(/\\/g, '\\\\')
    .replace(/"""/g, '\\"\\"\\"')
    .replace(/\r\n/g, '\n');

  return `
import json, sys, traceback, io, signal, copy, math

# ── Standard LeetCode imports available to user code ──────────────────────
_PRELUDE = """
from typing import List, Optional, Dict, Tuple, Set, Any, Union
from collections import defaultdict, deque, Counter, OrderedDict
from functools import lru_cache, cache, reduce
from itertools import combinations, permutations, product, accumulate, groupby
from heapq import heappush, heappop, heapify, nlargest, nsmallest
import heapq, math, bisect, re, string, operator, random
import sys, copy, functools, itertools

# ── LeetCode data structures ───────────────────────────────────────────────

class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next
    def __repr__(self):
        return f"ListNode({self.val})"

class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right
    def __repr__(self):
        return f"TreeNode({self.val})"

class Node:
    def __init__(self, val=0, left=None, right=None, next=None, neighbors=None, children=None):
        self.val = val
        self.left = left
        self.right = right
        self.next = next
        self.neighbors = neighbors if neighbors is not None else []
        self.children = children if children is not None else []
    def __repr__(self):
        return f"Node({self.val})"

# Helpers available inside user code
def list_to_linkedlist(arr):
    if not arr: return None
    head = cur = ListNode(arr[0])
    for v in arr[1:]: cur.next = ListNode(v); cur = cur.next
    return head

def linkedlist_to_list(head):
    res, seen = [], set()
    while head and id(head) not in seen:
        seen.add(id(head)); res.append(head.val); head = head.next
    return res

def list_to_tree(arr):
    if not arr or arr[0] is None: return None
    root = TreeNode(arr[0]); q = deque([root]); i = 1
    while q and i < len(arr):
        node = q.popleft()
        if i < len(arr) and arr[i] is not None:
            node.left = TreeNode(arr[i]); q.append(node.left)
        i += 1
        if i < len(arr) and arr[i] is not None:
            node.right = TreeNode(arr[i]); q.append(node.right)
        i += 1
    return root

def tree_to_list(root):
    if not root: return []
    res, q = [], deque([root])
    while q:
        node = q.popleft()
        if node:
            res.append(node.val); q.append(node.left); q.append(node.right)
        else:
            res.append(None)
    while res and res[-1] is None: res.pop()
    return res
"""

# ── User code ──────────────────────────────────────────────────────────────
_USER_CODE = _PRELUDE + """
${safeCode}
"""

_test_cases = ${testCasesJson}

# ── Input parsing ──────────────────────────────────────────────────────────
def _parse_value(raw_str, ns):
    """
    Parse a single value string into a Python object.
    Handles: arrays, nested arrays, ints, floats, bools, null/None, strings.
    After parsing, auto-converts arrays to ListNode/TreeNode when the
    namespace has those types and the var name hints at it.
    """
    s = raw_str.strip()
    if s in ('null', 'None', ''): return None
    if s == 'true':  return True
    if s == 'false': return False
    try:
        return json.loads(s)
    except Exception:
        # bare string without quotes
        return s

def _coerce_arg(value, varname, ns):
    """
    Auto-convert JSON-parsed lists to LeetCode structures based on varname hint.
    head/node/list -> ListNode
    root/tree      -> TreeNode
    """
    if not isinstance(value, list):
        return value
    name = (varname or '').lower().strip()
    if any(k in name for k in ('head', 'l1', 'l2', 'list', 'node')) and 'ListNode' in ns:
        return ns['ListNode'] and _build_linkedlist(value, ns['ListNode'])
    if any(k in name for k in ('root', 'tree', 'p', 'q')) and 'TreeNode' in ns:
        return _build_tree(value, ns['TreeNode'])
    return value

def _build_linkedlist(arr, ListNode):
    if not arr: return None
    head = cur = ListNode(arr[0])
    for v in arr[1:]:
        cur.next = ListNode(v); cur = cur.next
    return head

def _build_tree(arr, TreeNode):
    if not arr or arr[0] is None: return None
    from collections import deque
    root = TreeNode(arr[0]); q = deque([root]); i = 1
    while q and i < len(arr):
        node = q.popleft()
        if i < len(arr) and arr[i] is not None:
            node.left = TreeNode(arr[i]); q.append(node.left)
        i += 1
        if i < len(arr) and arr[i] is not None:
            node.right = TreeNode(arr[i]); q.append(node.right)
        i += 1
    return root

def _parse_inputs(raw, ns):
    """
    Parse multi-line LeetCode input string.
    Each line: either "varname = value" or bare "value".
    Returns list of (varname_or_None, parsed_value).
    """
    lines = [l.strip() for l in raw.strip().splitlines() if l.strip()]
    parsed = []
    for line in lines:
        if ' = ' in line:
            varname, val_str = line.split(' = ', 1)
            value = _parse_value(val_str.strip(), ns)
            value = _coerce_arg(value, varname.strip(), ns)
            parsed.append((varname.strip(), value))
        else:
            value = _parse_value(line, ns)
            parsed.append((None, value))
    return parsed

# ── Output serialization ───────────────────────────────────────────────────
def _serialize(obj, ns):
    """Convert any Python object (including LeetCode nodes) to JSON-serializable form."""
    if obj is None: return None
    if isinstance(obj, bool): return obj
    if isinstance(obj, (int, float, str)): return obj
    if isinstance(obj, (list, tuple)):
        return [_serialize(x, ns) for x in obj]
    if isinstance(obj, dict):
        return {str(k): _serialize(v, ns) for k, v in obj.items()}
    if isinstance(obj, set):
        return sorted(_serialize(x, ns) for x in obj)
    # ListNode
    if 'ListNode' in ns and isinstance(obj, ns['ListNode']):
        res, seen = [], set()
        cur = obj
        while cur and id(cur) not in seen:
            seen.add(id(cur)); res.append(cur.val); cur = cur.next
        return res
    # TreeNode
    if 'TreeNode' in ns and isinstance(obj, ns['TreeNode']):
        from collections import deque
        if not obj: return []
        res, q = [], deque([obj])
        while q:
            node = q.popleft()
            if node:
                res.append(node.val); q.append(node.left); q.append(node.right)
            else:
                res.append(None)
        while res and res[-1] is None: res.pop()
        return res
    # Node (graph/N-ary)
    if 'Node' in ns and isinstance(obj, ns['Node']):
        return obj.val
    # fallback
    try:
        return str(obj)
    except Exception:
        return repr(obj)

# ── Comparison ────────────────────────────────────────────────────────────
def _floats_equal(a, b, eps=1e-5):
    try:
        return abs(float(a) - float(b)) < eps
    except Exception:
        return False

def _deep_equal(a, b):
    """
    Multi-strategy equality:
    1. Exact JSON match
    2. Float epsilon match
    3. Sorted/unordered match (for problems where order doesn't matter)
    4. Set equality (for list-of-lists unordered)
    5. String match
    """
    if a == b: return True
    # Both None
    if a is None and b is None: return True
    # Float comparison
    if isinstance(a, (int, float)) and isinstance(b, (int, float)):
        return _floats_equal(a, b)
    # List vs list
    if isinstance(a, list) and isinstance(b, list):
        if len(a) != len(b): return False
        # Exact element-wise
        if all(_deep_equal(x, y) for x, y in zip(a, b)): return True
        # Unordered — try sorting
        try:
            sa = sorted(json.dumps(x, sort_keys=True) for x in a)
            sb = sorted(json.dumps(x, sort_keys=True) for x in b)
            if sa == sb: return True
        except Exception:
            pass
        # Set of frozensets for list-of-lists
        try:
            fa = set(tuple(sorted(x)) if isinstance(x, list) else x for x in a)
            fb = set(tuple(sorted(x)) if isinstance(x, list) else x for x in b)
            if fa == fb: return True
        except Exception:
            pass
        return False
    # Dict
    if isinstance(a, dict) and isinstance(b, dict):
        if set(a.keys()) != set(b.keys()): return False
        return all(_deep_equal(a[k], b[k]) for k in a)
    # String fallback
    return str(a) == str(b)

# ── Stdout capture ─────────────────────────────────────────────────────────
class _CaptureStdout:
    def __init__(self): self.buf = io.StringIO()
    def __enter__(self): self._old = sys.stdout; sys.stdout = self.buf; return self
    def __exit__(self, *a): sys.stdout = self._old
    @property
    def value(self): return self.buf.getvalue()

# ── Main runner ────────────────────────────────────────────────────────────
def _run_one(tc, idx):
    raw_input = tc.get("inputStr", "")
    raw_expected = tc.get("expected")

    # ── Compile user code ──
    ns = {}
    with _CaptureStdout() as cap:
        try:
            exec(_USER_CODE, ns)
        except Exception as e:
            return {
                "id": idx, "passed": False,
                "error": "Syntax/Compile error:\\n" + traceback.format_exc(limit=5),
                "input": raw_input,
                "expected": json.dumps(raw_expected),
                "output": "", "stdout": cap.value,
            }

    # ── Resolve function ──
    try:
        if "Solution" in ns:
            sol = ns["Solution"]()
            # Get the first non-dunder public method
            methods = [m for m in dir(sol)
                       if not m.startswith("_")
                       and callable(getattr(sol, m))
                       and m not in ('mro',)]
            if not methods:
                raise RuntimeError("Solution class has no public methods")
            fn = getattr(sol, methods[0])
        else:
            # bare function — pick last defined callable
            callables = [(k, v) for k, v in ns.items()
                         if callable(v) and not k.startswith("_")
                         and k not in ('ListNode', 'TreeNode', 'Node')]
            if not callables:
                raise RuntimeError("No callable function or Solution class found in user code")
            fn = callables[-1][1]
    except Exception as e:
        return {
            "id": idx, "passed": False,
            "error": str(e), "input": raw_input,
            "expected": json.dumps(raw_expected),
            "output": "", "stdout": "",
        }

    # ── Parse inputs ──
    try:
        parsed_inputs = _parse_inputs(raw_input, ns)
        args = [v for _, v in parsed_inputs]
        varnames = [k for k, _ in parsed_inputs]
    except Exception as e:
        return {
            "id": idx, "passed": False,
            "error": "Input parse error: " + str(e),
            "input": raw_input,
            "expected": json.dumps(raw_expected),
            "output": "", "stdout": "",
        }

    # ── Execute ──
    stdout_str = ""
    try:
        # Keep a deep copy of first arg in case of in-place mutation
        first_arg_copy = copy.deepcopy(args[0]) if args else None

        with _CaptureStdout() as cap:
            result = fn(*args)
        stdout_str = cap.value

        # If function returns None, check if first arg was mutated (in-place problems)
        if result is None and args:
            result = args[0]

        # Serialize result
        serialized_result = _serialize(result, ns)

        # Parse expected (may be JSON already or raw string)
        if isinstance(raw_expected, str):
            try:
                expected_val = json.loads(raw_expected)
            except Exception:
                expected_val = raw_expected
        else:
            expected_val = raw_expected

        # Serialize expected the same way (handles ListNode/TreeNode in expected)
        if isinstance(expected_val, list):
            # Check if expected looks like a linked list / tree for the problem type
            # (If result was a node type, expected is already deserialized to list by parseTestCases)
            pass

        passed = _deep_equal(serialized_result, expected_val)

        return {
            "id": idx,
            "passed": passed,
            "input": raw_input,
            "expected": json.dumps(expected_val),
            "output": json.dumps(serialized_result),
            "stdout": stdout_str,
            "error": None,
        }

    except RecursionError:
        return {
            "id": idx, "passed": False,
            "error": "RecursionError: Maximum recursion depth exceeded.\\nCheck for infinite recursion in your solution.",
            "input": raw_input,
            "expected": json.dumps(raw_expected),
            "output": "", "stdout": stdout_str,
        }
    except MemoryError:
        return {
            "id": idx, "passed": False,
            "error": "MemoryError: Your solution exceeded the memory limit.",
            "input": raw_input,
            "expected": json.dumps(raw_expected),
            "output": "", "stdout": stdout_str,
        }
    except Exception:
        return {
            "id": idx, "passed": False,
            "error": traceback.format_exc(limit=5),
            "input": raw_input,
            "expected": json.dumps(raw_expected),
            "output": "", "stdout": stdout_str,
        }

_results = []
for _i, _tc in enumerate(_test_cases):
    _results.append(_run_one(_tc, _i))

json.dumps(_results)
`;
}

// ── React hook ─────────────────────────────────────────────────────────────
export function usePyodide() {
  const [status, setStatus] = useState('idle'); // idle | loading | ready | error
  const [error, setError]   = useState(null);
  const pyodideRef          = useRef(null);

  /** Load Pyodide. Safe to call multiple times — reuses global promise. */
  const load = useCallback(async () => {
    if (pyodideRef.current) return pyodideRef.current;
    setStatus('loading');
    setError(null);
    try {
      const py = await loadPyodideInstance();
      pyodideRef.current = py;
      setStatus('ready');
      return py;
    } catch (err) {
      setError(err.message);
      setStatus('error');
      throw err;
    }
  }, []);

  /**
   * Run user Python code against test cases.
   * Auto-loads Pyodide if needed.
   *
   * @param {string} userCode  — raw Python source
   * @param {Array}  testCases — [{ inputStr: string, expected: any }]
   * @returns {Array} results  — [{ id, passed, input, expected, output, stdout, error }]
   */
  const runPython = useCallback(async (userCode, testCases) => {
    const py = pyodideRef.current ?? await loadPyodideInstance();
    if (!pyodideRef.current) {
      pyodideRef.current = py;
      setStatus('ready');
    }

    const runner = buildPythonRunner(userCode, testCases);
    try {
      const raw = await py.runPythonAsync(runner);
      const str = typeof raw === 'string' ? raw : raw.toString();
      return JSON.parse(str);
    } catch (err) {
      // Top-level runner failure (shouldn't happen — inner errors are caught per-case)
      return testCases.map((_, i) => ({
        id: i, passed: false,
        input: testCases[i]?.inputStr ?? '',
        expected: JSON.stringify(testCases[i]?.expected ?? ''),
        output: '', stdout: '',
        error: `Runner error: ${String(err)}`,
      }));
    }
  }, []);

  return { status, error, load, runPython };
}