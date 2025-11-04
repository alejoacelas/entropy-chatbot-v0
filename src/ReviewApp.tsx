import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  loadAnnotations,
  saveAnnotations,
  getAnnotation,
  setAnnotation,
  truncateText,
  exportAnnotationsToJSON,
  exportToCSV,
} from './utils';
import { listRuns, loadRun } from '@/api/evaluationApi';
import type { PromptfooResult, AnnotationsStore } from './types';

function App() {
  const [data, setData] = useState<PromptfooResult | null>(null);
  const [annotations, setAnnotations] = useState<AnnotationsStore>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [availableRuns, setAvailableRuns] = useState<string[]>([]);
  const [selectedRun, setSelectedRun] = useState<string | null>(null);
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [currentTestIdx, setCurrentTestIdx] = useState(0);
  const [localNotes, setLocalNotes] = useState('');

  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
        const runData = await loadRun(selectedRun);
        setData(runData);

        const annots = await loadAnnotations();
        setAnnotations(annots);

        const prompts = Array.from(
          new Set(
            runData.results.results.map((r: any) => r.prompt?.label || 'unknown')
          )
        ).sort() as string[];
        const providers = Array.from(
          new Set(
            runData.results.results.map((r: any) => r.provider?.label || 'unknown')
          )
        ).sort() as string[];

        if (prompts.length > 0) setSelectedPrompt(prompts[0]);
        if (providers.length > 0) setSelectedProvider(providers[0]);
      } catch (err) {
        setError(`Failed to load run data: ${err}`);
      } finally {
        setLoading(false);
      }
    };

    loadRunData();
  }, [selectedRun]);

  const prompts = data
    ? Array.from(
        new Set(data.results.results.map((r) => r.prompt?.label || 'unknown'))
      ).sort()
    : [];
  const providers = data
    ? Array.from(
        new Set(data.results.results.map((r) => r.provider?.label || 'unknown'))
      ).sort()
    : [];

  const filteredResults =
    data && selectedPrompt && selectedProvider
      ? data.results.results.filter(
          (r) =>
            r.prompt?.label === selectedPrompt &&
            r.provider?.label === selectedProvider
        )
      : [];

  const currentResult = filteredResults[currentTestIdx];

  const currentAnnotation = currentResult
    ? getAnnotation(
        annotations,
        data!.evalId,
        currentResult.testIdx,
        selectedPrompt!,
        selectedProvider!
      )
    : { rating: 0, notes: '' };

  useEffect(() => {
    setLocalNotes(currentAnnotation.notes);
  }, [currentAnnotation.notes, currentTestIdx]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const targetElement = event.target as HTMLElement;

      if (event.key >= '0' && event.key <= '5') {
        if (
          targetElement.tagName !== 'INPUT' &&
          targetElement.tagName !== 'TEXTAREA'
        ) {
          event.preventDefault();
          const newRating = parseInt(event.key);
          handleSaveRating(newRating, currentAnnotation.notes);
        }
      }

      if (event.key === 'Enter' && !event.metaKey && !event.ctrlKey) {
        if (
          targetElement.tagName !== 'TEXTAREA' &&
          targetElement.tagName !== 'INPUT'
        ) {
          event.preventDefault();
          textareaRef.current?.focus();
        }
      }

      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        if (targetElement.tagName === 'TEXTAREA') {
          event.preventDefault();
          handleSaveAndNext();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentAnnotation, currentResult, selectedPrompt, selectedProvider, currentTestIdx, filteredResults, data, annotations]);

  const handleSaveRating = (rating: number, notes: string) => {
    if (!currentResult || !selectedPrompt || !selectedProvider) return;

    const updated = setAnnotation(
      annotations,
      data!.evalId,
      currentResult.testIdx,
      selectedPrompt,
      selectedProvider,
      rating,
      notes
    );
    setAnnotations(updated);
    saveAnnotations(updated);
  };

  const handleSaveAndNext = () => {
    if (!currentResult || !selectedPrompt || !selectedProvider) return;

    handleSaveRating(currentAnnotation.rating, localNotes);

    if (currentTestIdx < filteredResults.length - 1) {
      setCurrentTestIdx(currentTestIdx + 1);
    }
  };

  const ratingLabels: Record<number, string> = {
    0: '⏳ Not rated',
    1: '❌ Poor',
    2: '⚠️ Needs improvement',
    3: '✓ Acceptable',
    4: '✓✓ Good',
    5: '✓✓✓ Excellent',
  };

  const allRatings = filteredResults.map((r) =>
    getAnnotation(
      annotations,
      data!.evalId,
      r.testIdx,
      selectedPrompt!,
      selectedProvider!
    ).rating
  );
  const ratedItems = allRatings.filter((r) => r > 0).length;
  const avgRating = ratedItems > 0 ? allRatings.reduce((a, b) => a + b, 0) / ratedItems : 0;

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

  if (!currentResult || !data) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Alert className="max-w-md">
          <AlertTitle>No Results</AlertTitle>
          <AlertDescription>No results found for this combination</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <div className="w-90 border-r bg-card p-6 flex flex-col gap-6 overflow-y-auto overflow-x-hidden">
        <div className="flex flex-col gap-4">
          <h3 className="text-lg font-semibold">🎯 Filters</h3>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Run</label>
            <Select value={selectedRun || undefined} onValueChange={(value) => {
              setSelectedRun(value);
              setCurrentTestIdx(0);
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Select run" />
              </SelectTrigger>
              <SelectContent>
                {availableRuns.map((run) => (
                  <SelectItem key={run} value={run}>{run}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Prompt</label>
            <Select value={selectedPrompt || undefined} onValueChange={(value) => {
              // Remember current testIdx to maintain position
              const currentTestId = currentResult?.testIdx;
              setSelectedPrompt(value);

              // After state updates, find the same test in new filtered results
              if (currentTestId !== undefined && data && selectedProvider) {
                const newFilteredResults = data.results.results.filter(
                  (r) => r.prompt?.label === value && r.provider?.label === selectedProvider
                );
                const newIdx = newFilteredResults.findIndex(r => r.testIdx === currentTestId);
                setCurrentTestIdx(newIdx >= 0 ? newIdx : 0);
              }
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Select prompt" />
              </SelectTrigger>
              <SelectContent>
                {prompts.map((p) => (
                  <SelectItem key={p} value={p}>{p.split(' ')[0]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Model</label>
            <Select value={selectedProvider || undefined} onValueChange={(value) => {
              // Remember current testIdx to maintain position
              const currentTestId = currentResult?.testIdx;
              setSelectedProvider(value);

              // After state updates, find the same test in new filtered results
              if (currentTestId !== undefined && data && selectedPrompt) {
                const newFilteredResults = data.results.results.filter(
                  (r) => r.prompt?.label === selectedPrompt && r.provider?.label === value
                );
                const newIdx = newFilteredResults.findIndex(r => r.testIdx === currentTestId);
                setCurrentTestIdx(newIdx >= 0 ? newIdx : 0);
              }
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Select model" />
              </SelectTrigger>
              <SelectContent>
                {providers.map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Separator />

        <div className="flex flex-col gap-4">
          <h3 className="text-lg font-semibold">📍 Navigation</h3>

          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Progress</span>
            <Badge variant="secondary">{ratedItems}/{filteredResults.length} rated</Badge>
          </div>
          <Progress value={(ratedItems / filteredResults.length) * 100 || 0} />

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setCurrentTestIdx(Math.max(0, currentTestIdx - 1))}
              disabled={currentTestIdx === 0}
            >
              ← Previous
            </Button>
            <Button
              className="flex-1"
              onClick={() => setCurrentTestIdx(Math.min(filteredResults.length - 1, currentTestIdx + 1))}
              disabled={currentTestIdx === filteredResults.length - 1}
            >
              Next →
            </Button>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Jump to item</label>
            <Select value={String(currentTestIdx)} onValueChange={(value) => setCurrentTestIdx(parseInt(value))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {filteredResults.map((r, idx) => (
                  <SelectItem key={idx} value={String(idx)}>
                    #{idx + 1} - {truncateText(r.testCase?.vars?.prompt || 'Q', 40)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Separator />

        <div className="flex flex-col gap-4">
          <h3 className="text-lg font-semibold">💾 Export</h3>
          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => exportToCSV(data!, annotations)}
            >
              📊 Download CSV
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => exportAnnotationsToJSON(annotations)}
            >
              📄 Download Annotations JSON
            </Button>
          </div>

        <Separator />

        <div className="flex flex-col gap-4">
          <h3 className="text-lg font-semibold">📊 Stats</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Rated</p>
              <p className="text-lg font-bold">{ratedItems}/{filteredResults.length}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Average</p>
              <p className="text-lg font-bold">{ratedItems > 0 ? avgRating.toFixed(1) : 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Excellent (5)</p>
              <p className="text-lg font-bold">{allRatings.filter((r) => r === 5).length}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Poor (1)</p>
              <p className="text-lg font-bold">{allRatings.filter((r) => r === 1).length}</p>
            </div>
          </div>
        </div>

        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold">Review Results</h1>
            <p className="text-sm text-muted-foreground">
              Test {currentTestIdx + 1} of {filteredResults.length}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Question and Response */}
            <div className="lg:col-span-2 flex flex-col gap-6">
              {/* Question */}
              <Card>
                <CardContent className="">
                  <p className="text-sm">{currentResult.testCase?.vars?.prompt || 'N/A'}</p>
                </CardContent>
              </Card>

              <Separator />

              {/* Model Response */}
              <Card>
                <CardContent className="prose prose-sm max-w-none">
                  <ReactMarkdown>{currentResult.response?.output || 'No output'}</ReactMarkdown>
                </CardContent>
              </Card>

              {/* Test Case Metadata */}
              <div className="flex flex-col gap-4">
                <h4 className="text-lg font-semibold">📌 Test Case Metadata</h4>
                {Object.entries(currentResult.testCase?.vars || {})
                  .filter(([key]) => key !== 'prompt')
                  .map(([key, value]) => (
                    <div key={key}>
                      <p className="text-xs text-muted-foreground font-bold">{key}</p>
                      <p className="text-xs">
                        {typeof value === 'string'
                          ? truncateText(value, 200)
                          : JSON.stringify(value)}
                      </p>
                    </div>
                  ))}
              </div>

              {/* Evaluation Metrics */}
              <div className="flex flex-col gap-4">
                <h4 className="text-lg font-semibold">📊 Evaluation Metrics</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="">
                      <p className="text-xs text-muted-foreground">Status</p>
                      <p className="text-sm font-bold">{currentResult.gradingResult?.pass ? '✓ Pass' : '✗ Fail'}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="">
                      <p className="text-xs text-muted-foreground">Score</p>
                      <p className="text-sm font-bold">{currentResult.gradingResult?.score || 0}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="">
                      <p className="text-xs text-muted-foreground">Latency</p>
                      <p className="text-sm font-bold">{currentResult.latencyMs}ms</p>
                    </CardContent>
                  </Card>
                </div>
                {currentResult.gradingResult?.reason && (
                  <p className="text-xs">
                    <strong>Reason:</strong> {currentResult.gradingResult.reason}
                  </p>
                )}
              </div>
            </div>

            {/* Right Column - Rating Section */}
            <div className="lg:col-span-1">
              <Card className="sticky top-6 bg-blue-50">
                <CardHeader>
                  <CardTitle>⭐ Your Evaluation</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-6">
                  <div className="flex flex-col gap-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Rating</span>
                      <Badge variant="secondary">{ratingLabels[currentAnnotation.rating]}</Badge>
                    </div>
                    <Slider
                      min={0}
                      max={5}
                      step={1}
                      value={[currentAnnotation.rating]}
                      onValueChange={(value) => handleSaveRating(value[0], currentAnnotation.notes)}
                    />
                    <div className="flex justify-between text-xs text-muted-foreground px-1">
                      <span>0</span>
                      <span>1</span>
                      <span>2</span>
                      <span>3</span>
                      <span>4</span>
                      <span>5</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Or press 0-5</p>
                  </div>

                  <Separator />

                  <div className="flex flex-col gap-2">
                    <span className="text-sm font-medium">Notes</span>
                    <Textarea
                      ref={textareaRef}
                      placeholder="Add comments..."
                      value={localNotes}
                      onChange={(e) => setLocalNotes(e.currentTarget.value)}
                      rows={8}
                      className="min-h-[200px]"
                    />
                    <p className="text-xs text-muted-foreground">Enter to focus · ⌘↵ to save</p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      className="flex-1"
                      onClick={() => handleSaveRating(currentAnnotation.rating, localNotes)}
                    >
                      💾 Save
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={handleSaveAndNext}
                    >
                      Next
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
