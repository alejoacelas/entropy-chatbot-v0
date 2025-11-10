import { useEffect, useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { ChevronLeft, ChevronRight, Star, Download } from 'lucide-react';
import { listRuns, loadRun, loadRatings, saveRating as saveRatingApi } from '@/api/evaluationApi';
import type { SavedRating } from '@/api/evaluationApi';

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

const RATING_USERS = ['Alejo', 'Jeffrey', 'Guest'];

function ReviewApp() {
  const [availableRuns, setAvailableRuns] = useState<string[]>([]);
  const [selectedRun, setSelectedRun] = useState<string | null>(null);
  const [runData, setRunData] = useState<SavedRun | null>(null);
  const [selectedPromptIndex, setSelectedPromptIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Rating state
  const [ratingUser, setRatingUser] = useState<string>(RATING_USERS[0]);
  const [currentRating, setCurrentRating] = useState<number>(0);
  const [currentComment, setCurrentComment] = useState<string>('');
  const [allRatings, setAllRatings] = useState<SavedRating | null>(null);
  const commentInputRef = useRef<HTMLTextAreaElement>(null);

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

  // Load ratings when run or user changes
  useEffect(() => {
    if (!selectedRun || !ratingUser) return;

    const loadRatingsData = async () => {
      try {
        const ratings = await loadRatings(selectedRun, ratingUser);
        setAllRatings(ratings);
      } catch (err) {
        console.error('Failed to load ratings:', err);
        // Initialize empty ratings if none exist
        setAllRatings({
          runName: selectedRun,
          ratingUser,
          timestamp: Date.now(),
          ratings: [],
        });
      }
    };

    loadRatingsData();
  }, [selectedRun, ratingUser]);

  // Update current rating/comment when question or ratings change
  useEffect(() => {
    if (!allRatings) {
      setCurrentRating(0);
      setCurrentComment('');
      return;
    }

    const existingRating = allRatings.ratings.find(
      r => r.promptIndex === selectedPromptIndex && r.questionIndex === currentQuestionIndex
    );

    if (existingRating) {
      setCurrentRating(existingRating.rating);
      setCurrentComment(existingRating.comment);
    } else {
      setCurrentRating(0);
      setCurrentComment('');
    }
  }, [allRatings, selectedPromptIndex, currentQuestionIndex]);

  // Keyboard shortcuts
  useEffect(() => {
    // Don't set up shortcuts if data isn't ready
    if (!runData || !runData.promptResults || runData.promptResults.length === 0) {
      return;
    }

    const totalQuestions = runData.promptResults[selectedPromptIndex]?.results?.length || 0;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in the comment box
      if (document.activeElement === commentInputRef.current) {
        // Allow Ctrl+Enter to move to next question even from comment box
        if (e.ctrlKey && e.key === 'Enter') {
          e.preventDefault();
          if (currentQuestionIndex < totalQuestions - 1) {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
          }
        }
        return;
      }

      // Number keys 1-5 for rating
      if (['1', '2', '3', '4', '5'].includes(e.key)) {
        e.preventDefault();
        const newRating = parseInt(e.key);
        if (!selectedRun || !ratingUser) return;

        setCurrentRating(newRating);

        // Save rating to backend
        saveRatingApi(
          selectedRun,
          ratingUser,
          selectedPromptIndex,
          currentQuestionIndex,
          newRating,
          currentComment
        ).then(() => {
          // Update local state
          if (allRatings) {
            const updatedRatings = allRatings.ratings.filter(
              r => !(r.promptIndex === selectedPromptIndex && r.questionIndex === currentQuestionIndex)
            );
            updatedRatings.push({
              promptIndex: selectedPromptIndex,
              questionIndex: currentQuestionIndex,
              rating: newRating,
              comment: currentComment,
              timestamp: Date.now(),
            });
            setAllRatings({
              ...allRatings,
              ratings: updatedRatings,
              timestamp: Date.now(),
            });
          }
        }).catch(err => {
          console.error('Failed to save rating:', err);
        });
      }

      // Enter to focus comment box
      if (e.key === 'Enter' && !e.ctrlKey) {
        e.preventDefault();
        commentInputRef.current?.focus();
      }

      // Ctrl+Enter to move to next question
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        if (currentQuestionIndex < totalQuestions - 1) {
          setCurrentQuestionIndex(currentQuestionIndex + 1);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [runData, currentQuestionIndex, selectedPromptIndex, currentComment, currentRating, selectedRun, ratingUser, allRatings]);

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

  const handleRatingChange = async (newRating: number) => {
    if (!selectedRun || !ratingUser) return;

    setCurrentRating(newRating);

    // Save rating to backend
    try {
      await saveRatingApi(
        selectedRun,
        ratingUser,
        selectedPromptIndex,
        currentQuestionIndex,
        newRating,
        currentComment
      );

      // Update local state
      if (allRatings) {
        const updatedRatings = allRatings.ratings.filter(
          r => !(r.promptIndex === selectedPromptIndex && r.questionIndex === currentQuestionIndex)
        );
        updatedRatings.push({
          promptIndex: selectedPromptIndex,
          questionIndex: currentQuestionIndex,
          rating: newRating,
          comment: currentComment,
          timestamp: Date.now(),
        });
        setAllRatings({
          ...allRatings,
          ratings: updatedRatings,
          timestamp: Date.now(),
        });
      }
    } catch (err) {
      console.error('Failed to save rating:', err);
    }
  };

  const handleCommentChange = async (newComment: string) => {
    if (!selectedRun || !ratingUser) return;

    setCurrentComment(newComment);

    // Save rating to backend (only if there's a rating)
    if (currentRating > 0) {
      try {
        await saveRatingApi(
          selectedRun,
          ratingUser,
          selectedPromptIndex,
          currentQuestionIndex,
          currentRating,
          newComment
        );

        // Update local state
        if (allRatings) {
          const updatedRatings = allRatings.ratings.filter(
            r => !(r.promptIndex === selectedPromptIndex && r.questionIndex === currentQuestionIndex)
          );
          updatedRatings.push({
            promptIndex: selectedPromptIndex,
            questionIndex: currentQuestionIndex,
            rating: currentRating,
            comment: newComment,
            timestamp: Date.now(),
          });
          setAllRatings({
            ...allRatings,
            ratings: updatedRatings,
            timestamp: Date.now(),
          });
        }
      } catch (err) {
        console.error('Failed to save rating:', err);
      }
    }
  };

  const handleExportToCSV = async () => {
    if (!runData || !selectedRun) return;

    // Load all ratings for all users
    const allUserRatings: Record<string, SavedRating> = {};
    for (const user of RATING_USERS) {
      try {
        const ratings = await loadRatings(selectedRun, user);
        allUserRatings[user] = ratings;
      } catch (err) {
        console.log(`No ratings found for user ${user}`);
        // User may not have rated anything yet
        allUserRatings[user] = {
          runName: selectedRun,
          ratingUser: user,
          timestamp: Date.now(),
          ratings: [],
        };
      }
    }

    // Build CSV headers
    const headers = ['Question'];
    runData.promptResults.forEach((pr) => {
      headers.push(`Response-${pr.promptName}`);
      headers.push(`Error-${pr.promptName}`);
      RATING_USERS.forEach((user) => {
        headers.push(`Rating-${pr.promptName}-${user}`);
        headers.push(`Comments-${pr.promptName}-${user}`);
      });
    });

    // Build CSV rows
    const rows: string[][] = [headers];

    // Assuming all prompts have the same number of questions
    const numQuestions = runData.promptResults[0].results.length;

    for (let questionIndex = 0; questionIndex < numQuestions; questionIndex++) {
      const row: string[] = [];

      // Add question text (from first prompt)
      const question = runData.promptResults[0].results[questionIndex].prompt;
      row.push(escapeCSV(question));

      // For each prompt, add response and ratings
      runData.promptResults.forEach((pr, promptIndex) => {
        const result = pr.results[questionIndex];

        // Add response
        row.push(escapeCSV(result.response));
        row.push(escapeCSV(result.error || ''));

        // Add ratings from all users
        RATING_USERS.forEach((user) => {
          const userRatings = allUserRatings[user];
          const rating = userRatings?.ratings.find(
            r => r.promptIndex === promptIndex && r.questionIndex === questionIndex
          );

          row.push(rating?.rating.toString() || '');
          row.push(escapeCSV(rating?.comment || ''));
        });
      });

      rows.push(row);
    }

    // Convert to CSV string
    const csvContent = rows.map(row => row.join(',')).join('\n');

    // Download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${selectedRun}_export.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const escapeCSV = (str: string): string => {
    if (!str) return '';
    // If string contains comma, newline, or quote, wrap in quotes and escape quotes
    if (str.includes(',') || str.includes('\n') || str.includes('"')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  return (
    <div className="container mx-auto p-0">
      {/* Header with Run Selection */}
      <Card className="mb-6">
        <CardContent className="space-y-4">
          {/* Run Selection, Prompt Selection, and Rating User on the same row */}
          <div className="flex flex-col gap-4 md:flex-row md:gap-6 md:items-end">
            <div className="flex-1 min-w-0">
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

            {runData && runData.promptResults.length > 1 && (
              <div className="flex-1 min-w-0">
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

            <div className="flex-1 min-w-0">
              <label className="block text-sm font-medium mb-2">Rating User</label>
              <Select value={ratingUser} onValueChange={setRatingUser}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RATING_USERS.map((user) => (
                    <SelectItem key={user} value={user}>
                      {user}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleExportToCSV}
              variant="outline"
              disabled={!runData}
              className="whitespace-nowrap"
            >
              <Download className="mr-2 h-4 w-4" />
              Export to CSV
            </Button>
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

        </CardContent>
      </Card>

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
        <div className="flex flex-row gap-6">
          {/* Left Column: Question + Rating */}
          <div className="w-[500px] space-y-6 flex-initial">
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

            {/* Rating Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Rating</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Star Rating */}
                <div>
                  <div className="flex items-center gap-1 mb-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => handleRatingChange(star)}
                        className="transition-colors hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded"
                        aria-label={`Rate ${star} stars`}
                      >
                        <Star
                          className={`h-8 w-8 ${
                            star <= currentRating
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-gray-300'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Press 1-5 to rate, Enter to comment, Ctrl+Enter for next question
                  </p>
                </div>

                {/* Comment Input */}
                <div>
                  <label className="block text-sm font-medium mb-2">Comments</label>
                  <Textarea
                    ref={commentInputRef}
                    value={currentComment}
                    onChange={(e) => handleCommentChange(e.target.value)}
                    placeholder="Add your comments here..."
                    rows={3}
                    className="resize-none"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Response */}
          <Card className="flex flex-col flex-1">
            <CardHeader>
              <CardTitle className="text-lg">Response</CardTitle>
            </CardHeader>
            <CardContent className="flex-1">
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

      {/* Current Prompt Details (moved to the bottom) */}
      {currentPromptResult && (
        <Card className="mt-6">
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
    </div>
  );
}

export default ReviewApp;
