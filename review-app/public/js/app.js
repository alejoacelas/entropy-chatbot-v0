/**
 * Main App
 * Initializes the application and wires up event listeners
 */

(async function initApp() {
  ui.showLoading();

  try {
    // Load data from server
    console.log('Loading results...');
    const resultsData = await api.loadResults();

    console.log('Loading annotations...');
    const annotations = await api.loadAnnotations();

    // Initialize state
    state.evalId = resultsData.evalId;
    state.allResults = resultsData.results;
    state.promptLabels = resultsData.promptLabels;
    state.providerLabels = resultsData.providerLabels;
    state.annotations = annotations;

    // Select defaults
    if (state.promptLabels.length > 0) {
      state.selectedPrompt = state.promptLabels[0];
    }
    if (state.providerLabels.length > 0) {
      state.selectedProvider = state.providerLabels[0];
    }

    // Update filtered results
    state.updateFilteredResults();

    // Setup event listeners
    setupEventListeners();

    // Initialize keyboard shortcuts
    keyboard.init();

    // Initial render
    await ui.render();

    ui.showApp();
    console.log('App initialized successfully');
  } catch (err) {
    console.error('Failed to initialize app:', err);
    ui.showErrorState(`Failed to load data: ${err.message}`);
  }
})();

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Filter selectors
  document.getElementById('prompt-select').addEventListener('change', (e) => {
    state.selectedPrompt = e.target.value;
    state.currentIndex = 0;
    state.updateFilteredResults();
    ui.render();
  });

  document.getElementById('provider-select').addEventListener('change', (e) => {
    state.selectedProvider = e.target.value;
    state.currentIndex = 0;
    state.updateFilteredResults();
    ui.render();
  });

  // Navigation
  document.getElementById('prev-button').addEventListener('click', () => {
    state.prevResult();
    ui.render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  document.getElementById('next-button').addEventListener('click', () => {
    state.nextResult();
    ui.render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  document.getElementById('jump-select').addEventListener('change', (e) => {
    const index = parseInt(e.target.value);
    if (!isNaN(index)) {
      state.jumpToResult(index);
      ui.render();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });

  // Rating slider
  document.getElementById('rating-slider').addEventListener('input', (e) => {
    state.setRating(parseInt(e.target.value));
    ui.updateRatingLabel();
  });

  // Notes textarea
  document.getElementById('notes-input').addEventListener('input', (e) => {
    state.setNotes(e.target.value);
  });

  // Save button
  document.getElementById('save-button').addEventListener('click', handleSaveAndContinue);

  // Export button
  document.getElementById('export-button').addEventListener('click', () => {
    api.downloadCSV();
  });

  // Subscribe to state changes
  state.subscribe(() => {
    // State changed, could add debounced auto-render here if needed
  });
}
