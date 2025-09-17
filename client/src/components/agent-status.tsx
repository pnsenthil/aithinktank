import { Brain, MessageSquare, Shield, BarChart3, Gavel, CheckCircle, Clock, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface AgentStatusProps {
  currentPhase: number;
  className?: string;
}

const agents = [
  {
    id: "solution",
    name: "Solution Agent",
    icon: Brain,
    description: "Generates innovative solution proposals",
    activePhases: [3],
    readyPhases: [1, 2],
    provider: "OpenAI GPT-4",
    color: "text-blue-600"
  },
  {
    id: "proponent", 
    name: "Proponent",
    icon: MessageSquare,
    description: "Argues FOR solution proposals",
    activePhases: [4],
    readyPhases: [1, 2, 3],
    provider: "OpenAI GPT-4",
    color: "text-green-600"
  },
  {
    id: "opponent",
    name: "Opponent", 
    icon: Shield,
    description: "Argues AGAINST solution proposals",
    activePhases: [4],
    readyPhases: [1, 2, 3],
    provider: "Anthropic Claude",
    color: "text-red-600"
  },
  {
    id: "analyst",
    name: "Analyst",
    icon: BarChart3,
    description: "Gathers evidence and insights",
    activePhases: [5],
    readyPhases: [1, 2, 3, 4],
    provider: "OpenAI GPT-4",
    color: "text-purple-600"
  },
  {
    id: "moderator",
    name: "Moderator",
    icon: Gavel,
    description: "Synthesizes final recommendations",
    activePhases: [6],
    readyPhases: [1, 2, 3, 4, 5],
    provider: "Anthropic Claude",
    color: "text-orange-600"
  }
];

export function AgentStatus({ currentPhase, className }: AgentStatusProps) {
  const getAgentStatus = (agent: typeof agents[0]) => {
    if (agent.activePhases.includes(currentPhase)) return "active";
    if (agent.readyPhases.includes(currentPhase)) return "ready";
    if (currentPhase > Math.max(...agent.activePhases)) return "completed";
    return "waiting";
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <Zap className="h-4 w-4 text-primary animate-pulse" />;
      case "ready":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "completed":
        return <CheckCircle className="h-4 w-4 text-muted-foreground" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <Badge variant="default" className="bg-primary/10 text-primary border-primary/20">
            Active
          </Badge>
        );
      case "ready":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            Ready
          </Badge>
        );
      case "completed":
        return (
          <Badge variant="outline" className="bg-muted text-muted-foreground">
            Completed
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-muted-foreground">
            Waiting
          </Badge>
        );
    }
  };

  const getStatusMessage = (agent: typeof agents[0], status: string) => {
    switch (status) {
      case "active":
        if (agent.id === "solution") return "Generating solution proposals...";
        if (agent.id === "proponent") return "Building arguments FOR solutions...";
        if (agent.id === "opponent") return "Building arguments AGAINST solutions...";
        if (agent.id === "analyst") return "Gathering evidence and citations...";
        if (agent.id === "moderator") return "Synthesizing final recommendations...";
        return "Working...";
      case "ready":
        return "Standing by, ready to engage";
      case "completed":
        return "Task completed successfully";
      default:
        return "Waiting for previous phases to complete";
    }
  };

  return (
    <Card className={cn("", className)} data-testid="agent-status">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Brain className="h-5 w-5 text-primary" />
          AI Agent Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {agents.map((agent) => {
          const status = getAgentStatus(agent);
          const AgentIcon = agent.icon;

          return (
            <div 
              key={agent.id} 
              className={cn(
                "flex items-center justify-between p-3 rounded-lg border transition-all",
                status === "active" ? "bg-primary/5 border-primary/20" : "bg-muted/30"
              )}
              data-testid={`agent-${agent.id}`}
            >
              <div className="flex items-center gap-3">
                <div className={cn("p-2 rounded-full bg-background shadow-sm", agent.color)}>
                  <AgentIcon className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-foreground">{agent.name}</span>
                    {getStatusBadge(status)}
                  </div>
                  <div className="text-xs text-muted-foreground mb-1">
                    {agent.description}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {getStatusMessage(agent, status)}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {getStatusIcon(status)}
                <div className="text-xs text-muted-foreground text-right">
                  <div>{agent.provider}</div>
                </div>
              </div>
            </div>
          );
        })}
        
        {/* Summary */}
        <div className="mt-4 p-3 bg-muted/50 rounded-lg">
          <div className="text-sm text-muted-foreground text-center">
            {agents.filter(a => getAgentStatus(a) === "active").length > 0 && (
              <span className="text-primary font-medium">
                {agents.filter(a => getAgentStatus(a) === "active").length} agent{agents.filter(a => getAgentStatus(a) === "active").length > 1 ? 's' : ''} actively working
              </span>
            )}
            {agents.filter(a => getAgentStatus(a) === "active").length === 0 && (
              <span>
                All agents ready • {agents.filter(a => getAgentStatus(a) === "ready").length} standing by
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}