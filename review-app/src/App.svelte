<script lang="ts">
  import { onMount } from 'svelte';
  import { marked } from 'marked';

  interface TestResult {
    testIdx: number;
    prompt: { label: string };
    provider: { label: string };
    testCase: { vars: Record<string, string> };
    response: { output: string };
    gradingResult: { pass: boolean; score: number; reason: string };
    latencyMs: number;
  }

  interface Annotation {
    rating: number;
    notes: string;
  }

  interface AnnotationsData {
    [evalId: string]: {
      [testIdx: string]: {
        [promptLabel: string]: {
          [providerLabel: string]: Annotation;
        };
      };
    };
  }

  let results: TestResult[] = [];
  let allResults: TestResult[] = [];
  let annotations: AnnotationsData = {};
  let evalId = '';
  let selectedPrompt = '';
  let selectedProvider = '';
  let currentTestIdx = 0;
  let loading = true;
  let error = '';

  let rating = 0;
  let notes = '';
  let notesTextarea: HTMLTextAreaElement;

  onMount(async () => {
    try {
      const [resultsRes, annotationsRes] = await Promise.all([
        fetch('/api/results'),
        fetch('/api/annotations'),
      ]);

      if (!resultsRes.ok) throw new Error('Failed to load results');
      if (!annotationsRes.ok) throw new Error('Failed to load annotations');

      const resultsData = await resultsRes.json();
      const annotationsData = await annotationsRes.json();

      allResults = resultsData.results || [];
      annotations = annotationsData;
      evalId = resultsData.evalId || '';

      // Get unique prompts and providers
      const uniquePrompts = new Set<string>();
      const uniqueProviders = new Set<string>();

      allResults.forEach((r) => {
        uniquePrompts.add(r.prompt?.label || 'unknown');
        uniqueProviders.add(r.provider?.label || 'unknown');
      });

      selectedPrompt = Array.from(uniquePrompts)[0] || '';
      selectedProvider = Array.from(uniqueProviders)[0] || '';

      filterResults();
      loading = false;
    } catch (e) {
      error = String(e);
      loading = false;
    }
  });

  function filterResults() {
    results = allResults.filter(
      (r) =>
        r.prompt?.label === selectedPrompt &&
        r.provider?.label === selectedProvider
    );
    currentTestIdx = 0;
    loadCurrentResult();
  }

  function loadCurrentResult() {
    if (results.length === 0) return;

    const result = results[currentTestIdx];
    const testIdx = result.testIdx;

    const annotation = annotations[evalId]?.[testIdx]?.[selectedPrompt]?.[
      selectedProvider
    ] || { rating: 0, notes: '' };

    rating = annotation.rating || 0;
    notes = annotation.notes || '';
  }

  function truncate(text: string, maxLength = 150): string {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  }

  function parseMarkdown(text: string): string {
    if (!text) return '';
    return marked.parse(text) as string;
  }

  function getUniquePrompts(): string[] {
    const unique = new Set<string>();
    allResults.forEach((r) => unique.add(r.prompt?.label || 'unknown'));
    return Array.from(unique).sort();
  }

  function getUniqueProviders(): string[] {
    const unique = new Set<string>();
    allResults.forEach((r) => unique.add(r.provider?.label || 'unknown'));
    return Array.from(unique).sort();
  }

  function setRating(newRating: number) {
    rating = newRating;
  }

  async function saveAndNext() {
    const result = results[currentTestIdx];
    const testIdx = result.testIdx;

    if (!annotations[evalId]) annotations[evalId] = {};
    if (!annotations[evalId][testIdx]) annotations[evalId][testIdx] = {};
    if (!annotations[evalId][testIdx][selectedPrompt]) {
      annotations[evalId][testIdx][selectedPrompt] = {};
    }

    annotations[evalId][testIdx][selectedPrompt][selectedProvider] = {
      rating,
      notes,
    };

    try {
      const res = await fetch('/api/annotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(annotations),
      });

      if (!res.ok) throw new Error('Failed to save');

      if (currentTestIdx < results.length - 1) {
        currentTestIdx++;
        loadCurrentResult();
      }
    } catch (e) {
      error = String(e);
    }
  }

  function handleKeyDown(e: KeyboardEvent) {
    // Skip if we're typing in the textarea
    if (document.activeElement === notesTextarea) {
      // Cmd+Enter to save
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        saveAndNext();
      }
      return;
    }

    // 0-5 to set rating
    if (/^[0-5]$/.test(e.key)) {
      setRating(parseInt(e.key, 10));
      return;
    }

    // Enter to focus notes
    if (e.key === 'Enter') {
      e.preventDefault();
      notesTextarea?.focus();
    }
  }

  const ratedCount = results.filter((r) => {
    const annotation =
      annotations[evalId]?.[r.testIdx]?.[selectedPrompt]?.[selectedProvider] ||
      ({ rating: 0, notes: '' } as Annotation);
    return (annotation.rating || 0) > 0;
  }).length;

  const allRatings = results.map((r) => {
    const annotation =
      annotations[evalId]?.[r.testIdx]?.[selectedPrompt]?.[selectedProvider] ||
      ({ rating: 0, notes: '' } as Annotation);
    return annotation.rating || 0;
  });

  const avgRating =
    allRatings.filter((r) => r > 0).length > 0
      ? allRatings.reduce((a, b) => a + b, 0) /
        allRatings.filter((r) => r > 0).length
      : 0;

  const ratingsMap = {
    0: '⏳ Not rated',
    1: '❌ Poor',
    2: '⚠️ Needs improvement',
    3: '✓ Acceptable',
    4: '✓✓ Good',
    5: '✓✓✓ Excellent',
  };

  $: if (results.length > 0) {
    loadCurrentResult();
  }
