import { ElevenLabsClient } from 'elevenlabs';
import { z } from 'zod';

// Zod schemas for validation
export const VoiceSettingsSchema = z.object({
  stability: z.number().min(0).max(1),
  similarity_boost: z.number().min(0).max(1),
  style: z.number().min(0).max(1),
  use_speaker_boost: z.boolean(),
});

export const AudioGenerationRequestSchema = z.object({
  text: z.string().min(1).max(5000),
  voiceId: z.string().optional(),
  modelId: z.string().optional(),
  voiceSettings: VoiceSettingsSchema.optional(),
});

export interface VoiceSettings {
  stability: number;
  similarity_boost: number;
  style: number;
  use_speaker_boost: boolean;
}

export interface AudioGenerationRequest {
  text: string;
  voiceId?: string;
  modelId?: string;
  voiceSettings?: VoiceSettings;
}

export interface AudioGenerationResult {
  audioBuffer: Buffer;
  audioUrl: string;
  duration: number;
  characterCount: number;
}

export interface VoiceServiceHealth {
  available: boolean;
  configured: boolean;
  lastError?: string;
}

export class VoiceService {
  private client: ElevenLabsClient | null = null;
  private defaultVoiceId: string = 'pNInz6obpgDQGcFmaJgB'; // Adam - Professional male voice
  private defaultModelId: string = 'eleven_monolingual_v1';
  private isAvailable: boolean = false;
  private lastError: string | undefined;
  private initializationAttempted: boolean = false;

  private constructor() {
    // Private constructor for factory pattern
  }

  /**
   * Factory method for creating VoiceService instance
   */
  static create(): VoiceService {
    return new VoiceService();
  }

  /**
   * Lazy initialization of ElevenLabs client
   */
  private async initialize(): Promise<void> {
    if (this.initializationAttempted) {
      return;
    }

    this.initializationAttempted = true;

    try {
      const apiKey = process.env.ELEVENLABS_API_KEY;
      if (!apiKey) {
        this.lastError = 'ELEVENLABS_API_KEY environment variable is not set';
        console.warn('⚠️ Voice Service: ELEVENLABS_API_KEY not found - voice features disabled');
        return;
      }

      this.client = new ElevenLabsClient({
        apiKey: apiKey
      });

      // Test the connection with a simple API call
      await this.testConnection();
      
      this.isAvailable = true;
      console.log('🎤 Voice Service initialized with ElevenLabs API');
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : 'Unknown initialization error';
      console.error('❌ Voice Service initialization failed:', this.lastError);
      this.isAvailable = false;
    }
  }

