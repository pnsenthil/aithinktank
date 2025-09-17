import { ProblemInput } from "@/components/problem-input";

export default function ProblemPage() {
  return (
    <div className="container max-w-6xl mx-auto py-8" data-testid="page-problem">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2">Define the Challenge</h1>
        <p className="text-muted-foreground">
          Submit your problem statement to begin the AI-powered debate process
        </p>
      </div>
      <ProblemInput />
    </div>
  );
}