/**
 * UI Rendering
 * Handles all DOM updates and user interface rendering
 */

const ui = {
  /**
   * Render the entire UI based on current state
   */
  async render() {
    this.renderCurrentResult();
    this.updateFilters();
    this.updateNavigation();
    this.updateStats();
  },

  /**
   * Render current result (question, response, metrics, metadata)
   */
  renderCurrentResult() {
    const current = state.getCurrentResult();

    if (!current) {
      document.getElementById('test-counter').textContent = 'No results';
      return;
    }

    const testIdx = current.testIdx;
    const testVars = current.testCase?.vars || {};
    const grading = current.gradingResult || {};

    // Test counter
    document.getElementById('test-counter').textContent =
      `Test ${state.currentIndex + 1} of ${state.filteredResults.length}`;

    // Question
    document.getElementById('question-text').textContent =
      testVars.prompt || 'N/A';

    // Response (rendered as markdown)
    const responseOutput = current.response?.output || 'No output';
    const responseHTML = marked.parse(responseOutput);
    document.getElementById('response-text').innerHTML = responseHTML;

    // Metrics
    document.getElementById('metric-status').textContent =
      grading.pass ? '✓ Pass' : '✗ Fail';
    document.getElementById('metric-score').textContent =
      grading.score !== undefined ? grading.score : 'N/A';
    document.getElementById('metric-latency').textContent =
      current.latencyMs ? `${current.latencyMs}ms` : 'N/A';
    document.getElementById('metric-reason').textContent =
      grading.reason || '';

    // Metadata
    this.renderMetadata(testVars);

    // Rating and notes
    document.getElementById('rating-slider').value = state.currentRating;
    document.getElementById('notes-input').value = state.currentNotes;
    this.updateRatingLabel();
  },

  /**
   * Render metadata from test case
   */
  renderMetadata(testVars) {
    const metadataDiv = document.getElementById('metadata-content');
    const items = [];

    const fields = [
      { label: 'Source', key: 'Source' },
      { label: 'Expected Capability', key: 'Bot current capability expectations; assuming we have Bot Guide correct, the Bot...' },
      { label: 'Test Difficulty', key: 'How good of a test for the Bot is this question?' },
      { label: 'Applies to', key: 'Applies to:' },
      { label: 'Notes', key: 'Notes' }
    ];

    fields.forEach(({ label, key }) => {
      if (testVars[key]) {
        items.push(`<strong>${label}:</strong> ${testVars[key]}`);
      }
    });

    if (testVars['JP Answer']) {
      items.push(`<strong>Reference Answer:</strong> ${testVars['JP Answer']}`);
    }

    metadataDiv.innerHTML = items.length > 0
      ? items.map(item => `<p>${item}</p>`).join('')
      : '<p>No metadata</p>';
  },

  /**
   * Update rating label based on current rating
   */
  updateRatingLabel() {
    const labels = {
      0: '⏳ Not rated',
      1: '❌ Poor',
      2: '⚠️ Needs improvement',
      3: '✓ Acceptable',
      4: '✓✓ Good',
      5: '✓✓✓ Excellent'
    };

    document.getElementById('rating-label').textContent =
      labels[state.currentRating] || 'Unknown';
  },

  /**
   * Update filter dropdowns
   */
  updateFilters() {
    // Prompt selector
    const promptSelect = document.getElementById('prompt-select');
    promptSelect.innerHTML = state.promptLabels
      .map(label => `<option ${label === state.selectedPrompt ? 'selected' : ''}>${label}</option>`)
      .join('');

    // Provider selector
    const providerSelect = document.getElementById('provider-select');
    providerSelect.innerHTML = state.providerLabels
      .map(label => `<option ${label === state.selectedProvider ? 'selected' : ''}>${label}</option>`)
      .join('');
  },

  /**
   * Update navigation controls
   */
  updateNavigation() {
    // Previous button
    document.getElementById('prev-button').disabled = state.currentIndex === 0;

    // Next button
    document.getElementById('next-button').disabled =
      state.currentIndex >= state.filteredResults.length - 1;

    // Jump select
    const jumpSelect = document.getElementById('jump-select');
    jumpSelect.innerHTML = '<option value="">Jump to item...</option>' +
      state.filteredResults
        .map((r, idx) => {
          const preview = r.testCase?.vars?.prompt?.substring(0, 40) || 'Q';
          return `<option value="${idx}">#${idx + 1} - ${preview}...</option>`;
        })
        .join('');
    jumpSelect.value = '';
  },

  /**
   * Update statistics
   */
  updateStats() {
    const stats = state.getStats();

    document.getElementById('progress-value').textContent =
      `${stats.rated}/${stats.total} rated`;

    document.getElementById('stats-rated').textContent =
      `${stats.rated}/${stats.total}`;

    document.getElementById('stats-average').textContent =
      stats.rated > 0 ? stats.average.toFixed(1) : 'N/A';

    document.getElementById('stats-excellent').textContent = stats.excellent;
    document.getElementById('stats-poor').textContent = stats.poor;
  },

  /**
   * Show save success message
   */
  showSaveSuccess() {
    const btn = document.getElementById('save-button');
    const originalText = btn.textContent;

    btn.classList.add('btn-success');
    btn.classList.remove('btn-primary');
    btn.textContent = '✅ Saved!';

    setTimeout(() => {
      btn.classList.remove('btn-success');
      btn.classList.add('btn-primary');
      btn.textContent = originalText;
    }, 1500);
  },

  /**
   * Show error message
   */
  showError(message) {
    alert(`Error: ${message}`);
  },

  /**
   * Show loading state
   */
  showLoading() {
    document.getElementById('loading').classList.remove('hidden');
    document.getElementById('app-content').classList.add('hidden');
    document.getElementById('error-state').classList.add('hidden');
  },

  /**
   * Show app content
   */
  showApp() {
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('app-content').classList.remove('hidden');
    document.getElementById('error-state').classList.add('hidden');
  },

  /**
   * Show error state
   */
  showErrorState(message) {
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('app-content').classList.add('hidden');
    document.getElementById('error-state').classList.remove('hidden');
    document.getElementById('error-message').textContent = message;
  }
};
