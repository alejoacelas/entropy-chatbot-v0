export interface EvaluationResult {
  prompt: string;
  response: string;
  cached: boolean;
  latencyMs: number;
  error?: string;
}

export interface PromptResult {
  promptName: string;
  promptContent: string;
  results: EvaluationResult[];
}

export interface EvaluationResponse {
  success: boolean;
  runName: string;
  datasetName: string;
  model: string;
  promptResults: PromptResult[];
  summary: {
    totalPrompts: number;
    totalTests: number;
    cached: number;
    errors: number;
  };
}

// Use relative URLs - Vite proxy will forward /api requests to backend
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export async function runEvaluation(
  file: File | null,
  datasetName: string,
  promptNames: string[],
  runName: string,
  model?: string
): Promise<EvaluationResponse> {
  if (file) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('datasetName', datasetName);
    formData.append('runName', runName);

    // Send promptNames as JSON string in formData
    formData.append('promptNames', JSON.stringify(promptNames));

    if (model) {
      formData.append('model', model);
    }

    const response = await fetch(`${API_BASE_URL}/api/evaluate`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    return response.json();
  } else {
    // Load existing dataset
    const response = await fetch(`${API_BASE_URL}/api/evaluate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        datasetName,
        promptNames,
        runName,
        model,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    return response.json();
  }
}

export async function listRuns(): Promise<string[]> {
  const response = await fetch(`${API_BASE_URL}/api/runs`);

  if (!response.ok) {
    throw new Error(`Failed to list runs: HTTP ${response.status}`);
  }

  const data = await response.json();
  return data.runs || [];
}

export async function loadRun(runName: string): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/api/runs/${encodeURIComponent(runName)}`);

  if (!response.ok) {
    throw new Error(`Failed to load run: HTTP ${response.status}`);
  }

  return response.json();
}

export async function listDatasets(): Promise<string[]> {
  const response = await fetch(`${API_BASE_URL}/api/datasets`);

  if (!response.ok) {
    throw new Error(`Failed to list datasets: HTTP ${response.status}`);
  }

  const data = await response.json();
  return data.datasets || [];
}

export async function loadDataset(datasetName: string): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/api/datasets/${encodeURIComponent(datasetName)}`);

  if (!response.ok) {
    throw new Error(`Failed to load dataset: HTTP ${response.status}`);
  }

  return response.json();
}

export async function listPrompts(): Promise<string[]> {
  const response = await fetch(`${API_BASE_URL}/api/prompts`);

  if (!response.ok) {
    throw new Error(`Failed to list prompts: HTTP ${response.status}`);
  }

  const data = await response.json();
  return data.prompts || [];
}

export async function loadPrompt(promptName: string): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/api/prompts/${encodeURIComponent(promptName)}`);

  if (!response.ok) {
    throw new Error(`Failed to load prompt: HTTP ${response.status}`);
  }

  return response.json();
}

export async function savePrompt(name: string, content: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/prompts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name, content }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(errorData.error || `HTTP ${response.status}`);
  }
}

export async function deletePrompt(promptName: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/prompts/${encodeURIComponent(promptName)}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error(`Failed to delete prompt: HTTP ${response.status}`);
  }
}

export interface QuestionRating {
  promptIndex: number;
  questionIndex: number;
  rating: number;
  comment: string;
  timestamp: number;
}

export interface SavedRating {
  runName: string;
  ratingUser: string;
  timestamp: number;
  ratings: QuestionRating[];
}

export async function loadRatings(runName: string, ratingUser: string): Promise<SavedRating> {
  const response = await fetch(
    `${API_BASE_URL}/api/ratings/${encodeURIComponent(runName)}/${encodeURIComponent(ratingUser)}`
  );

  if (!response.ok) {
    throw new Error(`Failed to load ratings: HTTP ${response.status}`);
  }

  return response.json();
}

export async function saveRating(
  runName: string,
  ratingUser: string,
  promptIndex: number,
  questionIndex: number,
  rating: number,
  comment: string
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/ratings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      runName,
      ratingUser,
      promptIndex,
      questionIndex,
      rating,
      comment,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(errorData.error || `HTTP ${response.status}`);
  }
}
