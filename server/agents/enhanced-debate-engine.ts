import { storage } from '../storage';
import { ProponentAgent } from './proponent-agent';
import { OpponentAgent } from './opponent-agent';
import { ModeratorAgent } from './moderator-agent';
import { AnalystAgent } from './analyst-agent';
import { AgentMessage, AgentContext } from './base-agent';

export interface DebateArgument {
  id: string;
  agentRole: 'proponent' | 'opponent';
  roundNumber: number;
  content: string;
  evidenceIds: string[];
  strengthScore: number;
  votes: {
    up: number;
    down: number;
    participants: string[];
  };
  rebuttalTo?: string;
  timestamp: Date;
}

export interface DebateRound {
  roundNumber: number;
  solutionId: string;
  arguments: DebateArgument[];
  roundSummary?: string;
  consensusLevel: 'low' | 'moderate' | 'high';
  completed: boolean;
}

export interface DebateSession {
  sessionId: string;
  solutionId: string;
  rounds: DebateRound[];
  overallConsensus: 'low' | 'moderate' | 'high';
  winningPosition?: 'proponent' | 'opponent' | 'draw';
  totalVotes: number;
  participantCount: number;
  status: 'active' | 'completed' | 'paused';
}

export interface VoteResult {
  argumentId: string;
  voteType: 'up' | 'down';
  userId: string;
  impact: {
    newScore: number;
    consensusShift: number;
  };
}

export class EnhancedDebateEngine {
  private proponent: ProponentAgent;
  private opponent: OpponentAgent;
  private moderator: ModeratorAgent;
  private analyst: AnalystAgent;

  constructor() {
    this.proponent = new ProponentAgent();
    this.opponent = new OpponentAgent();
    this.moderator = new ModeratorAgent();
    this.analyst = new AnalystAgent();
  }

  async startDebateSession(
    sessionId: string, 
    solutionId: string, 
    context: AgentContext,
    rounds: number = 3
  ): Promise<DebateSession> {
    const debateSession: DebateSession = {
      sessionId,
      solutionId,
      rounds: [],
      overallConsensus: 'low',
      totalVotes: 0,
      participantCount: 0,
      status: 'active'
    };

    // Start with moderator introduction
    const intro = await this.moderator.processMessage(
      `Begin a ${rounds}-round structured debate on this solution. Set clear ground rules for constructive argumentation.`,
      context
    );

    console.log(`🎯 Debate started for solution ${solutionId} with ${rounds} rounds`);

    for (let roundNum = 1; roundNum <= rounds; roundNum++) {
      const round = await this.conductDebateRound(
        roundNum, 
        solutionId, 
        context, 
        sessionId,
        debateSession.rounds
      );
      
      debateSession.rounds.push(round);
      
      // Moderate after each round
      if (roundNum < rounds) {
        const moderation = await this.moderator.processMessage(
          `Moderate this debate round. Identify key points of agreement and disagreement. Guide toward the next round.`,
          context
        );
        console.log(`🎭 Round ${roundNum} moderated:`, moderation.content.substring(0, 100) + '...');
      }
    }

    // Final analysis and consensus evaluation
    debateSession.overallConsensus = await this.evaluateConsensus(debateSession);
    debateSession.winningPosition = await this.determineWinner(debateSession);
    debateSession.status = 'completed';

    console.log(`✅ Debate completed. Consensus: ${debateSession.overallConsensus}, Winner: ${debateSession.winningPosition}`);

    return debateSession;
  }

