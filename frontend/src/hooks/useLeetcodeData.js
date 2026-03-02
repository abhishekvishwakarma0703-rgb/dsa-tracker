/**
 * useLeetcodeData hook
 * Fetches and caches real LeetCode problem data (description, starter code, examples)
 */
import { useState, useEffect } from 'react';
import {
  fetchLeetCodeProblem,
  parseTestCases,
  getStarterCode,
} from '@/services/leetcodeService';

export function useLeetcodeData(problemTitle, language = 'python3') {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!problemTitle) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const result = await fetchLeetCodeProblem(problemTitle);
        if (!cancelled) {
          setData(result);
          setError(result ? null : 'Could not fetch problem from LeetCode');
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [problemTitle]);

  // Derived helpers
  const starterCode = data ? getStarterCode(data.codeSnippets, language) : null;
  const testCases = data ? parseTestCases(data.exampleTestcases, data.examples) : [];

  return { data, loading, error, starterCode, testCases };
}
