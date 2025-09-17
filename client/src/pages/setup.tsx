import { SessionSetup } from "@/components/session-setup";

export default function SetupPage() {
  return (
    <div className="container max-w-6xl mx-auto py-8" data-testid="page-setup">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Session Setup</h1>
        <p className="text-muted-foreground">
          Configure your AI Think Tank workshop with grounding materials and agent personalities
        </p>
      </div>
      <SessionSetup />
    </div>
  );
}