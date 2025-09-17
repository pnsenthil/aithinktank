import { SessionLibrary } from "@/components/session-library";

export default function LibraryPage() {
  return (
    <div className="container max-w-6xl mx-auto py-8" data-testid="page-library">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Session Library</h1>
        <p className="text-muted-foreground">
          Browse and search through your AI Think Tank workshop history
        </p>
      </div>
      <SessionLibrary />
    </div>
  );
}