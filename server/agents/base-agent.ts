import { OpenAI } from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";

export interface AgentMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp?: Date;
  agentId?: string;
}

export interface AgentContext {
  sessionId: string;
  phase: number;
  problemStatement?: string;
  solutions?: Array<{id: string, title: string, description: string}>;
  debateHistory?: AgentMessage[];
  evidence?: Array<{type: string, content: string, source: string}>;
}

export interface AgentProvider {
  name: 'openai' | 'anthropic' | 'gemini';
  model: string;
}

export abstract class BaseAgent {
  protected provider: AgentProvider;
  protected role: string;
  protected systemPrompt: string;
  protected openai?: OpenAI;
  protected anthropic?: Anthropic;
  protected gemini?: GoogleGenerativeAI;

  constructor(provider: AgentProvider, role: string, systemPrompt: string) {
    this.provider = provider;
    this.role = role;
    this.systemPrompt = systemPrompt;
    
    // Enhanced environment validation and AI client initialization
    this.initializeAIProviders();
  }

  private initializeAIProviders(): void {
    const availableProviders: string[] = [];
    const unavailableProviders: string[] = [];

    // Initialize AI clients with comprehensive validation
    if (this.provider.name === 'openai') {
      if (!process.env.OPENAI_API_KEY) {
        unavailableProviders.push('OpenAI');
        console.warn(`❌ ${this.role} agent: OPENAI_API_KEY not found, OpenAI features will be unavailable`);
      } else {
        try {
          this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
          });
          availableProviders.push(`OpenAI (${this.provider.model})`);
          console.log(`✅ ${this.role} agent: OpenAI initialized with model ${this.provider.model}`);
        } catch (error) {
          console.error(`❌ ${this.role} agent: Failed to initialize OpenAI:`, error);
          unavailableProviders.push('OpenAI');
        }
      }
    } else if (this.provider.name === 'anthropic') {
      if (!process.env.ANTHROPIC_API_KEY) {
        unavailableProviders.push('Anthropic');
        console.warn(`❌ ${this.role} agent: ANTHROPIC_API_KEY not found, Anthropic features will be unavailable`);
      } else {
        try {
          this.anthropic = new Anthropic({
            apiKey: process.env.ANTHROPIC_API_KEY,
          });
          availableProviders.push(`Anthropic (${this.provider.model})`);
          console.log(`✅ ${this.role} agent: Anthropic initialized with model ${this.provider.model}`);
        } catch (error) {
          console.error(`❌ ${this.role} agent: Failed to initialize Anthropic:`, error);
          unavailableProviders.push('Anthropic');
        }
      }
    } else if (this.provider.name === 'gemini') {
      if (!process.env.GOOGLE_API_KEY && !process.env.GEMINI_API_KEY) {
        unavailableProviders.push('Gemini');
        console.warn(`❌ ${this.role} agent: GOOGLE_API_KEY or GEMINI_API_KEY not found, Gemini features will be unavailable`);
      } else {
        try {
          const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
          this.gemini = new GoogleGenerativeAI(apiKey!);
          availableProviders.push(`Gemini (${this.provider.model})`);
          console.log(`✅ ${this.role} agent: Gemini initialized with model ${this.provider.model}`);
        } catch (error) {
          console.error(`❌ ${this.role} agent: Failed to initialize Gemini:`, error);
          unavailableProviders.push('Gemini');
        }
      }
    }

    // Check for fallback providers
    const fallbackProviders: string[] = [];
    if (this.provider.name !== 'openai' && process.env.OPENAI_API_KEY) {
      fallbackProviders.push('OpenAI');
    }
    if (this.provider.name !== 'anthropic' && process.env.ANTHROPIC_API_KEY) {
      fallbackProviders.push('Anthropic');
    }

    // Log comprehensive provider status
    if (availableProviders.length > 0) {
      console.log(`🚀 ${this.role} agent: Ready with ${availableProviders.join(', ')}`);
    }
    if (fallbackProviders.length > 0) {
      console.log(`⚡ ${this.role} agent: Fallback providers available: ${fallbackProviders.join(', ')}`);
    }
    if (unavailableProviders.length > 0) {
      console.warn(`⚠️  ${this.role} agent: Unavailable providers: ${unavailableProviders.join(', ')}`);
    }
  }

  abstract getName(): string;
  abstract getDescription(): string;

  protected async generateResponse(messages: AgentMessage[], context: AgentContext): Promise<string> {
    const startTime = Date.now();
    const systemMessage: AgentMessage = {
      role: 'system',
      content: this.buildSystemPrompt(context)
    };

    const allMessages = [systemMessage, ...messages];
    const maxRetries = 2;
    const inputTokens = JSON.stringify(allMessages).length / 4; // Rough token estimation

    console.log(`🤖 ${this.role} agent: Starting generation (${this.provider.name}/${this.provider.model}) - Est. ${Math.round(inputTokens)} input tokens`);

    // Try the primary provider first
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        let response: string = '';
        let actualProvider = this.provider.name;
        let actualModel = this.provider.model;
        let tokenUsage: any = null;

        if (this.provider.name === 'gemini' && this.gemini) {
          const model = this.gemini.getGenerativeModel({ model: this.provider.model });
          
          // Format messages for Gemini
          const prompt = `${systemMessage.content}\n\nUser: ${messages.map(m => m.content).join('\n')}`;
          
          const result = await model.generateContent(prompt);
          const geminiResponse = await result.response;
          response = geminiResponse.text() || '';
          
          // Extract usage if available
          tokenUsage = (result as any)?.response?.usageMetadata;
          
        } else if (this.provider.name === 'openai' && this.openai) {
          const openaiResponse = await this.openai.chat.completions.create({
            model: this.provider.model,
            messages: allMessages.map(msg => ({
              role: msg.role,
              content: msg.content
            })),
            temperature: 0.7,
            max_tokens: 2000
          });

          response = openaiResponse.choices[0]?.message?.content || '';
          tokenUsage = openaiResponse.usage;
          
        } else if (this.provider.name === 'anthropic' && this.anthropic) {
          const anthropicResponse = await this.anthropic.messages.create({
            model: this.provider.model,
            max_tokens: 2000,
            temperature: 0.7,
            system: systemMessage.content,
            messages: messages.map(msg => ({
              role: msg.role === 'system' ? 'user' : msg.role,
              content: msg.content
            }))
          });

          response = anthropicResponse.content[0]?.type === 'text' ? anthropicResponse.content[0].text : '';
          tokenUsage = anthropicResponse.usage;
        }

        // Log successful response
        const duration = Date.now() - startTime;
        const outputTokens = response.length / 4; // Rough estimation
        
        console.log(`✅ ${this.role} agent: Response generated successfully`);
        console.log(`   📊 Provider: ${actualProvider}/${actualModel}`);
        console.log(`   ⏱️  Duration: ${duration}ms`);
        console.log(`   📝 Output: ${Math.round(outputTokens)} tokens (${response.length} chars)`);
        
        if (tokenUsage) {
          console.log(`   🔢 Token Usage:`, tokenUsage);
        }

        return response;
        
      } catch (error) {
        const duration = Date.now() - startTime;
        console.error(`❌ ${this.role} agent: Attempt ${attempt + 1}/${maxRetries + 1} failed (${duration}ms)`, error);
        
        // If it's the last attempt and we have a fallback, try OpenAI
        if (attempt === maxRetries && this.provider.name === 'gemini' && process.env.OPENAI_API_KEY) {
          try {
            console.log(`🔄 ${this.role} agent: Falling back to OpenAI for Gemini failure`);
            const fallbackOpenAI = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
            const fallbackResponse = await fallbackOpenAI.chat.completions.create({
              model: 'gpt-4o',
              messages: allMessages.map(msg => ({
                role: msg.role,
                content: msg.content
              })),
              temperature: 0.7,
              max_tokens: 2000
            });
            
            const response = fallbackResponse.choices[0]?.message?.content || '';
            const fallbackDuration = Date.now() - startTime;
            
            console.log(`✅ ${this.role} agent: Fallback successful (OpenAI/gpt-4o, ${fallbackDuration}ms)`);
            console.log(`   📝 Output: ${Math.round(response.length / 4)} tokens`);
            
            if (fallbackResponse.usage) {
              console.log(`   🔢 Token Usage:`, fallbackResponse.usage);
            }
            
            return response;
          } catch (fallbackError) {
            console.error(`❌ ${this.role} agent: Fallback to OpenAI also failed:`, fallbackError);
          }
        }
        
        // If not the last attempt, wait briefly before retry
        if (attempt < maxRetries) {
          const retryDelay = 1000 * (attempt + 1);
          console.log(`⏳ ${this.role} agent: Retrying in ${retryDelay}ms...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }
    }

    const totalDuration = Date.now() - startTime;
    console.error(`💥 ${this.role} agent: All attempts failed after ${totalDuration}ms`);
    throw new Error(`Failed to generate response after ${maxRetries + 1} attempts with provider: ${this.provider.name}`);
  }

  protected buildSystemPrompt(context: AgentContext): string {
    let prompt = this.systemPrompt;
    
    // Add context-specific information
    if (context.problemStatement) {
      prompt += `\n\nPROBLEM STATEMENT: ${context.problemStatement}`;
    }
    
    if (context.solutions && context.solutions.length > 0) {
      prompt += `\n\nCURRENT SOLUTIONS:\n${context.solutions.map(s => 
        `- ${s.title}: ${s.description}`
      ).join('\n')}`;
    }
    
    if (context.phase) {
      prompt += `\n\nCURRENT PHASE: ${this.getPhaseDescription(context.phase)}`;
    }

    return prompt;
  }

  private getPhaseDescription(phase: number): string {
    const phases = {
      1: "Session Setup - Establishing session parameters and participant roles",
      2: "Problem Statement - Defining and refining the core problem to solve", 
      3: "Solution Generation - Creating and evaluating potential solutions",
      4: "Debate & Rebuttal - Structured argumentation between different perspectives",
      5: "Analysis & Evidence - Gathering facts and data to support arguments",
      6: "Summary & Next Steps - Synthesizing conclusions and planning follow-up actions"
    };
    return phases[phase as keyof typeof phases] || `Phase ${phase}`;
  }

  public async processMessage(message: string, context: AgentContext): Promise<AgentMessage> {
    const userMessage: AgentMessage = {
      role: 'user',
      content: message,
      timestamp: new Date()
    };

    const response = await this.generateResponse([userMessage], context);

    return {
      role: 'assistant',
      content: response,
      timestamp: new Date(),
      agentId: this.getName()
    };
  }

  public async participate(conversation: AgentMessage[], context: AgentContext): Promise<AgentMessage> {
    const response = await this.generateResponse(conversation, context);

    return {
      role: 'assistant',
      content: response,
      timestamp: new Date(),
      agentId: this.getName()
    };
  }
}