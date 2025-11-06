import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ReactMarkdown from 'react-markdown';
import { runEvaluation, listDatasets, type EvaluationResult } from '@/api/evaluationApi';
import { Upload, Play, CheckCircle, XCircle, Clock } from 'lucide-react';

const HARDCODED_MODEL = 'claude-sonnet-4-5-20250929';
const STORAGE_KEY_PROMPTS = 'savedSystemPrompts';

interface SavedPrompt {
  name: string;
  content: string;
}

export function EvaluationRunner() {
  const [file, setFile] = useState<File | null>(null);
  const [datasetName, setDatasetName] = useState('');
  const [selectedDataset, setSelectedDataset] = useState<string | null>(null);
  const [availableDatasets, setAvailableDatasets] = useState<string[]>([]);
  const [runName, setRunName] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [promptName, setPromptName] = useState('');
  const [savedPrompts, setSavedPrompts] = useState<SavedPrompt[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<EvaluationResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<{ total: number; cached: number; errors: number } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load saved prompts from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY_PROMPTS);
    if (saved) {
      try {
        setSavedPrompts(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load saved prompts:', e);
      }
    }
  }, []);

  // Load available datasets on mount
  useEffect(() => {
    const loadDatasets = async () => {
      try {
        const datasets = await listDatasets();
        setAvailableDatasets(datasets);
      } catch (err) {
        console.error('Failed to load datasets:', err);
      }
    };
    loadDatasets();
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.csv')) {
        setError('Please upload a CSV file');
        return;
      }
      setFile(selectedFile);
      setSelectedDataset(null); // Clear dataset selection when file is selected
      setError(null);
    }
  };

  const handleDatasetSelect = (dataset: string) => {
    setSelectedDataset(dataset);
    setFile(null); // Clear file when dataset is selected
  };

  const saveCurrentPrompt = () => {
    if (!promptName.trim() || !systemPrompt.trim()) {
      setError('Please provide both a prompt name and prompt content');
      return;
    }

    const newPrompt: SavedPrompt = {
      name: promptName.trim(),
      content: systemPrompt.trim(),
    };

    const updated = [...savedPrompts.filter(p => p.name !== newPrompt.name), newPrompt];
    setSavedPrompts(updated);
    localStorage.setItem(STORAGE_KEY_PROMPTS, JSON.stringify(updated));
    setPromptName('');
    setError(null);
  };

  const handlePromptSelect = (promptName: string) => {
    const prompt = savedPrompts.find(p => p.name === promptName);
    if (prompt) {
      setSystemPrompt(prompt.content);
      setSelectedPrompt(promptName);
    }
  };

  const handleRunEvaluation = async () => {
    if (!file && !selectedDataset) {
      setError('Please upload a CSV file or select a dataset');
      return;
    }

    if (!runName.trim()) {
      setError('Please provide a name for this evaluation run');
      return;
    }

    if (file && !datasetName.trim()) {
      setError('Please provide a name for this dataset');
      return;
    }

    // Check if using a custom system prompt
    if (systemPrompt.trim()) {
      // Check if this is a new prompt (not already saved)
      const isPromptSaved = savedPrompts.some(p => p.content === systemPrompt.trim());

      if (!isPromptSaved && !promptName.trim()) {
        setError('Please provide a name for this system prompt before running the evaluation');
        return;
      }

      // Automatically save the prompt if it's new
      if (!isPromptSaved && promptName.trim()) {
        const newPrompt: SavedPrompt = {
          name: promptName.trim(),
          content: systemPrompt.trim(),
        };
        const updated = [...savedPrompts.filter(p => p.name !== newPrompt.name), newPrompt];
        setSavedPrompts(updated);
        localStorage.setItem(STORAGE_KEY_PROMPTS, JSON.stringify(updated));
        setSelectedPrompt(newPrompt.name);
        setPromptName(''); // Clear the name field after saving
      }
    }

    setIsRunning(true);
    setError(null);
    setResults([]);
    setSummary(null);

    try {
      const response = await runEvaluation(
        file,
        null,
        HARDCODED_MODEL,
        systemPrompt || undefined,
        runName.trim(),
        file ? datasetName.trim() : selectedDataset || undefined
      );

      setResults(response.results);
      setSummary({
        total: response.total,
        cached: response.cached,
        errors: response.errors,
      });

      // Reload datasets list if we just saved a new one
      if (file && datasetName.trim()) {
        const datasets = await listDatasets();
        setAvailableDatasets(datasets);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsRunning(false);
    }
  };

  const downloadResults = () => {
    const dataStr = JSON.stringify(results, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `evaluation-results-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const downloadCSV = () => {
    const headers = ['Prompt', 'Response', 'Cached', 'Latency (ms)', 'Error'];
    const rows = results.map(r => [
      `"${r.prompt.replace(/"/g, '""')}"`,
      `"${r.response.replace(/"/g, '""')}"`,
      r.cached.toString(),
      r.latencyMs.toString(),
      r.error ? `"${r.error.replace(/"/g, '""')}"` : '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `evaluation-results-${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Run AI Evaluation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Dataset Selection or File Upload */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Select Dataset or Upload CSV
            </label>
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-4">
                <Select
                  value={selectedDataset || undefined}
                  onValueChange={handleDatasetSelect}
                  disabled={isRunning || !!file}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select existing dataset" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableDatasets.map((dataset) => (
                      <SelectItem key={dataset} value={dataset}>
                        {dataset}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">or</span>
              </div>

              <div className="flex items-center gap-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  disabled={isRunning || !!selectedDataset}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Choose CSV File
                </Button>
                {file && (
                  <span className="text-sm text-muted-foreground">
                    {file.name}
                  </span>
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              CSV must have a "prompt" column
            </p>
          </div>

          {/* Dataset Name (only shown when uploading new file) */}
          {file && (
            <div>
              <label className="block text-sm font-medium mb-2">
                Dataset Name
              </label>
              <input
                type="text"
                value={datasetName}
                onChange={(e) => setDatasetName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="e.g., customer-support-questions"
                disabled={isRunning}
              />
              <p className="text-xs text-muted-foreground mt-2">
                Give this dataset a name to reuse it later
              </p>
            </div>
          )}

          {/* Run Name */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Run Name
            </label>
            <input
              type="text"
              value={runName}
              onChange={(e) => setRunName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="e.g., customer-support-v1"
              disabled={isRunning}
            />
            <p className="text-xs text-muted-foreground mt-2">
              Give this evaluation run a unique name
            </p>
          </div>

          {/* System Prompt (Optional) */}
          <div>
            <label className="block text-sm font-medium mb-2">
              System Prompt Template (Optional)
            </label>

            {/* Prompt Selection */}
            {savedPrompts.length > 0 && (
              <div className="mb-3">
                <Select
                  value={selectedPrompt || undefined}
                  onValueChange={handlePromptSelect}
                  disabled={isRunning}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Load a saved prompt" />
                  </SelectTrigger>
                  <SelectContent>
                    {savedPrompts.map((prompt) => (
                      <SelectItem key={prompt.name} value={prompt.name}>
                        {prompt.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <Textarea
              value={systemPrompt}
              onChange={(e) => {
                setSystemPrompt(e.target.value);
                // Clear selected prompt when user modifies the content
                if (selectedPrompt) {
                  const currentPrompt = savedPrompts.find(p => p.name === selectedPrompt);
                  if (currentPrompt && currentPrompt.content !== e.target.value) {
                    setSelectedPrompt(null);
                  }
                }
              }}
              placeholder="Leave empty to use default. Use {user_message} as placeholder."
              className="min-h-[120px] max-h-[300px]"
              disabled={isRunning}
            />
            <p className="text-xs text-muted-foreground mt-2">
              Use {'{user_message}'} as a placeholder for each prompt
            </p>

            {/* Prompt Name - Required for new prompts */}
            {systemPrompt.trim() && !savedPrompts.some(p => p.content === systemPrompt.trim()) && (
              <div className="mt-3">
                <label className="block text-sm font-medium mb-2">
                  Prompt Name <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={promptName}
                    onChange={(e) => setPromptName(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                    placeholder="Required: Give this prompt a name"
                    disabled={isRunning}
                  />
                  <Button
                    onClick={saveCurrentPrompt}
                    variant="outline"
                    size="sm"
                    disabled={isRunning || !promptName.trim() || !systemPrompt.trim()}
                  >
                    Save Now
                  </Button>
                </div>
                <p className="text-xs text-red-500 mt-1">
                  This prompt will be automatically saved when you run the evaluation
                </p>
              </div>
            )}
          </div>

          {/* Run Button */}
          <Button
            onClick={handleRunEvaluation}
            disabled={(!file && !selectedDataset) || !runName.trim() || isRunning}
            className="w-full"
          >
            <Play className="mr-2 h-4 w-4" />
            {isRunning ? 'Running Evaluation...' : 'Run Evaluation'}
          </Button>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Progress */}
          {isRunning && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Processing prompts...</p>
              <Progress value={undefined} className="w-full" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results Summary */}
      {summary && (
        <Card>
          <CardHeader>
            <CardTitle>Results Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Badge variant="outline">
                Total: {summary.total}
              </Badge>
              <Badge variant="secondary">
                Cached: {summary.cached}
              </Badge>
              {summary.errors > 0 && (
                <Badge variant="destructive">
                  Errors: {summary.errors}
                </Badge>
              )}
            </div>

            <div className="flex gap-2">
              <Button onClick={downloadResults} variant="outline" size="sm">
                Download JSON
              </Button>
              <Button onClick={downloadCSV} variant="outline" size="sm">
                Download CSV
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results List */}
      {results.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Results ({results.length})</h2>

          {results.map((result, idx) => (
            <Card key={idx}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base">
                    Prompt {idx + 1}
                  </CardTitle>
                  <div className="flex gap-2 items-center">
                    {result.cached && (
                      <Badge variant="secondary">
                        <CheckCircle className="mr-1 h-3 w-3" />
                        Cached
                      </Badge>
                    )}
                    <Badge variant="outline">
                      <Clock className="mr-1 h-3 w-3" />
                      {result.latencyMs}ms
                    </Badge>
                    {result.error && (
                      <Badge variant="destructive">
                        <XCircle className="mr-1 h-3 w-3" />
                        Error
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium mb-2">Prompt:</p>
                  <p className="text-sm bg-muted p-3 rounded-md whitespace-pre-wrap">
                    {result.prompt}
                  </p>
                </div>

                <Separator />

                {result.error ? (
                  <Alert variant="destructive">
                    <XCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{result.error}</AlertDescription>
                  </Alert>
                ) : (
                  <div>
                    <p className="text-sm font-medium mb-2">Response:</p>
                    <div className="prose prose-sm max-w-none bg-muted p-3 rounded-md">
                      <ReactMarkdown>{result.response}</ReactMarkdown>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
