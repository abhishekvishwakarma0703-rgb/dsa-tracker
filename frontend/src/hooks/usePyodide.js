/**
 * usePyodide hook
 * Lazily loads Pyodide (Python in WebAssembly) from CDN.
 * No installation needed - runs Python entirely in the browser.
 */
import { useState, useEffect, useRef, useCallback } from 'react';

const PYODIDE_CDN = 'https://cdn.jsdelivr.net/pyodide/v0.25.1/full/pyodide.js';

let globalPyodide = null;
let loadingPromise = null;

async function loadPyodideInstance() {
  if (globalPyodide) return globalPyodide;
  if (loadingPromise) return loadingPromise;

  loadingPromise = new Promise(async (resolve, reject) => {
    try {
      // Inject script tag if not already present
      if (!window.loadPyodide) {
        await new Promise((res, rej) => {
          const script = document.createElement('script');
          script.src = PYODIDE_CDN;
          script.onload = res;
          script.onerror = () => rej(new Error('Failed to load Pyodide from CDN'));
          document.head.appendChild(script);
        });
      }

      // Load with stdout/stderr capture
      const pyodide = await window.loadPyodide({
        stdout: () => {},
        stderr: () => {},
      });

      globalPyodide = pyodide;
      resolve(pyodide);
    } catch (err) {
      loadingPromise = null;
      reject(err);
    }
  });

  return loadingPromise;
}

/**
 * The Python test runner template.
 * We inject user code + test cases, then capture results as JSON.
 *
 * Strategy:
 *  1. Execute the user's code in namespace
 *  2. Detect either a `Solution` class (LeetCode style) or a bare function
 *  3. Call it with each test case input
 *  4. Return structured results
 */
function buildPythonRunner(userCode, testCases) {
  const testCasesJson = JSON.stringify(testCases);
  // Escape backticks / triple quotes in userCode
  const safeCode = userCode.replace(/\\/g, '\\\\').replace(/"""/g, '\\"\\"\\"');

  return `
import json, sys, traceback, inspect

_user_code = """
${safeCode}
"""

_results = []
_test_cases = ${testCasesJson}

def _run_one(tc, idx):
    ns = {}
    try:
        exec(_user_code, ns)
    except Exception as e:
        return {
            "id": idx, "passed": False,
            "error": "Compilation error: " + str(e),
            "input": str(tc.get("inputStr", "")),
            "expected": str(tc.get("expected", "")),
            "output": ""
        }

    try:
        # Prefer Solution class (LeetCode style)
        if "Solution" in ns:
            sol = ns["Solution"]()
            methods = [m for m in dir(sol) if not m.startswith("_") and callable(getattr(sol, m))]
            if not methods:
                raise RuntimeError("Solution class has no public methods")
            fn = getattr(sol, methods[0])
        else:
            # Find last defined callable (user's function)
            callables = [(k, v) for k, v in ns.items()
                         if callable(v) and not k.startswith("_")]
            if not callables:
                raise RuntimeError("No function or class found")
            fn = callables[-1][1]

        # Build args from inputStr
        raw = tc.get("inputStr", "")
        # Parse each line as a separate argument (LeetCode multi-line input format)
        lines = [l.strip() for l in raw.strip().splitlines() if l.strip()]
        args = []
        for line in lines:
            try:
                args.append(json.loads(line))
            except Exception:
                args.append(line)

        # Call the function
        result = fn(*args)

        # Compare with expected
        expected = tc.get("expected")
        try:
            passed = json.dumps(result, sort_keys=True) == json.dumps(expected, sort_keys=True)
        except Exception:
            passed = str(result) == str(expected)

        return {
            "id": idx,
            "input": raw,
            "expected": json.dumps(expected),
            "output": json.dumps(result),
            "passed": passed,
            "error": None
        }
    except Exception as e:
        return {
            "id": idx,
            "input": str(tc.get("inputStr", "")),
            "expected": str(tc.get("expected", "")),
            "output": "",
            "passed": False,
            "error": traceback.format_exc(limit=3)
        }

for _i, _tc in enumerate(_test_cases):
    _results.append(_run_one(_tc, _i))

json.dumps(_results)
`;
}

export function usePyodide() {
  const [status, setStatus] = useState('idle'); // idle | loading | ready | error
  const [error, setError] = useState(null);
  const pyodideRef = useRef(null);

  // Pre-load Pyodide when user hovers over Run or selects Python
  const load = useCallback(async () => {
    if (pyodideRef.current || status === 'loading') return;
    setStatus('loading');
    setError(null);
    try {
      const py = await loadPyodideInstance();
      pyodideRef.current = py;
      setStatus('ready');
    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  }, [status]);

  /**
   * Run Python code against test cases
   * testCases: Array<{ inputStr: string, expected: any }>
   */
  const runPython = useCallback(async (userCode, testCases) => {
    if (!pyodideRef.current) throw new Error('Pyodide not loaded');

    const runner = buildPythonRunner(userCode, testCases);
    try {
      const output = await pyodideRef.current.runPythonAsync(runner);
      return JSON.parse(output);
    } catch (err) {
      // Return a single error result
      return [{
        id: 0, passed: false,
        input: '', expected: '', output: '',
        error: String(err),
      }];
    }
  }, []);

  return { status, error, load, runPython };
}
