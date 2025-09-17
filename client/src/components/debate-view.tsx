import { useState } from "react";
import { MessageSquare, ThumbsUp, ThumbsDown, User, Bot, Pin, ExternalLink } from "lucide-react";
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
  const [activePoint, setActivePoint] = useState(1);
  
  // todo: remove mock functionality
  const [debatePoints] = useState<DebatePoint[]>([
    {
      id: "point-1-pro",
      agent: "proponent", 
      point: 1,
      title: "Customer Success Programs Drive Measurable Retention",
      content: "Proactive customer success programs have proven track records across SaaS companies. Companies like HubSpot and Salesforce have reduced churn by 20-30% through dedicated success managers and health scoring systems. The investment in customer success typically pays for itself within 6-12 months through retained revenue.",
      votes: { up: 8, down: 1, userVote: undefined },
      evidenceAttached: true,
      rebuttal: {
        id: "point-1-con",
        agent: "opponent",
        point: 1,
        title: "High Implementation Costs May Offset Retention Benefits",
        content: "While customer success programs can improve retention, the substantial upfront costs often undermine profitability goals. Dedicated success managers cost $80-120K annually, plus platform costs. For smaller SaaS companies, this overhead may exceed the revenue protected by retention improvements, especially given uncertain ROI timelines.",
        votes: { up: 5, down: 3 },
        evidenceAttached: true
      }
    },
    {
      id: "point-2-pro",
      agent: "proponent",
      point: 2, 
      title: "AI-Driven Approach Reduces Manual Overhead",
      content: "Modern customer success platforms use AI to automate risk detection and intervention triggering, significantly reducing manual effort. Automated health scoring and triggered communications can handle the majority of customer touchpoints, requiring human intervention only for high-value or high-risk accounts.",
      votes: { up: 6, down: 2 },
      evidenceAttached: false,
      rebuttal: {
        id: "point-2-con",
        agent: "opponent",
        point: 2,
        title: "Automation Risks Reducing Personal Customer Relationships",
        content: "Over-reliance on automated systems can damage the personal relationships that often drive customer loyalty. B2B customers, especially in competitive markets, value human connections and personalized service. Automated touchpoints may feel impersonal and could actually accelerate churn among relationship-driven customers.",
        votes: { up: 4, down: 4 },
        evidenceAttached: false
      }
    },
    {
      id: "point-3-pro",
      agent: "proponent",
      point: 3,
      title: "Early Intervention Prevents Costly Customer Recovery",
      content: "Health scoring systems can identify at-risk customers 30-90 days before they would typically churn, allowing for targeted intervention when relationships can still be salvaged. The cost of retaining an existing customer is 5-25x lower than acquiring a new one, making early intervention highly cost-effective.",
      votes: { up: 9, down: 0 },
      evidenceAttached: true
    }
  ]);

  const handleVote = (pointId: string, vote: "up" | "down") => {
    onVote?.(pointId, vote);
    console.log(`Voted ${vote} on point ${pointId}`);
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