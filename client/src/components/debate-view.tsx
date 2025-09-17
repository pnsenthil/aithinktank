import { useState, useMemo } from "react";
import { MessageSquare, ThumbsUp, ThumbsDown, User, Bot, Pin, ExternalLink, AlertCircle } from "lucide-react";
import { useSessionContext } from "@/context/session-context";
import { useSessionDebatePoints, useVoteOnDebatePoint } from "@/hooks/use-sessions";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

interface DebatePoint {
  id: string;
  agent: "proponent" | "opponent";
  point: number;
  title: string;
  content: string;
  votes: {
    up: number;
    down: number;
    userVote?: "up" | "down";
  };
  evidenceAttached?: boolean;
  rebuttal?: DebatePoint;
}

interface DebateViewProps {
  onVote?: (pointId: string, vote: "up" | "down") => void;
  onViewDebateMap?: () => void;
}

export function DebateView({ onVote, onViewDebateMap }: DebateViewProps) {
  const [currentRound, setCurrentRound] = useState(1);
  
  const { currentSessionId } = useSessionContext();
  const { data: rawDebatePoints = [], isLoading: debateLoading, error: debateError } = useSessionDebatePoints(currentSessionId);
  const voteOnPointMutation = useVoteOnDebatePoint();
  const { toast } = useToast();

  // Transform backend debate points to component format
  const debatePoints = useMemo(() => {
    const pointsMap = new Map<number, DebatePoint>();
    
    // Group points by point number and organize proponent/opponent pairs
    rawDebatePoints.forEach(point => {
      const pointNum = point.pointNumber;
      
      const debatePoint: DebatePoint = {
        id: point.id,
        agent: point.agent as "proponent" | "opponent",
        point: pointNum,
        title: point.title,
        content: point.content,
        votes: {
          up: point.upvotes,
          down: point.downvotes,
          userVote: undefined // Could be determined from user votes if needed
        },
        evidenceAttached: point.evidenceAttached || false
      };

      if (point.agent === "proponent") {
        pointsMap.set(pointNum, debatePoint);
      } else if (point.agent === "opponent") {
        // Find the proponent point to attach as rebuttal
        const proponentPoint = pointsMap.get(pointNum);
        if (proponentPoint) {
          proponentPoint.rebuttal = debatePoint;
        } else {
          // If proponent doesn't exist yet, create a placeholder
          pointsMap.set(pointNum, debatePoint);
        }
      }
    });

    return Array.from(pointsMap.values()).sort((a, b) => a.point - b.point);
  }, [rawDebatePoints]);

  // Show loading state
  if (debateLoading) {
    return (
      <div className="flex items-center justify-center p-8" data-testid="debate-loading">
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading debate...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (debateError) {
    return (
      <div className="text-center p-8" data-testid="debate-error">
        <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
        <h3 className="text-lg font-medium mb-2">Failed to Load Debate</h3>
        <p className="text-muted-foreground mb-4">Unable to fetch debate points</p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    );
  }

  // Show empty state
  if (debatePoints.length === 0) {
    return (
      <div className="text-center p-8" data-testid="no-debate-points">
        <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">No Debate Points Yet</h3>
        <p className="text-muted-foreground">Debate points will appear here once the AI agents begin their discussion.</p>
      </div>
    );
  }


  const handleVote = async (pointId: string, vote: "up" | "down") => {
    if (!currentSessionId) {
      toast({
        title: "Voting failed",
        description: "No active session found.",
        variant: "destructive",
      });
      return;
    }

    try {
      await voteOnPointMutation.mutateAsync({ 
        sessionId: currentSessionId,
        pointId, 
        voteType: vote 
      });
      toast({
        title: "Vote recorded",
        description: `Your ${vote === "up" ? "upvote" : "downvote"} has been recorded.`,
      });
      onVote?.(pointId, vote);
    } catch (error) {
      toast({
        title: "Voting failed",
        description: "Unable to record your vote. Please try again.",
        variant: "destructive",
      });
      console.error(`Failed to vote ${vote} on point ${pointId}:`, error);
    }
  };

  const handleViewDebateMap = () => {
    onViewDebateMap?.();
    console.log("Opening debate map view");
  };

  const getAgentColor = (agent: "proponent" | "opponent") => {
    return agent === "proponent" 
      ? "border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20" 
      : "border-l-red-500 bg-red-50/50 dark:bg-red-950/20";
  };

  const getAgentIcon = (agent: "proponent" | "opponent") => {
    return agent === "proponent" ? "P" : "O";
  };

  return (
    <div className="space-y-6" data-testid="debate-view">
      {/* Debate Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Debate: Customer Success Enhancement Program
            </CardTitle>
            <div className="flex items-center gap-4">
              <Badge variant="outline">Round {currentRound} of 3</Badge>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleViewDebateMap}
                data-testid="button-view-debate-map"
              >
                <ExternalLink className="h-4 w-4 mr-1" />
                View Debate Map
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-500 rounded" />
              <span className="text-sm">Proponent (Supporting)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500 rounded" />
              <span className="text-sm">Opponent (Challenging)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Debate Points */}
      <div className="space-y-6">
        {debatePoints.map((point, index) => (
          <div key={point.id} className="space-y-4">
            {/* Main Point */}
            <Card className={`border-l-4 ${getAgentColor(point.agent)}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className={
                        point.agent === "proponent" 
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" 
                          : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                      }>
                        {getAgentIcon(point.agent)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium capitalize">{point.agent}</span>
                        <Badge variant="secondary">Point {point.point}</Badge>
                        {point.evidenceAttached && (
                          <Badge variant="outline" className="text-xs">
                            <Pin className="h-3 w-3 mr-1" />
                            Evidence
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <h3 className="font-medium text-lg">{point.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{point.content}</p>
                
                {/* Voting */}
                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleVote(point.id, "up")}
                      disabled={voteOnPointMutation.isPending}
                      className={`flex items-center gap-1 ${
                        point.votes.userVote === "up" ? "text-green-600" : ""
                      }`}
                      data-testid={`button-upvote-${point.id}`}
                    >
                      <ThumbsUp className="h-4 w-4" />
                      {point.votes.up}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleVote(point.id, "down")}
                      disabled={voteOnPointMutation.isPending}
                      className={`flex items-center gap-1 ${
                        point.votes.userVote === "down" ? "text-red-600" : ""
                      }`}
                      data-testid={`button-downvote-${point.id}`}
                    >
                      <ThumbsDown className="h-4 w-4" />
                      {point.votes.down}
                    </Button>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {point.votes.up + point.votes.down} total votes
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Rebuttal */}
            {point.rebuttal && (
              <Card className={`ml-8 border-l-4 ${getAgentColor(point.rebuttal.agent)}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className={
                          point.rebuttal.agent === "proponent" 
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" 
                            : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                        }>
                          {getAgentIcon(point.rebuttal.agent)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium capitalize">{point.rebuttal.agent}</span>
                          <Badge variant="outline">Rebuttal {point.rebuttal.point}</Badge>
                          {point.rebuttal.evidenceAttached && (
                            <Badge variant="outline" className="text-xs">
                              <Pin className="h-3 w-3 mr-1" />
                              Evidence
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <h3 className="font-medium text-lg">{point.rebuttal.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{point.rebuttal.content}</p>
                  
                  {/* Rebuttal Voting */}
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleVote(point.rebuttal!.id, "up")}
                        disabled={voteOnPointMutation.isPending}
                        className={`flex items-center gap-1 ${
                          point.rebuttal.votes.userVote === "up" ? "text-green-600" : ""
                        }`}
                        data-testid={`button-upvote-${point.rebuttal.id}`}
                      >
                        <ThumbsUp className="h-4 w-4" />
                        {point.rebuttal.votes.up}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleVote(point.rebuttal!.id, "down")}
                        disabled={voteOnPointMutation.isPending}
                        className={`flex items-center gap-1 ${
                          point.rebuttal.votes.userVote === "down" ? "text-red-600" : ""
                        }`}
                        data-testid={`button-downvote-${point.rebuttal.id}`}
                      >
                        <ThumbsDown className="h-4 w-4" />
                        {point.rebuttal.votes.down}
                      </Button>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {point.rebuttal.votes.up + point.rebuttal.votes.down} total votes
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {index < debatePoints.length - 1 && <Separator className="my-6" />}
          </div>
        ))}
      </div>

      {/* Debate Status */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Debate in progress • {debatePoints.length} points presented • Round {currentRound} of 3
            </div>
            <Button variant="outline" data-testid="button-proceed-to-analysis">
              Proceed to Analysis →
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}