  private async conductDebateRound(
    roundNumber: number,
    solutionId: string,
    context: AgentContext,
    sessionId: string,
    previousRounds: DebateRound[]
  ): Promise<DebateRound> {
    const round: DebateRound = {
      roundNumber,
      solutionId,
      arguments: [],
      consensusLevel: 'low',
      completed: false
    };

    // Build context from previous rounds
    const debateHistory = previousRounds.flatMap(r => 
      r.arguments.map(arg => ({
        role: 'assistant' as const,
        content: arg.content,
        agentId: arg.agentRole,
        timestamp: arg.timestamp
      }))
    );

    const enhancedContext = {
      ...context,
      debateHistory: [...(context.debateHistory || []), ...debateHistory]
    };

    console.log(`🥊 Starting debate round ${roundNumber}`);

    // Get current solution description
    const solution = context.solutions?.find(s => s.id === solutionId);
    const solutionDescription = solution ? `${solution.title}: ${solution.description}` : 'Unknown solution';

    // Proponent presents argument
    let proponentArgument: AgentMessage;
    if (roundNumber === 1) {
      proponentArgument = await this.proponent.advocateForSolution(solutionDescription, enhancedContext);
    } else {
      // Build on previous arguments
      const lastOpponentPoint = this.getLastArgumentByRole(previousRounds, 'opponent');
      proponentArgument = lastOpponentPoint 
        ? await this.proponent.rebutOpponentPoint(lastOpponentPoint.content, solutionDescription, enhancedContext)
        : await this.proponent.advocateForSolution(solutionDescription, enhancedContext);
    }

    const proponentDbPoint = await this.saveDebatePoint(
      sessionId, 
      solutionId, 
      'proponent', 
      roundNumber, 
      proponentArgument.content
    );

    round.arguments.push({
      id: proponentDbPoint.id,
      agentRole: 'proponent',
      roundNumber,
      content: proponentArgument.content,
      evidenceIds: [],
      strengthScore: 5.0, // Initial neutral score
      votes: { up: 0, down: 0, participants: [] },
      timestamp: new Date()
    });

    // Opponent responds
    let opponentArgument: AgentMessage;
    if (roundNumber === 1) {
      opponentArgument = await this.opponent.challengeSolution(solutionDescription, enhancedContext);
    } else {
      opponentArgument = await this.opponent.rebutProponentPoint(
        proponentArgument.content, 
        solutionDescription, 
        enhancedContext
      );
    }

    const opponentDbPoint = await this.saveDebatePoint(
      sessionId, 
      solutionId, 
      'opponent', 
      roundNumber, 
      opponentArgument.content,
      proponentDbPoint.id
    );

    round.arguments.push({
      id: opponentDbPoint.id,
      agentRole: 'opponent',
      roundNumber,
      content: opponentArgument.content,
      evidenceIds: [],
      strengthScore: 5.0, // Initial neutral score
      votes: { up: 0, down: 0, participants: [] },
      rebuttalTo: proponentDbPoint.id,
      timestamp: new Date()
    });

    // Gather evidence for key claims made in this round
    const evidenceRequests = this.extractClaimsForEvidence(round.arguments);
    for (const claim of evidenceRequests.slice(0, 2)) { // Limit to 2 per round
      try {
        const evidence = await this.analyst.factCheckClaim(claim, enhancedContext);
        const savedEvidence = await storage.createEvidence({
          sessionId,
          pointId: this.findArgumentIdForClaim(round.arguments, claim),
          claim,
          snippet: evidence.content.substring(0, 500),
          source: { type: 'ai_analysis', url: '', title: 'AI Fact Check' },
          confidence: 75,
          relevanceScore: 80,
          gatheredBy: 'analyst_agent'
        });

        // Attach evidence to relevant argument
        const relevantArg = round.arguments.find(arg => 
          arg.content.toLowerCase().includes(claim.toLowerCase().substring(0, 30))
        );
        if (relevantArg) {
          relevantArg.evidenceIds.push(savedEvidence.id);
        }
      } catch (error) {
        console.error('Failed to gather evidence for claim:', claim, error);
      }
    }

    // Generate round summary using moderator agent
    const roundSummaryPrompt = `Summarize this debate round between proponent and opponent:\n\n` +
      `PROPONENT ARGUMENT: ${round.arguments.find(arg => arg.agentRole === 'proponent')?.content || 'None'}\n\n` +
      `OPPONENT ARGUMENT: ${round.arguments.find(arg => arg.agentRole === 'opponent')?.content || 'None'}\n\n` +
      `Provide a balanced summary of the key points, evidence quality, and areas of agreement/disagreement. Keep it concise but comprehensive.`;
    
    try {
      const summaryResponse = await this.moderator.processMessage(roundSummaryPrompt, enhancedContext);
      round.roundSummary = summaryResponse.content;
      console.log(`📝 Round ${roundNumber} summary generated: ${round.roundSummary.substring(0, 100)}...`);
    } catch (error) {
      console.error(`Failed to generate round ${roundNumber} summary:`, error);
      round.roundSummary = `Round ${roundNumber}: Debate between proponent and opponent with ${round.arguments.length} arguments. Consensus level: ${round.consensusLevel}.`;
    }

    // Evaluate round consensus
    round.consensusLevel = await this.evaluateRoundConsensus(round);
    round.completed = true;

    console.log(`✅ Round ${roundNumber} completed with ${round.arguments.length} arguments and consensus: ${round.consensusLevel}`);

    return round;
  }

