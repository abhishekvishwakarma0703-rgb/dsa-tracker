/**
 * Problems Context
 * Manages global state for DSA problems, user progress, and revisions
 * Categorization is driven entirely by the backend response (category, section_id fields)
 */

import { createContext, useCallback, useState, useEffect, useContext } from 'react';
import apiClient from '@/services/apiClient';

export const ProblemsContext = createContext(null);

/**
 * Builds a section map from a flat array of problems returned by the backend.
 * Relies solely on each problem's `category` and `section_id` fields.
 */
function buildSectionMap(data) {
  const sectionMap = {};

  data.forEach((problem) => {
    const sectionId = problem.section_id || problem.category || 'uncategorized';
    const sectionName = problem.category || 'Uncategorized';

    if (!sectionMap[sectionId]) {
      sectionMap[sectionId] = {
        id: sectionId,
        name: sectionName,
        category: sectionName,
        problems: []
      };
    }

    sectionMap[sectionId].problems.push({
      ...problem,
      // Map backend 'notes' to 'insights' for UI compatibility
      insights: problem.notes || problem.insights || [],
      done: typeof problem.done === 'boolean' ? problem.done
        : (typeof problem.is_done === 'boolean' ? problem.is_done : false),
      revision: typeof problem.revision === 'boolean' ? problem.revision
        : (typeof problem.is_revision === 'boolean' ? problem.is_revision : false)
    });
  });

  return sectionMap;
}

/**
 * ProblemsProvider Component
 * Provides problems state and actions to the entire app
 */
