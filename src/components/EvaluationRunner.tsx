import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import ReactMarkdown from 'react-markdown';
import { runEvaluation, type EvaluationResult } from '@/api/evaluationApi';
import { Upload, Play, CheckCircle, XCircle, Clock } from 'lucide-react';

const HARDCODED_MODEL = 'claude-sonnet-4-5-20250929';
const STORAGE_KEY_SYSTEM_PROMPT = 'lastSystemPrompt';

export function EvaluationRunner() {
  const [file, setFile] = useState<File | null>(null);
  const [runName, setRunName] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<EvaluationResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<{ total: number; cached: number; errors: number } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load last system prompt from localStorage on mount
  useEffect(() => {
    const savedPrompt = localStorage.getItem(STORAGE_KEY_SYSTEM_PROMPT);
    if (savedPrompt) {
      setSystemPrompt(savedPrompt);
    }
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.csv')) {
        setError('Please upload a CSV file');
        return;
      }
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleRunEvaluation = async () => {
    if (!file) {
      setError('Please upload a CSV file');
      return;
    }

    if (!runName.trim()) {
      setError('Please provide a name for this evaluation run');
      return;
    }

    setIsRunning(true);
    setError(null);
    setResults([]);
    setSummary(null);

    try {
      // Save system prompt to localStorage for future use
      if (systemPrompt.trim()) {
        localStorage.setItem(STORAGE_KEY_SYSTEM_PROMPT, systemPrompt);
      }

      const response = await runEvaluation(
        file,
        null,
        HARDCODED_MODEL,
        systemPrompt || undefined,
        runName.trim()
      );

      setResults(response.results);
      setSummary({
        total: response.total,
        cached: response.cached,
        errors: response.errors,
      });
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
          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Upload CSV File
            </label>
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
                disabled={isRunning}
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
            <p className="text-xs text-muted-foreground mt-2">
              CSV must have a "prompt" column
            </p>
          </div>

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
            <Textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="Leave empty to use default. Use {user_message} as placeholder."
              rows={4}
              disabled={isRunning}
            />
            <p className="text-xs text-muted-foreground mt-2">
              Use {'{user_message}'} as a placeholder for each prompt
            </p>
          </div>

          {/* Run Button */}
          <Button
            onClick={handleRunEvaluation}
            disabled={!file || !runName.trim() || isRunning}
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
