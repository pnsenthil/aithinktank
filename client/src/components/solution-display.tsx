import { useState } from "react";
import { Lightbulb, Target, Cog, AlertTriangle, TrendingUp, Clock, RotateCcw, Edit, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Solution {
  id: string;
  title: string;
  objective: string;
  approach: string;
  enablers: string[];
  risks: string[];
  impact: {
    timeframe: "quick_win" | "longer_term";
    effort: "low" | "medium" | "high";
    confidence: number;
  };
  expectedOutcomes: string[];
}

interface SolutionDisplayProps {
  onProceedToDebate?: (solutionId: string) => void;
  onRegenerateSolution?: (solutionId: string) => void;
  onRefineSolution?: (solutionId: string) => void;
}

export function SolutionDisplay({ 
  onProceedToDebate,
  onRegenerateSolution,
  onRefineSolution 
}: SolutionDisplayProps) {
  const [selectedSolution, setSelectedSolution] = useState(0);
  
  // todo: remove mock functionality
  const [solutions] = useState<Solution[]>([
    {
      id: "sol-001",
      title: "Customer Success Enhancement Program",
      objective: "Implement a proactive customer success program that identifies at-risk customers and provides personalized retention strategies while optimizing operational efficiency.",
      approach: "Deploy AI-driven customer health scoring combined with automated touchpoints and dedicated success manager interventions for high-value accounts.",
      enablers: [
        "Customer analytics platform integration",
        "Success manager training program", 
        "Automated communication workflows",
        "Customer feedback collection system"
      ],
      risks: [
        "Initial implementation costs may impact short-term profitability",
        "Customer data privacy concerns",
        "Potential staff resistance to new processes",
        "Over-automation may reduce personal touch"
      ],
      impact: {
        timeframe: "longer_term",
        effort: "high",
        confidence: 85
      },
      expectedOutcomes: [
        "25% reduction in customer churn within 12 months",
        "15% increase in customer lifetime value",
        "Improved customer satisfaction scores",
        "More predictable revenue stream"
      ]
    },
    {
      id: "sol-002", 
      title: "Quick Win: Feature Usage Optimization",
      objective: "Rapidly improve feature adoption and user engagement through targeted onboarding improvements and usage analytics.",
      approach: "Implement in-app guidance, feature discovery prompts, and usage dashboards to help customers realize value faster.",
      enablers: [
        "In-app messaging tool",
        "User analytics tracking",
        "Onboarding flow redesign",
        "Feature usage dashboards"
      ],
      risks: [
        "May not address underlying product-market fit issues",
        "Potential user interface complexity increase",
        "Limited impact on fundamental retention drivers"
      ],
      impact: {
        timeframe: "quick_win",
        effort: "medium",
        confidence: 75
      },
      expectedOutcomes: [
        "10% improvement in feature adoption",
        "Reduced time-to-value for new users",
        "Better user engagement metrics",
        "Quick revenue protection"
      ]
    }
  ]);

  const currentSolution = solutions[selectedSolution];

  const handleRegenerateSolution = () => {
    onRegenerateSolution?.(currentSolution.id);
    console.log("Regenerating solution:", currentSolution.id);
  };

  const handleRefineSolution = () => {
    onRefineSolution?.(currentSolution.id);
    console.log("Refining solution:", currentSolution.id);
  };

  const handleProceedToDebate = () => {
    onProceedToDebate?.(currentSolution.id);
    console.log("Proceeding to debate with solution:", currentSolution.id);
  };

  const getEffortColor = (effort: string) => {
    switch (effort) {
      case "low": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "medium": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "high": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const getTimeframeColor = (timeframe: string) => {
    return timeframe === "quick_win" 
      ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
      : "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
  };

  return (
    <div className="space-y-6" data-testid="solution-display">
      {/* Solution Selector */}
      {solutions.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5" />
              Generated Solutions ({solutions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={selectedSolution.toString()} onValueChange={(value) => setSelectedSolution(parseInt(value))}>
              <TabsList className="grid w-full grid-cols-2">
                {solutions.map((solution, index) => (
                  <TabsTrigger 
                    key={solution.id} 
                    value={index.toString()}
                    data-testid={`tab-solution-${index}`}
                  >
                    Solution {index + 1}
                    <Badge 
                      variant="secondary" 
                      className={`ml-2 ${getTimeframeColor(solution.impact.timeframe)}`}
                    >
                      {solution.impact.timeframe === "quick_win" ? "Quick Win" : "Long Term"}
                    </Badge>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Selected Solution Details */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="text-xl">{currentSolution.title}</CardTitle>
              <div className="flex gap-2">
                <Badge className={getTimeframeColor(currentSolution.impact.timeframe)}>
                  {currentSolution.impact.timeframe === "quick_win" ? "Quick Win" : "Long Term"}
                </Badge>
                <Badge className={getEffortColor(currentSolution.impact.effort)}>
                  {currentSolution.impact.effort.toUpperCase()} Effort
                </Badge>
                <Badge variant="outline">
                  {currentSolution.impact.confidence}% Confidence
                </Badge>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleRegenerateSolution}
                data-testid="button-regenerate-solution"
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                Regenerate
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleRefineSolution}
                data-testid="button-refine-solution"
              >
                <Edit className="h-4 w-4 mr-1" />
                Refine
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Objective */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              <h3 className="font-medium">Objective</h3>
            </div>
            <p className="text-muted-foreground leading-relaxed pl-6">
              {currentSolution.objective}
            </p>
          </div>

          <Separator />

          {/* Approach */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Cog className="h-4 w-4 text-primary" />
              <h3 className="font-medium">Approach</h3>
            </div>
            <p className="text-muted-foreground leading-relaxed pl-6">
              {currentSolution.approach}
            </p>
          </div>

          <Separator />

          {/* Enablers and Risks */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Cog className="h-4 w-4 text-green-600" />
                <h3 className="font-medium">Enablers</h3>
              </div>
              <ul className="space-y-2 pl-6">
                {currentSolution.enablers.map((enabler, index) => (
                  <li key={index} className="text-muted-foreground text-sm leading-relaxed">
                    • {enabler}
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <h3 className="font-medium">Risks</h3>
              </div>
              <ul className="space-y-2 pl-6">
                {currentSolution.risks.map((risk, index) => (
                  <li key={index} className="text-muted-foreground text-sm leading-relaxed">
                    • {risk}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <Separator />

          {/* Expected Outcomes */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <h3 className="font-medium">Expected Outcomes</h3>
            </div>
            <ul className="space-y-2 pl-6">
              {currentSolution.expectedOutcomes.map((outcome, index) => (
                <li key={index} className="text-muted-foreground text-sm leading-relaxed">
                  • {outcome}
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-between">
        <Button variant="outline" data-testid="button-back-to-problem">
          ← Back to Problem
        </Button>
        <Button 
          onClick={handleProceedToDebate}
          className="flex items-center gap-2"
          data-testid="button-proceed-to-debate"
        >
          Proceed to Debate
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}