/**
 * API Client — JWT-secured, all endpoints use token from localStorage.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

class APIClient {
  constructor() {
    this.baseURL   = API_BASE_URL;
    this.timeout   = 30000;
    this.tokenKey  = 'auth_token';
    this.userKey   = 'auth_user';
  }

  // ── Token management ────────────────────────────────────────────────────────
  setToken(token) { localStorage.setItem(this.tokenKey, token); }
  getToken()      { return localStorage.getItem(this.tokenKey); }
  setUser(user)   { localStorage.setItem(this.userKey, JSON.stringify(user)); }
  getUser()       {
    try { return JSON.parse(localStorage.getItem(this.userKey)); } catch { return null; }
  }
  isAuthenticated() { return !!this.getToken(); }
  isAdmin()         { return !!this.getUser()?.is_admin; }

  clearStorage() {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
  }

  // ── Core request ────────────────────────────────────────────────────────────
  async request(endpoint, options = {}) {
    const url   = `${this.baseURL}${endpoint}`;
    const token = this.getToken();
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), this.timeout);

    try {
      const res = await fetch(url, { ...options, headers, signal: controller.signal });
      clearTimeout(id);

      if (res.status === 401) { this.logout(); throw new Error('Unauthorized'); }
      if (res.status === 204) return null;
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Error ${res.status}`);
      }
      return await res.json();
    } catch (e) {
      if (e.name === 'AbortError') throw new Error('Request timeout');
      throw e;
    }
  }

  async get(url)          { return this.request(url, { method: 'GET' }); }
  async post(url, data)   { return this.request(url, { method: 'POST',   body: JSON.stringify(data) }); }
  async put(url, data)    { return this.request(url, { method: 'PUT',    body: JSON.stringify(data) }); }
  async patch(url, data)  { return this.request(url, { method: 'PATCH',  body: JSON.stringify(data) }); }
  async delete(url)       { return this.request(url, { method: 'DELETE' }); }

  // ── Auth ────────────────────────────────────────────────────────────────────
  async login(username, password) {
    const res = await this.post('/auth/login', { username, password });
    if (res.access_token) { this.setToken(res.access_token); this.setUser(res.user); }
    return res;
  }
  async register(username, email, password, fullName) {
    const res = await this.post('/auth/register', { username, email, password, full_name: fullName });
    if (res.access_token) { this.setToken(res.access_token); this.setUser(res.user); }
    return res;
  }
  logout() {
    this.clearStorage();
    if (window.location.pathname !== '/login') window.location.href = '/login';
  }
  async getCurrentUser() {
    const user = await this.get('/auth/me');
    this.setUser(user);
    return user;
  }

  // ── Problems ────────────────────────────────────────────────────────────────
  async getProblems(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => { if (v && v !== 'All') params.append(k, v); });
    const q = params.toString() ? `?${params}` : '';
    return this.get(`/problems/${q}`);
  }
  async getProblem(id)        { return this.get(`/problems/${id}`); }
  async createProblem(data)   { return this.post('/problems/', data); }
  async deleteProblem(id)     { return this.delete(`/problems/${id}`); }

  async addFromMaster(selected,category)  { return this.post(`/problems/add-from-master/${selected.id}`, {category}); }
   /**
   * Search the master LeetCode problem list
   * GET /leetcode-master?search=two+sum&page=1&page_size=30
   */
  async searchLeetCodeMaster(search = '', page = 1, pageSize = 30, difficulty = '') {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (difficulty && difficulty !== 'All') params.append('difficulty', difficulty);
    params.append('page', String(page));
    params.append('page_size', String(pageSize));
    
    // Uses this.get to ensure Token headers are included
    return this.get(`/leetcode?${params.toString()}`);
  }
  async markProblemDone(problemId)     { return this.post(`/problems/${problemId}/mark-done`, {}); }
  async markProblemReviewed(problemId) { return this.post(`/problems/${problemId}/mark-reviewed`, {}); }

  async autosave(problemId, code, language) {
    return this.patch(`/problems/${problemId}/autosave`, { code, language });
  }

  async getMyStats() { return this.get('/problems/me/stats'); }

  // ── Solutions ───────────────────────────────────────────────────────────────
  async submitSolution(problemId, code, language, explanation = '', timeComplexity = '', spaceComplexity = '') {
    return this.post(`/solutions/${problemId}/submit`, {
      code, language, explanation,
      time_complexity: timeComplexity,
      space_complexity: spaceComplexity,
    });
  }
  async testSolution(problemId, code, language, testCases) {
    return this.post(`/solutions/${problemId}/test`, { code, language, test_cases: testCases });
  }
  async getSolutionHistory(problemId) {
    return this.get(`/solutions/me/history?problem_id=${problemId}`);
  }

  // ── Insights ────────────────────────────────────────────────────────────────
  async createInsight(problemId, text, type = 'general') {
    return this.post(`/insights/${problemId}`, { text, insight_type: type });
  }
  async updateInsight(insightId, data) { return this.put(`/insights/${insightId}`, data); }
  async deleteInsight(insightId)       { return this.delete(`/insights/${insightId}`); }

  // ── Rich Notes ───────────────────────────────────────────────────────────────
  async getNote(problemId)           { return this.get(`/notes/${problemId}`); }
  async saveNote(problemId, content) { return this.put(`/notes/${problemId}`, { content }); }
  async saveQuickNote(problemId, quickText) {
    return this.post(`/notes/${problemId}/quick`, { quick_text: quickText });
  }
  async uploadNoteImage(problemId, file) {
    const formData = new FormData();
    formData.append('file', file);
    const token = this.getToken();
    const res = await fetch(`${this.baseURL}/notes/${problemId}/upload-image`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    if (!res.ok) throw new Error('Image upload failed');
    return res.json();
  }

  // ── Tags ─────────────────────────────────────────────────────────────────────
  async getTags()               { return this.get('/tags/'); }
  async createTag(data)         { return this.post('/tags/', data); }
  async updateTag(id, data)     { return this.put(`/tags/${id}`, data); }
  async addTagToProblem(pid, tid) { return this.post(`/problems/${pid}/tags`, { tag_id: tid }); }
  async removeTagFromProblem(pid, tid) { return this.delete(`/problems/${pid}/tags/${tid}`); }

  // ── Discussion ───────────────────────────────────────────────────────────────
  async getMessages(problemId, skip = 0, limit = 50) {
    return this.get(`/discussion/${problemId}/messages?skip=${skip}&limit=${limit}`);
  }
  async postMessage(problemId, content) {
    return this.post(`/discussion/${problemId}/messages`, { content });
  }
  async getMessageCount(problemId) {
    return this.get(`/discussion/${problemId}/count`);
  }
  async watchProblem(problemId)   { return this.post(`/discussion/${problemId}/watch`, {}); }
  async unwatchProblem(problemId) { return this.delete(`/discussion/${problemId}/watch`); }

  // ── Notifications ─────────────────────────────────────────────────────────
  async getNotifications(unreadOnly = false) {
    return this.get(`/discussion/notifications/me${unreadOnly ? '?unread_only=true' : ''}`);
  }
  async markAllNotificationsRead() {
    return this.post('/discussion/notifications/read-all', {});
  }

  // ── AI / Tutor ────────────────────────────────────────────────────────────
  async tutorChat(sessionId, message, problemSlug, userCode = '', language = 'python3', msgType = 'chat', hintLevel = 1, model) {
    return this.post('/tutor/chat', {
      session_id: sessionId, message, problem_slug: problemSlug,
      user_code: userCode, language, msg_type: msgType, hint_level: hintLevel, model,
    });
  }
  async getHint(problemId, level, language = 'python3', userCode = '') {
    const q = new URLSearchParams({ level, language, user_code: userCode }).toString();
    return this.get(`/tutor/hints/${problemId}?${q}`);
  }
  async generateTestCases(problemId, model) {
    return this.post(`/tutor/generate-test-cases/${problemId}`, { model });
  }
  async analyzeComplexity(code, language, problemTitle = '', model) {
    return this.post('/tutor/analyze-complexity', { code, language, problem_title: problemTitle, model });
  }
  async getTutorHistory(sessionId)  { return this.get(`/tutor/history?session_id=${sessionId}`); }
  async clearTutorHistory(sessionId){ return this.delete(`/tutor/history?session_id=${sessionId}`); }
  async getAIUsage()                { return this.get('/tutor/usage'); }

  // ── Admin ─────────────────────────────────────────────────────────────────
  async listUsers()                 { return this.get('/auth/users'); }
  async changeUserRole(uid, isAdmin){ return this.patch(`/auth/users/${uid}/role?is_admin=${isAdmin}`); }
}

const apiClient = new APIClient();
export default apiClient;
