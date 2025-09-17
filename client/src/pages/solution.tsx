import { SolutionDisplay } from "@/components/solution-display";

export default function SolutionPage() {
  return (
    <div className="container max-w-6xl mx-auto py-8" data-testid="page-solution">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Generated Solutions</h1>
        <p className="text-muted-foreground">
          Review AI-generated solution proposals before proceeding to debate
        </p>
      </div>
      <SolutionDisplay />
    </div>
  );
}