  async voteOnArgument(
    argumentId: string, 
    voteType: 'up' | 'down', 
    userId: string,
    debateSession?: DebateSession
  ): Promise<VoteResult> {
    // Use atomic voting to prevent race conditions
    const voteResult = await storage.createVoteWithCountUpdate({
      userId,
      pointId: argumentId,
      voteType
    });

    if (!voteResult.success) {
      throw new Error(voteResult.message || 'Failed to record vote');
    }

    // Get updated debate point with new vote counts
    const updatedDebatePoint = await storage.getDebatePoint(argumentId);
    if (!updatedDebatePoint) {
      throw new Error('Debate point not found after vote update');
    }

    const newUpvotes = updatedDebatePoint.upvotes;
    const newDownvotes = updatedDebatePoint.downvotes;
    const totalVotes = newUpvotes + newDownvotes;
    const newScore = totalVotes > 0 ? (newUpvotes / totalVotes) * 10 : 5.0;

    // Update in-memory DebateArgument structure if debateSession is provided
    if (debateSession) {
      this.updateInMemoryArgument(debateSession, argumentId, {
        votes: {
          up: newUpvotes,
          down: newDownvotes,
          participants: [] // Will be populated from database if needed
        },
        strengthScore: newScore
      });
    }

    console.log(`📊 Vote recorded: ${voteType} for argument ${argumentId}. New score: ${newScore.toFixed(1)} (${newUpvotes}↑/${newDownvotes}↓)`);

    return {
      argumentId,
      voteType,
      userId,
      impact: {
        newScore,
        consensusShift: Math.abs(newScore - 5.0) // Distance from neutral
      }
    };
  }

  async attachEvidence(
    argumentId: string, 
    evidenceId: string,
    debateSession?: DebateSession
  ): Promise<{ success: boolean; strengthBoost: number }> {
    const evidence = await storage.getEvidence(evidenceId);
    if (!evidence) {
      throw new Error('Evidence not found');
    }

    // Link evidence to argument
    const linkSuccess = await storage.linkEvidenceToDebatePoint(argumentId, evidenceId);
    if (!linkSuccess) {
      throw new Error('Failed to link evidence to argument');
    }

    // Calculate strength boost based on evidence quality
    const strengthBoost = this.calculateEvidenceStrengthBoost(evidence);

    // Update in-memory DebateArgument structure if debateSession is provided
    if (debateSession) {
      const argument = this.findArgumentInSession(debateSession, argumentId);
      if (argument) {
        // Add evidence ID to the argument
        if (!argument.evidenceIds.includes(evidenceId)) {
          argument.evidenceIds.push(evidenceId);
        }
        // Apply strength boost
        argument.strengthScore = Math.min(10, argument.strengthScore + strengthBoost);
        
        console.log(`🔗 Evidence ${evidenceId} attached to argument ${argumentId}. Strength boost: +${strengthBoost.toFixed(1)}, New score: ${argument.strengthScore.toFixed(1)}`);
      }
    }

    return {
      success: true,
      strengthBoost
    };
  }

