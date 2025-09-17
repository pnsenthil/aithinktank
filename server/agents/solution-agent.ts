import { BaseAgent, AgentProvider, AgentMessage, AgentContext } from './base-agent';

export class SolutionAgent extends BaseAgent {
  constructor(provider: AgentProvider = { name: 'openai', model: 'gpt-4o' }) {
    const systemPrompt = `You are the SOLUTION agent in an AI Think Tank debate system. Your role is to:

CORE RESPONSIBILITIES:
- Generate innovative, practical solutions to complex problems
- Apply design thinking methodologies and creative problem-solving frameworks
- Ensure solutions are feasible, scalable, and address root causes
- Propose multiple solution alternatives with clear implementation paths
- Adapt solutions based on constraints and feedback

SOLUTION GENERATION APPROACH:
- Start with problem deconstruction and root cause analysis
- Use frameworks like Design Thinking, Jobs-to-be-Done, First Principles
- Consider diverse perspectives and stakeholder needs
- Balance innovation with practical implementation
- Include resource requirements, timelines, and success metrics

SOLUTION STRUCTURE:
- Clear title and one-sentence summary
- Problem alignment and target outcomes
- Implementation approach with key steps
- Resource requirements and constraints
- Success metrics and validation methods
- Potential risks and mitigation strategies

COMMUNICATION STYLE:
- Structured, actionable, and implementation-focused
- Use clear headings and bullet points
- Provide concrete examples and analogies
- Balance optimism with realistic assessment
- Include both quick wins and long-term strategies

You create solutions that are both visionary and executable, ensuring they can progress from concept to implementation.`;

    super(provider, 'solution', systemPrompt);
  }

  getName(): string {
    return 'Solution';
  }

  getDescription(): string {
    return 'Generates innovative, practical solutions using design thinking and creative problem-solving frameworks';
  }

  async generateSolutions(problemStatement: string, context: AgentContext, count: number = 3): Promise<AgentMessage[]> {
    const generationPrompt = `Generate ${count} distinct, innovative solutions for this problem:

PROBLEM: ${problemStatement}

For each solution, provide:
1. TITLE: Clear, compelling name
2. SUMMARY: One-sentence value proposition  
3. APPROACH: Core methodology and key steps
4. IMPLEMENTATION: Practical path to execution
5. IMPACT: Expected outcomes and success metrics
6. CONSIDERATIONS: Key constraints and risks

Make each solution meaningfully different in approach, timeline, or focus area.`;

    const response = await this.processMessage(generationPrompt, context);
    return [response];
  }

  async refineSolution(solutionId: string, feedback: string, context: AgentContext): Promise<AgentMessage> {
    const refinementPrompt = `Refine the solution based on this feedback:

FEEDBACK: ${feedback}

Please provide an improved version that addresses the feedback while maintaining the solution's core value proposition. Focus on:
- Addressing specific concerns raised
- Strengthening weak areas identified
- Adding missing implementation details
- Improving feasibility and practicality`;

    return this.processMessage(refinementPrompt, context);
  }

  async expandSolution(solutionId: string, aspect: 'implementation' | 'resources' | 'risks' | 'metrics', context: AgentContext): Promise<AgentMessage> {
    const aspectPrompts = {
      implementation: "Provide a detailed implementation roadmap with phases, milestones, and key deliverables",
      resources: "Detail the resources needed including team, budget, tools, and external dependencies", 
      risks: "Identify potential risks, challenges, and mitigation strategies",
      metrics: "Define success metrics, KPIs, and validation methods to measure solution effectiveness"
    };

    const expandPrompt = `Expand on the ${aspect} aspect of this solution:

${aspectPrompts[aspect]}

Provide comprehensive details that would help stakeholders understand what's required for successful execution.`;

    return this.processMessage(expandPrompt, context);
  }

  async compareSolutions(solutions: string[], criteria: string[], context: AgentContext): Promise<AgentMessage> {
    const comparisonPrompt = `Compare these solutions across the specified criteria:

SOLUTIONS:
${solutions.map((s, i) => `${i + 1}. ${s}`).join('\n')}

COMPARISON CRITERIA:
${criteria.map(c => `- ${c}`).join('\n')}

Provide a structured comparison matrix and recommend the most promising solution(s) with clear reasoning.`;

    return this.processMessage(comparisonPrompt, context);
  }
}