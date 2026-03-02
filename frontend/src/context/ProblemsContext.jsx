/**
 * Problems Context — uses real user.id from JWT auth, zero hardcoded user IDs.
 */

import { createContext, useCallback, useState, useEffect, useContext } from 'react';
import api from '@/services/apiClient';

export const ProblemsContext = createContext(null);

function buildSectionMap(data) {
  const map = {};
  data.forEach((problem) => {
    const sid  = problem.section_id || problem.category || 'uncategorized';
    const name = problem.category    || 'Uncategorized';
    if (!map[sid]) map[sid] = { id: sid, name, category: name, problems: [] };
    map[sid].problems.push({
      ...problem,
      insights:  problem.notes || problem.insights || [],
      done:      typeof problem.done === 'boolean'     ? problem.done     : !!problem.is_done,
      revision:  typeof problem.revision === 'boolean' ? problem.revision : !!problem.is_revision,
    });
  });
  return map;
}

export function ProblemsProvider({ children }) {
  const [problems,        setProblems]        = useState([]);
  const [filters,         setFilters]         = useState({ difficulty: 'All', status: 'All', category: 'All', searchTerm: '' });
  const [selectedProblem, setSelectedProblem] = useState(null);
  const [loading,         setLoading]         = useState(true);
  const [error,           setError]           = useState(null);

  const refetchProblems = useCallback(async () => {
    const data = await api.getProblems();
    setProblems(Object.values(buildSectionMap(data)));
  }, []);

  useEffect(() => {
    async function init() {
      setLoading(true);
      setError(null);
      try {
        await refetchProblems();
      } catch (e) {
        setError(e.message || 'Failed to load problems');
      } finally {
        setLoading(false);
      }
    }
    // Only fetch if authenticated
    if (api.isAuthenticated()) init();
    else setLoading(false);
  }, []);

  // ── Actions (all use JWT token — no userId needed) ──────────────────────────

  const deleteProblem = useCallback(async (sectionId, problemId) => {
    await api.deleteProblem(problemId);
    setProblems(prev => prev.map(s =>
      s.id === sectionId ? { ...s, problems: s.problems.filter(p => p.id !== problemId) } : s
    ));
  }, []);

  const toggleDone = useCallback(async (sectionId, problemId) => {
    try {
      await api.markProblemDone(problemId);
      await refetchProblems();
    } catch (e) { setError(e.message); }
  }, [refetchProblems]);

  const toggleRevision = useCallback(async (sectionId, problemId) => {
    try {
      await api.markProblemReviewed(problemId);
      await refetchProblems();
    } catch (e) { setError(e.message); }
  }, [refetchProblems]);

  const addInsight = useCallback(async (sectionId, problemId, text) => {
    try {
      await api.createInsight(problemId, text, 'note');
      await refetchProblems();
    } catch (e) { setError(e.message); }
  }, [refetchProblems]);

  const removeInsight = useCallback(async (sectionId, problemId, insightId) => {
    try {
      await api.deleteInsight(insightId);
      await refetchProblems();
    } catch (e) { setError(e.message); }
  }, [refetchProblems]);

  const editInsight = useCallback(async (insightId, data) => {
    try {
      await api.updateInsight(insightId, data);
      await refetchProblems();
    } catch (e) { setError(e.message); }
  }, [refetchProblems]);

  const updateInsight = useCallback(async (sectionId, problemId, insightId, text) => {
    try {
      await api.updateInsight(insightId, { text });
      await refetchProblems();
    } catch (e) { setError(e.message); }
  }, [refetchProblems]);

  const addTag = useCallback(async (sectionId, problemId, tagNameOrId) => {
    try {
      const tags = await api.getTags();
      let tagId  = tags.find(t => t.name === tagNameOrId)?.id;
      if (!tagId) {
        try {
          const newTag = await api.createTag({ name: tagNameOrId });
          tagId = newTag.id;
        } catch {
          const updated = await api.getTags();
          tagId = updated.find(t => t.name === tagNameOrId)?.id;
        }
      }
      if (tagId) { await api.addTagToProblem(problemId, tagId); await refetchProblems(); }
    } catch (e) { setError(e.message); }
  }, [refetchProblems]);

  const removeTag = useCallback(async (sectionId, problemId, tagNameOrId) => {
    try {
      const tags = await api.getTags();
      const tag  = tags.find(t => t.name === tagNameOrId || t.id === tagNameOrId);
      if (!tag) throw new Error('Tag not found');
      await api.removeTagFromProblem(problemId, tag.id);
      await refetchProblems();
    } catch (e) { setError(e.message); }
  }, [refetchProblems]);

  const updateTag = useCallback(async (tagId, name) => {
    try {
      await api.updateTag(tagId, { name });
      await refetchProblems();
    } catch (e) { setError(e.message); }
  }, [refetchProblems]);

  const getProblemById = useCallback((id) => {
    for (const s of problems) {
      const f = s.problems.find(p => p.id === id);
      if (f) return f;
    }
    return null;
  }, [problems]);

  const getSectionStats = useCallback((sectionId) => {
    const s = problems.find(s => s.id === sectionId);
    if (!s) return { total: 0, done: 0, revision: 0 };
    return { total: s.problems.length, done: s.problems.filter(p => p.done).length, revision: s.problems.filter(p => p.revision).length };
  }, [problems]);

  const getOverallStats = useCallback(() => {
    let total = 0, done = 0, revision = 0;
    problems.forEach(s => {
      total    += s.problems.length;
      done     += s.problems.filter(p => p.done).length;
      revision += s.problems.filter(p => p.revision).length;
    });
    return { total, done, revision };
  }, [problems]);

  const getFilteredProblems = useCallback(() => {
    return problems.flatMap(s => s.problems.map(p => ({ ...p, sectionId: s.id }))).filter(p => {
      if (filters.difficulty !== 'All' && p.difficulty !== filters.difficulty) return false;
      if (filters.status !== 'All') {
        if (filters.status === 'Done'     && !p.done)              return false;
        if (filters.status === 'Revision' && !p.revision)          return false;
        if (filters.status === 'Pending'  && (p.done || p.revision)) return false;
      }
      if (filters.searchTerm && !p.title.toLowerCase().includes(filters.searchTerm.toLowerCase())) return false;
      return true;
    });
  }, [problems, filters]);

  return (
    <ProblemsContext.Provider value={{
      problems, filters, selectedProblem, loading, error,
      setFilters, setSelectedProblem, refetchProblems,
      getSectionStats, getOverallStats, getFilteredProblems, getProblemById,
      toggleDone, toggleRevision,
      addInsight, removeInsight, editInsight, updateInsight,
      addTag, removeTag, updateTag,
      deleteProblem,
    }}>
      {children}
    </ProblemsContext.Provider>
  );
}

export function useProblems() {
  const ctx = useContext(ProblemsContext);
  if (!ctx) throw new Error('useProblems must be used within ProblemsProvider');
  return ctx;
}
