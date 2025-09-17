import { useState } from "react";
import { CheckCircle, TrendingUp, TrendingDown, BarChart3, Users, Edit, Download, Share, Play, Pause, Volume2, AlertCircle } from "lucide-react";
import { useSessionContext } from "@/context/session-context";
import { useSummary, useSaveSummary, useGenerateSummary, useSummaryNarration } from "@/hooks/use-sessions";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";

interface SummarySection {
  title: string;
  points: string[];
  sentiment: "positive" | "negative" | "neutral";
}

interface ParticipantSentiment {
  category: string;
  percentage: number;
  count: number;
}

interface SummaryViewProps {
  sessionId?: string; // Make sessionId optional, will use context if not provided
  onExport?: (format: "pdf" | "markdown") => void;
  onEditSummary?: (sectionId: string, content: string) => void;
}

export function SummaryView({ sessionId: propSessionId, onExport, onEditSummary }: SummaryViewProps) {
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);

  const { currentSessionId: contextSessionId } = useSessionContext();
  const sessionId = propSessionId || contextSessionId;
  const { toast } = useToast();

  // Real API data fetching
  const { data: summary, isLoading: summaryLoading, error: summaryError } = useSummary(sessionId);
  const saveSummaryMutation = useSaveSummary();
  const generateSummaryMutation = useGenerateSummary();
  const narrationMutation = useSummaryNarration(sessionId);

  // Show loading state
  if (summaryLoading) {
    return (
      <div className="flex items-center justify-center p-8" data-testid="summary-loading">
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading summary...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (summaryError) {
    return (
      <div className="text-center p-8" data-testid="summary-error">
        <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
        <h3 className="text-lg font-medium mb-2">Failed to Load Summary</h3>
        <p className="text-muted-foreground mb-4">Unable to fetch session summary</p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    );
  }

  // Show empty state or generate option
  if (!summary && sessionId) {
    return (
      <div className="text-center p-8" data-testid="no-summary">
        <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">No Summary Available</h3>
        <p className="text-muted-foreground mb-4">Generate a summary for this session using AI analysis.</p>
        <Button 
          onClick={() => handleGenerateSummary()} 
          disabled={generateSummaryMutation.isPending}
          data-testid="button-generate-summary"
        >
          {generateSummaryMutation.isPending ? 'Generating...' : 'Generate Summary'}
        </Button>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="text-center p-8" data-testid="no-session">
        <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">No Session Selected</h3>
        <p className="text-muted-foreground">Please select a session to view its summary.</p>
      </div>
    );
  }

  // Transform summary data for component format
  const transformedSections = summary.sections ? (typeof summary.sections === 'string' ? JSON.parse(summary.sections) : summary.sections) : [];
  const transformedSentiment = summary.participantSentiment ? (typeof summary.participantSentiment === 'string' ? JSON.parse(summary.participantSentiment) : summary.participantSentiment) : [];

  const handleGenerateSummary = async () => {
    if (!sessionId) return;
    
    try {
      await generateSummaryMutation.mutateAsync(sessionId);
      toast({
        title: "Summary Generated",
        description: "AI summary has been generated successfully.",
      });
    } catch (error) {
      toast({
        title: "Generation Failed", 
        description: "Failed to generate summary. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handlePlayNarration = async () => {
    if (isPlaying) {
      currentAudio?.pause();
      setIsPlaying(false);
      return;
    }

    try {
      const result = await narrationMutation.mutateAsync();
      
      if (currentAudio) {
        currentAudio.pause();
      }

      const audio = new Audio(result.audioUrl);
      setCurrentAudio(audio);
      
      audio.onplay = () => setIsPlaying(true);
      audio.onpause = () => setIsPlaying(false);
      audio.onended = () => setIsPlaying(false);
      
      await audio.play();
      
      toast({
        title: "Playing Summary Narration",
        description: `Duration: ${Math.round(result.duration / 1000)}s`,
      });
    } catch (error) {
      toast({
        title: "Narration Failed",
        description: "Unable to play summary narration. Voice service may be unavailable.",
        variant: "destructive",
      });
    }
  };

  // Mock data fallback for UI structure (real data should be structured similarly)
  const mockSummary = {
    sessionId: "session-001",
    title: "Customer Success Enhancement Program",
    moderatorInsights: "The debate revealed strong support for customer success programs with legitimate concerns about implementation costs and automation balance. The evidence strongly supports retention benefits, but implementation strategy needs careful consideration.",
    createdAt: "2024-01-15T14:30:00Z",
    totalParticipants: 12,
    totalVotes: 156
  };

  const [sections] = useState<SummarySection[]>([
    {
      title: "Strongest Pro Arguments",
      sentiment: "positive",
      points: [
        "Proven 20-30% churn reduction across similar SaaS companies with robust evidence from industry benchmarks",
        "Customer acquisition costs are 5-25x higher than retention, making investment in customer success highly cost-effective",
        "AI-driven health scoring enables early intervention 30-90 days before churn, maximizing success rates",
        "Automated systems can handle routine touchpoints while preserving human relationships for high-value accounts"
      ]
    },
    {
      title: "Key Concerns & Challenges",
      sentiment: "negative", 
      points: [
        "High upfront costs ($80-120K per success manager plus platform costs) may impact short-term profitability",
        "ROI timeline uncertainty creates budget planning challenges for resource allocation",
        "Over-automation risks damaging personal relationships that drive B2B customer loyalty",
        "Implementation complexity may require 3-6 months before seeing measurable results"
      ]
    },
    {
      title: "Evidence Highlights",
      sentiment: "neutral",
      points: [
        "Industry benchmarks show 23% average churn reduction within 12 months of implementation",
        "Customer success platforms demonstrate 85% accuracy in predicting churn using behavioral data",
        "Implementation timeline typically requires 3-6 months for full deployment and measurement",
        "Cost-benefit analysis shows positive ROI within 6-12 months for companies with >$1M ARR"
      ]
    }
  ]);

  const [participantSentiment] = useState<ParticipantSentiment[]>([
    { category: "Strongly Support", percentage: 45, count: 54 },
    { category: "Support with Concerns", percentage: 35, count: 42 },
    { category: "Neutral", percentage: 12, count: 15 },
    { category: "Oppose", percentage: 8, count: 10 }
  ]);

  const [decisionPrompts] = useState([
    "Should we prioritize quick wins (feature adoption improvements) or long-term customer success program implementation?",
    "What's the minimum viable customer success program that balances cost concerns with retention benefits?",
    "How can we measure and communicate ROI to stakeholders during the 6-month implementation period?",
    "What automation level preserves personal relationships while achieving operational efficiency?"
  ]);

  const handleStartEdit = (sectionIndex: number, currentContent: string) => {
    setIsEditing(`section-${sectionIndex}`);
    setEditContent(currentContent);
  };

  const handleSaveEdit = (sectionId: string) => {
    onEditSummary?.(sectionId, editContent);
    setIsEditing(null);
    console.log(`Saved edit for ${sectionId}:`, editContent);
  };

  const handleExport = (format: "pdf" | "markdown") => {
    onExport?.(format);
    console.log(`Exporting summary as ${format}`);
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case "positive": return "border-l-green-500 bg-green-50/50 dark:bg-green-950/20";
      case "negative": return "border-l-red-500 bg-red-50/50 dark:bg-red-950/20"; 
      case "neutral": return "border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20";
      default: return "border-l-gray-500";
    }
  };

  return (
    <div className="space-y-6" data-testid="summary-view">
      {/* Summary Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Workshop Summary: {summary.sessionId || "AI Think Tank Session"}
              </CardTitle>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <Badge variant="outline">Session {summary.id}</Badge>
                <span>Completed: {new Date(summary.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" data-testid="button-share-summary">
                <Share className="h-4 w-4 mr-1" />
                Share
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleExport("markdown")}
                data-testid="button-export-markdown"
              >
                <Download className="h-4 w-4 mr-1" />
                Markdown
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleExport("pdf")}
                data-testid="button-export-pdf"
              >
                <Download className="h-4 w-4 mr-1" />
                PDF
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">Moderator Insights</h3>
              <p className="text-muted-foreground leading-relaxed">
                {summary.moderatorInsights}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Summary Sections */}
      <div className="grid gap-6">
        {sections.map((section, index) => (
          <Card key={index} className={`border-l-4 ${getSentimentColor(section.sentiment)}`}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  {section.sentiment === "positive" && <TrendingUp className="h-4 w-4 text-green-600" />}
                  {section.sentiment === "negative" && <TrendingDown className="h-4 w-4 text-red-600" />}
                  {section.sentiment === "neutral" && <BarChart3 className="h-4 w-4 text-blue-600" />}
                  {section.title}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleStartEdit(index, section.points.join('\n• '))}
                  data-testid={`button-edit-section-${index}`}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isEditing === `section-${index}` ? (
                <div className="space-y-3">
                  <Textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="min-h-32"
                    placeholder="Edit section content..."
                    data-testid={`textarea-edit-section-${index}`}
                  />
                  <div className="flex gap-2">
                    <Button 
                      size="sm"
                      onClick={() => handleSaveEdit(`section-${index}`)}
                      data-testid={`button-save-edit-${index}`}
                    >
                      Save
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => setIsEditing(null)}
                      data-testid={`button-cancel-edit-${index}`}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <ul className="space-y-3">
                  {section.points.map((point, pointIndex) => (
                    <li key={pointIndex} className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-current opacity-50 mt-2 shrink-0" />
                      <p className="text-muted-foreground leading-relaxed">{point}</p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Participant Sentiment */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Participant Sentiment
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {participantSentiment.map((sentiment, index) => (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{sentiment.category}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">{sentiment.count} votes</span>
                  <Badge variant="secondary">{sentiment.percentage}%</Badge>
                </div>
              </div>
              <Progress value={sentiment.percentage} className="h-2" />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Decision Prompts */}
      <Card>
        <CardHeader>
          <CardTitle>Decision Prompts & Next Steps</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {decisionPrompts.map((prompt, index) => (
              <div key={index} className="p-4 border rounded-lg bg-muted/30">
                <p className="font-medium text-sm mb-2">Question {index + 1}</p>
                <p className="text-muted-foreground">{prompt}</p>
              </div>
            ))}
          </div>
          
          <Separator className="my-6" />
          
          <div className="space-y-3">
            <h4 className="font-medium">Recommended Actions</h4>
            <div className="bg-primary/5 border-l-4 border-primary p-4 rounded">
              <p className="text-sm leading-relaxed">
                <strong>Immediate:</strong> Conduct cost-benefit analysis for a minimal viable customer success program. 
                <strong>Short-term (30 days):</strong> Pilot automated health scoring with existing customer data.
                <strong>Long-term (3-6 months):</strong> Phased rollout of customer success program starting with highest-value accounts.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Final Actions */}
      <div className="flex justify-between">
        <Button variant="outline" data-testid="button-back-to-debate">
          ← Back to Debate
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" data-testid="button-save-to-library">
            Save to Library
          </Button>
          <Button data-testid="button-start-new-session">
            Start New Session
          </Button>
        </div>
      </div>
    </div>
  );
}