</script>

<svelte:window on:keydown={handleKeyDown} />

<style>
  :global(body) {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
      'Helvetica Neue', Arial, sans-serif;
    background: #f5f5f5;
    margin: 0;
    padding: 0;
  }

  .container {
    display: grid;
    grid-template-columns: 300px 1fr;
    gap: 0;
    height: 100vh;
  }

  .sidebar {
    background: #fff;
    border-right: 1px solid #e0e0e0;
    padding: 24px;
    overflow-y: auto;
  }

  .main {
    display: flex;
    flex-direction: column;
    padding: 24px;
    overflow: hidden;
  }

  .content-wrapper {
    display: grid;
    grid-template-columns: 1fr 350px;
    gap: 24px;
    flex: 1;
    overflow: hidden;
    margin-bottom: 24px;
  }

  .left-panel {
    display: flex;
    flex-direction: column;
    gap: 12px;
    overflow-y: auto;
  }

  .header {
    font-size: 20px;
    font-weight: 600;
    margin: 0 0 16px 0;
  }

  .section-header {
    font-size: 14px;
    font-weight: 600;
    text-transform: uppercase;
    color: #666;
    margin: 16px 0 12px 0;
    border-bottom: 1px solid #e0e0e0;
    padding-bottom: 8px;
  }

  .select-group {
    margin-bottom: 16px;
  }

  label {
    display: block;
    font-size: 12px;
    font-weight: 500;
    margin-bottom: 6px;
    color: #333;
  }

  select {
    width: 100%;
    padding: 8px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 14px;
  }

  .navigation {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin: 16px 0;
  }

  button {
    padding: 8px 12px;
    border: 1px solid #ddd;
    border-radius: 4px;
    background: #fff;
    cursor: pointer;
    font-size: 13px;
    transition: all 0.2s;
  }

  button:hover {
    background: #f0f0f0;
    border-color: #999;
  }

  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .metric {
    margin: 8px 0;
    font-size: 13px;
    color: #666;
  }

  .metric-value {
    font-weight: 600;
    color: #333;
  }

  .title {
    font-size: 24px;
    font-weight: 600;
    margin: 0 0 4px 0;
  }

  .caption {
    font-size: 13px;
    color: #999;
    margin-bottom: 12px;
  }

  .question {
    background: #f9f9f9;
    padding: 12px;
    border-radius: 4px;
    margin-bottom: 12px;
    font-size: 13px;
    line-height: 1.5;
    border-left: 3px solid #2196f3;
    flex-shrink: 0;
  }

  .response {
    background: #fff;
    padding: 16px;
    border-radius: 4px;
    margin-bottom: 12px;
    font-size: 14px;
    line-height: 1.6;
    border: 1px solid #e0e0e0;
    overflow-y: auto;
    min-height: 60vh;
    flex: 0 0 auto;
  }

  .response :global(h1),
  .response :global(h2),
  .response :global(h3),
  .response :global(h4),
  .response :global(h5),
  .response :global(h6) {
    margin-top: 16px;
    margin-bottom: 8px;
    font-weight: 600;
    line-height: 1.3;
  }

  .response :global(h1) {
    font-size: 20px;
  }
  .response :global(h2) {
    font-size: 18px;
  }
  .response :global(h3) {
    font-size: 16px;
  }

  .response :global(p) {
    margin: 8px 0;
  }

  .response :global(ul),
  .response :global(ol) {
    margin: 8px 0;
    padding-left: 24px;
  }

  .response :global(li) {
    margin: 4px 0;
  }

  .response :global(code) {
    background: #f5f5f5;
    padding: 2px 6px;
    border-radius: 3px;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: 13px;
  }

  .response :global(pre) {
    background: #f5f5f5;
    padding: 12px;
    border-radius: 4px;
    overflow-x: auto;
    margin: 8px 0;
  }

  .response :global(pre code) {
    background: none;
    padding: 0;
  }

  .response :global(blockquote) {
    border-left: 3px solid #e0e0e0;
    padding-left: 12px;
    margin: 8px 0;
    color: #666;
    font-style: italic;
  }

  .response :global(a) {
    color: #2196f3;
    text-decoration: none;
  }

  .response :global(a:hover) {
    text-decoration: underline;
  }

  .response :global(strong) {
    font-weight: 600;
  }

  .response :global(em) {
    font-style: italic;
  }

  .response :global(hr) {
    border: none;
    border-top: 1px solid #e0e0e0;
    margin: 16px 0;
  }

  .response :global(table) {
    border-collapse: collapse;
    width: 100%;
    margin: 8px 0;
  }

  .response :global(th),
  .response :global(td) {
    border: 1px solid #e0e0e0;
    padding: 8px;
    text-align: left;
  }

  .response :global(th) {
    background: #f9f9f9;
    font-weight: 600;
  }

  .metrics-section {
    background: #f9f9f9;
    padding: 12px;
    border-radius: 4px;
    font-size: 12px;
    flex-shrink: 0;
  }

  .metrics-row {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
    margin: 8px 0;
  }

  .metric-item {
    background: #fff;
    padding: 8px;
    border-radius: 3px;
    border: 1px solid #e0e0e0;
    text-align: center;
  }

  .rating-section {
    background: #fff;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .subheader {
    font-size: 16px;
    font-weight: 600;
    margin: 0 0 12px 0;
  }

  .rating-control {
    margin-bottom: 16px;
    flex-shrink: 0;
  }

  .rating-label {
    font-size: 14px;
    font-weight: 500;
    margin-bottom: 8px;
  }

  .rating-slider {
    width: 100%;
    height: 6px;
    border-radius: 3px;
    background: #ddd;
    outline: none;
    -webkit-appearance: none;
    appearance: none;
  }

  .rating-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #2196f3;
    cursor: pointer;
  }

  .rating-slider::-moz-range-thumb {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #2196f3;
    cursor: pointer;
    border: none;
  }

  .rating-display {
    font-size: 14px;
    font-weight: 600;
    color: #333;
    margin-top: 8px;
  }

  .notes-section {
    margin-top: 16px;
    flex: 0.7;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  .notes-label {
    font-size: 14px;
    font-weight: 500;
    margin-bottom: 8px;
    flex-shrink: 0;
  }

  textarea {
    flex: 1;
    padding: 12px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
      'Helvetica Neue', Arial, sans-serif;
    font-size: 13px;
    resize: none;
    min-height: 0;
  }

  .button-group {
    display: grid;
    grid-template-columns: 1fr;
    gap: 8px;
    margin-top: 16px;
    flex-shrink: 0;
  }

  .save-button {
    background: #2196f3;
    color: white;
    border: none;
    padding: 10px;
    font-weight: 500;
    width: 100%;
  }

  .save-button:hover {
    background: #1976d2;
  }

  .loading,
  .error-message {
    padding: 24px;
    text-align: center;
  }

  .error-message {
    color: #d32f2f;
  }

  .stats-section {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
    flex-shrink: 0;
    border-top: 1px solid #e0e0e0;
    padding-top: 16px;
  }

  .stat-item {
    background: #fff;
    padding: 12px;
    border-radius: 4px;
    border: 1px solid #e0e0e0;
    text-align: center;
  }

  .stat-label {
    font-size: 11px;
    color: #999;
    text-transform: uppercase;
    font-weight: 500;
  }

  .stat-value {
    font-size: 20px;
    font-weight: 600;
    margin-top: 6px;
  }

  .keyboard-hint {
    font-size: 11px;
    color: #999;
    margin-top: 8px;
    font-style: italic;
  }

  input[type='range'] {
    cursor: pointer;
  }
</style>

{#if loading}
  <div class="loading">Loading...</div>
{:else if error}
  <div class="error-message">Error: {error}</div>
{:else if results.length === 0}
  <div class="error-message">No results found for this combination</div>
{:else}
  <div class="container">
    <div class="sidebar">
      <h2 class="header">🎯 Filters</h2>

      <div class="select-group">
        <label for="prompt-select">Prompt:</label>
        <select
          id="prompt-select"
          bind:value={selectedPrompt}
          on:change={filterResults}
        >
          {#each getUniquePrompts() as p}
            <option value={p}>{p}</option>
          {/each}
        </select>
      </div>

      <div class="select-group">
        <label for="provider-select">Model:</label>
        <select
          id="provider-select"
          bind:value={selectedProvider}
          on:change={filterResults}
        >
          {#each getUniqueProviders() as pr}
            <option value={pr}>{pr}</option>
          {/each}
        </select>
      </div>

      <div class="section-header">📍 Navigation</div>

      <div class="metric">
        <div class="metric-value">Progress</div>
        <div>{ratedCount}/{results.length} rated</div>
      </div>

      <div class="navigation">
        <button
          disabled={currentTestIdx === 0}
          on:click={() => {
            currentTestIdx--;
          }}
        >
          ← Previous
        </button>
        <button
          disabled={currentTestIdx === results.length - 1}
          on:click={() => {
            currentTestIdx++;
          }}
        >
          Next →
        </button>
      </div>

      {#if results.length > 0}
        <div class="select-group">
          <label for="jump-select">Jump to item:</label>
          <select
            id="jump-select"
            bind:value={currentTestIdx}
            on:change={() => {
              currentTestIdx = typeof currentTestIdx === 'string' 
                ? parseInt(currentTestIdx, 10) 
                : currentTestIdx;
            }}
          >
            {#each results as result, idx}
              <option value={idx}>
                #{idx + 1} - {truncate(
                  result.testCase?.vars?.prompt || 'Q',
                  40
                )}
              </option>
            {/each}
          </select>
        </div>
      {/if}

      <div class="section-header">📊 Keyboard Shortcuts</div>
      <div class="keyboard-hint">
        <strong>0-5</strong>: Set rating<br />
        <strong>Enter</strong>: Focus notes<br />
        <strong>Cmd+Enter</strong>: Save & next
      </div>
    </div>

    <div class="main">
      {#if results.length > 0}
        <div>
          <div class="title">Review Results</div>
          <div class="caption">
            Test {currentTestIdx + 1} of {results.length}
          </div>
        </div>

        <div class="content-wrapper">
          <div class="left-panel">
            <div class="question">
              <strong>Question:</strong><br />
              {truncate(results[currentTestIdx].testCase?.vars?.prompt, 300)}
            </div>

            <div class="response">
              <strong>Model Response:</strong><br />
              {@html parseMarkdown(results[currentTestIdx].response?.output || 'No output')}
            </div>

            <div class="metrics-section">
              <strong>📊 Evaluation Metrics</strong>
              <div class="metrics-row">
                <div class="metric-item">
                  <div class="stat-label">Status</div>
                  <div class="stat-value">
                    {results[currentTestIdx].gradingResult?.pass ? '✓' : '✗'}
                  </div>
                </div>
                <div class="metric-item">
                  <div class="stat-label">Score</div>
                  <div class="stat-value">
                    {results[currentTestIdx].gradingResult?.score || 0}
                  </div>
                </div>
                <div class="metric-item">
                  <div class="stat-label">Latency</div>
                  <div class="stat-value">
                    {results[currentTestIdx].latencyMs}ms
                  </div>
                </div>
              </div>
              {#if results[currentTestIdx].gradingResult?.reason}
                <div style="margin-top: 8px; font-size: 12px;">
                  <strong>Reason:</strong> {results[currentTestIdx].gradingResult
                    ?.reason}
                </div>
              {/if}
            </div>
          </div>

          <div class="rating-section">
            <div class="subheader">⭐ Your Evaluation</div>

            <div class="rating-control">
              <label for="rating-slider" class="rating-label">
                Rating:
              </label>
              <input
                id="rating-slider"
                type="range"
                class="rating-slider"
                min="0"
                max="5"
                bind:value={rating}
                on:change={() => {
                  rating = typeof rating === 'string' 
                    ? parseInt(rating, 10) 
                    : rating;
                }}
              />
              <div class="rating-display">
                {ratingsMap[rating]}
              </div>
            </div>

            <div class="notes-section">
              <label for="notes-textarea" class="notes-label">Notes:</label>
              <textarea
                id="notes-textarea"
                bind:value={notes}
                bind:this={notesTextarea}
                placeholder="Add comments or observations..."
              />
            </div>

            <div class="button-group">
              <button class="save-button" on:click={saveAndNext}>
                💾 Save & Continue
              </button>
            </div>
          </div>
        </div>

        <div class="stats-section">
          <div class="stat-item">
            <div class="stat-label">Rated</div>
            <div class="stat-value">{ratedCount}/{results.length}</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">Avg Rating</div>
            <div class="stat-value">
              {avgRating > 0 ? avgRating.toFixed(1) : 'N/A'}
            </div>
          </div>
          <div class="stat-item">
            <div class="stat-label">Excellent (5)</div>
            <div class="stat-value">
              {allRatings.filter((r) => r === 5).length}
            </div>
          </div>
          <div class="stat-item">
            <div class="stat-label">Poor (1)</div>
            <div class="stat-value">
              {allRatings.filter((r) => r === 1).length}
            </div>
          </div>
        </div>
      {/if}
    </div>
  </div>
{/if}
