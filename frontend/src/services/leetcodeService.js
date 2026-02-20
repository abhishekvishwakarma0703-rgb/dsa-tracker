import apiClient from "./apiClient";

/**
 * LeetCode Service
 * Fetches real problem descriptions, starter code, and examples
 */

// In-memory cache to avoid redundant fetches
const cache = new Map();

/**
 * Convert a problem title to a LeetCode slug
 * "Two Sum" -> "two-sum"
 * "3Sum" -> "3sum"
 */
export function titleToSlug(title) {
  if (!title) return '';
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

/**
 * Parse example test cases from raw LeetCode content HTML
 * Returns array of { input: string, output: string, explanation: string }
 */
export function parseExamplesFromHtml(html) {
  if (!html) return [];
  const examples = [];

  // LeetCode wraps examples in <pre> tags
  const preMatches = html.matchAll(/<pre>([\s\S]*?)<\/pre>/gi);
  for (const m of preMatches) {
    const text = m[1].replace(/<[^>]+>/g, '').trim();
    const inputMatch = text.match(/Input:\s*([\s\S]*?)(?=Output:|$)/i);
    const outputMatch = text.match(/Output:\s*([\s\S]*?)(?=Explanation:|$)/i);
    const explanationMatch = text.match(/Explanation:\s*([\s\S]*?)$/i);
    if (inputMatch || outputMatch) {
      examples.push({
        input: inputMatch ? inputMatch[1].trim() : '',
        output: outputMatch ? outputMatch[1].trim() : '',
        explanation: explanationMatch ? explanationMatch[1].trim() : '',
      });
    }
  }
  return examples;
}

/**
 * Get the starter code for a given language from codeSnippets array
 */
export function getStarterCode(codeSnippets = [], lang = 'python3') {
  const langMap = {
    python: 'python3',
    python3: 'python3',
    javascript: 'javascript',
    java: 'java',
    cpp: 'cpp',
    c: 'c',
  };
  const target = langMap[lang] || lang;
  const snippet = codeSnippets.find(
    (s) => s.langSlug === target || s.lang?.toLowerCase() === target
  );
  return snippet?.code || null;
}

/**
 * Main export: fetch LeetCode problem data by problem title
 * Returns null on failure (graceful degradation)
 */
export async function fetchLeetCodeProblem(problemTitle, titleSlug) {
  const cacheKey = problemTitle?.toLowerCase().trim();
  if (!cacheKey) return null;
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  try {
    const data = await apiClient.getLeetcodePublicProblem(titleSlug);

    const result = {
      title: data.title,
      slug: titleSlug,
      difficulty: data.difficulty,
      contentHtml: data.description_html || '',                       // ✅ was data.content
      examples: parseExamplesFromHtml(data.description_html || ''),  // ✅ was data.content
      codeSnippets: data.code_snippets || [],                        // ✅ snake_case from API
      exampleTestcases: data.example_testcases || '',                // ✅ was data.exampleTestcases
      constraints: data.constraints || '',
      topicTags: data.tags || [],                                     // ✅ was data.topicTags
      hints: data.hints || [],
      link: `https://leetcode.com/problems/${titleSlug}/`,           // ✅ was undefined `slug`
    };

    cache.set(cacheKey, result);
    return result;
  } catch (e) {
    console.error("fetchLeetCodeProblem error:", e);
  }

  // Fetch failed
  cache.set(cacheKey, null);
  return null;
}

/**
 * Parse exampleTestcases string into structured test cases
 * LeetCode format: inputs separated by newlines, one test per group
 */
export function parseTestCases(exampleTestcases = '', examples = []) {
  const testCases = [];

  // Build from parsed examples (best quality)
  for (const ex of examples) {
    try {
      const inputStr = ex.input;
      const outputStr = ex.output;

      // Try to parse output as JSON
      let expected;
      try { expected = JSON.parse(outputStr); } catch { expected = outputStr; }

      testCases.push({ inputStr, expected, explanation: ex.explanation });
    } catch {
      // skip malformed
    }
  }

  return testCases;
}