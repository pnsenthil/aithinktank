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
import { AuthProvider, useAuth } from "@/context/auth-context";
import { ProtectedRoute } from "@/components/protected-route";
import { WorkshopProgress } from "@/components/workshop-progress";

// Import pages
import SetupPage from "@/pages/setup";
import ProblemPage from "@/pages/problem";
import SolutionPage from "@/pages/solution";
import DebatePage from "@/pages/debate";
import AnalysisPage from "@/pages/analysis";
import SummaryPage from "@/pages/summary";
import LibraryPage from "@/pages/library";
import LoginPage from "@/pages/login";
import SignupPage from "@/pages/signup";
import NotFound from "@/pages/not-found";

function AuthRouter() {
  const { isAuthenticated, isLoading } = useAuth();

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background" data-testid="auth-loading">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Public routes (login/signup) when not authenticated
  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/login" component={LoginPage} />
        <Route path="/signup" component={SignupPage} />
        <Route>
          <LoginPage />
        </Route>
      </Switch>
    );
  }

  // Protected routes (main app) when authenticated
  return (
    <SessionProvider>
      <AppContent />
    </SessionProvider>
  );
}

function ProtectedRouter() {
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
  const { logout, user } = useAuth();

  const style = {
    "--sidebar-width": "20rem",
    "--sidebar-width-icon": "4rem",
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      // Error handled by auth context
    }
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar 
          currentPhase={getCurrentPhase()} 
          completedPhases={getCompletedPhases()} 
        />
        <div className="flex flex-col flex-1">
          <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            {/* Top Header Bar */}
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                <SidebarTrigger data-testid="button-sidebar-toggle" />
                <div className="text-lg font-semibold text-foreground">
                  AI Think Tank Workshop
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-sm text-muted-foreground">
                  Welcome, {user?.username}
                </div>
                <button
                  onClick={handleLogout}
                  className="text-sm text-primary hover:underline"
                  data-testid="button-logout"
                >
                  Logout
                </button>
                <ThemeToggle />
              </div>
            </div>
            
            {/* Progress Indicator */}
            <div className="px-4 pb-4">
              <WorkshopProgress 
                currentPhase={getCurrentPhase()} 
                completedPhases={getCompletedPhases()}
              />
            </div>
          </header>
          <main className="flex-1 overflow-auto">
            <ProtectedRouter />
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
          <AuthProvider>
            <AuthRouter />
            <Toaster />
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
