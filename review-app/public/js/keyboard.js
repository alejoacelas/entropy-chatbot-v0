/**
 * Keyboard Shortcuts
 * Handles keyboard events for efficient review workflow
 */

const keyboard = {
  /**
   * Check if the target is a text input element
   */
  isTextInput(target) {
    return ['TEXTAREA', 'INPUT'].includes(target.tagName) ||
           target.getAttribute('contenteditable') === 'true';
  },

  /**
   * Initialize keyboard event listeners
   */
  init() {
    document.addEventListener('keydown', (e) => {
      // Don't intercept if we're in certain input contexts
      const target = e.target;

      // Number keys (0-5) for rating - only if not in text input
      if (/^[0-5]$/.test(e.key) && !this.isTextInput(target)) {
        e.preventDefault();
        const rating = parseInt(e.key);
        state.setRating(rating);
        document.getElementById('rating-slider').value = rating;
        ui.updateRatingLabel();
      }

      // Enter key to focus notes - only if not already in textarea
      if (e.key === 'Enter' && !this.isTextInput(target)) {
        e.preventDefault();
        document.getElementById('notes-input').focus();
      }

      // Cmd+Enter (Mac) or Ctrl+Enter (Windows/Linux) to save
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSaveAndContinue();
      }
    });

    console.log('Keyboard shortcuts initialized');
    console.log('- Press 0-5 to set rating');
    console.log('- Press Enter to focus notes');
    console.log('- Press Cmd+Enter (Ctrl+Enter) to save & continue');
  }
};

/**
 * Handle save and continue
 */
async function handleSaveAndContinue() {
  try {
    const saveBtn = document.getElementById('save-button');
    saveBtn.disabled = true;
    saveBtn.textContent = '⏳ Saving...';

    // Save current evaluation
    await state.saveEvaluation();

    // Show success
    ui.showSaveSuccess();

    // Move to next
    state.nextResult();

    // Render UI
    await ui.render();

    // Re-enable button
    saveBtn.disabled = false;
    saveBtn.textContent = '💾 Save & Continue';

    // Focus notes for next item
    document.getElementById('notes-input').focus();
  } catch (err) {
    console.error('Error saving:', err);
    ui.showError('Failed to save');

    // Re-enable button
    document.getElementById('save-button').disabled = false;
    document.getElementById('save-button').textContent = '💾 Save & Continue';
  }
}