  /**
   * Test ElevenLabs API connection
   */
  private async testConnection(): Promise<void> {
    if (!this.client) {
      throw new Error('Client not initialized');
    }

    try {
      // Simple API call to test connectivity
      await this.client.voices.getAll();
    } catch (error) {
      throw new Error(`API connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check service health and availability
   */
  async getHealth(): Promise<VoiceServiceHealth> {
    await this.initialize();
    
    return {
      available: this.isAvailable,
      configured: !!process.env.ELEVENLABS_API_KEY,
      lastError: this.lastError
    };
  }

  /**
   * Check if service is available
   */
  async isServiceAvailable(): Promise<boolean> {
    await this.initialize();
    return this.isAvailable;
  }

  /**
   * Generate speech audio from text using ElevenLabs
   */
  async generateSpeech(request: AudioGenerationRequest): Promise<AudioGenerationResult> {
    await this.initialize();
    
    if (!this.isAvailable) {
      throw new Error(`Voice service is not available: ${this.lastError || 'Unknown error'}`);
    }

    if (!this.client) {
      throw new Error('Voice service client not initialized');
    }

    try {
      // Validate request
      AudioGenerationRequestSchema.parse(request);
      
      const { text, voiceId, modelId, voiceSettings } = request;

      console.log(`🗣️ Generating speech for ${text.length} characters...`);

      const audioStream = await this.client.generate({
        voice: voiceId || this.defaultVoiceId,
        model_id: modelId || this.defaultModelId,
        text: text,
        voice_settings: voiceSettings || this.getDefaultVoiceSettings()
      });

      // Convert stream to buffer (Node.js Readable stream)
      const chunks: Buffer[] = [];
      
      for await (const chunk of audioStream as any) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }

      const audioBuffer = Buffer.concat(chunks);
      
      // Create a temporary audio URL (in production, you'd store this in object storage)
      const audioUrl = `data:audio/mpeg;base64,${audioBuffer.toString('base64')}`;

      const result: AudioGenerationResult = {
        audioBuffer: audioBuffer, // Fixed: Return Buffer instead of ArrayBuffer
        audioUrl,
        duration: this.estimateAudioDuration(text),
        characterCount: text.length
      };

      console.log(`✅ Speech generated: ${result.duration}s, ${result.characterCount} chars`);
      return result;

    } catch (error) {
      console.error('❌ Speech generation failed:', error);
      throw new Error(`Speech generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate audio narration for debate summaries
   */
  async narrateDebateSummary(summary: {
    sessionTitle: string;
    problemStatement: string;
    rounds: Array<{
      roundNumber: number;
      summary: string;
      winnerRole?: 'proponent' | 'opponent' | 'draw';
    }>;
    finalConclusion: string;
    winnerPosition?: 'proponent' | 'opponent' | 'draw';
  }): Promise<AudioGenerationResult> {
    
    const narrationScript = this.buildDebateNarrationScript(summary);
    
    return this.generateSpeech({
      text: narrationScript,
      voiceId: this.defaultVoiceId, // Professional narrator voice
      voiceSettings: {
        stability: 0.75,
        similarity_boost: 0.85,
        style: 0.20, // Slightly expressive for narration
        use_speaker_boost: true
      }
    });
  }

  /**
   * Generate audio for problem statement confirmation
   */
  async narrateProblemStatement(
    problemStatement: string,
    context?: { userTitle?: string; urgency?: string }
  ): Promise<AudioGenerationResult> {
    
    let narrationText = '';
    
    if (context?.userTitle) {
      narrationText += `Problem submitted by ${context.userTitle}. `;
    }
    
    narrationText += 'Here is your problem statement: ';
    narrationText += problemStatement;
    
    if (context?.urgency) {
      narrationText += ` This has been marked as ${context.urgency} priority.`;
    }
    
    narrationText += ' Please confirm if this accurately represents your problem, or provide corrections.';

    return this.generateSpeech({
      text: narrationText,
      voiceSettings: {
        stability: 0.80,
        similarity_boost: 0.75,
        style: 0.15, // Calm and clear
        use_speaker_boost: true
      }
    });
  }

  /**
   * Get available voices from ElevenLabs
   */
  async getAvailableVoices(): Promise<Array<{
    voiceId: string;
    name: string;
    category: string;
    description?: string;
  }>> {
    await this.initialize();
    
    if (!this.isAvailable || !this.client) {
      console.warn('⚠️ Voice service not available - returning empty voices list');
      return [];
    }

    try {
      const response = await this.client.voices.getAll();
      
      return response.voices.map((voice: any) => ({
        voiceId: voice.voice_id,
        name: voice.name,
        category: voice.category || 'unknown',
        description: voice.description || undefined
      }));
    } catch (error) {
      console.error('❌ Failed to fetch voices:', error);
      return [];
    }
  }

  /**
   * Validate text for speech generation
   */
  validateTextForSpeech(text: string): { isValid: boolean; issues: string[] } {
    const issues: string[] = [];
    
    if (!text || text.trim().length === 0) {
      issues.push('Text cannot be empty');
    }
    
    if (text.length > 5000) {
      issues.push('Text is too long (max 5000 characters)');
    }
    
    // Check for problematic characters
    if (text.includes('<') && text.includes('>')) {
      issues.push('Text may contain HTML tags which could affect pronunciation');
    }
    
    return {
      isValid: issues.length === 0,
      issues
    };
  }

  private getDefaultVoiceSettings(): VoiceSettings {
    return {
      stability: 0.71,
      similarity_boost: 0.75,
      style: 0.25,
      use_speaker_boost: true
    };
  }

  private buildDebateNarrationScript(summary: {
    sessionTitle: string;
    problemStatement: string;
    rounds: Array<{
      roundNumber: number;
      summary: string;
      winnerRole?: 'proponent' | 'opponent' | 'draw';
    }>;
    finalConclusion: string;
    winnerPosition?: 'proponent' | 'opponent' | 'draw';
  }): string {
    
    let script = `Debate Summary: ${summary.sessionTitle}. `;
    script += `\n\nThe problem being addressed: ${summary.problemStatement}\n\n`;
    
    script += 'Here is the debate breakdown:\n\n';
    
    for (const round of summary.rounds) {
      script += `Round ${round.roundNumber}: `;
      script += round.summary;
      
      if (round.winnerRole && round.winnerRole !== 'draw') {
        script += ` The ${round.winnerRole} made the stronger argument in this round.`;
      } else if (round.winnerRole === 'draw') {
        script += ' This round ended in a draw.';
      }
      
      script += '\n\n';
    }
    
    script += 'Final Conclusion: ';
    script += summary.finalConclusion;
    
    if (summary.winnerPosition && summary.winnerPosition !== 'draw') {
      script += ` Overall, the ${summary.winnerPosition} position proved stronger.`;
    } else if (summary.winnerPosition === 'draw') {
      script += ' The debate ended in a draw with compelling arguments on both sides.';
    }
    
    script += ' Thank you for participating in this AI Think Tank session.';
    
    return script;
  }

  private estimateAudioDuration(text: string): number {
    // Rough estimation: ~150 words per minute average speech rate
    const wordsPerMinute = 150;
    const wordCount = text.split(/\s+/).length;
    return Math.round((wordCount / wordsPerMinute) * 60); // Duration in seconds
  }
}

// Factory function for creating voice service instances
export function createVoiceService(): VoiceService {
  return VoiceService.create();
}

// Global instance for convenience (lazy-initialized)
let globalVoiceService: VoiceService | null = null;

export function getVoiceService(): VoiceService {
  if (!globalVoiceService) {
    globalVoiceService = createVoiceService();
  }
  return globalVoiceService;
}