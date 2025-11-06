import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { listRuns, loadRun } from '@/api/evaluationApi';

interface SavedRun {
  runName: string;
  datasetName: string;
  model: string;
  timestamp: number;
  promptResults: Array<{
    promptName: string;
    promptContent: string;
    results: Array<{
      prompt: string;
      response: string;
      cached: boolean;
      latencyMs: number;
      error?: string;
    }>;
  }>;
  summary: {
    totalPrompts: number;
    totalTests: number;
    cached: number;
    errors: number;
  };
}

function ReviewApp() {
  const [availableRuns, setAvailableRuns] = useState<string[]>([]);
  const [selectedRun, setSelectedRun] = useState<string | null>(null);
  const [runData, setRunData] = useState<SavedRun | null>(null);
  const [selectedPromptIndex, setSelectedPromptIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load available runs on mount
  useEffect(() => {
    const loadAvailableRuns = async () => {
      try {
        const runs = await listRuns();
        setAvailableRuns(runs);

        if (runs.length > 0) {
          setSelectedRun(runs[0]);
        } else {
          setError('No saved runs found. Run an evaluation first.');
          setLoading(false);
        }
      } catch (err) {
        setError(`Failed to load runs: ${err}`);
        setLoading(false);
      }
    };

    loadAvailableRuns();
  }, []);

  // Load selected run data
  useEffect(() => {
    if (!selectedRun) return;

    const loadRunData = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await loadRun(selectedRun);
        setRunData(data);
        setSelectedPromptIndex(0);
        setCurrentQuestionIndex(0);
      } catch (err) {
        setError(`Failed to load run data: ${err}`);
      } finally {
        setLoading(false);
      }
    };

    loadRunData();
  }, [selectedRun]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!runData || !runData.promptResults || runData.promptResults.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Alert className="max-w-md">
          <AlertTitle>No Results</AlertTitle>
          <AlertDescription>No prompt results found in this run</AlertDescription>
        </Alert>
      </div>
    );
  }

  const currentPromptResult = runData.promptResults[selectedPromptIndex];
  const currentQuestion = currentPromptResult.results[currentQuestionIndex];
  const totalQuestions = currentPromptResult.results.length;

  const handlePrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePromptChange = (index: string) => {
    setSelectedPromptIndex(parseInt(index));
    setCurrentQuestionIndex(0);
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header with Run Selection */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Review Evaluation Results</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Run Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">Evaluation Run</label>
            <Select value={selectedRun || undefined} onValueChange={setSelectedRun}>
              <SelectTrigger>
                <SelectValue placeholder="Select a run" />
              </SelectTrigger>
              <SelectContent>
                {availableRuns.map((run) => (
                  <SelectItem key={run} value={run}>
                    {run}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Run Metadata */}
          {runData && (
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">Dataset: {runData.datasetName}</Badge>
              <Badge variant="outline">Model: {runData.model}</Badge>
              <Badge variant="outline">{runData.summary.totalPrompts} Prompts</Badge>
              <Badge variant="outline">{runData.summary.totalTests} Tests</Badge>
              <Badge variant="secondary">{runData.summary.cached} Cached</Badge>
              {runData.summary.errors > 0 && (
                <Badge variant="destructive">{runData.summary.errors} Errors</Badge>
              )}
            </div>
          )}

          {/* Prompt Selection */}
          {runData && runData.promptResults.length > 1 && (
            <div>
              <label className="block text-sm font-medium mb-2">System Prompt</label>
              <Select
                value={selectedPromptIndex.toString()}
                onValueChange={handlePromptChange}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {runData.promptResults.map((pr, idx) => (
                    <SelectItem key={idx} value={idx.toString()}>
                      {pr.promptName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Current Prompt Details */}
      {currentPromptResult && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>System Prompt: {currentPromptResult.promptName}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-muted p-4 rounded-md">
              <pre className="text-sm whitespace-pre-wrap font-mono">
                {currentPromptResult.promptContent}
              </pre>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Question Navigation */}
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="outline"
          onClick={handlePrevQuestion}
          disabled={currentQuestionIndex === 0}
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          Previous
        </Button>

        <span className="text-sm text-muted-foreground">
          Question {currentQuestionIndex + 1} of {totalQuestions}
        </span>

        <Button
          variant="outline"
          onClick={handleNextQuestion}
          disabled={currentQuestionIndex === totalQuestions - 1}
        >
          Next
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>

      {/* Question and Response */}
      {currentQuestion && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Question */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Question</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{currentQuestion.prompt}</p>
              <div className="mt-4 flex gap-2">
                {currentQuestion.cached && (
                  <Badge variant="secondary">Cached</Badge>
                )}
                {currentQuestion.error && (
                  <Badge variant="destructive">Error</Badge>
                )}
                <Badge variant="outline">{currentQuestion.latencyMs}ms</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Response */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Response</CardTitle>
            </CardHeader>
            <CardContent>
              {currentQuestion.error ? (
                <Alert variant="destructive">
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{currentQuestion.error}</AlertDescription>
                </Alert>
              ) : (
                <div className="prose prose-sm max-w-none">
                  <ReactMarkdown>{currentQuestion.response}</ReactMarkdown>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

export default ReviewApp;
