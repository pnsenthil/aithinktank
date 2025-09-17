import { useState } from "react";
import { FileText, Mic, MicOff, CheckCircle, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ProblemInputProps {
  onSubmit?: (problem: string) => void;
  onApprove?: (problemId: string) => void;
}

export function ProblemInput({ onSubmit, onApprove }: ProblemInputProps) {
  const [problemStatement, setProblemStatement] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [characterCount, setCharacterCount] = useState(0);

  // todo: remove mock functionality  
  const [submittedProblem] = useState({
    id: "prob-001",
    text: "How might we reduce customer churn in our SaaS platform while maintaining profitability and improving user experience?",
    submittedBy: "Sarah Chen",
    submittedAt: "2 minutes ago",
    status: "pending_approval" as const
  });

  const handleTextChange = (text: string) => {
    setProblemStatement(text);
    setCharacterCount(text.length);
  };

  const handleSubmit = () => {
    if (problemStatement.trim()) {
      onSubmit?.(problemStatement);
      setIsSubmitted(true);
      console.log("Problem submitted:", problemStatement);
    }
  };

  const handleVoiceToggle = () => {
    setIsRecording(!isRecording);
    if (!isRecording) {
      console.log("Starting voice recording...");
      // todo: remove mock functionality
      setTimeout(() => {
        setProblemStatement("How might we improve customer retention while reducing operational costs?");
        setCharacterCount(85);
        setIsRecording(false);
      }, 3000);
    } else {
      console.log("Stopping voice recording...");
    }
  };

  const handleApproval = () => {
    onApprove?.(submittedProblem.id);
    console.log("Problem approved:", submittedProblem.id);
  };

  if (isSubmitted || submittedProblem.status === "pending_approval") {
    return (
      <Card className="max-w-4xl mx-auto" data-testid="problem-approval">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Problem Statement - Pending Approval
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Submitted Problem */}
          <div className="bg-muted/50 rounded-lg p-6 space-y-4">
            <div className="flex items-start gap-4">
              <Avatar className="h-10 w-10">
                <AvatarImage src="/avatars/sarah.jpg" />
                <AvatarFallback>SC</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-medium">{submittedProblem.submittedBy}</span>
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {submittedProblem.submittedAt}
                  </Badge>
                </div>
                <p className="text-lg leading-relaxed">
                  {submittedProblem.text}
                </p>
              </div>
            </div>
          </div>

          {/* Approval Actions */}
          <div className="border rounded-lg p-6 bg-card">
            <h3 className="font-medium mb-4">Facilitator Review</h3>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">
                  Review the problem statement before proceeding to solution generation
                </p>
                <p className="text-xs text-muted-foreground">
                  This will start the AI debate process with all 5 agents
                </p>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" data-testid="button-request-revision">
                  Request Revision
                </Button>
                <Button 
                  onClick={handleApproval}
                  className="flex items-center gap-2"
                  data-testid="button-approve-problem"
                >
                  <CheckCircle className="h-4 w-4" />
                  Approve & Continue
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-4xl mx-auto" data-testid="problem-input">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Submit Problem Statement
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Problem Statement Input */}
        <div className="space-y-3">
          <Label htmlFor="problem-text">
            Describe the challenge or opportunity you want to explore
          </Label>
          <div className="relative">
            <Textarea
              id="problem-text"
              placeholder="How might we..."
              value={problemStatement}
              onChange={(e) => handleTextChange(e.target.value)}
              className="min-h-32 pr-16 resize-none text-base leading-relaxed"
              data-testid="textarea-problem-statement"
            />
            <div className="absolute bottom-3 right-3 flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {characterCount}/500
              </span>
            </div>
          </div>
        </div>

        {/* Voice Input */}
        <div className="flex items-center gap-4 p-4 border rounded-lg bg-muted/30">
          <Button
            variant={isRecording ? "destructive" : "outline"}
            size="sm"
            onClick={handleVoiceToggle}
            className="flex items-center gap-2"
            data-testid="button-voice-input"
          >
            {isRecording ? (
              <>
                <MicOff className="h-4 w-4" />
                Stop Recording
              </>
            ) : (
              <>
                <Mic className="h-4 w-4" />
                Voice Input
              </>
            )}
          </Button>
          <div className="flex-1">
            {isRecording ? (
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="w-1 h-4 bg-destructive rounded animate-pulse"
                      style={{ animationDelay: `${i * 0.2}s` }}
                    />
                  ))}
                </div>
                <span className="text-sm text-destructive">Recording...</span>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Use voice input to dictate your problem statement
              </p>
            )}
          </div>
        </div>

        {/* Guidelines */}
        <div className="bg-muted/50 rounded-lg p-4">
          <h4 className="font-medium mb-2">💡 Tips for Better Problem Statements</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Start with "How might we..." to frame it as an opportunity</li>
            <li>• Be specific about the context and constraints</li>
            <li>• Include stakeholders who are affected</li>
            <li>• Avoid assuming solutions in the problem description</li>
          </ul>
        </div>

        {/* Submit Actions */}
        <div className="flex justify-between">
          <Button variant="outline" data-testid="button-save-draft">
            Save as Draft
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={problemStatement.trim().length < 10}
            data-testid="button-submit-problem"
          >
            Submit for Review
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}