  private async saveDebatePoint(
    sessionId: string,
    solutionId: string,
    agent: 'proponent' | 'opponent',
    roundNumber: number,
    content: string,
    rebuttalTo?: string
  ) {
    return await storage.createDebatePoint({
      sessionId,
      solutionId,
      agent,
      pointNumber: roundNumber,
      round: roundNumber,
      title: `${agent} argument round ${roundNumber}`,
      content,
      rebuttalTo: rebuttalTo || null
    });
  }

  private getLastArgumentByRole(rounds: DebateRound[], role: 'proponent' | 'opponent'): DebateArgument | null {
    for (let i = rounds.length - 1; i >= 0; i--) {
      // Create a copy and reverse it to avoid mutating the original array
      const argumentsCopy = [...rounds[i].arguments];
      const lastArg = argumentsCopy.reverse().find(arg => arg.agentRole === role);
      if (lastArg) return lastArg;
    }
    return null;
  }

  private extractClaimsForEvidence(debateArgs: DebateArgument[]): string[] {
    const claims: string[] = [];
    
    for (const arg of debateArgs) {
      // Extract sentences that sound like factual claims
      const sentences = arg.content.split(/[.!?]+/);
      for (const sentence of sentences) {
        if (sentence.length > 30 && 
            (sentence.includes('studies show') || 
             sentence.includes('research indicates') ||
             sentence.includes('data suggests') ||
             sentence.includes('proven') ||
             sentence.includes('evidence'))) {
          claims.push(sentence.trim());
        }
      }
    }
    
    return claims.slice(0, 3); // Limit claims per round
  }

  private findArgumentIdForClaim(debateArgs: DebateArgument[], claim: string): string | null {
    const relevantArg = debateArgs.find(arg => 
      arg.content.toLowerCase().includes(claim.toLowerCase().substring(0, 30))
    );
    return relevantArg?.id || null;
  }

  private async evaluateRoundConsensus(round: DebateRound): Promise<'low' | 'moderate' | 'high'> {
    const totalVotes = round.arguments.reduce((sum, arg) => sum + arg.votes.up + arg.votes.down, 0);
    const avgScore = round.arguments.reduce((sum, arg) => sum + arg.strengthScore, 0) / round.arguments.length;
    
    if (totalVotes < 5) return 'low';
    if (avgScore > 7) return 'high';
    return 'moderate';
  }

  private async evaluateConsensus(session: DebateSession): Promise<'low' | 'moderate' | 'high'> {
    const totalRounds = session.rounds.length;
    const highConsensusRounds = session.rounds.filter(r => r.consensusLevel === 'high').length;
    
    if (highConsensusRounds / totalRounds > 0.6) return 'high';
    if (highConsensusRounds / totalRounds > 0.3) return 'moderate';
    return 'low';
  }

  private async determineWinner(session: DebateSession): Promise<'proponent' | 'opponent' | 'draw'> {
    let proponentScore = 0;
    let opponentScore = 0;

    for (const round of session.rounds) {
      for (const arg of round.arguments) {
        if (arg.agentRole === 'proponent') {
          proponentScore += arg.strengthScore + arg.votes.up - arg.votes.down;
        } else {
          opponentScore += arg.strengthScore + arg.votes.up - arg.votes.down;
        }
      }
    }

    const difference = Math.abs(proponentScore - opponentScore);
    if (difference < 5) return 'draw';
    
    return proponentScore > opponentScore ? 'proponent' : 'opponent';
  }

