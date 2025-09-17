import { ModeratorAgent } from './moderator-agent';
import { SolutionAgent } from './solution-agent';
import { ProponentAgent } from './proponent-agent';
import { OpponentAgent } from './opponent-agent';
import { AnalystAgent } from './analyst-agent';
import { AgentMessage, AgentContext } from './base-agent';
import { storage } from '../storage';

export interface DebateRound {
  roundNumber: number;
  solutionId: string;
  messages: AgentMessage[];
  completed: boolean;
}

export interface OrchestrationResult {
  success: boolean;
  messages: AgentMessage[];
  nextActions?: string[];
  phaseComplete?: boolean;
  error?: string;
  data?: {
    savedSolutionIds?: string[];
    savedDebatePointIds?: string[];
    savedEvidenceIds?: string[];
    savedSummaryId?: string;
    totalSolutions?: number;
    [key: string]: any;
  };
}

export class AgentOrchestrator {
  private moderator: ModeratorAgent;
  private solution: SolutionAgent;
  private proponent: ProponentAgent;
  private opponent: OpponentAgent;
  private analyst: AnalystAgent;

  constructor() {
    this.moderator = new ModeratorAgent();
    this.solution = new SolutionAgent();
    this.proponent = new ProponentAgent();
    this.opponent = new OpponentAgent();
    this.analyst = new AnalystAgent();
  }

