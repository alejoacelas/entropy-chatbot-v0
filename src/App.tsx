import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EvaluationRunner } from '@/components/EvaluationRunner';
import ReviewApp from './ReviewApp';

function App() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">AI Evaluation System</h1>
          <p className="text-muted-foreground">
            Run evaluations or review existing results
          </p>
        </div>

        <Tabs defaultValue="evaluate" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="evaluate">Run Evaluation</TabsTrigger>
            <TabsTrigger value="review">Review Results</TabsTrigger>
          </TabsList>

          <TabsContent value="evaluate">
            <EvaluationRunner />
          </TabsContent>

          <TabsContent value="review">
            <ReviewApp />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default App;
