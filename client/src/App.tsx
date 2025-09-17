import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { SessionProvider, useSessionContext } from "@/context/session-context";

// Import pages
import SetupPage from "@/pages/setup";
import ProblemPage from "@/pages/problem";
import SolutionPage from "@/pages/solution";
import DebatePage from "@/pages/debate";
import AnalysisPage from "@/pages/analysis";
import SummaryPage from "@/pages/summary";
import LibraryPage from "@/pages/library";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={SetupPage} />
      <Route path="/setup" component={SetupPage} />
      <Route path="/problem" component={ProblemPage} />
      <Route path="/solution" component={SolutionPage} />
      <Route path="/debate" component={DebatePage} />
      <Route path="/analysis" component={AnalysisPage} />
      <Route path="/summary" component={SummaryPage} />
      <Route path="/library" component={LibraryPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const { getCurrentPhase, getCompletedPhases } = useSessionContext();

  const style = {
    "--sidebar-width": "20rem",
    "--sidebar-width-icon": "4rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar 
          currentPhase={getCurrentPhase()} 
          completedPhases={getCompletedPhases()} 
        />
        <div className="flex flex-col flex-1">
          <header className="flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex items-center gap-4">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <div className="text-sm text-muted-foreground">
                Phase {getCurrentPhase()} of 6
              </div>
            </div>
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-auto">
            <Router />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" enableSystem>
        <TooltipProvider>
          <SessionProvider>
            <AppContent />
          </SessionProvider>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
