import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EvaluationRunner } from '@/components/EvaluationRunner';
import { RegisterPrompt } from '@/components/RegisterPrompt';
import ReviewApp from '@/components/ReviewApp';

function App() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">AI Evaluation System</h1>
          <p className="text-muted-foreground">
            Register prompts, run evaluations, or review existing results
          </p>
        </div>

        <Tabs defaultValue="review" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="review">Review Results</TabsTrigger>
            <TabsTrigger value="evaluate">Run Evaluation</TabsTrigger>
            <TabsTrigger value="register">Register Prompt</TabsTrigger>
          </TabsList>

          <TabsContent value="review">
            <ReviewApp />
          </TabsContent>

          <TabsContent value="evaluate">
            <EvaluationRunner />
          </TabsContent>

          <TabsContent value="register">
            <RegisterPrompt />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default App;
