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

