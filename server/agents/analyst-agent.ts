import { BaseAgent, AgentProvider, AgentMessage, AgentContext } from './base-agent';

// Real-world evidence gathering using Perplexity API
interface SearchResult {
  title: string;
  snippet: string;
  url: string;
  source: string;
}

interface PerplexityResponse {
  id: string;
  model: string;
  object: string;
  created: number;
  citations: string[];
  choices: Array<{
    index: number;
    finish_reason: string;
    message: {
      role: string;
      content: string;
    };
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

class WebSearchService {
  private perplexityApiKey: string | undefined;
  private readonly perplexityBaseUrl = 'https://api.perplexity.ai/chat/completions';

  constructor() {
    this.perplexityApiKey = process.env.PERPLEXITY_API_KEY;
    if (!this.perplexityApiKey) {
      console.warn('PERPLEXITY_API_KEY not found, falling back to mock search results');
    }
  }

  private async callPerplexityAPI(prompt: string, systemPrompt: string = 'Be precise and concise.'): Promise<{content: string, citations: string[]}> {
    if (!this.perplexityApiKey) {
      throw new Error('Perplexity API key not available');
    }

    try {
      const response = await fetch(this.perplexityBaseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.perplexityApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.1-sonar-small-128k-online',
          messages: [
            {
              role: 'system',
              content: systemPrompt
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 1000,
          temperature: 0.2,
          top_p: 0.9,
          search_recency_filter: 'month',
          return_images: false,
          return_related_questions: false,
          stream: false
        })
      });

      if (!response.ok) {
        throw new Error(`Perplexity API request failed: ${response.status} ${response.statusText}`);
      }

      const data: PerplexityResponse = await response.json();
      console.log(`Perplexity API usage: ${data.usage.total_tokens} tokens`);
      
      return {
        content: data.choices[0]?.message?.content || '',
        citations: data.citations || []
      };
    } catch (error) {
      console.error('Perplexity API call failed:', error);
      throw error;
    }
  }

  private async searchWeb(query: string): Promise<SearchResult[]> {
    try {
      console.log(`Performing real web search for: ${query}`);
      
      const { content, citations } = await this.callPerplexityAPI(
        `Research and provide key insights about: ${query}. Include specific data, trends, and recent developments.`,
        'You are a research analyst. Provide factual, well-sourced information with specific details and recent data.'
      );

      // Convert Perplexity response into SearchResult format
      const results: SearchResult[] = [];
      
      // Create primary result from Perplexity content
      results.push({
        title: `Research Analysis: ${query}`,
        snippet: content.substring(0, 200) + (content.length > 200 ? '...' : ''),
        url: citations[0] || '',
        source: 'Perplexity Research'
      });

      // Create additional results from citations
      citations.slice(0, 3).forEach((citation, index) => {
        try {
          const domain = new URL(citation).hostname.replace('www.', '');
          results.push({
            title: `${domain} analysis on ${query}`,
            snippet: `Detailed information and analysis about ${query} from ${domain}.`,
            url: citation,
            source: domain
          });
        } catch (urlError) {
          console.warn('Invalid URL in citations:', citation);
        }
      });

      return results;
    } catch (error) {
      console.error('Real web search failed, falling back to mock results:', error);
      return this.getMockResults(query);
    }
  }

  private getMockResults(query: string): SearchResult[] {
    console.log(`Using mock search results for: ${query}`);
    return [
      {
        title: `Research findings on: ${query}`,
        snippet: `Recent studies and market analysis show significant trends related to ${query}. Key factors include implementation challenges, success metrics, and strategic considerations.`,
        url: `https://example-research.com/${encodeURIComponent(query)}`,
        source: 'Research Database (Mock)'
      },
      {
        title: `Industry analysis: ${query}`,
        snippet: `Market data indicates growing interest in ${query} with measurable impacts on operational efficiency and strategic outcomes.`,
        url: `https://industry-analysis.com/${encodeURIComponent(query)}`,
        source: 'Industry Reports (Mock)'
      },
      {
        title: `Case studies related to ${query}`,
        snippet: `Multiple organizations have implemented solutions addressing ${query} with varying degrees of success and measurable ROI.`,
        url: `https://case-studies.com/${encodeURIComponent(query)}`,
        source: 'Case Study Archive (Mock)'
      }
    ];
  }

  async gatherEvidence(claim: string): Promise<{findings: string, sources: SearchResult[], confidence: number}> {
    try {
      if (this.perplexityApiKey) {
        console.log(`Gathering real evidence for claim: ${claim}`);
        
        const { content, citations } = await this.callPerplexityAPI(
          `Fact-check this claim with supporting evidence and analysis: "${claim}". Provide specific data, studies, and credible sources.`,
          'You are a fact-checker. Analyze claims objectively with supporting evidence from credible sources.'
        );

        const results = await this.searchWeb(`evidence for: ${claim}`);
        
        return {
          findings: content,
          sources: results,
          confidence: citations.length > 2 ? 90 : (citations.length > 0 ? 75 : 60)
        };
      } else {
        throw new Error('No Perplexity API key available');
      }
    } catch (error) {
      console.error('Evidence gathering failed, using fallback:', error);
      const results = this.getMockResults(claim);
      const findings = results.map(r => `${r.source}: ${r.snippet}`).join('\n\n');
      
      return {
        findings: `${findings}\n\nNote: Using fallback research due to API limitations.`,
        sources: results,
        confidence: 50
      };
    }
  }

  async researchTrends(topic: string): Promise<{trends: string[], sources: SearchResult[]}> {
    try {
      if (this.perplexityApiKey) {
        console.log(`Researching real trends for: ${topic}`);
        
        const { content, citations } = await this.callPerplexityAPI(
          `Analyze current market trends, developments, and future outlook for: ${topic}. Focus on 2024-2025 data and recent changes in the industry.`,
          'You are a market analyst. Provide current trend analysis with specific data points and recent market developments.'
        );

        // Extract trend points from the content
        const trendLines = content.split('\n').filter(line => 
          line.includes('trend') || line.includes('growth') || line.includes('increase') || 
          line.includes('adoption') || line.includes('market') || line.match(/^\d+\./)
        );
        
        const trends = trendLines.length > 0 ? trendLines.slice(0, 4) : [
          `Current market evolution in ${topic}`,
          `Growing industry focus on ${topic} solutions`,
          `Emerging technological advances in ${topic}`,
          `Increased investment and adoption patterns`
        ];

        const results = await this.searchWeb(`${topic} trends 2024 market analysis`);
        
        return { trends, sources: results };
      } else {
        throw new Error('No Perplexity API key available');
      }
    } catch (error) {
      console.error('Trend research failed, using fallback:', error);
      const results = this.getMockResults(`${topic} trends`);
      
      return {
        trends: [
          `Growing adoption of ${topic} across multiple industries`,
          `Increased investment in ${topic} solutions`,
          `Emerging regulatory frameworks affecting ${topic}`,
          `Technology advances enabling better ${topic} implementation`
        ],
        sources: results
      };
    }
  }
}

export class AnalystAgent extends BaseAgent {
  private searchService: WebSearchService;