  private calculateEvidenceStrengthBoost(evidence: any): number {
    // Base boost on confidence and relevance scores
    const confidenceBoost = (evidence.confidence / 100) * 2; // Max 2 points
    const relevanceBoost = (evidence.relevanceScore / 100) * 1; // Max 1 point
    return confidenceBoost + relevanceBoost;
  }

  private updateInMemoryArgument(
    debateSession: DebateSession, 
    argumentId: string, 
    updates: Partial<DebateArgument>
  ): boolean {
    for (const round of debateSession.rounds) {
      const argument = round.arguments.find(arg => arg.id === argumentId);
      if (argument) {
        Object.assign(argument, updates);
        return true;
      }
    }
    return false;
  }

  private findArgumentInSession(
    debateSession: DebateSession, 
    argumentId: string
  ): DebateArgument | null {
    for (const round of debateSession.rounds) {
      const argument = round.arguments.find(arg => arg.id === argumentId);
      if (argument) {
        return argument;
      }
    }
    return null;
  }

  async getDebateSession(sessionId: string): Promise<DebateSession | null> {
    // This method allows external systems to get the current debate session
    // for passing to voteOnArgument and attachEvidence methods
    const session = await storage.getSession(sessionId);
    if (!session) return null;

    const solutions = await storage.getSessionSolutions(sessionId);
    const debatePoints = await storage.getSessionDebatePoints(sessionId);
    const evidence = await storage.getSessionEvidence(sessionId);

    // Reconstruct debate session from database
    const rounds: DebateRound[] = [];
    const roundsMap = new Map<number, DebateRound>();

    // Group debate points by round
    for (const point of debatePoints) {
      const roundNum = point.round;
      if (!roundsMap.has(roundNum)) {
        roundsMap.set(roundNum, {
          roundNumber: roundNum,
          solutionId: point.solutionId,
          arguments: [],
          consensusLevel: 'low',
          completed: true
        });
      }

      const round = roundsMap.get(roundNum)!;
      const pointEvidence = evidence.filter(e => e.pointId === point.id);
      
      round.arguments.push({
        id: point.id,
        agentRole: point.agent as 'proponent' | 'opponent',
        roundNumber: roundNum,
        content: point.content,
        evidenceIds: pointEvidence.map(e => e.id),
        strengthScore: this.calculateStrengthScore(point.upvotes, point.downvotes, pointEvidence.length),
        votes: {
          up: point.upvotes,
          down: point.downvotes,
          participants: [] // Could be populated from votes table if needed
        },
        rebuttalTo: point.rebuttalTo || undefined,
        timestamp: point.createdAt
      });
    }

    // Convert map to sorted array
    const sortedRounds = Array.from(roundsMap.values()).sort((a, b) => a.roundNumber - b.roundNumber);
    
    // Evaluate consensus for each round
    for (const round of sortedRounds) {
      round.consensusLevel = await this.evaluateRoundConsensus(round);
    }

    const debateSession: DebateSession = {
      sessionId,
      solutionId: solutions[0]?.id || '',
      rounds: sortedRounds,
      overallConsensus: await this.evaluateConsensus({ rounds: sortedRounds } as DebateSession),
      totalVotes: debatePoints.reduce((sum, p) => sum + p.upvotes + p.downvotes, 0),
      participantCount: 0, // Could be calculated from unique voters
      status: 'completed'
    };

    debateSession.winningPosition = await this.determineWinner(debateSession);
    
    return debateSession;
  }

  private calculateStrengthScore(upvotes: number, downvotes: number, evidenceCount: number): number {
    const totalVotes = upvotes + downvotes;
    const baseScore = totalVotes > 0 ? (upvotes / totalVotes) * 10 : 5.0;
    const evidenceBoost = evidenceCount * 0.5; // 0.5 points per piece of evidence
    return Math.min(10, baseScore + evidenceBoost);
  }
}

export const debateEngine = new EnhancedDebateEngine();