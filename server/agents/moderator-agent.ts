import { BaseAgent, AgentProvider, AgentMessage, AgentContext } from './base-agent';

export class ModeratorAgent extends BaseAgent {
  constructor(provider: AgentProvider = { name: 'anthropic', model: 'claude-3-5-sonnet-20241022' }) {
    const systemPrompt = `You are the MODERATOR agent in an AI Think Tank debate system. Your role is to:

CORE RESPONSIBILITIES:
- Facilitate structured design thinking sessions through 6 phases
- Ensure productive dialogue between all participants and AI agents
- Guide phase transitions and maintain session focus
- Synthesize discussions into actionable insights
- Maintain neutrality while keeping debates constructive

BEHAVIORAL GUIDELINES:
- Be diplomatic, professional, and solution-oriented
- Ask clarifying questions to deepen understanding
- Redirect conversations when they become unproductive
- Acknowledge all valid viewpoints before making decisions
- Provide clear summaries at key transition points
- Use structured approaches (5 whys, design thinking, etc.)

COMMUNICATION STYLE:
- Clear, concise, and actionable language
- Use numbered lists and bullet points for clarity
- Address participants by role when relevant
- Signal phase transitions explicitly
- Balance encouragement with constructive challenge

You facilitate evidence-based decision making and ensure all voices are heard while maintaining productive momentum toward session goals.`;

    super(provider, 'moderator', systemPrompt);
  }

  getName(): string {
    return 'Moderator';
  }

  getDescription(): string {
    return 'Facilitates structured debates and guides phase progression to ensure productive outcomes';
  }

  async facilitatePhase(phase: number, context: AgentContext): Promise<AgentMessage> {
    const phasePrompts = {
      1: "Welcome to this AI Think Tank session! Let's establish our session parameters. Please share the problem you'd like to explore and any specific goals or constraints.",
      2: "Now let's clearly define our problem statement. I'll help ensure it's specific, actionable, and well-scoped for productive solution generation.",
      3: "Time for solution generation! I'll coordinate with our Solution Agent to develop multiple innovative approaches to this problem.",
      4: "Let's begin structured debate. Our Proponent and Opponent agents will examine each solution critically to identify strengths and address potential concerns.",
      5: "Now we'll gather evidence and analysis. Our Analyst will research supporting data to help us make informed decisions about our solutions.",
      6: "Let's synthesize our findings. I'll help create a comprehensive summary with concrete next steps and implementation recommendations."
    };

    const message = phasePrompts[phase as keyof typeof phasePrompts] || 
      `Let's proceed with phase ${phase} of our think tank session.`;

    return this.processMessage(message, context);
  }

  async summarizeDebate(debateHistory: AgentMessage[], context: AgentContext): Promise<AgentMessage> {
    const summaryPrompt = `Please analyze the debate history and provide a balanced summary including:
    1. Key arguments presented
    2. Areas of consensus and disagreement  
    3. Most compelling evidence shared
    4. Recommended next steps
    
    Debate to summarize: ${debateHistory.map(msg => `${msg.agentId}: ${msg.content}`).join('\n\n')}`;

    return this.processMessage(summaryPrompt, context);
  }

  async progressPhase(currentPhase: number, context: AgentContext): Promise<{
    canProgress: boolean;
    reason: string;
    nextSteps?: string[];
  }> {
    const progressPrompt = `Evaluate if we can progress from phase ${currentPhase} based on current session state. 
    Consider completeness of current phase deliverables and readiness for next phase.
    Respond with JSON: {"canProgress": boolean, "reason": "explanation", "nextSteps": ["step1", "step2"]}`;

    const response = await this.processMessage(progressPrompt, context);
    
    try {
      return JSON.parse(response.content);
    } catch {
      return {
        canProgress: false,
        reason: "Unable to evaluate progress - please review session state",
        nextSteps: ["Review current phase completeness", "Address any blocking issues"]
      };
    }
  }
}