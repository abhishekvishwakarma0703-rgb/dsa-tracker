import { useState, useEffect } from 'react';
import { titleToSlug } from '@/services/leetcodeService';
import apiClient from '@/services/apiClient'; // Import your central client

/**
 * Normalizes backend response to match CodeEditor expectations,
 * including user-specific draft and solution status.
 */
function normalizeBackendResponse(json) {
  return {
    title: json.title,
    slug: json.slug,
    difficulty: json.difficulty,
    contentHtml: json.raw_html || '',
    description: json.description || '',
    examples: json.examples || [],
    codeSnippets: json.code_snippets || [],
    exampleTestcases: json.example_testcases || '',
    topicTags: (json.tags || []).map(name => ({ name, slug: name.toLowerCase() })),
    link: `https://leetcode.com/problems/${json.slug}/`,
    
    // --- New User Specific Fields ---
    draftCode: json.draft_code || null,
    draftLang: json.draft_lang || 'python3',
    isDone: json.is_done || false,
    lastStatus: json.last_status || null,
    submissionCount: json.submission_count || 0,
    
    // Use draft if exists, otherwise fallback to starter code
    backendStarterCode: json.draft_code || json.starter_code || '',
  };
}

export function useLeetcodeBackend(problemTitle) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!problemTitle) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      const slug = titleToSlug(problemTitle);

      // ── 1. Try backend via apiClient ─────────────────────────────────────
      try {
        // apiClient.get handles the JWT token automatically
        const response = await apiClient.get(`/leetcode/${slug}`);
        
        if (!cancelled && response) {
          setData(normalizeBackendResponse(response));
          setLoading(false);
          return;
        }
      } catch (backendErr) {
        console.warn('[useLeetcodeBackend] Backend fetch failed, trying direct fallback:', backendErr.message);
      }

      // ── 2. Fallback: Direct LC Fetch (External API) ────────────────────────
      try {
        const { fetchLeetCodeProblem } = await import('@/services/leetcodeService');
        const result = await fetchLeetCodeProblem(problemTitle);
        
        if (!cancelled) {
          if (result) {
            setData({ ...result, backendStarterCode: '' });
          } else {
            setError('Problem not found');
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