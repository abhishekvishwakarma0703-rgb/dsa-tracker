import { useState, useEffect } from 'react';
import {
  fetchLeetCodeProblem,
  parseTestCases,
  getStarterCode,
} from '@/services/leetcodeService';

export function useLeetcodeData(title, titleSlug, language = 'python3') {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!titleSlug) return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const result = await fetchLeetCodeProblem(title, titleSlug);
        if (!cancelled) {
          setData(result);
          if (!result) {
            setError('Could not fetch problem from LeetCode');
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Failed to fetch problem');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [titleSlug]);

  // ✅ Use normalized field names from the service result
  const starterCode = data
    ? getStarterCode(data.codeSnippets, language)
    : null;

  // ✅ Pass both args — examples is the primary source, exampleTestcases is fallback
  const testCases = data
    ? parseTestCases(data.exampleTestcases, data.examples)
    : [];

  return { data, loading, error, starterCode, testCases };
}