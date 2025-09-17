import { useState } from "react";
import { Search, ExternalLink, Check, AlertCircle, FileText, Link as LinkIcon, Pin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Evidence {
  id: string;
  pointId: string;
  claim: string;
  source: {
    title: string;
    url: string;
    type: "internal" | "external" | "research";
    date?: string;
  };
  confidence: number;
  snippet: string;
  relevanceScore: number;
}

interface Question {
  id: string;
  question: string;
  askedBy: string;
  votes: number;
  answered: boolean;
  answer?: string;
}

interface EvidencePanelProps {
  isOpen?: boolean;
  onToggle?: () => void;
}

export function EvidencePanel({ isOpen = true, onToggle }: EvidencePanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEvidence, setSelectedEvidence] = useState<string | null>(null);

  // todo: remove mock functionality
  const [evidence] = useState<Evidence[]>([
    {
      id: "ev-001",
      pointId: "point-1-pro",
      claim: "SaaS companies reduce churn by 20-30% through customer success programs",
      source: {
        title: "SaaS Customer Success Benchmarks 2024",
        url: "https://example.com/saas-benchmarks",
        type: "research",
        date: "2024"
      },
      confidence: 85,
      snippet: "Companies implementing dedicated customer success programs showed average churn reduction of 23% within 12 months, with enterprise clients showing higher retention rates...",
      relevanceScore: 92
    },
    {
      id: "ev-002", 
      pointId: "point-1-con",
      claim: "Customer success manager costs range from $80-120K annually",
      source: {
        title: "SaaS Compensation Report",
        url: "https://example.com/compensation",
        type: "research",
        date: "2024"
      },
      confidence: 95,
      snippet: "Median salary for Customer Success Managers in SaaS companies ranges from $82K to $118K, with additional platform and training costs averaging $15K-25K annually...",
      relevanceScore: 88
    },
    {
      id: "ev-003",
      pointId: "point-3-pro", 
      claim: "Customer acquisition cost is 5-25x higher than retention cost",
      source: {
        title: "Customer Acquisition vs Retention Economics",
        url: "https://example.com/retention-economics", 
        type: "research",
        date: "2023"
      },
      confidence: 90,
      snippet: "Research across 500+ SaaS companies shows that acquiring a new customer costs between 5-25 times more than retaining an existing customer, with the ratio increasing in competitive markets...",
      relevanceScore: 94
    }
  ]);

  // todo: remove mock functionality
  const [questions] = useState<Question[]>([
    {
      id: "q-001",
      question: "What's the typical implementation timeline for customer success platforms?",
      askedBy: "Sarah",
      votes: 5,
      answered: true,
      answer: "Based on implementation data from leading platforms, typical deployment takes 3-6 months for full rollout, with initial health scoring available within 4-6 weeks."
    },
    {
      id: "q-002", 
      question: "How do smaller companies manage customer success without dedicated staff?",
      askedBy: "Alex",
      votes: 8,
      answered: false
    },
    {
      id: "q-003",
      question: "What are the key metrics that predict customer churn most accurately?",
      askedBy: "Jordan",
      votes: 3,
      answered: true,
      answer: "Login frequency, feature adoption rates, and support ticket sentiment are the strongest predictive indicators, with 85% accuracy when combined."
    }
  ]);

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return "text-green-600";
    if (confidence >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getSourceIcon = (type: string) => {
    switch (type) {
      case "internal": return <FileText className="h-4 w-4" />;
      case "external": return <LinkIcon className="h-4 w-4" />;
      case "research": return <Search className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const filteredEvidence = evidence.filter(ev => 
    ev.claim.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ev.source.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sortedQuestions = [...questions].sort((a, b) => b.votes - a.votes);

  if (!isOpen) {
    return (
      <Button
        onClick={onToggle}
        variant="outline"
        size="sm"
        className="fixed right-4 top-1/2 -translate-y-1/2 z-50"
        data-testid="button-open-evidence-panel"
      >
        <Pin className="h-4 w-4 mr-1" />
        Evidence
      </Button>
    );
  }

  return (
    <Card className="w-80 h-fit max-h-[80vh] fixed right-4 top-20 z-50 shadow-lg" data-testid="evidence-panel">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Search className="h-4 w-4" />
            Evidence & Analysis
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onToggle} data-testid="button-close-evidence-panel">
            ×
          </Button>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="outline">{evidence.length} sources</Badge>
          <Badge variant="outline">{questions.length} questions</Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4 p-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search evidence..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
            data-testid="input-search-evidence"
          />
        </div>

        <ScrollArea className="h-64">
          {/* Evidence List */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <Pin className="h-3 w-3" />
              Attached Evidence
            </h4>
            
            {filteredEvidence.map((ev) => (
              <div
                key={ev.id}
                className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                  selectedEvidence === ev.id ? "bg-accent/50 border-accent" : "hover:bg-muted/50"
                }`}
                onClick={() => setSelectedEvidence(selectedEvidence === ev.id ? null : ev.id)}
                data-testid={`evidence-item-${ev.id}`}
              >
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    {getSourceIcon(ev.source.type)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-tight line-clamp-2">
                        {ev.claim}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {ev.source.type}
                        </Badge>
                        <span className={`text-xs font-medium ${getConfidenceColor(ev.confidence)}`}>
                          {ev.confidence}% confidence
                        </span>
                      </div>
                    </div>
                  </div>

                  {selectedEvidence === ev.id && (
                    <div className="space-y-2 mt-3 pt-2 border-t">
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {ev.snippet}
                      </p>
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-muted-foreground">
                          {ev.source.title}
                        </div>
                        <Button size="sm" variant="ghost" data-testid={`button-view-source-${ev.id}`}>
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <Separator />

        <ScrollArea className="h-48">
          {/* Participant Questions */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Top Questions</h4>
            
            {sortedQuestions.map((q) => (
              <div
                key={q.id}
                className="p-3 border rounded-lg space-y-2"
                data-testid={`question-item-${q.id}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm leading-tight">{q.question}</p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                    <span>{q.votes}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                      data-testid={`button-vote-question-${q.id}`}
                    >
                      +
                    </Button>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">by {q.askedBy}</span>
                  {q.answered ? (
                    <Badge variant="secondary" className="text-xs">
                      <Check className="h-3 w-3 mr-1" />
                      Answered
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Pending
                    </Badge>
                  )}
                </div>

                {q.answered && q.answer && (
                  <div className="pt-2 mt-2 border-t">
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {q.answer}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}