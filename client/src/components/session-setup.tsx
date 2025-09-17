import { useState, useCallback } from "react";
import { useLocation } from "wouter";
import { useCreateSession } from "@/hooks/use-sessions";
import { useSessionContext } from "@/context/session-context";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, Link as LinkIcon, Settings, Sliders, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface UploadedFile {
  name: string;
  size: string;
  type: "pdf" | "doc" | "link";
}

interface AgentConfig {
  name: string;
  description: string;
  settings: {
    [key: string]: number;
  };
}

export function SessionSetup() {
  const [, setLocation] = useLocation();
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [researchMode, setResearchMode] = useState<"quick" | "deep">("quick");
  const [debateRounds, setDebateRounds] = useState(3);
  const [pointsPerSide, setPointsPerSide] = useState(3);
  const [isDragOver, setIsDragOver] = useState(false);
  const [sessionTitle, setSessionTitle] = useState("");
  const [facilitatorName, setFacilitatorName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const { setCurrentSessionId } = useSessionContext();
  const createSessionMutation = useCreateSession();
  const { toast } = useToast();
  
  const [agentConfigs] = useState<AgentConfig[]>([
    {
      name: "Solution Agent",
      description: "Generates structured solution proposals",
      settings: { innovation: 70, rigor: 80 }
    },
    {
      name: "Proponent",
      description: "Advocates for proposed solutions",
      settings: { vision: 75, customer_focus: 60 }
    },
    {
      name: "Opponent", 
      description: "Challenges solutions with counter-arguments",
      settings: { risk_aversion: 80, cost_focus: 70 }
    },
    {
      name: "Analyst",
      description: "Provides evidence and fact-checking",
      settings: { evidence_depth: 85, confidence_threshold: 75 }
    },
    {
      name: "Moderator",
      description: "Synthesizes debates into actionable summaries",
      settings: { detail_level: 65, decision_focus: 80 }
    }
  ]);

  const handleFileUpload = useCallback((uploadedFiles: FileList | null) => {
    if (!uploadedFiles) return;
    
    const newFiles: UploadedFile[] = Array.from(uploadedFiles).map(file => ({
      name: file.name,
      size: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
      type: file.type.includes("pdf") ? "pdf" : "doc"
    }));
    
    setFiles(prev => [...prev, ...newFiles]);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFileUpload(e.dataTransfer.files);
  }, [handleFileUpload]);

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleStartSession = async () => {
    if (!sessionTitle.trim()) {
      toast({
        title: "Session Title Required",
        description: "Please provide a title for your session.",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    
    try {
      const newSession = await createSessionMutation.mutateAsync({
        title: sessionTitle.trim(),
        facilitator: facilitatorName.trim() || "Anonymous",
        currentPhase: 1,
        metadata: {
          researchMode,
          debateRounds,
          pointsPerSide,
          agentConfigs,
          uploadedFiles: files.map(f => ({ name: f.name, type: f.type }))
        }
      });

      setCurrentSessionId(newSession.id);
      
      toast({
        title: "🎉 Session Created Successfully!",
        description: `AI Think Tank session "${sessionTitle}" is ready! Taking you to Problem Statement...`,
      });

      // Clear form
      setSessionTitle("");
      setFacilitatorName("");
      setFiles([]);
      
      // Auto-navigate to Problem Statement (Phase 2) after brief delay
      setTimeout(() => {
        setLocation("/problem");
      }, 1500);
      
    } catch (error) {
      console.error("Failed to create session:", error);
      toast({
        title: "Failed to Create Session",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6" data-testid="session-setup">
      {/* Grounding Materials */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Grounding Materials
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* File Upload Zone */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25"
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            data-testid="file-upload-zone"
          >
            <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">Upload grounding materials</p>
            <p className="text-muted-foreground mb-4">
              Drag and drop files here, or click to browse. Supports PDFs, documents, and web links.
            </p>

            <div className="space-y-3 mb-6">
              <div>
                <Label htmlFor="session-title">Session Title *</Label>
                <Input
                  id="session-title"
                  placeholder="e.g., Customer Retention Strategy Workshop"
                  value={sessionTitle}
                  onChange={(e) => setSessionTitle(e.target.value)}
                  data-testid="input-session-title"
                />
              </div>
              
              <div>
                <Label htmlFor="facilitator-name">Facilitator Name</Label>
                <Input
                  id="facilitator-name"
                  placeholder="Your name (optional)"
                  value={facilitatorName}
                  onChange={(e) => setFacilitatorName(e.target.value)}
                  data-testid="input-facilitator-name"
                />
              </div>
            </div>
            <input
              type="file"
              multiple
              accept=".pdf,.doc,.docx"
              onChange={(e) => handleFileUpload(e.target.files)}
              className="hidden"
              id="file-upload"
              data-testid="file-input"
            />
            <Button 
              onClick={() => document.getElementById("file-upload")?.click()}
              data-testid="button-browse-files"
            >
              Browse Files
            </Button>
          </div>

          {/* Link Input */}
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                placeholder="Add link to external resource..."
                data-testid="input-external-link"
              />
            </div>
            <Button variant="outline" data-testid="button-add-link">
              <LinkIcon className="h-4 w-4" />
            </Button>
          </div>

          {/* Uploaded Files */}
          {files.length > 0 && (
            <div className="space-y-2">
              <Label>Uploaded Files ({files.length})</Label>
              {files.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-muted rounded-md"
                  data-testid={`file-item-${index}`}
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">{file.name}</p>
                      <p className="text-xs text-muted-foreground">{file.size}</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeFile(index)}
                    data-testid={`button-remove-file-${index}`}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Research Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Research Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Research Mode</Label>
              <Select
                value={researchMode}
                onValueChange={(value: "quick" | "deep") => setResearchMode(value)}
                data-testid="select-research-mode"
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="quick">
                    Quick Mode (2 min)
                  </SelectItem>
                  <SelectItem value="deep">
                    Deep Mode (4 min)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Grounding Priority</Label>
              <Select defaultValue="internal-first" data-testid="select-grounding-priority">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="internal-only">Internal Only</SelectItem>
                  <SelectItem value="internal-first">Internal First</SelectItem>
                  <SelectItem value="open-web">Open Web</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Debate Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Debate Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-3">
              <Label>Points per Side: {pointsPerSide}</Label>
              <Slider
                value={[pointsPerSide]}
                onValueChange={(value) => setPointsPerSide(value[0])}
                min={2}
                max={5}
                step={1}
                data-testid="slider-points-per-side"
              />
            </div>
            <div className="space-y-3">
              <Label>Rebuttal Rounds: {debateRounds}</Label>
              <Slider
                value={[debateRounds]}
                onValueChange={(value) => setDebateRounds(value[0])}
                min={1}
                max={5}
                step={1}
                data-testid="slider-rebuttal-rounds"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Agent Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sliders className="h-5 w-5" />
            Agent Personalities
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {agentConfigs.map((agent, index) => (
            <div key={agent.name} className="space-y-3 p-4 border rounded-lg">
              <div>
                <h4 className="font-medium">{agent.name}</h4>
                <p className="text-sm text-muted-foreground">{agent.description}</p>
              </div>
              <div className="space-y-3">
                {Object.entries(agent.settings).map(([setting, value]) => (
                  <div key={setting} className="space-y-2">
                    <div className="flex justify-between">
                      <Label className="capitalize">{setting.replace("_", " ")}</Label>
                      <span className="text-sm text-muted-foreground">{value}%</span>
                    </div>
                    <Slider
                      value={[value]}
                      onValueChange={(newValue) => console.log(`${agent.name} ${setting}: ${newValue[0]}`)}
                      min={0}
                      max={100}
                      step={5}
                      className="flex-1"
                      data-testid={`slider-${agent.name.toLowerCase().replace(" ", "-")}-${setting}`}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-between">
        <Button variant="outline" data-testid="button-save-template">
          Save as Template
        </Button>
        <Button 
          onClick={handleStartSession}
          disabled={isCreating || !sessionTitle.trim()}
          data-testid="button-start-session"
        >
          {isCreating ? "Creating Session..." : "Start Workshop Session"}
        </Button>
      </div>
    </div>
  );
}