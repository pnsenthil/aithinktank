import { CheckCircle, Circle, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

interface WorkshopProgressProps {
  currentPhase: number;
  completedPhases: number[];
  className?: string;
}

const phases = [
  { id: 1, name: "Setup", shortName: "Setup" },
  { id: 2, name: "Problem Statement", shortName: "Problem" },
  { id: 3, name: "Solution Generation", shortName: "Solutions" },
  { id: 4, name: "Debate & Rebuttal", shortName: "Debate" },
  { id: 5, name: "Analysis & Evidence", shortName: "Analysis" },
  { id: 6, name: "Summary", shortName: "Summary" },
];

export function WorkshopProgress({ currentPhase, completedPhases, className }: WorkshopProgressProps) {
  const getPhaseStatus = (phaseId: number) => {
    if (completedPhases.includes(phaseId)) return "completed";
    if (phaseId === currentPhase) return "current";
    if (phaseId < currentPhase) return "available";
    return "locked";
  };

  const getPhaseIcon = (phaseId: number) => {
    const status = getPhaseStatus(phaseId);
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-600" data-testid={`phase-${phaseId}-completed`} />;
      case "current":
        return <Circle className="h-4 w-4 text-primary animate-pulse" data-testid={`phase-${phaseId}-current`} />;
      default:
        return <Lock className="h-4 w-4 text-muted-foreground" data-testid={`phase-${phaseId}-locked`} />;
    }
  };

  const getPhaseStyles = (phaseId: number) => {
    const status = getPhaseStatus(phaseId);
    switch (status) {
      case "completed":
        return "text-green-600 font-medium";
      case "current":
        return "text-primary font-semibold";
      default:
        return "text-muted-foreground";
    }
  };

  const progressPercentage = ((currentPhase - 1) / (phases.length - 1)) * 100;

  return (
    <div className={cn("space-y-3", className)} data-testid="workshop-progress">
      {/* Progress Bar */}
      <div className="relative">
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-500 ease-out rounded-full"
            style={{ width: `${progressPercentage}%` }}
            data-testid="progress-bar"
          />
        </div>
        <div className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full font-medium">
          {currentPhase}/6
        </div>
      </div>

      {/* Phase Steps */}
      <div className="flex items-center justify-between gap-2">
        {phases.map((phase, index) => (
          <div key={phase.id} className="flex items-center gap-1">
            <div className="flex items-center gap-1">
              {getPhaseIcon(phase.id)}
              <span className={cn("text-xs", getPhaseStyles(phase.id))}>
                {phase.shortName}
              </span>
            </div>
            {index < phases.length - 1 && (
              <div className="w-2 h-px bg-muted-foreground/30 mx-1" />
            )}
          </div>
        ))}
      </div>

      {/* Current Phase Description */}
      <div className="text-center">
        <div className="text-sm font-medium text-foreground">
          Phase {currentPhase}: {phases[currentPhase - 1]?.name}
        </div>
        {currentPhase === 1 && (
          <div className="text-xs text-muted-foreground mt-1">
            Configure your AI Think Tank session
          </div>
        )}
        {currentPhase === 2 && (
          <div className="text-xs text-muted-foreground mt-1">
            Submit your problem statement to begin AI analysis
          </div>
        )}
        {currentPhase === 3 && (
          <div className="text-xs text-muted-foreground mt-1">
            AI agents are generating solution proposals
          </div>
        )}
        {currentPhase === 4 && (
          <div className="text-xs text-muted-foreground mt-1">
            Proponent and Opponent agents debate solutions
          </div>
        )}
        {currentPhase === 5 && (
          <div className="text-xs text-muted-foreground mt-1">
            Analyst agent gathering evidence and insights
          </div>
        )}
        {currentPhase === 6 && (
          <div className="text-xs text-muted-foreground mt-1">
            Moderator agent synthesizing final recommendations
          </div>
        )}
      </div>
    </div>
  );
}