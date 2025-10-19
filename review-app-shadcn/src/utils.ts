import type { PromptfooResult, AnnotationsStore, Annotation } from './types';

export async function loadPromptfooResults(): Promise<PromptfooResult | null> {
  try {
    const response = await fetch('/data/evals/results.json');
    if (!response.ok) {
      console.error('Failed to fetch results:', response.status, response.statusText);
      return null;
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to load promptfoo results:', error);
    return null;
  }
}

export async function loadAnnotations(): Promise<AnnotationsStore> {
  try {
    const cached = localStorage.getItem('review_annotations');
    if (cached) {
      return JSON.parse(cached);
    }

    const response = await fetch('/review_annotations.json');
    if (!response.ok) {
      return {};
    }
    return response.json();
  } catch (error) {
    console.error('Failed to load annotations:', error);
    try {
      const cached = localStorage.getItem('review_annotations');
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {
      // Ignore
    }
    return {};
  }
}

export async function saveAnnotations(annotations: AnnotationsStore): Promise<void> {
  try {
    localStorage.setItem('review_annotations', JSON.stringify(annotations));
  } catch (error) {
    console.error('Failed to save annotations:', error);
  }
}

export function getAnnotation(
  annotations: AnnotationsStore,
  evalId: string,
  testIdx: number,
  promptLabel: string,
  providerLabel: string
): Annotation {
  return (
    annotations?.[evalId]?.[String(testIdx)]?.[promptLabel]?.[providerLabel] || {
      rating: 0,
      notes: '',
    }
  );
}

export function setAnnotation(
  annotations: AnnotationsStore,
  evalId: string,
  testIdx: number,
  promptLabel: string,
  providerLabel: string,
  rating: number,
  notes: string
): AnnotationsStore {
  const updated = JSON.parse(JSON.stringify(annotations));

  if (!updated[evalId]) updated[evalId] = {};
  if (!updated[evalId][String(testIdx)]) updated[evalId][String(testIdx)] = {};
  if (!updated[evalId][String(testIdx)][promptLabel]) {
    updated[evalId][String(testIdx)][promptLabel] = {};
  }

  updated[evalId][String(testIdx)][promptLabel][providerLabel] = {
    rating,
    notes,
  };

  return updated;
}

export function truncateText(text: string, maxLength: number = 100): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

export function exportAnnotationsToJSON(annotations: AnnotationsStore): void {
  const dataStr = JSON.stringify(annotations, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'review_annotations.json';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportToCSV(
  promptfooData: PromptfooResult,
  annotations: AnnotationsStore
): void {
  const evalId = promptfooData.evalId;
  const results = promptfooData.results.results;

  // Build a map of (testIdx, promptLabel, providerLabel) -> result
  const resultMap = new Map<string, any>();
  for (const result of results) {
    const key = `${result.testIdx}-${result.prompt.label}-${result.provider.label}`;
    resultMap.set(key, result);
  }

  // Collect all unique (prompt, model) combinations
  const combinations = new Set<string>();
  for (const result of results) {
    combinations.add(`${result.prompt.label}|||${result.provider.label}`);
  }
  const sortedCombinations = Array.from(combinations).sort().map(c => {
    const [prompt, provider] = c.split('|||');
    return { prompt, provider };
  });

  // Get unique test indices
  const testIndices = Array.from(new Set(results.map(r => r.testIdx))).sort((a, b) => a - b);

  // Build CSV rows
  const rows: string[][] = [];
  
  // Header row
  const headers = ['testIdx', 'prompt_text'];
  for (const { prompt, provider } of sortedCombinations) {
    const cleanPrompt = prompt.split(':')[0].trim();
    const cleanProvider = provider.replace(/[^a-zA-Z0-9]/g, '_');
    headers.push(
      `${cleanPrompt}_${cleanProvider}_response`,
      `${cleanPrompt}_${cleanProvider}_rating`,
      `${cleanPrompt}_${cleanProvider}_notes`
    );
  }
  rows.push(headers);

  // Data rows
  for (const testIdx of testIndices) {
    const row: string[] = [String(testIdx)];
    
    // Get prompt text from first result for this testIdx
    const firstResult = results.find(r => r.testIdx === testIdx);
    const promptText = firstResult?.testCase?.vars?.prompt || '';
    row.push(promptText);

    for (const { prompt, provider } of sortedCombinations) {
      const key = `${testIdx}-${prompt}-${provider}`;
      const result = resultMap.get(key);
      
      if (result) {
        const response = result.response?.output || '';
        const annotation = getAnnotation(annotations, evalId, testIdx, prompt, provider);
        row.push(
          response,
          String(annotation.rating),
          annotation.notes
        );
      } else {
        row.push('', '0', '');
      }
    }
    
    rows.push(row);
  }

  // Convert to CSV string
  const csvContent = rows.map(row => 
    row.map(cell => {
      // Escape quotes and wrap in quotes if contains comma, newline, or quote
      const cellStr = String(cell);
      if (cellStr.includes(',') || cellStr.includes('\n') || cellStr.includes('"')) {
        return `"${cellStr.replace(/"/g, '""')}"`;
      }
      return cellStr;
    }).join(',')
  ).join('\n');

  // Download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `annotations_export_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