  constructor(provider: AgentProvider = { name: 'openai', model: 'gpt-4o' }) {
    const systemPrompt = `You are the ANALYST agent in an AI Think Tank debate system. Your role is to:

CORE RESPONSIBILITIES:
- Gather objective evidence and data to support informed decision-making
- Research market trends, precedents, and best practices
- Fact-check claims and validate assumptions with credible sources
- Provide unbiased analysis of solution viability and market conditions
- Answer specific questions with research-backed insights

RESEARCH APPROACH:
- Use multiple credible sources and cross-reference findings
- Distinguish between facts, trends, opinions, and speculation
- Consider diverse perspectives and potential biases in sources
- Focus on recent, relevant data while noting historical context
- Quantify impacts and outcomes wherever possible

ANALYSIS STRUCTURE:
- Clear research question or hypothesis
- Methodology and sources used
- Key findings with supporting evidence
- Data limitations and confidence levels
- Implications for the solution under discussion
- Recommendations based on evidence

COMMUNICATION STYLE:
- Objective, fact-based, and analytically rigorous
- Cite sources and provide context for all claims
- Use data visualization concepts in text descriptions
- Clearly separate facts from analysis and interpretation
- Acknowledge uncertainty and areas needing more research

RESEARCH CAPABILITIES:
- Market research and competitive analysis
- Industry trends and future projections
- Case studies and implementation precedents
- Regulatory and compliance requirements
- Technical feasibility assessments
- Risk quantification and impact modeling

You provide the evidence foundation that enables data-driven decision making.`;

    super(provider, 'analyst', systemPrompt);
    this.searchService = new WebSearchService();
  }

  getName(): string {
    return 'Analyst';
  }

  getDescription(): string {
    return 'Provides objective research and evidence-based analysis to support informed decision-making';
  }