  async processPhase(sessionId: string, phase: number): Promise<OrchestrationResult> {
    try {
      const context = await this.buildContext(sessionId);
      let result: OrchestrationResult;
      
      switch (phase) {
        case 1:
          result = await this.handleSessionSetup(sessionId, context);
          break;
        case 2:
          result = await this.handleProblemRefinement(sessionId, context);
          break;
        case 3:
          result = await this.handleSolutionGeneration(sessionId, context);
          break;
        case 4:
          result = await this.handleDebatePhase(sessionId, context);
          break;
        case 5:
          result = await this.handleEvidenceGathering(sessionId, context);
          break;
        case 6:
          result = await this.handleSummaryGeneration(sessionId, context);
          break;
        default:
          throw new Error(`Unknown phase: ${phase}`);
      }

      // Update session phase if processing was successful and phase complete
      if (result.success && result.phaseComplete) {
        const session = await storage.getSession(sessionId);
        const existingCompleted = session?.completedPhases || [];
        const newCompleted = existingCompleted.includes(phase) ? existingCompleted : [...existingCompleted, phase];
        
        await storage.updateSession(sessionId, {
          currentPhase: Math.min(phase + 1, 6),
          completedPhases: newCompleted
        });
      }

      return result;
    } catch (error) {
      return {
        success: false,
        messages: [],
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  private async buildContext(sessionId: string): Promise<AgentContext> {
    const session = await storage.getSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const problems = await storage.getSessionProblems(sessionId);
    const solutions = await storage.getSessionSolutions(sessionId);
    const debatePoints = await storage.getSessionDebatePoints(sessionId);
    const evidence = await storage.getSessionEvidence(sessionId);

    return {
      sessionId,
      phase: session.currentPhase,
      problemStatement: problems.find(p => p.status === 'approved')?.statement,
      solutions: solutions.map(s => ({
        id: s.id,
        title: s.title,
        description: s.objective
      })),
      debateHistory: debatePoints.map(point => ({
        role: 'assistant' as const,
        content: point.content,
        timestamp: point.createdAt,
        agentId: point.agent
      })),
      evidence: evidence.map(e => ({
        type: e.claim,
        content: e.snippet,
        source: typeof e.source === 'object' ? (e.source as any).title || 'Unknown' : 'Unknown'
      }))
    };
  }

  private async handleSessionSetup(sessionId: string, context: AgentContext): Promise<OrchestrationResult> {
    const facilitation = await this.moderator.facilitatePhase(1, context);
    
    return {
      success: true,
      messages: [facilitation],
      nextActions: [
        'Define problem statement',
        'Set session objectives',
        'Establish participant roles'
      ]
    };
  }

  private async handleProblemRefinement(sessionId: string, context: AgentContext): Promise<OrchestrationResult> {
    const facilitation = await this.moderator.facilitatePhase(2, context);
    
    // If we have an existing problem, get moderator to help refine it
    const messages = [facilitation];
    
    if (context.problemStatement) {
      const refinementGuidance = await this.moderator.processMessage(
        `Help refine this problem statement: "${context.problemStatement}". Ensure it's specific, actionable, and well-scoped.`,
        context
      );
      messages.push(refinementGuidance);
    }

    return {
      success: true,
      messages,
      nextActions: [
        'Review and approve problem statement',
        'Proceed to solution generation'
      ]
    };
  }

  private async handleSolutionGeneration(sessionId: string, context: AgentContext): Promise<OrchestrationResult> {
    if (!context.problemStatement) {
      return {
        success: false,
        messages: [],
        error: 'No approved problem statement found'
      };
    }

    try {
      const facilitation = await this.moderator.facilitatePhase(3, context);
      const solutions = await this.solution.generateSolutions(context.problemStatement, context, 3);
      const savedSolutionIds: string[] = [];

      // Find the approved problem ID first
      const approvedProblem = await storage.getSessionProblems(sessionId).then(probs => 
        probs.find(p => p.status === 'approved')
      );
      if (!approvedProblem) {
        return {
          success: false,
          messages: [facilitation],
          error: 'No approved problem found for solution generation'
        };
      }

      // Store generated solutions in database with enhanced error handling
      for (const solutionMessage of solutions) {
        const solutionContent = this.parseSolutionFromMessage(solutionMessage.content);
        
        for (const sol of solutionContent) {
          try {
            const savedSolution = await storage.createSolution({
              sessionId,
              problemId: approvedProblem.id,
              title: sol.title,
              objective: sol.description,
              approach: sol.approach,
              enablers: sol.enablers || [],
              risks: sol.risks || [],
              expectedOutcomes: sol.expectedOutcomes || [sol.impact],
              impact: {
                timeframe: 'medium',
                effort: 'moderate', 
                confidence: 'high'
              },
              generatedBy: 'solution_agent'
            });
            
            savedSolutionIds.push(savedSolution.id);
          } catch (error) {
            console.error('Failed to save solution:', sol.title, error);
            // Continue with other solutions even if one fails
          }
        }
      }

      if (savedSolutionIds.length === 0) {
        return {
          success: false,
          messages: [facilitation, ...solutions],
          error: 'Failed to save any generated solutions'
        };
      }

      return {
        success: true,
        messages: [facilitation, ...solutions],
        nextActions: [
          'Review generated solutions',
          'Begin structured debate phase'
        ],
        phaseComplete: true,
        data: {
          savedSolutionIds,
          totalSolutions: savedSolutionIds.length
        }
      };
    } catch (error) {
      return {
        success: false,
        messages: [],
        error: `Solution generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private async handleDebatePhase(sessionId: string, context: AgentContext): Promise<OrchestrationResult> {
    if (!context.solutions || context.solutions.length === 0) {
      return {
        success: false,
        messages: [],
        error: 'No solutions found to debate'
      };
    }

    const facilitation = await this.moderator.facilitatePhase(4, context);
    const messages = [facilitation];

    // Conduct debate for each solution
    for (const solution of context.solutions) {
      const debateRound = await this.conductDebateRound(solution.id, solution, context, sessionId);
      messages.push(...debateRound.messages);
    }

    // Moderator summarizes the debate
    const summary = await this.moderator.summarizeDebate(
      context.debateHistory || [],
      context
    );
    messages.push(summary);

    return {
      success: true,
      messages,
      nextActions: [
        'Gather evidence for claims made',
        'Proceed to analysis phase'
      ],
      phaseComplete: true
    };
  }

  private async conductDebateRound(
    solutionId: string, 
    solution: {id: string, title: string, description: string}, 
    context: AgentContext,
    sessionId: string
  ): Promise<DebateRound> {
    const messages: AgentMessage[] = [];

    // Proponent advocates for the solution
    const advocacy = await this.proponent.advocateForSolution(
      `${solution.title}: ${solution.description}`,
      context
    );
    messages.push(advocacy);

    // Store debate point
    await storage.createDebatePoint({
      sessionId,
      solutionId,
      agent: 'proponent',
      pointNumber: 1,
      round: 1,
      title: `Advocacy for ${solution.title}`,
      content: advocacy.content
    });

    // Opponent challenges the solution
    const challenge = await this.opponent.challengeSolution(
      `${solution.title}: ${solution.description}`,
      context
    );
    messages.push(challenge);

    // Store opponent's challenge
    await storage.createDebatePoint({
      sessionId,
      solutionId,
      agent: 'opponent',
      pointNumber: 2,
      round: 1,
      title: `Challenge to ${solution.title}`,
      content: challenge.content
    });

    // Proponent responds to the challenge
    const rebuttal = await this.proponent.rebutOpponentPoint(
      challenge.content,
      `${solution.title}: ${solution.description}`,
      context
    );
    messages.push(rebuttal);

    // Store proponent's rebuttal
    await storage.createDebatePoint({
      sessionId,
      solutionId,
      agent: 'proponent',
      pointNumber: 3,
      round: 1,
      title: `Rebuttal for ${solution.title}`,
      content: rebuttal.content
    });

    return {
      roundNumber: 1,
      solutionId,
      messages,
      completed: true
    };
  }

  private async handleEvidenceGathering(sessionId: string, context: AgentContext): Promise<OrchestrationResult> {
    const facilitation = await this.moderator.facilitatePhase(5, context);
    const messages = [facilitation];

    // Gather evidence for key claims made during debate
    if (context.debateHistory && context.debateHistory.length > 0) {
      const claims = this.extractClaimsFromDebate(context.debateHistory);
      
      for (const claim of claims.slice(0, 3)) { // Limit to top 3 claims
        const research = await this.analyst.factCheckClaim(claim, context);
        messages.push(research);

        // Store evidence
        await storage.createEvidence({
          sessionId,
          claim: claim,
          snippet: research.content,
          source: {
            title: 'AI Analysis',
            url: '',
            type: 'analysis',
            date: new Date().toISOString()
          },
          confidence: 80,
          relevanceScore: 85,
          gatheredBy: 'analyst_agent'
        });
      }
    }

    return {
      success: true,
      messages,
      nextActions: [
        'Review evidence and findings',
        'Generate final summary'
      ],
      phaseComplete: true
    };
  }

  private async handleSummaryGeneration(sessionId: string, context: AgentContext): Promise<OrchestrationResult> {
    const facilitation = await this.moderator.facilitatePhase(6, context);
    
    // Generate comprehensive summary
    const summary = await this.moderator.summarizeDebate(
      context.debateHistory || [],
      context
    );

    // Store summary
    const keyFindings = this.extractKeyFindings(summary.content);
    const recommendations = this.extractRecommendations(summary.content);
    const nextSteps = this.extractNextSteps(summary.content);
    
    await storage.createSummary({
      sessionId,
      moderatorInsights: summary.content,
      sections: {
        keyFindings,
        recommendations,
        nextSteps,
        sentiment: 'neutral'
      },
      participantSentiment: {
        positive: 60,
        neutral: 30,
        negative: 10
      },
      decisionPrompts: nextSteps,
      recommendedActions: recommendations.join('; '),
      outcome: 'pending'
    });

    return {
      success: true,
      messages: [facilitation, summary],
      phaseComplete: true,
      nextActions: [
        'Review final recommendations',
        'Plan implementation next steps'
      ]
    };
  }

  // Helper methods for parsing content
  private parseSolutionFromMessage(content: string): Array<{title: string, description: string, approach: string, impact: string, enablers?: string[], risks?: string[], expectedOutcomes?: string[]}> {
    const solutions = [];
    const lines = content.split('\n');
    let currentSolution: any = {};
    let inSolution = false;

    for (const line of lines) {
      const cleanLine = line.trim();
      
      // Look for solution markers
      if (cleanLine.match(/^\d+\./)) {
        // Save previous solution if exists
        if (currentSolution.title && currentSolution.description) {
          solutions.push({
            ...currentSolution,
            enablers: currentSolution.enablers || ['AI analysis', 'Strategic planning'],
            risks: currentSolution.risks || ['Implementation complexity', 'Resource constraints'],
            expectedOutcomes: currentSolution.expectedOutcomes || ['Process improvement', 'Enhanced outcomes']
          });
        }
        
        // Start new solution
        currentSolution = {};
        inSolution = true;
      }
      
      // Parse different sections
      if (cleanLine.includes('TITLE:') || cleanLine.match(/^title:/i)) {
        currentSolution.title = cleanLine.replace(/TITLE:|title:/i, '').trim();
      } else if (cleanLine.includes('SUMMARY:') || cleanLine.match(/^summary:/i)) {
        currentSolution.description = cleanLine.replace(/SUMMARY:|summary:/i, '').trim();
      } else if (cleanLine.includes('APPROACH:') || cleanLine.match(/^approach:/i)) {
        currentSolution.approach = cleanLine.replace(/APPROACH:|approach:/i, '').trim();
      } else if (cleanLine.includes('IMPACT:') || cleanLine.match(/^impact:/i)) {
        currentSolution.impact = cleanLine.replace(/IMPACT:|impact:/i, '').trim();
      } else if (inSolution && cleanLine.length > 20 && !currentSolution.title && !cleanLine.includes(':')) {
        // If no explicit title, use first meaningful line
        currentSolution.title = cleanLine.substring(0, 50);
      } else if (inSolution && cleanLine.length > 30 && !currentSolution.description && cleanLine !== currentSolution.title) {
        // If no explicit description, use substantial content line
        currentSolution.description = cleanLine;
      } else if (inSolution && !currentSolution.approach && cleanLine.length > 20 && cleanLine !== currentSolution.title && cleanLine !== currentSolution.description) {
        currentSolution.approach = cleanLine;
      }
    }
    
    // Don't forget the last solution
    if (currentSolution.title && currentSolution.description) {
      solutions.push({
        ...currentSolution,
        enablers: currentSolution.enablers || ['AI analysis', 'Strategic planning'],
        risks: currentSolution.risks || ['Implementation complexity', 'Resource constraints'],
        expectedOutcomes: currentSolution.expectedOutcomes || ['Process improvement', 'Enhanced outcomes'],
        impact: currentSolution.impact || 'Positive strategic impact expected'
      });
    }
    
    // If no solutions parsed, create a fallback from the full content
    if (solutions.length === 0 && content.trim().length > 0) {
      const fallbackTitle = content.split('\n')[0].substring(0, 50).trim();
      const fallbackDescription = content.substring(0, 200).trim();
      solutions.push({
        title: fallbackTitle || 'AI Generated Solution',
        description: fallbackDescription || content.trim(),
        approach: 'Strategic implementation approach',
        impact: 'Positive outcomes expected',
        enablers: ['AI analysis', 'Strategic planning'],
        risks: ['Implementation complexity', 'Resource constraints'],
        expectedOutcomes: ['Process improvement', 'Enhanced outcomes']
      });
    }
    
    return solutions;
  }

  private extractClaimsFromDebate(debateHistory: AgentMessage[]): string[] {
    // Extract key claims that need fact-checking
    const claims: string[] = [];
    
    for (const message of debateHistory) {
      const sentences = message.content.split(/[.!?]+/);
      for (const sentence of sentences) {
        if (sentence.includes('evidence shows') || 
            sentence.includes('research indicates') || 
            sentence.includes('studies prove') ||
            sentence.length > 50) {
          claims.push(sentence.trim());
        }
      }
    }
    
    return claims.slice(0, 5); // Return top 5 claims
  }

  private extractKeyFindings(summaryContent: string): string[] {
    // Extract key findings from summary
    const lines = summaryContent.split('\n');
    const findings: string[] = [];
    
    let inFindingsSection = false;
    for (const line of lines) {
      if (line.toLowerCase().includes('key findings') || line.toLowerCase().includes('findings')) {
        inFindingsSection = true;
        continue;
      }
      if (inFindingsSection && line.trim().startsWith('-')) {
        findings.push(line.replace('-', '').trim());
      }
      if (inFindingsSection && line.toLowerCase().includes('recommendations')) {
        break;
      }
    }
    
    return findings;
  }

  private extractRecommendations(summaryContent: string): string[] {
    // Extract recommendations from summary
    const lines = summaryContent.split('\n');
    const recommendations: string[] = [];
    
    let inRecommendationsSection = false;
    for (const line of lines) {
      if (line.toLowerCase().includes('recommendations')) {
        inRecommendationsSection = true;
        continue;
      }
      if (inRecommendationsSection && line.trim().startsWith('-')) {
        recommendations.push(line.replace('-', '').trim());
      }
      if (inRecommendationsSection && line.toLowerCase().includes('next steps')) {
        break;
      }
    }
    
    return recommendations;
  }

  private extractNextSteps(summaryContent: string): string[] {
    // Extract next steps from summary
    const lines = summaryContent.split('\n');
    const nextSteps: string[] = [];
    
    let inNextStepsSection = false;
    for (const line of lines) {
      if (line.toLowerCase().includes('next steps')) {
        inNextStepsSection = true;
        continue;
      }
      if (inNextStepsSection && line.trim().startsWith('-')) {
        nextSteps.push(line.replace('-', '').trim());
      }
    }
    
    return nextSteps;
  }
}

// Singleton instance
export const orchestrator = new AgentOrchestrator();