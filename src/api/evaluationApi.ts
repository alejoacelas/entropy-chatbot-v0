export interface EvaluationResult {
  prompt: string;
  response: string;
  cached: boolean;
  latencyMs: number;
  error?: string;
}

export interface EvaluationResponse {
  success: boolean;
  total: number;
  cached: number;
  errors: number;
  results: EvaluationResult[];
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export async function runEvaluation(
  file: File | null,
  prompts: string[] | null,
  model?: string,
  systemPrompt?: string,
  runName?: string,
  datasetName?: string
): Promise<EvaluationResponse> {
  if (file) {
    const formData = new FormData();
    formData.append('file', file);
    if (datasetName) {
      formData.append('datasetName', datasetName);
    }
    if (model) {
      formData.append('model', model);
    }
    if (systemPrompt) {
      formData.append('systemPrompt', systemPrompt);
    }
    if (runName) {
      formData.append('runName', runName);
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
  } else if (datasetName) {
    // Load existing dataset
    const response = await fetch(`${API_BASE_URL}/api/evaluate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        datasetName,
        model,
        systemPrompt,
        runName,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    return response.json();
  } else if (prompts && prompts.length > 0) {
    // Send as JSON instead of FormData
    const response = await fetch(`${API_BASE_URL}/api/evaluate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompts,
        model,
        systemPrompt,
        runName,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    return response.json();
  } else {
    throw new Error('Either file, dataset, or prompts array must be provided');
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
