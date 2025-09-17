import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import type { 
  Session, 
  Problem, 
  Solution, 
  DebatePoint, 
  Evidence, 
  Summary,
  insertSessionSchema,
  insertProblemSchema
} from '@shared/schema';
import { z } from 'zod';

// Session Management Hooks

export function useSessions() {
  return useQuery<Session[]>({
    queryKey: ['/api/sessions'],
    staleTime: 30000, // 30 seconds
  });
}

export function useSession(sessionId: string | null) {
  return useQuery<Session | null>({
    queryKey: ['/api/sessions', sessionId],
    enabled: !!sessionId,
    staleTime: 10000, // 10 seconds
  });
}

export function useCreateSession() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (sessionData: z.infer<typeof insertSessionSchema>) => {
      const response = await apiRequest('POST', '/api/sessions', sessionData);
      return response.json() as Promise<Session>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sessions'] });
    },
  });
}

export function useUpdateSession() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ sessionId, updates }: { 
      sessionId: string; 
      updates: Partial<Session> 
    }) => {
      const response = await apiRequest('PATCH', `/api/sessions/${sessionId}`, updates);
      return response.json() as Promise<Session>;
    },
    onSuccess: (_, { sessionId }) => {
      queryClient.invalidateQueries({ queryKey: ['/api/sessions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/sessions', sessionId] });
    },
  });
}

// Session Phase Processing
export function useProcessSessionPhase() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await apiRequest('POST', `/api/sessions/${sessionId}/process`);
      return response.json() as Promise<{
        message: string;
        sessionId: string;
        currentPhase: number;
        nextPhase: number;
        messages: any[];
        nextActions: string[];
        phaseComplete: boolean;
        data: any;
      }>;
    },
    onSuccess: (_, sessionId) => {
      queryClient.invalidateQueries({ queryKey: ['/api/sessions', sessionId] });
      queryClient.invalidateQueries({ queryKey: ['/api/sessions'] });
    },
  });
}

// Problem Management Hooks

export function useSessionProblems(sessionId: string | null) {
  return useQuery<Problem[]>({
    queryKey: ['/api/sessions', sessionId, 'problems'],
    enabled: !!sessionId,
    staleTime: 5000,
  });
}

export function useCreateProblem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      sessionId, 
      problemData 
    }: { 
      sessionId: string; 
      problemData: z.infer<typeof insertProblemSchema> 
    }) => {
      const response = await apiRequest('POST', `/api/sessions/${sessionId}/problems`, problemData);
      return response.json() as Promise<Problem>;
    },
    onSuccess: (_, { sessionId }) => {
      queryClient.invalidateQueries({ queryKey: ['/api/sessions', sessionId, 'problems'] });
    },
  });
}

export function useApproveProblem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ sessionId, problemId }: { sessionId: string; problemId: string }) => {
      const response = await apiRequest('PATCH', `/api/sessions/${sessionId}/problems/${problemId}`, {
        status: 'approved'
      });
      return response.json() as Promise<Problem>;
    },
    onSuccess: (_, { sessionId }) => {
      queryClient.invalidateQueries({ queryKey: ['/api/sessions', sessionId, 'problems'] });
    },
  });
}

// Solution Management Hooks

export function useSessionSolutions(sessionId: string | null) {
  return useQuery<Solution[]>({
    queryKey: ['/api/sessions', sessionId, 'solutions'],
    enabled: !!sessionId,
    staleTime: 5000,
  });
}

// Debate Management Hooks

export function useSessionDebatePoints(sessionId: string | null) {
  return useQuery<DebatePoint[]>({
    queryKey: ['/api/sessions', sessionId, 'debate-points'],
    enabled: !!sessionId,
    staleTime: 5000,
  });
}

export function useVoteOnDebatePoint() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      sessionId, 
      pointId, 
      voteType 
    }: { 
      sessionId: string; 
      pointId: string; 
      voteType: 'up' | 'down' 
    }) => {
      const response = await apiRequest('POST', `/api/sessions/${sessionId}/debate-points/${pointId}/vote`, {
        voteType
      });
      return response.json();
    },
    onSuccess: (_, { sessionId }) => {
      queryClient.invalidateQueries({ queryKey: ['/api/sessions', sessionId, 'debate-points'] });
    },
  });
}

// Evidence Management Hooks

export function useSessionEvidence(sessionId: string | null) {
  return useQuery<Evidence[]>({
    queryKey: ['/api/sessions', sessionId, 'evidence'],
    enabled: !!sessionId,
    staleTime: 5000,
  });
}

