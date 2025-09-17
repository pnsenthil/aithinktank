import { useState, useEffect, useRef } from "react";
import { FileText, Mic, MicOff, CheckCircle, Clock, Play, Pause, Volume2, Loader2 } from "lucide-react";
import { useSessionContext } from "@/context/session-context";
import { useSessionProblems, useCreateProblem, useApproveProblem, useGenerateVoice, useVoiceHealth } from "@/hooks/use-sessions";
import { useToast } from "@/hooks/use-toast";
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
  const [isGeneratingVoice, setIsGeneratingVoice] = useState(false);
  const [characterCount, setCharacterCount] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const { currentSessionId } = useSessionContext();
  const { data: problems, isLoading: problemsLoading } = useSessionProblems(currentSessionId);
  const createProblemMutation = useCreateProblem();
  const approveProblemMutation = useApproveProblem();
  const generateVoiceMutation = useGenerateVoice();
  const { data: voiceHealth } = useVoiceHealth();
  const { toast } = useToast();

  // Get the most recent pending problem (with fallback to any non-approved problem)
  const submittedProblem = problems?.find(p => p.status === "pending") || 
                          problems?.find(p => p.status !== "approved");

  const handleTextChange = (text: string) => {
    setProblemStatement(text);
    setCharacterCount(text.length);
  };

  const handleSubmit = async () => {
    if (problemStatement.trim() && currentSessionId) {
      try {
        await createProblemMutation.mutateAsync({
          sessionId: currentSessionId,
          problemData: {
            sessionId: currentSessionId,
            statement: problemStatement.trim()
          }
        });
        onSubmit?.(problemStatement);
        setIsSubmitted(true);
        toast({ title: "Problem submitted successfully!" });
      } catch (error) {
        toast({ title: "Failed to submit problem", variant: "destructive" });
      }
    }
  };

  const handleVoiceNarration = async () => {
    // Voice narration only - no speech-to-text functionality
    if (problemStatement.trim()) {
      try {
        setIsGeneratingVoice(true);
        const result = await generateVoiceMutation.mutateAsync({
          text: problemStatement.trim(),
          voiceId: 'pNInz6obpgDQGcFmaJgB'
        });
        if (result.success && result.audioUrl) {
          setAudioUrl(result.audioUrl);
          toast({ title: "Voice narration generated!", description: "Click the play button to listen to your problem statement." });
        }
      } catch (error) {
        toast({ 
          title: "Voice generation failed", 
          description: "Please try again later",
          variant: "destructive" 
        });
      } finally {
        setIsGeneratingVoice(false);
      }
    } else {
      toast({ 
        title: "Please enter text first", 
        description: "Voice narration requires a problem statement to be entered first",
        variant: "destructive" 
      });
    }
  };

  const handleAudioPlay = () => {
    if (audioUrl && audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
  };

  const handleAudioError = () => {
    setIsPlaying(false);
    toast({ 
      title: "Audio playback failed", 
      description: "Please try generating the audio again",
      variant: "destructive" 
    });
  };

  const handleApproval = async () => {
    if (submittedProblem) {
      try {
        await approveProblemMutation.mutateAsync({
          sessionId: currentSessionId!,
          problemId: submittedProblem.id
        });
        onApprove?.(submittedProblem.id);
        toast({ title: "Problem approved successfully!" });
      } catch (error) {
        toast({ title: "Failed to approve problem", variant: "destructive" });
      }
    }
  };

  // Show loading state while problems are loading
  if (problemsLoading) {
    return (
      <Card className="max-w-4xl mx-auto" data-testid="problem-loading">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Loading Problem Status...
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2 text-muted-foreground">Loading...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isSubmitted || (submittedProblem && submittedProblem.status === "pending")) {
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
                  <span className="font-medium">{submittedProblem?.submittedBy || 'Anonymous'}</span>
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(submittedProblem?.createdAt || new Date()).toLocaleDateString()}
                  </Badge>
                </div>
                <p className="text-lg leading-relaxed">
                  {submittedProblem?.statement}
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
                  disabled={approveProblemMutation.isPending}
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

        {/* Voice Narration */}
        <div className="flex items-center gap-4 p-4 border rounded-lg bg-muted/30">
          <Button
            variant="outline"
            size="sm"
            onClick={handleVoiceNarration}
            disabled={isGeneratingVoice || !problemStatement.trim()}
            className="flex items-center gap-2"
            data-testid="button-voice-narration"
          >
            {isGeneratingVoice ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Volume2 className="h-4 w-4" />
                Generate Audio
              </>
            )}
          </Button>
          
          {audioUrl && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleAudioPlay}
              className="flex items-center gap-2"
              data-testid="button-play-audio"
            >
              {isPlaying ? (
                <>
                  <Pause className="h-4 w-4" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Play
                </>
              )}
            </Button>
          )}
          
          <div className="flex-1">
            {isGeneratingVoice ? (
              <div className="flex items-center gap-2">
                <div className="animate-pulse">
                  <div className="flex gap-1">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="w-1 h-4 bg-primary rounded"
                        style={{ animationDelay: `${i * 0.2}s` }}
                      />
                    ))}
                  </div>
                </div>
                <span className="text-sm text-primary">Generating voice narration...</span>
              </div>
            ) : audioUrl ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-green-600 font-medium">✓ Audio ready</span>
                <span className="text-sm text-muted-foreground">Click play to listen to your problem statement</span>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Generate AI voice narration of your problem statement
              </p>
            )}
          </div>
          
          {/* Hidden audio element */}
          {audioUrl && (
            <audio
              ref={audioRef}
              src={audioUrl}
              onEnded={handleAudioEnded}
              onError={handleAudioError}
              data-testid="audio-player"
              style={{ display: 'none' }}
            />
          )}
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
            disabled={problemStatement.trim().length < 10 || createProblemMutation.isPending}
            data-testid="button-submit-problem"
          >
            {createProblemMutation.isPending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                Submitting...
              </>
            ) : (
              "Submit for Review"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}