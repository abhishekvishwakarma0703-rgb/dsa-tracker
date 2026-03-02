import { useState, useRef, useCallback } from 'react';

const PYODIDE_CDN = 'https://cdn.jsdelivr.net/pyodide/v0.25.1/full/pyodide.js';

let globalPyodide = null;
let loadingPromise = null;

async function loadPyodideInstance() {
  if (globalPyodide) return globalPyodide;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    try {
      if (!window.loadPyodide) {
        await new Promise((res, rej) => {
          const existing = document.querySelector(`script[src="${PYODIDE_CDN}"]`);
          if (existing) existing.remove();
          const script = document.createElement('script');
          script.src = PYODIDE_CDN;
          script.onload = res;
          script.onerror = () => rej(new Error('Failed to load Pyodide CDN. Check your internet connection.'));
          document.head.appendChild(script);
        });
      }

      const pyodide = await window.loadPyodide({
        indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.25.1/full/',
        stdout: (text) => console.log('Python stdout:', text),
        stderr: (text) => console.error('Python stderr:', text),
      });

      globalPyodide = pyodide;
      return pyodide;
    } catch (err) {
      loadingPromise = null;
      globalPyodide = null;
      throw err;
    }
  })();

  return loadingPromise;
}

export function usePyodide() {
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const pyodideRef = useRef(null);

  const load = useCallback(async () => {
    if (pyodideRef.current) return;
    if (status === 'loading') return;

    setStatus('loading');
    setError(null);

    try {
      const py = await loadPyodideInstance();
      pyodideRef.current = py;
      setStatus('ready');
    } catch (err) {
      pyodideRef.current = null;
      setError(err.message);
      setStatus('error');
    }
  }, [status]);

  const runPython = useCallback(async (userCode, testCases) => {
    if (!pyodideRef.current) {
      await load();
      if (!pyodideRef.current) {
        return [{
          id: 0,
          passed: false,
          error: 'Python runtime failed to load. Click "Retry" to try again.',
        }];
      }
    }

    const py = pyodideRef.current;

    try {
      py.globals.set('_user_code', userCode);
      py.globals.set('_test_cases_json', JSON.stringify(testCases));

      const wrapperScript = `
import json, traceback, sys, types, re

def parse_input(raw):
    """
    Handles all LeetCode input formats:
      1. "nums = [2,7,11,15], target = 9"   (comma-separated assignments, one line)
      2. "nums = [2,7,11,15]\\ntarget = 9"  (newline-separated assignments)
      3. "[2,7,11,15]\\n9"                  (raw values, one per line)
      4. "[2,7,11,15]"                       (single raw value)
    """
    raw = raw.strip()

    # Detect assignment format: contains "identifier ="
    if re.search(r'[a-zA-Z_]\\w*\\s*=', raw):
        # Split on ", key =" or "\\n" boundaries
        # Replace ", varname =" with "\\n" so we can split uniformly
        normalized = re.sub(r',\\s*(?=[a-zA-Z_]\\w*\\s*=)', '\\n', raw)
        parts = [p.strip() for p in normalized.split('\\n') if p.strip()]
        args = []
        for part in parts:
            # Strip "varname = " prefix
            value = re.sub(r'^[a-zA-Z_]\\w*\\s*=\\s*', '', part).strip()
            try:
                args.append(json.loads(value))
            except json.JSONDecodeError:
                args.append(value)
        return args
    else:
        # Raw format: one value per line
        lines = [l.strip() for l in raw.split('\\n') if l.strip()]
        args = []
        for line in lines:
            try:
                args.append(json.loads(line))
            except json.JSONDecodeError:
                args.append(line)
        return args

def _run_suite():
    test_cases = json.loads(_test_cases_json)
    results = []

    base_ns = {}
    exec("""
from typing import List, Dict, Tuple, Set, Optional, Union, Any
from collections import defaultdict, Counter, deque, OrderedDict
from functools import lru_cache, cache
from itertools import product, permutations, combinations
import heapq, math, bisect, sys
""", base_ns)

    for i, tc in enumerate(test_cases):
        ns = dict(base_ns)
        try:
            exec(_user_code, ns)

            if "Solution" in ns:
                inst = ns["Solution"]()
                methods = [
                    m for m in vars(ns["Solution"])
                    if not m.startswith("_") and callable(getattr(inst, m))
                ]
                if not methods:
                    raise Exception("Solution class has no public methods.")
                fn = getattr(inst, methods[0])
            else:
                user_fns = [
                    v for k, v in ns.items()
                    if isinstance(v, types.FunctionType) and not k.startswith("_")
                ]
                if not user_fns:
                    raise Exception("No function found. Define a function or Solution class.")
                fn = user_fns[-1]

            raw_input = tc.get("inputStr", "")
            args = parse_input(raw_input)
            output = fn(*args)

            expected = tc.get("expected")
            passed = json.dumps(output, sort_keys=True) == json.dumps(expected, sort_keys=True)

            results.append({
                "id": i,
                "input": raw_input,
                "output": json.dumps(output),
                "expected": json.dumps(expected),
                "passed": passed,
                "error": None
            })

        except Exception:
            results.append({
                "id": i,
                "input": tc.get("inputStr", ""),
                "output": "",
                "expected": json.dumps(tc.get("expected")),
                "passed": False,
                "error": traceback.format_exc(limit=3)
            })

    return json.dumps(results)

_run_suite()
      `;

      const jsonResult = await py.runPythonAsync(wrapperScript);
      return JSON.parse(jsonResult);

    } catch (err) {
      return [{
        id: 0,
        passed: false,
        error: `System Error: ${err.message}`,
      }];
    }
  }, [load]);

  return { status, error, load, runPython };
}