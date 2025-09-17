import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, Brain, ArrowRight } from "lucide-react";

export default function AnalysisPage() {
  return (
    <div className="container max-w-6xl mx-auto py-8" data-testid="page-analysis">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Evidence & Analysis</h1>
        <p className="text-muted-foreground">
          AI Analyst provides evidence, citations, and answers to participant questions
        </p>
      </div>
      
      <Card className="text-center py-16">
        <CardContent>
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <Brain className="h-8 w-8 text-primary animate-pulse" />
              </div>
              <div className="absolute -top-1 -right-1 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                <BarChart3 className="h-3 w-3 text-white" />
              </div>
            </div>
          </div>
          
          <h2 className="text-xl font-semibold mb-2">Analyst is Processing Evidence</h2>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            The AI Analyst is gathering evidence, fact-checking claims, and preparing 
            responses to participant questions from the debate session.
          </p>
          
          <div className="space-y-2 text-sm text-muted-foreground mb-6">
            <p>✓ Analyzing debate claims for accuracy</p>
            <p>✓ Gathering supporting evidence from grounding materials</p>
            <p>✓ Preparing confidence scores for each claim</p>
            <p>• Answering top-voted participant questions...</p>
          </div>
          
          <Button data-testid="button-view-analysis-results">
            <ArrowRight className="h-4 w-4 mr-2" />
            View Analysis Results
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}