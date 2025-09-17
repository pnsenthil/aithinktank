import { DebateView } from "@/components/debate-view";
import { EvidencePanel } from "@/components/evidence-panel";

export default function DebatePage() {
  return (
    <div className="container max-w-6xl mx-auto py-8" data-testid="page-debate">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">AI Debate Session</h1>
        <p className="text-muted-foreground">
          Watch as Proponent and Opponent agents debate the proposed solutions
        </p>
      </div>
      <div className="relative">
        <DebateView />
        <EvidencePanel />
      </div>
    </div>
  );
}