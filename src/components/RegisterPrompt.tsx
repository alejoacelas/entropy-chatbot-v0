import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { listPrompts, loadPrompt, savePrompt as apiSavePrompt, deletePrompt as apiDeletePrompt } from '@/api/evaluationApi';
import { Save, Trash2, CheckCircle, XCircle } from 'lucide-react';

interface SavedPrompt {
  name: string;
  content: string;
}

export function RegisterPrompt() {
  const [promptName, setPromptName] = useState('');
  const [promptContent, setPromptContent] = useState('');
  const [savedPrompts, setSavedPrompts] = useState<SavedPrompt[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Load saved prompts on mount
  useEffect(() => {
    loadPromptsData();
  }, []);

  const loadPromptsData = async () => {
    try {
      const promptNames = await listPrompts();

      // Load full prompt details for each
      const prompts = await Promise.all(
        promptNames.map(async (name) => {
          try {
            const prompt = await loadPrompt(name);
            return { name: prompt.name, content: prompt.content };
          } catch {
            return null;
          }
        })
      );

      setSavedPrompts(prompts.filter((p): p is SavedPrompt => p !== null));
    } catch (err) {
      console.error('Failed to load saved prompts:', err);
      setError('Failed to load saved prompts');
    }
  };

  const handleSavePrompt = async () => {
    if (!promptName.trim()) {
      setError('Please provide a prompt name');
      return;
    }

    if (!promptContent.trim()) {
      setError('Please provide prompt content');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await apiSavePrompt(promptName.trim(), promptContent.trim());

      const newPrompt: SavedPrompt = {
        name: promptName.trim(),
        content: promptContent.trim(),
      };

      const updated = [...savedPrompts.filter(p => p.name !== newPrompt.name), newPrompt];
      setSavedPrompts(updated);

      setSuccess(`Prompt "${promptName.trim()}" saved successfully!`);
      setPromptName('');
      setPromptContent('');

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(`Failed to save prompt: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeletePrompt = async (name: string) => {
    if (!confirm(`Are you sure you want to delete the prompt "${name}"?`)) {
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await apiDeletePrompt(name);
      setSavedPrompts(savedPrompts.filter(p => p.name !== name));
      setSuccess(`Prompt "${name}" deleted successfully!`);

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(`Failed to delete prompt: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadPrompt = (prompt: SavedPrompt) => {
    setPromptName(prompt.name);
    setPromptContent(prompt.content);
    setError(null);
    setSuccess(null);
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Register System Prompt</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Prompt Name */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Prompt Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={promptName}
              onChange={(e) => setPromptName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="e.g., customer-support-v1"
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground mt-2">
              Give this prompt a unique name
            </p>
          </div>

          {/* Prompt Content */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Prompt Template <span className="text-red-500">*</span>
            </label>
            <Textarea
              value={promptContent}
              onChange={(e) => setPromptContent(e.target.value)}
              placeholder="Enter your system prompt template here. Use {user_message} as placeholder."
              className="min-h-[200px] max-h-[400px]"
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground mt-2">
              Use {'{user_message}'} as a placeholder for each prompt
            </p>
          </div>

          {/* Save Button */}
          <Button
            onClick={handleSavePrompt}
            disabled={!promptName.trim() || !promptContent.trim() || isLoading}
            className="w-full"
          >
            <Save className="mr-2 h-4 w-4" />
            {isLoading ? 'Saving...' : 'Save Prompt'}
          </Button>

          {/* Success Alert */}
          {success && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>Success</AlertTitle>
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Saved Prompts List */}
      {savedPrompts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Saved Prompts ({savedPrompts.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {savedPrompts.map((prompt) => (
                <div
                  key={prompt.name}
                  className="border border-gray-200 rounded-md p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-sm mb-2">{prompt.name}</h3>
                      <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-3">
                        {prompt.content}
                      </p>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button
                        onClick={() => handleLoadPrompt(prompt)}
                        variant="outline"
                        size="sm"
                        disabled={isLoading}
                      >
                        Edit
                      </Button>
                      <Button
                        onClick={() => handleDeletePrompt(prompt.name)}
                        variant="destructive"
                        size="sm"
                        disabled={isLoading}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
