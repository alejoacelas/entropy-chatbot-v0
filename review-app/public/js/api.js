/**
 * API Client
 * Handles communication with the backend
 */

const api = {
  baseURL: '/api',

  /**
   * Make a GET request
   */
  async get(endpoint) {
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (err) {
      console.error(`GET ${endpoint}:`, err);
      throw err;
    }
  },

  /**
   * Make a POST request
   */
  async post(endpoint, data) {
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (err) {
      console.error(`POST ${endpoint}:`, err);
      throw err;
    }
  },

  /**
   * Load promptfoo results
   */
  async loadResults() {
    return this.get('/results');
  },

  /**
   * Load annotations
   */
  async loadAnnotations() {
    return this.get('/annotations');
  },

  /**
   * Save a single annotation
   */
  async saveAnnotation(evalId, testIdx, promptLabel, providerLabel, rating, notes) {
    return this.post('/annotations', {
      evalId,
      testIdx,
      promptLabel,
      providerLabel,
      rating,
      notes
    });
  },

  /**
   * Export results to CSV
   */
  downloadCSV() {
    window.location.href = `${this.baseURL}/export`;
  }
};
