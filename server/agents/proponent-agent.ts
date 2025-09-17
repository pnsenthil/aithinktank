import { BaseAgent, AgentProvider, AgentMessage, AgentContext } from './base-agent';

export class ProponentAgent extends BaseAgent {
  constructor(provider: AgentProvider = { name: 'openai', model: 'gpt-4o' }) {
    const systemPrompt = `You are the PROPONENT agent in an AI Think Tank debate system. Your role is to:

CORE RESPONSIBILITIES:
- Advocate strongly for proposed solutions and their benefits
- Build compelling cases using logic, evidence, and persuasive reasoning
- Identify solution strengths, opportunities, and positive outcomes
- Counter objections with well-reasoned responses
- Demonstrate implementation feasibility and value creation

ADVOCACY APPROACH:
- Lead with the strongest benefits and value propositions
- Use concrete examples, case studies, and analogies
- Address stakeholder needs and desired outcomes
- Highlight unique advantages and competitive differentiation
- Show clear path from current state to desired future state

ARGUMENTATION STRUCTURE:
- Clear thesis statement supporting the solution
- Multiple supporting arguments with evidence
- Acknowledgment and reframing of potential concerns
- Cost-benefit analysis favoring implementation
- Call to action with specific next steps

COMMUNICATION STYLE:
- Confident, enthusiastic, and solution-oriented
- Use compelling stories and concrete examples
- Balance passion with professional credibility
- Acknowledge valid concerns while maintaining advocacy position
- Focus on opportunities and positive outcomes

DEBATE TACTICS:
- Build on opponent's valid points while redirecting to solution benefits
- Use evidence-based reasoning to support claims
- Reframe challenges as opportunities for innovation
- Demonstrate understanding of complexities while maintaining optimism
- Provide specific, actionable implementation guidance

You champion solutions while remaining intellectually honest and evidence-based in your advocacy.`;

    super(provider, 'proponent', systemPrompt);
  }

  getName(): string {
    return 'Proponent';
  }

  getDescription(): string {
    return 'Advocates for solutions by building compelling cases with evidence-based reasoning and addressing concerns';
  }

  async advocateForSolution(solutionDescription: string, context: AgentContext): Promise<AgentMessage> {
    const advocacyPrompt = `Present a compelling case for this solution:

SOLUTION: ${solutionDescription}

Structure your advocacy with:
1. VALUE PROPOSITION: Core benefits and why this matters
2. EVIDENCE: Supporting data, examples, and precedents
3. FEASIBILITY: Why this can be successfully implemented
4. IMPACT: Positive outcomes and transformational potential
5. URGENCY: Why action should be taken now

Make a persuasive case that inspires confidence and commitment.`;

    return this.processMessage(advocacyPrompt, context);
  }

  async rebutOpponentPoint(opponentArgument: string, solutionContext: string, context: AgentContext): Promise<AgentMessage> {
    const rebuttalPrompt = `The Opponent has raised this concern:

OPPONENT'S POINT: ${opponentArgument}

SOLUTION CONTEXT: ${solutionContext}

Provide a thoughtful rebuttal that:
1. Acknowledges any valid aspects of their concern
2. Presents evidence that addresses or mitigates the issue
3. Reframes the concern as a manageable challenge or opportunity
4. Reinforces why the solution's benefits outweigh the risks
5. Suggests specific actions to address their concern

Be respectful but firm in maintaining your advocacy position.`;

    return this.processMessage(rebuttalPrompt, context);
  }

  async strengthenArgument(currentArgument: string, additionalEvidence: string[], context: AgentContext): Promise<AgentMessage> {
    const strengthenPrompt = `Strengthen this argument with additional evidence:

CURRENT ARGUMENT: ${currentArgument}

ADDITIONAL EVIDENCE:
${additionalEvidence.map(e => `- ${e}`).join('\n')}

Enhance the argument by:
1. Integrating the new evidence seamlessly
2. Making the logical connections explicit
3. Addressing potential counterarguments preemptively
4. Increasing the persuasive impact
5. Maintaining clear, compelling messaging`;

    return this.processMessage(strengthenPrompt, context);
  }

  async addressConcerns(concerns: string[], solutionContext: string, context: AgentContext): Promise<AgentMessage> {
    const concernsPrompt = `Address these specific concerns about the solution:

CONCERNS RAISED:
${concerns.map(c => `- ${c}`).join('\n')}

SOLUTION: ${solutionContext}

For each concern:
1. Acknowledge the validity where appropriate
2. Provide specific mitigation strategies
3. Present evidence that reduces the risk
4. Show how benefits still outweigh concerns
5. Offer concrete steps to address issues

Maintain your advocacy position while showing thoughtful consideration of legitimate concerns.`;

    return this.processMessage(concernsPrompt, context);
  }
}