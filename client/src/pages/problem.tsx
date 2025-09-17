import { ProblemInput } from "@/components/problem-input";
import { AgentStatus } from "@/components/agent-status";
import { useSessionContext } from "@/context/session-context";

export default function ProblemPage() {
  const { getCurrentPhase } = useSessionContext();
  
  return (
    <div className="container max-w-6xl mx-auto py-8" data-testid="page-problem">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2">Define the Challenge</h1>
        <p className="text-muted-foreground">
          Submit your problem statement to activate the Solution Agent and begin AI-powered analysis
        </p>
        <div className="mt-4 p-4 bg-primary/5 border border-primary/20 rounded-lg max-w-2xl mx-auto">
          <div className="flex items-center gap-2 text-primary font-medium mb-2">
            <span className="animate-pulse">⚡</span>
            Next Step: Problem Statement Submission
          </div>
          <p className="text-sm text-muted-foreground">
            Once you submit your problem statement, our Solution Agent will generate innovative proposals, 
            followed by structured debates between Proponent and Opponent agents.
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Problem Input - Main Content */}
        <div className="lg:col-span-2">
          <ProblemInput />
        </div>
        
        {/* Agent Status - Sidebar */}
        <div className="lg:col-span-1">
          <AgentStatus currentPhase={getCurrentPhase()} />
        </div>
      </div>
    </div>
  );
}