export function ProblemsProvider({ children }) {
  const [problems, setProblems] = useState([]);
  const [filters, setFilters] = useState({
    difficulty: 'All',
    status: 'All',
    category: 'All',
    searchTerm: ''
  });
  const [selectedProblem, setSelectedProblem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch problems from backend API on mount
  useEffect(() => {
    async function fetchProblems() {
      setLoading(true);
      setError(null);
      try {
        const data = await apiClient.getProblems({});
        setProblems(Object.values(buildSectionMap(data)));
      } catch (err) {
        setError(err.message || 'Failed to load problems');
      } finally {
        setLoading(false);
      }
    }
    fetchProblems();
  }, []);

  // Helper to refetch and sync state
  const refetchProblems = useCallback(async () => {
    const data = await apiClient.getProblems();
    setProblems(Object.values(buildSectionMap(data)));
  }, []);

  // Helper to find a problem by id
  const getProblemById = useCallback((problemId) => {
    for (const section of problems) {
      const found = section.problems.find((p) => p.id === problemId);
      if (found) return found;
    }
    return null;
  }, [problems]);

  // Placeholder userId (should be dynamic in real app)
  const userId = 'demo-user';

  // Toggle problem as done (API)
  const toggleDone = useCallback(async (sectionId, problemId) => {
    try {
      await apiClient.markProblemDone(problemId, userId);
      await refetchProblems();
    } catch (err) {
      setError(err.message || 'Failed to update problem status');
    }
  }, [refetchProblems]);

  // Toggle problem for revision (API: mark-reviewed)
  const toggleRevision = useCallback(async (sectionId, problemId) => {
    try {
      await apiClient.markProblemReviewed(problemId, userId);
      await refetchProblems();
    } catch (err) {
      setError(err.message || 'Failed to update problem status');
    }
  }, [refetchProblems]);

  // Add insight (API)
  const addInsight = useCallback(async (sectionId, problemId, text) => {
    try {
      await apiClient.createInsight(problemId, text, 'note', userId);
      await refetchProblems();
    } catch (err) {
      setError(err.message || 'Failed to add insight');
    }
  }, [refetchProblems]);

  // Remove insight (API)
  const removeInsight = useCallback(async (sectionId, problemId, insightId) => {
    try {
      await apiClient.deleteInsight(insightId);
      await refetchProblems();
    } catch (err) {
      setError(err.message || 'Failed to remove insight');
    }
  }, [refetchProblems]);

  // Add tag to problem (API: addTagToProblem)
  const addTag = useCallback(async (sectionId, problemId, tagNameOrId) => {
    try {
      let tagId = null;
      const tags = await apiClient.getTags();
      const existing = tags.find(t => t.name === tagNameOrId);
      if (existing) {
        tagId = existing.id;
      } else {
        try {
          const newTag = await apiClient.createTag({ name: tagNameOrId });
          tagId = newTag.id;
        } catch (err) {
          // If duplicate error, reuse existing tag
          if (err.message && err.message.toLowerCase().includes('unique constraint')) {
            const tagsAfter = await apiClient.getTags();
            const fallback = tagsAfter.find(t => t.name === tagNameOrId);
            if (fallback) tagId = fallback.id;
          } else {
            throw err;
          }
        }
      }
      if (tagId) {
        await apiClient.addTagToProblem(problemId, tagId);
        await refetchProblems();
      } else {
        setError('Failed to add tag: could not resolve tag id');
      }
    } catch (err) {
      setError(err.message || 'Failed to add tag');
    }
  }, [refetchProblems]);

  // Remove tag from problem (API: removeTagFromProblem)
  const removeTag = useCallback(async (sectionId, problemId, tagNameOrId) => {
    try {
      // Find tag by name
      const tags = await apiClient.getTags();
      const tag = tags.find(t => t.name === tagNameOrId || t.id === tagNameOrId);
      if (!tag) throw new Error('Tag not found');
      await apiClient.removeTagFromProblem(problemId, tag.id);
      await refetchProblems();
    } catch (err) {
      setError(err.message || 'Failed to remove tag');
    }
  }, [refetchProblems]);

  // Edit insight (API: updateInsight)
  const editInsight = useCallback(async (insightId, insightData) => {
    try {
      await apiClient.updateInsight(insightId, insightData);
      await refetchProblems();
    } catch (err) {
      setError(err.message || 'Failed to edit insight');
    }
  }, [refetchProblems]);

  // Update tag (API: updateTag)
  const updateTag = useCallback(async (tagId, name) => {
    try {
      await apiClient.updateTag(tagId, { name });
      await refetchProblems();
    } catch (err) {
      setError(err.message || 'Failed to update tag');
    }
  }, [refetchProblems]);

  // Update insight (API: updateInsight)
  const updateInsight = useCallback(async (sectionId, problemId, insightId, text) => {
    try {
      await apiClient.updateInsight(insightId, { text });
      await refetchProblems();
    } catch (err) {
      setError(err.message || 'Failed to update insight');
    }
  }, [refetchProblems]);

  // Get filtered problems based on current filters
  const getFilteredProblems = useCallback(() => {
    const allProblems = [];
    problems.forEach((section) => {
      section.problems.forEach((problem) => {
        allProblems.push({ ...problem, sectionId: section.id });
      });
    });

    return allProblems.filter((problem) => {
      if (filters.difficulty !== 'All' && problem.difficulty !== filters.difficulty) return false;

      if (filters.status !== 'All') {
        if (filters.status === 'Done' && !problem.done) return false;
        if (filters.status === 'Revision' && !problem.revision) return false;
        if (filters.status === 'Pending' && (problem.done || problem.revision)) return false;
      }

      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        if (!problem.title.toLowerCase().includes(searchLower)) return false;
      }

      return true;
    });
  }, [problems, filters]);

  // Get section statistics
  const getSectionStats = useCallback((sectionId) => {
    const section = problems.find((s) => s.id === sectionId);
    if (!section) return { total: 0, done: 0, revision: 0 };
    return {
      total: section.problems.length,
      done: section.problems.filter((p) => p.done).length,
      revision: section.problems.filter((p) => p.revision).length
    };
  }, [problems]);

  // Get overall statistics
  const getOverallStats = useCallback(() => {
    let total = 0, done = 0, revision = 0;
    problems.forEach((section) => {
      total += section.problems.length;
      done += section.problems.filter((p) => p.done).length;
      revision += section.problems.filter((p) => p.revision).length;
    });
    return { total, done, revision };
  }, [problems]);

  const value = {
    problems,
    filters,
    selectedProblem,
    loading,
    error,
    setFilters,
    setSelectedProblem,
    getSectionStats,
    getOverallStats,
    getFilteredProblems,
    getProblemById,
    toggleDone,
    toggleRevision,
    addInsight,
    removeInsight,
    addTag,
    removeTag,
    updateTag,
    updateInsight,
  };

  return <ProblemsContext.Provider value={value}>{children}</ProblemsContext.Provider>;
}

/**
 * Hook to use Problems Context
 */
export function useProblems() {
  const context = useContext(ProblemsContext);
  if (!context) {
    throw new Error('useProblems must be used within ProblemsProvider');
  }
  return context;
}