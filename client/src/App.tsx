import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";

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
  const [location] = useLocation();
  
  // Determine current phase based on route
  const getCurrentPhase = () => {
    switch (location) {
      case '/setup': case '/': return 1;
      case '/problem': return 2;
      case '/solution': return 3;
      case '/debate': return 4;
      case '/analysis': return 5;
      case '/summary': return 6;
      default: return 1;
    }
  };

  // todo: remove mock functionality - phases would be managed by backend state
  const completedPhases = location === '/summary' ? [1, 2, 3, 4, 5] : 
    location === '/analysis' ? [1, 2, 3, 4] :
    location === '/debate' ? [1, 2, 3] :
    location === '/solution' ? [1, 2] :
    location === '/problem' ? [1] : [];

  const style = {
    "--sidebar-width": "20rem",
    "--sidebar-width-icon": "4rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar 
          currentPhase={getCurrentPhase()} 
          completedPhases={completedPhases} 
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
          <AppContent />
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
