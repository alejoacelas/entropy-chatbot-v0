/**
 * State Management
 * Reactive state object for the application
 */

const state = {
  // Data from server
  evalId: null,
  allResults: [],
  promptLabels: [],
  providerLabels: [],
  annotations: {},

  // Filters
  selectedPrompt: null,
  selectedProvider: null,

  // Navigation
  currentIndex: 0,
  filteredResults: [],

  // Current evaluation
  currentRating: 0,
  currentNotes: '',

  // Listeners
  listeners: [],

  /**
   * Register a listener for state changes
   */
  subscribe(callback) {
    this.listeners.push(callback);
  },

  /**
   * Notify all listeners of state change
   */
  notify() {
    this.listeners.forEach(callback => callback());
  },

  /**
   * Filter results by selected prompt and provider
   */
  updateFilteredResults() {
    this.filteredResults = this.allResults.filter(r =>
      r.prompt?.label === this.selectedPrompt &&
      r.provider?.label === this.selectedProvider
    );

    // Reset index if out of bounds
    if (this.currentIndex >= this.filteredResults.length) {
      this.currentIndex = Math.max(0, this.filteredResults.length - 1);
    }

    this.updateCurrentEvaluation();
    this.notify();
  },

  /**
   * Update current evaluation from annotations
   */
  updateCurrentEvaluation() {
    if (this.filteredResults.length === 0) {
      this.currentRating = 0;
      this.currentNotes = '';
      return;
    }

    const current = this.filteredResults[this.currentIndex];
    const testIdx = current.testIdx;
    const annotation = this.annotations[this.evalId]?.[testIdx]?.[this.selectedPrompt]?.[this.selectedProvider] || {};

    this.currentRating = annotation.rating || 0;
    this.currentNotes = annotation.notes || '';
  },

  /**
   * Go to next result
   */
  nextResult() {
    if (this.currentIndex < this.filteredResults.length - 1) {
      this.currentIndex++;
      this.updateCurrentEvaluation();
      this.notify();
    }
  },

  /**
   * Go to previous result
   */
  prevResult() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.updateCurrentEvaluation();
      this.notify();
    }
  },

  /**
   * Jump to specific result by index
   */
  jumpToResult(index) {
    if (index >= 0 && index < this.filteredResults.length) {
      this.currentIndex = index;
      this.updateCurrentEvaluation();
      this.notify();
    }
  },

  /**
   * Set rating (0-5)
   */
  setRating(rating) {
    if (rating >= 0 && rating <= 5) {
      this.currentRating = rating;
      this.notify();
    }
  },

  /**
   * Set notes
   */
  setNotes(notes) {
    this.currentNotes = notes;
  },

  /**
   * Save current evaluation
   */
  async saveEvaluation() {
    if (this.filteredResults.length === 0) return false;

    const current = this.filteredResults[this.currentIndex];
    const testIdx = current.testIdx;

    await api.saveAnnotation(
      this.evalId,
      testIdx,
      this.selectedPrompt,
      this.selectedProvider,
      this.currentRating,
      this.currentNotes
    );

    // Update local state
    if (!this.annotations[this.evalId]) this.annotations[this.evalId] = {};
    if (!this.annotations[this.evalId][testIdx]) this.annotations[this.evalId][testIdx] = {};
    if (!this.annotations[this.evalId][testIdx][this.selectedPrompt]) {
      this.annotations[this.evalId][testIdx][this.selectedPrompt] = {};
    }

    this.annotations[this.evalId][testIdx][this.selectedPrompt][this.selectedProvider] = {
      rating: this.currentRating,
      notes: this.currentNotes
    };

    this.notify();
    return true;
  },

  /**
   * Get current result
   */
  getCurrentResult() {
    return this.filteredResults[this.currentIndex] || null;
  },

  /**
   * Get statistics for current filter
   */
  getStats() {
    const ratings = this.filteredResults.map(r => {
      const testIdx = r.testIdx;
      const annotation = this.annotations[this.evalId]?.[testIdx]?.[this.selectedPrompt]?.[this.selectedProvider] || {};
      return annotation.rating || 0;
    });

    const rated = ratings.filter(r => r > 0).length;
    const avg = rated > 0 ? (ratings.reduce((a, b) => a + b, 0) / rated) : 0;
    const excellent = ratings.filter(r => r === 5).length;
    const poor = ratings.filter(r => r === 1).length;

    return {
      total: this.filteredResults.length,
      rated,
      average: avg,
      excellent,
      poor
    };
  }
};
