import { useEffect, useRef, useState } from 'react';
import {
  AppShell,
  Box,
  Button,
  Grid,
  Group,
  Progress,
  Select,
  SimpleGrid,
  Slider,
  Stack,
  Text,
  Textarea,
  Title,
  Badge,
  Divider,
  Alert,
  Loader,
  Center,
  ScrollArea,
} from '@mantine/core';
import ReactMarkdown from 'react-markdown';
import {
  loadPromptfooResults,
  loadAnnotations,
  saveAnnotations,
  getAnnotation,
  setAnnotation,
  truncateText,
} from './utils/data';
import type { PromptfooResult, AnnotationsStore } from './types';
import './App.css';

function App() {
  const [data, setData] = useState<PromptfooResult | null>(null);
  const [annotations, setAnnotations] = useState<AnnotationsStore>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [currentTestIdx, setCurrentTestIdx] = useState(0);
  const [localNotes, setLocalNotes] = useState('');

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const promptfooData = await loadPromptfooResults();
        if (!promptfooData) {
          setError('No evaluation results found. Run promptfoo first.');
          setLoading(false);
          return;
        }

        setData(promptfooData);

        // Load annotations
        const annots = await loadAnnotations();
        setAnnotations(annots);

        // Set initial selections
        const prompts = Array.from(
          new Set(
            promptfooData.results.results.map((r) => r.prompt?.label || 'unknown')
          )
        ).sort();
        const providers = Array.from(
          new Set(
            promptfooData.results.results.map((r) => r.provider?.label || 'unknown')
          )
        ).sort();

        if (prompts.length > 0) setSelectedPrompt(prompts[0]);
        if (providers.length > 0) setSelectedProvider(providers[0]);
      } catch (err) {
        setError(`Failed to load data: ${err}`);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Get unique prompts and providers
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

  // Filter results
  const filteredResults =
    data && selectedPrompt && selectedProvider
      ? data.results.results.filter(
          (r) =>
            r.prompt?.label === selectedPrompt &&
            r.provider?.label === selectedProvider
        )
      : [];

  const currentResult = filteredResults[currentTestIdx];

  // Get current annotation
  const currentAnnotation = currentResult
    ? getAnnotation(
        annotations,
        data!.evalId,
        currentResult.testIdx,
        selectedPrompt!,
        selectedProvider!
      )
    : { rating: 0, notes: '' };

  // Sync localNotes when currentAnnotation changes
  useEffect(() => {
    setLocalNotes(currentAnnotation.notes);
  }, [currentAnnotation.notes, currentTestIdx]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const targetElement = event.target as HTMLElement;

      // Number keys 0-5 to set rating
      if (event.key >= '0' && event.key <= '5') {
        // Only handle if not typing in an input/textarea
        if (
          targetElement.tagName !== 'INPUT' &&
          targetElement.tagName !== 'TEXTAREA'
        ) {
          event.preventDefault();
          const newRating = parseInt(event.key);
          handleSaveRating(newRating, currentAnnotation.notes);
        }
      }

      // Enter to focus textarea
      if (event.key === 'Enter' && !event.metaKey && !event.ctrlKey) {
        if (
          targetElement.tagName !== 'TEXTAREA' &&
          targetElement.tagName !== 'INPUT'
        ) {
          event.preventDefault();
          textareaRef.current?.focus();
        }
      }

      // Cmd+Enter (or Ctrl+Enter) to save and move to next
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

  // Calculate stats
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
      <Center style={{ height: '100vh' }}>
        <Loader />
      </Center>
    );
  }

  if (error) {
    return (
      <Center style={{ height: '100vh' }}>
        <Alert color="red" title="Error">
          {error}
        </Alert>
      </Center>
    );
  }

  if (!currentResult || !data) {
    return (
      <Center style={{ height: '100vh' }}>
        <Alert color="yellow" title="No Results">
          No results found for this combination
        </Alert>
      </Center>
    );
  }

  return (
    <AppShell
      navbar={{
        width: 280,
        breakpoint: 'sm',
        collapsed: { mobile: true },
      }}
      padding="xs"
    >
      <AppShell.Navbar p="md">
        <Stack h="100%">
          <Title order={3}>🎯 Filters</Title>

          <Select
            label="Prompt"
            placeholder="Select prompt"
            data={prompts}
            value={selectedPrompt}
            onChange={(value) => {
              setSelectedPrompt(value);
              setCurrentTestIdx(0);
            }}
          />

          <Select
            label="Model"
            placeholder="Select model"
            data={providers}
            value={selectedProvider}
            onChange={(value) => {
              setSelectedProvider(value);
              setCurrentTestIdx(0);
            }}
          />

          <Divider />

          <Title order={3}>📍 Navigation</Title>

          <Group justify="space-between">
            <Text size="sm" fw={500}>
              Progress
            </Text>
            <Badge variant="light" size="lg">
              {ratedItems}/{filteredResults.length} rated
            </Badge>
          </Group>
          <Progress
            value={
              (ratedItems / filteredResults.length) * 100 || 0
            }
          />

          <Group grow>
            <Button
              variant="default"
              onClick={() =>
                setCurrentTestIdx(Math.max(0, currentTestIdx - 1))
              }
              disabled={currentTestIdx === 0}
            >
              ← Previous
            </Button>
            <Button
              onClick={() =>
                setCurrentTestIdx(
                  Math.min(filteredResults.length - 1, currentTestIdx + 1)
                )
              }
              disabled={currentTestIdx === filteredResults.length - 1}
            >
              Next →
            </Button>
          </Group>

          <Select
            label="Jump to item"
            placeholder="Select item"
            data={filteredResults.map((r, idx) => ({
              value: String(idx),
              label: `#${idx + 1} - ${truncateText(
                r.testCase?.vars?.prompt || 'Q',
                40
              )}`,
            }))}
            value={String(currentTestIdx)}
            onChange={(value) => setCurrentTestIdx(parseInt(value || '0'))}
          />

          <Divider />

          <Title order={3}>📊 Stats</Title>
          <SimpleGrid cols={2}>
            <Box>
              <Text size="xs" c="dimmed">
                Rated
              </Text>
              <Text size="lg" fw={700}>
                {ratedItems}/{filteredResults.length}
              </Text>
            </Box>
            <Box>
              <Text size="xs" c="dimmed">
                Average
              </Text>
              <Text size="lg" fw={700}>
                {ratedItems > 0 ? avgRating.toFixed(1) : 'N/A'}
              </Text>
            </Box>
            <Box>
              <Text size="xs" c="dimmed">
                Excellent (5)
              </Text>
              <Text size="lg" fw={700}>
                {allRatings.filter((r) => r === 5).length}
              </Text>
            </Box>
            <Box>
              <Text size="xs" c="dimmed">
                Poor (1)
              </Text>
              <Text size="lg" fw={700}>
                {allRatings.filter((r) => r === 1).length}
              </Text>
            </Box>
          </SimpleGrid>
        </Stack>
      </AppShell.Navbar>

      <AppShell.Main>
        <Stack>
          <Title>Review Results</Title>
          <Text c="dimmed" size="sm">
            Test {currentTestIdx + 1} of {filteredResults.length}
          </Text>
        </Stack>

        <Grid gutter="md" mt="md">
          <Grid.Col span={{ base: 12, lg: 8 }}>
            <Stack>
              {/* Question */}
              <Box
                p="md"
                style={{
                  backgroundColor: 'var(--mantine-color-gray-0)',
                  borderRadius: 'var(--mantine-radius-md)',
                  border: '1px solid var(--mantine-color-gray-2)',
                }}
              >
                <Text size="sm">{currentResult.testCase?.vars?.prompt || 'N/A'}</Text>
              </Box>

              <Divider />

              {/* Model Response */}
              <ScrollArea>
                <Box
                  p="md"
                  style={{
                    backgroundColor: 'var(--mantine-color-gray-0)',
                    borderRadius: 'var(--mantine-radius-md)',
                    border: '1px solid var(--mantine-color-gray-2)',
                    minHeight: '200px',
                    fontSize: '0.9rem',
                    lineHeight: 1.5,
                  }}
                >
                  <ReactMarkdown>{currentResult.response?.output || 'No output'}</ReactMarkdown>
                </Box>
              </ScrollArea>

              {/* Evaluation Metrics */}
              <Stack gap="xs">
                <Title order={4}>📊 Evaluation Metrics</Title>
                <SimpleGrid cols={{ base: 1, sm: 3 }}>
                  <Box
                    p="md"
                    style={{
                      backgroundColor: 'var(--mantine-color-gray-0)',
                      borderRadius: 'var(--mantine-radius-md)',
                      border: '1px solid var(--mantine-color-gray-2)',
                    }}
                  >
                    <Text size="xs" c="dimmed">
                      Status
                    </Text>
                    <Text size="sm" fw={700}>
                      {currentResult.gradingResult?.pass ? '✓ Pass' : '✗ Fail'}
                    </Text>
                  </Box>
                  <Box
                    p="md"
                    style={{
                      backgroundColor: 'var(--mantine-color-gray-0)',
                      borderRadius: 'var(--mantine-radius-md)',
                      border: '1px solid var(--mantine-color-gray-2)',
                    }}
                  >
                    <Text size="xs" c="dimmed">
                      Score
                    </Text>
                    <Text size="sm" fw={700}>{currentResult.gradingResult?.score || 0}</Text>
                  </Box>
                  <Box
                    p="md"
                    style={{
                      backgroundColor: 'var(--mantine-color-gray-0)',
                      borderRadius: 'var(--mantine-radius-md)',
                      border: '1px solid var(--mantine-color-gray-2)',
                    }}
                  >
                    <Text size="xs" c="dimmed">
                      Latency
                    </Text>
                    <Text size="sm" fw={700}>{currentResult.latencyMs}ms</Text>
                  </Box>
                </SimpleGrid>
                {currentResult.gradingResult?.reason && (
                  <Text size="xs">
                    <strong>Reason:</strong> {currentResult.gradingResult.reason}
                  </Text>
                )}
              </Stack>

              {/* Test Case Metadata */}
              <Stack gap="xs">
                <Title order={4}>📌 Test Case Metadata</Title>
                {Object.entries(currentResult.testCase?.vars || {})
                  .filter(
                    ([key]) =>
                      ![
                        'prompt',
                        'Source',
                        'Bot current capability expectations; assuming we have Bot Guide correct, the Bot...',
                        'How good of a test for the Bot is this question?',
                        'Applies to:',
                        'JP Answer',
                        'Notes',
                      ].includes(key) || key === 'prompt'
                  )
                  .slice(0, 4)
                  .map(([key, value]) => (
                    <Box key={key}>
                      <Text size="xs" c="dimmed" fw={700}>
                        {key}
                      </Text>
                      <Text size="xs">
                        {typeof value === 'string'
                          ? truncateText(value, 200)
                          : JSON.stringify(value)}
                      </Text>
                    </Box>
                  ))}
              </Stack>
            </Stack>
          </Grid.Col>

          <Grid.Col span={{ base: 12, lg: 4 }}>
            {/* Rating Section */}
            <Box
              p="md"
              style={{
                backgroundColor: 'var(--mantine-color-blue-0)',
                borderRadius: 'var(--mantine-radius-md)',
                border: '1px solid var(--mantine-color-blue-2)',
                position: 'sticky',
                top: 'var(--mantine-spacing-sm)',
              }}
            >
              <Stack>
                <Title order={4}>⭐ Your Evaluation</Title>

                <Stack gap="lg">
                  <Group justify="space-between">
                    <Text size="sm" fw={500}>Rating</Text>
                    <Badge size="sm">{ratingLabels[currentAnnotation.rating]}</Badge>
                  </Group>
                  <Slider
                    min={0}
                    max={5}
                    step={1}
                    value={currentAnnotation.rating}
                    onChange={(value) =>
                      handleSaveRating(value, currentAnnotation.notes)
                    }
                    marks={[
                      { value: 0, label: '0' },
                      { value: 1, label: '1' },
                      { value: 2, label: '2' },
                      { value: 3, label: '3' },
                      { value: 4, label: '4' },
                      { value: 5, label: '5' },
                    ]}
                  />
                  <Text size="xs" c="dimmed">
                    Or press 0-5
                  </Text>
                </Stack>

                <Divider />

                <Stack gap="xs">
                  <Text size="sm" fw={500}>
                    Notes
                  </Text>
                  <Textarea
                    ref={textareaRef}
                    placeholder="Add comments..."
                    value={localNotes}
                    onChange={(e) => setLocalNotes(e.currentTarget.value)}
                    minRows={5}
                    size="sm"
                  />
                  <Text size="xs" c="dimmed">
                    Enter to focus · ⌘↵ to save
                  </Text>
                </Stack>

                <Group grow>
                  <Button
                    size="sm"
                    onClick={() => {
                      handleSaveRating(currentAnnotation.rating, localNotes);
                    }}
                    fullWidth
                  >
                    💾 Save
                  </Button>
                  <Button
                    size="sm"
                    variant="default"
                    onClick={handleSaveAndNext}
                    fullWidth
                  >
                    Next
                  </Button>
                </Group>
              </Stack>
            </Box>
          </Grid.Col>
        </Grid>
      </AppShell.Main>
    </AppShell>
  );
}

export default App;
