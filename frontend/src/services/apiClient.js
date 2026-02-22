 
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

class APIClient {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.timeout = 30000; // 30 seconds
  }
 // ========== TAGS ENDPOINTS ===========

  /**
   * Get all tags
   * GET /tags
   */
  async getTags() {
    return this.fetch('/tags/');
  }

  /**
   * Get a tag by ID
   * GET /tags/{id}
   */
  async getTag(tagId) {
    return this.fetch(`/tags/${tagId}/`);
  }

  /**
   * Create a new tag
   * POST /tags
   */
  async createTag(tagData) {
    return this.fetch('/tags/', {
      method: 'POST',
      body: JSON.stringify(tagData),
    });
  }

  /**
   * Update a tag
   * PUT /tags/{id}
   */
  async updateTag(tagId, tagData) {
    return this.fetch(`/tags/${tagId}/`, {
      method: 'PUT',
      body: JSON.stringify(tagData),
    });
  }

  /**
   * Delete a tag
   * DELETE /tags/{id}
   */
  async deleteTag(tagId) {
    return this.fetch(`/tags/${tagId}/`, {
      method: 'DELETE',
    });
  }

  /**
   * Add a tag to a problem
   * POST /problems/{problem_id}/tags (tag_id in body)
   */
  async addTagToProblem(problemId, tagId) {
    return this.fetch(`/problems/${problemId}/tags`, {
      method: 'POST',
      body: JSON.stringify({ tag_id: tagId }),
    });
  }

  /**
   * Remove a tag from a problem
   * DELETE /problems/{problem_id}/tags/{tag_id}
   */
  async removeTagFromProblem(problemId, tagId) {
    return this.fetch(`/problems/${problemId}/tags/${tagId}`, {
      method: 'DELETE',
    });
  }
