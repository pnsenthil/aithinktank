import { SummaryView } from "@/components/summary-view";

export default function SummaryPage() {
  return (
    <div className="container max-w-6xl mx-auto py-8" data-testid="page-summary">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Workshop Summary</h1>
        <p className="text-muted-foreground">
          AI Moderator provides a balanced synthesis of the debate with actionable next steps
        </p>
      </div>
      <SummaryView />
    </div>
  );
}