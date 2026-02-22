/**
 * useLeetcodeBackend
 * ==================
 * Fetches LeetCode problem data via the backend cache endpoint.
 *
 * Primary:  GET /api/v1/leetcode/{slug}
 *   → Backend checks its DB; if miss, fetches from LC GraphQL, stores, returns.
 *
 * Fallback: uses existing fetchLeetCodeProblem() (direct alfa-leetcode-api)
 *   → Used when the backend is unreachable (e.g. local dev without backend).
 *
 * Returns the same shape as useLeetcodeData so CodeEditor can swap the import
 * with minimal changes.
 */

import { useState, useEffect } from 'react';
import { titleToSlug } from '@/services/leetcodeService';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

/**
 * Convert a backend LeetCodeCache record into the shape that CodeEditor expects
 * (same shape as the object returned by fetchLeetCodeProblem).
 */
function normalizeBackendResponse(json) {
  return {
    title:             json.title,
    slug:              json.slug,
    difficulty:        json.difficulty,
    // CodeEditor reads contentHtml for ProblemDescription
    contentHtml:       json.raw_html    || '',
    description:       json.description || '',
    examples:          json.examples    || [],
    codeSnippets:      json.code_snippets || [],
    exampleTestcases:  json.example_testcases || '',
    topicTags:         (json.tags || []).map(name => ({ name, slug: name.toLowerCase() })),
    hints:             [],
    link:              `https://leetcode.com/problems/${json.slug}/`,
    // Extra convenience — python3 starter already extracted by backend
    backendStarterCode: json.starter_code || '',
  };
}

export function useLeetcodeBackend(problemTitle) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    if (!problemTitle) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      const slug = titleToSlug(problemTitle);

      // ── 1. Try backend cache ──────────────────────────────────────────────
      try {
        const res = await fetch(`${API_BASE}/leetcode/${slug}`, {
          signal: AbortSignal.timeout(14_000),
        });
        if (res.ok) {
          const json = await res.json();
          if (!cancelled && json?.title) {
            setData(normalizeBackendResponse(json));
            setLoading(false);
            return;
          }
        }
      } catch (backendErr) {
        // Backend unavailable — fall through to direct fetch
        console.warn('[useLeetcodeBackend] backend unavailable, using direct LC fetch:', backendErr.message);
      }

      // ── 2. Fallback: direct alfa-leetcode-api (same as before) ───────────
      try {
        const { fetchLeetCodeProblem } = await import('@/services/leetcodeService');
        const result = await fetchLeetCodeProblem(problemTitle);
        if (!cancelled) {
          if (result) {
            setData({ ...result, backendStarterCode: '' });
          } else {
            setError('Could not fetch problem from LeetCode');
          }
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

  return { data, loading, error };
}
