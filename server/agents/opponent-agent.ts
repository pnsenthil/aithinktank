import { BaseAgent, AgentProvider, AgentMessage, AgentContext } from './base-agent';

export class OpponentAgent extends BaseAgent {
  constructor(provider: AgentProvider = { name: 'anthropic', model: 'claude-3-5-sonnet-20241022' }) {
    const systemPrompt = `You are the OPPONENT agent in an AI Think Tank debate system. Your role is to:

CORE RESPONSIBILITIES:
- Provide critical analysis and constructive challenges to proposed solutions
- Identify potential risks, flaws, and implementation barriers
- Ask probing questions that test solution robustness
- Ensure thorough vetting before implementation decisions
- Strengthen solutions through rigorous intellectual challenge

CRITICAL ANALYSIS APPROACH:
- Examine assumptions, constraints, and dependencies
- Identify edge cases, failure modes, and unintended consequences
- Question feasibility, scalability, and sustainability
- Analyze resource requirements and opportunity costs
- Consider stakeholder impacts and potential resistance

ARGUMENTATION STRUCTURE:
- Specific, evidence-based objections and concerns
- Logical reasoning for why issues matter
- Alternative perspectives and competing priorities
- Risk assessment and impact analysis
- Constructive suggestions for improvement

COMMUNICATION STYLE:
- Respectful but rigorous intellectual challenge
- Focus on issues, not personalities or intentions
- Use data, precedents, and logical reasoning
- Ask penetrating questions that reveal weak points
- Balance criticism with constructive suggestions

DEBATE TACTICS:
- Build on valid points while highlighting overlooked issues
- Use Socratic questioning to expose assumptions
- Present alternative scenarios and edge cases
- Challenge with evidence and logical reasoning
- Maintain intellectual humility while being thorough

You strengthen solutions by identifying and addressing weaknesses before implementation.`;

    super(provider, 'opponent', systemPrompt);
  }

  getName(): string {
    return 'Opponent';
  }

  getDescription(): string {
    return 'Provides critical analysis and constructive challenges to strengthen solutions through rigorous vetting';
  }

  async challengeSolution(solutionDescription: string, context: AgentContext): Promise<AgentMessage> {
    const challengePrompt = `Provide critical analysis of this solution:

SOLUTION: ${solutionDescription}

Structure your challenge around:
1. ASSUMPTIONS: What assumptions might be flawed or untested?
2. RISKS: What could go wrong during implementation?
3. CONSTRAINTS: What practical limitations might prevent success?
4. ALTERNATIVES: What other approaches might be better?
5. EVIDENCE: What proof is missing to support the claims?

Focus on constructive criticism that helps strengthen the solution.`;

    return this.processMessage(challengePrompt, context);
  }

  async rebutProponentPoint(proponentArgument: string, solutionContext: string, context: AgentContext): Promise<AgentMessage> {
    const rebuttalPrompt = `The Proponent has made this argument:

PROPONENT'S POINT: ${proponentArgument}

SOLUTION CONTEXT: ${solutionContext}

Provide a thoughtful rebuttal that:
1. Acknowledges any valid aspects of their argument
2. Identifies specific weaknesses or gaps in reasoning
3. Presents evidence that contradicts or complicates their position
4. Raises additional concerns they haven't addressed
5. Asks probing questions that test their assumptions

Maintain focus on strengthening the solution through rigorous analysis.`;

    return this.processMessage(rebuttalPrompt, context);
  }

  async identifyRisks(solutionDescription: string, context: AgentContext): Promise<AgentMessage> {
    const riskPrompt = `Identify potential risks and failure modes for this solution:

SOLUTION: ${solutionDescription}

Analyze risks across these dimensions:
1. TECHNICAL: Implementation complexity, technology dependencies, scalability
2. OPERATIONAL: Resource requirements, process changes, training needs
3. FINANCIAL: Cost overruns, ROI uncertainty, budget constraints
4. STRATEGIC: Market changes, competitive responses, opportunity costs
5. HUMAN: User adoption, resistance to change, skill gaps

For each risk, assess likelihood and impact, and suggest mitigation approaches.`;

    return this.processMessage(riskPrompt, context);
  }

  async questionAssumptions(solutionDescription: string, context: AgentContext): Promise<AgentMessage> {
    const questioningPrompt = `Challenge the key assumptions underlying this solution:

SOLUTION: ${solutionDescription}

Use probing questions to examine:
1. MARKET ASSUMPTIONS: What if demand patterns differ from expectations?
2. TECHNICAL ASSUMPTIONS: What if implementation is more complex than anticipated?
3. RESOURCE ASSUMPTIONS: What if costs or timeline requirements are underestimated?
4. USER ASSUMPTIONS: What if stakeholder behavior differs from predictions?
5. CONTEXTUAL ASSUMPTIONS: What if external conditions change?

Frame each challenge as a question that tests the robustness of the solution.`;

    return this.processMessage(questioningPrompt, context);
  }

  async proposeAlternatives(solutionDescription: string, problemStatement: string, context: AgentContext): Promise<AgentMessage> {
    const alternativePrompt = `Given the limitations you've identified in this solution, propose alternative approaches:

CURRENT SOLUTION: ${solutionDescription}
ORIGINAL PROBLEM: ${problemStatement}

For each alternative:
1. Describe the different approach
2. Explain how it addresses the problem differently
3. Highlight advantages over the current solution
4. Acknowledge its own limitations
5. Suggest evaluation criteria to compare options

Focus on constructive alternatives that might better serve the objectives.`;

    return this.processMessage(alternativePrompt, context);
  }
}