import { Brain, Settings, Library, Plus, FileText, MessageSquare, BarChart3, CheckCircle } from "lucide-react";
import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";

// Menu items for workshop phases
const workshopPhases = [
  {
    title: "Setup Session",
    url: "/setup",
    icon: Settings,
    phase: 1,
  },
  {
    title: "Problem Statement",
    url: "/problem",
    icon: FileText,
    phase: 2,
  },
  {
    title: "Solution Generation", 
    url: "/solution",
    icon: Brain,
    phase: 3,
  },
  {
    title: "Debate & Rebuttal",
    url: "/debate",
    icon: MessageSquare,
    phase: 4,
  },
  {
    title: "Analysis & Evidence",
    url: "/analysis", 
    icon: BarChart3,
    phase: 5,
  },
  {
    title: "Summary",
    url: "/summary",
    icon: CheckCircle,
    phase: 6,
  },
];

const libraryItems = [
  {
    title: "Session Library",
    url: "/library",
    icon: Library,
  },
  {
    title: "New Session",
    url: "/setup",
    icon: Plus,
  },
];

interface AppSidebarProps {
  currentPhase?: number;
  completedPhases?: number[];
}

export function AppSidebar({ currentPhase = 1, completedPhases = [] }: AppSidebarProps) {
  const [location] = useLocation();

  const getPhaseStatus = (phase: number) => {
    if (completedPhases.includes(phase)) return "completed";
    if (phase === currentPhase) return "current";
    if (phase < currentPhase) return "available";
    return "locked";
  };

  return (
    <Sidebar data-testid="sidebar-main">
      <SidebarContent>
        {/* Workshop Header */}
        <SidebarGroup>
          <div className="flex items-center gap-2 px-4 py-2">
            <Brain className="h-6 w-6 text-primary" />
            <span className="font-semibold text-lg">AI Think Tank</span>
          </div>
        </SidebarGroup>

        {/* Active Workshop Phases */}
        <SidebarGroup>
          <SidebarGroupLabel>Workshop Phases</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {workshopPhases.map((item) => {
                const status = getPhaseStatus(item.phase);
                const isActive = location === item.url;
                
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild
                      data-testid={`nav-${item.url.slice(1)}`}
                      className={`
                        ${isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : ""} 
                        ${status === "locked" ? "opacity-50 cursor-not-allowed" : ""}
                      `}
                    >
                      <Link href={status === "locked" ? "#" : item.url}>
                        <item.icon className="h-4 w-4" />
                        <span className="flex-1">{item.title}</span>
                        {status === "completed" && (
                          <Badge variant="secondary" className="h-5 w-5 p-0 flex items-center justify-center">
                            <CheckCircle className="h-3 w-3" />
                          </Badge>
                        )}
                        {status === "current" && (
                          <Badge variant="default" className="text-xs px-1">
                            {item.phase}
                          </Badge>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Library & Actions */}
        <SidebarGroup>
          <SidebarGroupLabel>Library</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {libraryItems.map((item) => {
                const isActive = location === item.url;
                
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild 
                      data-testid={`nav-${item.title.toLowerCase().replace(/\s/g, "-")}`}
                      className={isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : ""}
                    >
                      <Link href={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}