// Summary Management Hooks

export function useSessionSummaries(sessionId: string | null) {
  return useQuery<Summary[]>({
    queryKey: ['/api/sessions', sessionId, 'summaries'],
    enabled: !!sessionId,
    staleTime: 5000,
  });
}

// Voice Integration Hooks

export function useGenerateVoice() {
  return useMutation({
    mutationFn: async ({ 
      text, 
      voiceId, 
      voiceSettings 
    }: { 
      text: string; 
      voiceId?: string; 
      voiceSettings?: any 
    }) => {
      const response = await apiRequest('POST', '/api/voice/generate', {
        text,
        voiceId,
        voiceSettings
      });
      return response.json() as Promise<{
        success: boolean;
        audioUrl: string;
        duration: number;
        characterCount: number;
      }>;
    },
  });
}

export function useNarrateDebate() {
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await apiRequest('POST', `/api/voice/narrate-debate/${sessionId}`);
      return response.json() as Promise<{
        success: boolean;
        audioUrl: string;
        duration: number;
        characterCount: number;
        title: string;
      }>;
    },
  });
}

export function useNarrateProblem() {
  return useMutation({
    mutationFn: async ({ 
      problemStatement, 
      context 
    }: { 
      problemStatement: string; 
      context?: any 
    }) => {
      const response = await apiRequest('POST', '/api/voice/narrate-problem', {
        problemStatement,
        context
      });
      return response.json() as Promise<{
        success: boolean;
        audioUrl: string;
        duration: number;
        characterCount: number;
        title: string;
      }>;
    },
  });
}

export function useVoiceHealth() {
  return useQuery({
    queryKey: ['/api/voice/health'],
    staleTime: 60000, // 1 minute
    retry: false,
  });
}

// Summary and Library Integration Hooks

export function useSummary(sessionId: string | null) {
  return useQuery<Summary | null>({
    queryKey: ['/api/sessions', sessionId, 'summary'],
    enabled: !!sessionId,
    staleTime: 30000, // 30 seconds
  });
}

export function useSaveSummary() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      sessionId, 
      summaryData 
    }: { 
      sessionId: string; 
      summaryData: Omit<Summary, 'id' | 'sessionId' | 'createdAt'> 
    }) => {
      const response = await apiRequest('POST', `/api/sessions/${sessionId}/summary`, summaryData);
      return response.json() as Promise<Summary>;
    },
    onSuccess: (_, { sessionId }) => {
      queryClient.invalidateQueries({ queryKey: ['/api/sessions', sessionId, 'summary'] });
      queryClient.invalidateQueries({ queryKey: ['/api/sessions', sessionId] });
      queryClient.invalidateQueries({ queryKey: ['/api/library'] });
    },
  });
}

export function useGenerateSummary() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await apiRequest('POST', `/api/sessions/${sessionId}/summary/generate`);
      return response.json() as Promise<Summary>;
    },
    onSuccess: (_, sessionId) => {
      queryClient.invalidateQueries({ queryKey: ['/api/sessions', sessionId, 'summary'] });
      queryClient.invalidateQueries({ queryKey: ['/api/sessions', sessionId] });
      queryClient.invalidateQueries({ queryKey: ['/api/library'] });
    },
  });
}

// Library Management Hooks

export function useLibrary(filter?: { status?: string; outcome?: string }) {
  const queryParams = new URLSearchParams();
  if (filter?.status) queryParams.append('status', filter.status);
  if (filter?.outcome) queryParams.append('outcome', filter.outcome);
  
  const queryString = queryParams.toString();
  const url = queryString ? `/api/library?${queryString}` : '/api/library';
  
  return useQuery<Session[]>({
    queryKey: ['/api/library', filter],
    queryFn: async () => {
      const response = await apiRequest('GET', url);
      return response.json() as Promise<Session[]>;
    },
    staleTime: 60000, // 1 minute
  });
}

// Summary Voice Narration Hook

export function useSummaryNarration(sessionId: string | null, voiceId?: string) {
  return useMutation({
    mutationFn: async () => {
      if (!sessionId) throw new Error('Session ID is required');
      
      const queryParams = new URLSearchParams();
      if (voiceId) queryParams.append('voice', voiceId);
      
      const url = `/api/sessions/${sessionId}/narration${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await apiRequest('GET', url);
      return response.json() as Promise<{
        success: boolean;
        audioUrl: string;
        duration: number;
        characterCount: number;
        title: string;
      }>;
    },
  });
}