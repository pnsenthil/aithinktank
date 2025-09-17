import { useState, useMemo } from "react";
import { Search, Filter, Calendar, Users, TrendingUp, ExternalLink, MoreHorizontal, Archive, AlertCircle } from "lucide-react";
import { useLibrary } from "@/hooks/use-sessions";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface SessionRecord {
  id: string;
  title: string;
  problemStatement: string;
  status: "completed" | "in_progress" | "draft";
  createdAt: string;
  updatedAt: string;
  facilitator: {
    name: string;
    avatar?: string;
  };
  participants: number;
  totalVotes: number;
  solutionCount: number;
  tags: string[];
  outcome?: "adopted" | "modified" | "rejected" | "pending";
  engagementScore: number;
}

interface SessionLibraryProps {
  onViewSession?: (sessionId: string) => void;
  onCreateSession?: () => void;
}

export function SessionLibrary({ onViewSession, onCreateSession }: SessionLibraryProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [outcomeFilter, setOutcomeFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("updated");

  const { toast } = useToast();

  // Real API data fetching with filters
  const libraryFilter = useMemo(() => {
    const filter: { status?: string; outcome?: string } = {};
    if (statusFilter !== "all") filter.status = statusFilter;
    if (outcomeFilter !== "all") filter.outcome = outcomeFilter;
    return filter;
  }, [statusFilter, outcomeFilter]);

  const { data: rawSessions = [], isLoading: libraryLoading, error: libraryError } = useLibrary(libraryFilter);

  // Transform sessions data for component format
  const sessions = useMemo(() => {
    return rawSessions.map(session => ({
      id: session.id,
      title: session.title,
      problemStatement: "AI Think Tank Session", // Default if not in session data
      status: session.status as "completed" | "in_progress" | "draft",
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      facilitator: { 
        name: session.facilitatorId ? `User ${session.facilitatorId.slice(0, 8)}` : "Unknown",
        avatar: undefined 
      },
      participants: 0, // Could be calculated from session data
      totalVotes: 0, // Could be calculated from session data  
      solutionCount: 0, // Could be calculated from session data
      tags: session.config ? (typeof session.config === 'object' && session.config.tags ? session.config.tags : []) : [],
      outcome: session.status === "completed" ? "adopted" as const : undefined,
      engagementScore: session.status === "completed" ? 85 : session.status === "in_progress" ? 60 : 0
    }));
  }, [rawSessions]);

  const handleViewSession = (sessionId: string) => {
    onViewSession?.(sessionId);
    console.log("Opening session:", sessionId);
  };

  const handleCreateSession = () => {
    onCreateSession?.();
    console.log("Creating new session");
  };

  // Show loading state
  if (libraryLoading) {
    return (
      <div className="flex items-center justify-center p-8" data-testid="library-loading">
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading sessions...</p>
        </div>
      </div>
    );
  }

  // Show error state  
  if (libraryError) {
    return (
      <div className="text-center p-8" data-testid="library-error">
        <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
        <h3 className="text-lg font-medium mb-2">Failed to Load Library</h3>
        <p className="text-muted-foreground mb-4">Unable to fetch session library</p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    );
  }

  // Show empty state or use real sessions data
  if (sessions.length === 0 && !libraryLoading) {
    return (
      <div className="text-center p-8" data-testid="no-sessions">
        <Archive className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">No Sessions Found</h3>
        <p className="text-muted-foreground mb-4">Create your first AI Think Tank session to get started.</p>
        <Button onClick={handleCreateSession} data-testid="button-create-first-session">
          + Create First Session
        </Button>
      </div>
    );
  }

  const filteredSessions = sessions.filter(session => {
    const matchesSearch = 
      session.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      session.problemStatement.toLowerCase().includes(searchQuery.toLowerCase()) ||
      session.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === "all" || session.status === statusFilter;
    const matchesOutcome = outcomeFilter === "all" || session.outcome === outcomeFilter;

    return matchesSearch && matchesStatus && matchesOutcome;
  });

  const sortedSessions = [...filteredSessions].sort((a, b) => {
    switch (sortBy) {
      case "updated": return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      case "created": return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case "engagement": return b.engagementScore - a.engagementScore;
      case "participants": return b.participants - a.participants;
      default: return 0;
    }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "in_progress": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "draft": return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getOutcomeColor = (outcome?: string) => {
    switch (outcome) {
      case "adopted": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "modified": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "rejected": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "pending": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="space-y-6" data-testid="session-library">
      {/* Library Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Archive className="h-5 w-5" />
              Session Library
            </CardTitle>
            <Button onClick={handleCreateSession} data-testid="button-new-session">
              + New Session
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and Filters */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search sessions, problems, or tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search-sessions"
              />
            </div>
            
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter} data-testid="select-status-filter">
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                </SelectContent>
              </Select>

              <Select value={outcomeFilter} onValueChange={setOutcomeFilter} data-testid="select-outcome-filter">
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Outcome" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Outcomes</SelectItem>
                  <SelectItem value="adopted">Adopted</SelectItem>
                  <SelectItem value="modified">Modified</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy} data-testid="select-sort-by">
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="updated">Last Updated</SelectItem>
                  <SelectItem value="created">Date Created</SelectItem>
                  <SelectItem value="engagement">Engagement</SelectItem>
                  <SelectItem value="participants">Participants</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Results Summary */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>{sortedSessions.length} sessions found</span>
            {searchQuery && <span>for "{searchQuery}"</span>}
          </div>
        </CardContent>
      </Card>

      {/* Session Cards */}
      <div className="grid gap-4">
        {sortedSessions.map((session) => (
          <Card key={session.id} className="hover-elevate" data-testid={`session-card-${session.id}`}>
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-lg">{session.title}</h3>
                    <Badge className={getStatusColor(session.status)}>
                      {session.status.replace('_', ' ')}
                    </Badge>
                    {session.outcome && (
                      <Badge variant="outline" className={getOutcomeColor(session.outcome)}>
                        {session.outcome}
                      </Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground leading-relaxed line-clamp-2">
                    {session.problemStatement}
                  </p>
                </div>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" data-testid={`button-session-menu-${session.id}`}>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => handleViewSession(session.id)}>
                      View Details
                    </DropdownMenuItem>
                    <DropdownMenuItem>Export Summary</DropdownMenuItem>
                    <DropdownMenuItem>Duplicate Session</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Session Metadata */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={session.facilitator.avatar} />
                      <AvatarFallback className="text-xs">
                        {session.facilitator.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-muted-foreground">{session.facilitator.name}</span>
                  </div>
                  
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>{formatDate(session.updatedAt)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    <span>{session.participants}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    <span>{session.engagementScore}%</span>
                  </div>
                  <span>{session.totalVotes} votes</span>
                </div>
              </div>

              {/* Tags */}
              <div className="flex items-center gap-2">
                {session.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>

              {/* Quick Actions */}
              <div className="flex items-center justify-between pt-2">
                <div className="text-sm text-muted-foreground">
                  {session.solutionCount} solution{session.solutionCount !== 1 ? 's' : ''} generated
                </div>
                <div className="flex gap-2">
                  {session.status === 'completed' && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      data-testid={`button-view-summary-${session.id}`}
                    >
                      View Summary
                    </Button>
                  )}
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleViewSession(session.id)}
                    data-testid={`button-view-session-${session.id}`}
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Open
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {sortedSessions.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Archive className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-medium mb-2">No sessions found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery ? 'Try adjusting your search or filters' : 'Create your first workshop session to get started'}
            </p>
            <Button onClick={handleCreateSession} data-testid="button-create-first-session">
              + Create New Session
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}