/**
 * API Client Service
 * Handles all communication with the FastAPI backend
 */

  /**
   * Generic fetch wrapper with error handling
   */
  async fetch(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    
    try {
      const response = await Promise.race([
        fetch(url, {
          headers: {
            'Content-Type': 'application/json',
            ...options.headers,
          },
          ...options,
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout')), this.timeout)
        ),
      ]);

      if (!response.ok) {
        let errorDetail = 'API Error';
        try {
          const error = await response.json();
          errorDetail = error.detail || error.message || errorDetail;
        } catch (e) {
          errorDetail = `HTTP ${response.status}`;
        }
        throw new Error(errorDetail);
      }

      return await response.json();
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error);
      throw error;
    }
  }

  // ========== PROBLEMS ENDPOINTS ==========

  /**
   * Get all problems with optional filters
   * GET /problems
   */
  async getProblems(filters = {}) {
    const params = new URLSearchParams();
    
    if (filters.difficulty) params.append('difficulty', filters.difficulty);
    if (filters.category) params.append('category', filters.category);
    if (filters.search) params.append('search', filters.search);
    if (filters.skip) params.append('skip', filters.skip);
    if (filters.limit) params.append('limit', filters.limit);

    const query = params.toString() ? `?${params}` : '';
    return this.fetch(`/problems${query}`);
  }

  /**
   * Get a specific problem by ID
   * GET /problems/{id}
   */
  async getProblem(problemId) {
    return this.fetch(`/problems/${problemId}`);
  }

  /**
   * Create a new problem
   * POST /problems
   */
  async createProblem(problemData) {
    return this.fetch(`/problems`, {
      method: 'POST',
      body: JSON.stringify(problemData),
    });
  }

  /**
   * Update a problem
   * PUT /problems/{id}
   */
  async updateProblem(problemId, problemData) {
    return this.fetch(`/problems/${problemId}`, {
      method: 'PUT',
      body: JSON.stringify(problemData),
    });
  }

  /**
   * Delete a problem
   * DELETE /problems/{id}
   */
  async deleteProblem(problemId) {
    return this.fetch(`/problems/${problemId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Mark a problem as done
   * POST /problems/{id}/mark-done
   */
  async markProblemDone(problemId, userId) {
    return this.fetch(`/problems/${problemId}/mark-done`, {
      method: 'POST',
      body: JSON.stringify({ user_id: userId }),
    });
  }

  async markProblemReviewed(problemId, userId) {
    return this.fetch(`/problems/${problemId}/mark-reviewed`, {
      method: 'POST',
      body: JSON.stringify({ user_id: userId }),
    });
  }

  /**
   * Get user statistics
   * GET /problems/{user_id}/stats
   */
  async getUserStats(userId) {
    return this.fetch(`/problems/${userId}/stats`);
  }

  // ========== SOLUTIONS ENDPOINTS ==========

  /**
   * Submit and test a solution
   * POST /solutions/{problem_id}/submit
   */
  async submitSolution(problemId, code, language, userId, explanation = '') {
    return this.fetch(`/solutions/${problemId}/submit`, {
      method: 'POST',
      body: JSON.stringify({
        code,
        language,
        user_id: userId,
        explanation,
      }),
    });
  }

  /**
   * Test a solution without submitting
   * POST /solutions/{problem_id}/test
   */
  async testSolution(problemId, code, language) {
    return this.fetch(`/solutions/${problemId}/test`, {
      method: 'POST',
      body: JSON.stringify({
        code,
        language,
      }),
    });
  }

  /**
   * Get all solutions for a user
   * GET /solutions/user/{user_id}
   */
  async getUserSolutions(userId) {
    return this.fetch(`/solutions/user/${userId}`);
  }

  /**
   * Get a specific solution
   * GET /solutions/{id}
   */
  async getSolution(solutionId) {
    return this.fetch(`/solutions/${solutionId}`);
  }

  // ========== INSIGHTS ENDPOINTS ==========

  /**
   * Create an insight for a problem
   * POST /insights/{problem_id}
   */
  async createInsight(problemId, text, insightType, userId) {
    // Backend expects {text, insight_type} in body, user_id as query param
    const url = userId ? `/insights/${problemId}?user_id=${encodeURIComponent(userId)}` : `/insights/${problemId}`;
    return this.fetch(url, {
      method: 'POST',
      body: JSON.stringify({
        text,
        insight_type: insightType
      }),
    });
  }

  /**
   * Get all insights for a problem
   * GET /insights/{problem_id}
   */
  async getProblemInsights(problemId) {
    return this.fetch(`/insights/${problemId}`);
  }

  /**
   * Get all insights for a user
   * GET /insights/user/{user_id}
   */
  async getUserInsights(userId) {
    return this.fetch(`/insights/user/${userId}`);
  }

  /**
   * Update an insight
   * PUT /insights/{id}
   */
  async updateInsight(insightId, insightData) {
    return this.fetch(`/insights/${insightId}`, {
      method: 'PUT',
      body: JSON.stringify(insightData),
    });
  }

  /**
   * Delete an insight
   * DELETE /insights/{id}
   */
  async deleteInsight(insightId) {
    return this.fetch(`/insights/${insightId}`, {
      method: 'DELETE',
    });
  }

  // ========== HEALTH CHECK ==========

  /**
   * Check if backend is healthy
   * GET /health
   */
  async checkHealth() {
    try {
      // Use root URL for health check
      const response = await fetch(`${this.baseURL.replace('/api/v1', '')}/health`);
      return response.ok ? await response.json() : { status: 'unhealthy' };
    } catch (error) {
      console.error('Health check failed:', error);
      return { status: 'unhealthy', error: error.message };
    }
  }
}

// Export singleton instance
export default new APIClient();

/**
 * Export class for testing/advanced usage
 */
export { APIClient };

/**
 * Example usage:
 * 
 * import apiClient from './services/apiClient.js';
 * 
 * // Get all problems
 * const problems = await apiClient.getProblems({ difficulty: 'Easy' });
 * 
 * // Test solution
 * const result = await apiClient.testSolution(1, 'function solve() { ... }', 'javascript');
 * 
 * // Submit solution
 * const submission = await apiClient.submitSolution(1, code, 'javascript', userId);
 * 
 * // Create insight
 * const insight = await apiClient.createInsight(1, 'Important trick', 'trick', userId);
 */