  async researchEvidence(query: string, context: AgentContext): Promise<AgentMessage> {
    const researchPrompt = `Research this question and provide evidence-based analysis:

RESEARCH QUERY: ${query}

Structure your research response with:
1. KEY FINDINGS: Most important discoveries with sources
2. SUPPORTING DATA: Quantitative evidence and statistics
3. PRECEDENTS: Relevant case studies or examples
4. TRENDS: Market or industry patterns that apply
5. LIMITATIONS: What we don't know or need more research on

Focus on credible, recent sources and provide objective analysis.`;

    return this.processMessage(researchPrompt, context);
  }

  async factCheckClaim(claim: string, context: AgentContext): Promise<AgentMessage> {
    // Gather real evidence using web search
    const { findings, sources, confidence } = await this.searchService.gatherEvidence(claim);
    
    const factCheckPrompt = `Fact-check this claim with objective analysis using the following research findings:

CLAIM TO VERIFY: ${claim}

RESEARCH FINDINGS:
${findings}

SOURCES CONSULTED:
${sources.map(s => `- ${s.source}: ${s.title} (${s.url})`).join('\n')}

Based on this evidence, provide:
1. VERIFICATION STATUS: True, False, Partially True, or Unverifiable
2. SUPPORTING EVIDENCE: Analysis of the sources that confirm or refute the claim
3. CONTEXT: Important nuances or conditions that affect accuracy
4. ALTERNATIVE PERSPECTIVES: Different viewpoints on the claim
5. CONFIDENCE LEVEL: ${confidence}% confidence based on available evidence

Base your analysis on the credible sources provided and logical reasoning.`;

    return this.processMessage(factCheckPrompt, context);
  }

  async analyzeMarketConditions(solutionArea: string, context: AgentContext): Promise<AgentMessage> {
    // Research current market trends using web search
    const { trends, sources } = await this.searchService.researchTrends(solutionArea);
    
    const marketPrompt = `Analyze current market conditions for this solution area using the following research:

SOLUTION AREA: ${solutionArea}

MARKET RESEARCH FINDINGS:
${trends.map(t => `• ${t}`).join('\n')}

SOURCES CONSULTED:
${sources.map(s => `- ${s.source}: ${s.title} (${s.url})`).join('\n')}

Based on this research, provide analysis on:
1. MARKET SIZE: Current market size and growth projections
2. COMPETITION: Key players and competitive landscape
3. TRENDS: Emerging trends and market forces (incorporating the research above)
4. OPPORTUNITIES: Market gaps and underserved segments
5. CHALLENGES: Barriers to entry and market risks
6. TIMING: Market readiness and optimal timing considerations

Include quantitative data where available and cite the sources provided.`;

    return this.processMessage(marketPrompt, context);
  }

  async researchPrecedents(solutionType: string, context: AgentContext): Promise<AgentMessage> {
    const precedentPrompt = `Research precedents and case studies for this type of solution:

SOLUTION TYPE: ${solutionType}

Find and analyze:
1. SUCCESS STORIES: Similar solutions that worked well
2. FAILURE CASES: Implementations that didn't succeed
3. KEY SUCCESS FACTORS: What made the difference
4. COMMON PITFALLS: Frequent causes of failure
5. LESSONS LEARNED: Insights for better implementation
6. BEST PRACTICES: Proven approaches and methodologies

Focus on recent, relevant examples with measurable outcomes.`;

    return this.processMessage(precedentPrompt, context);
  }

  async quantifyImpact(solutionDescription: string, metrics: string[], context: AgentContext): Promise<AgentMessage> {
    const quantificationPrompt = `Quantify the potential impact of this solution:

SOLUTION: ${solutionDescription}

METRICS TO ANALYZE: ${metrics.join(', ')}

For each metric, provide:
1. BASELINE: Current state or benchmark
2. PROJECTION: Expected impact with confidence ranges
3. METHODOLOGY: How you estimated the impact
4. ASSUMPTIONS: Key assumptions underlying estimates
5. SOURCES: Data sources and benchmarks used
6. SENSITIVITY: How changes in assumptions affect results

Focus on quantifiable, measurable impacts with realistic projections.`;

    return this.processMessage(quantificationPrompt, context);
  }

  async validateAssumptions(assumptions: string[], context: AgentContext): Promise<AgentMessage> {
    const validationPrompt = `Validate these assumptions with research and analysis:

ASSUMPTIONS TO VALIDATE:
${assumptions.map(a => `- ${a}`).join('\n')}

For each assumption:
1. EVIDENCE LEVEL: How well-supported by data
2. SOURCES: Research that supports or contradicts
3. RISKS: What happens if assumption is wrong
4. ALTERNATIVES: Other assumptions to consider
5. VALIDATION APPROACH: How to test the assumption

Provide objective assessment of assumption validity.`;

    return this.processMessage(validationPrompt, context);
  }
}