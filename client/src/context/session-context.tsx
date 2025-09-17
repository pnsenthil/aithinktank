import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useSession, useUpdateSession } from '@/hooks/use-sessions';
import type { Session } from '@shared/schema';

interface SessionContextType {
  currentSessionId: string | null;
  currentSession: Session | null;
  isLoading: boolean;
  error: string | null;
  setCurrentSessionId: (sessionId: string | null) => void;
  advanceToNextPhase: () => Promise<void>;
  getCurrentPhase: () => number;
  getCompletedPhases: () => number[];
  isPhaseCompleted: (phase: number) => boolean;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export function useSessionContext() {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSessionContext must be used within a SessionProvider');
  }
  return context;
}

interface SessionProviderProps {
  children: ReactNode;
}

export function SessionProvider({ children }: SessionProviderProps) {
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(
    () => localStorage.getItem('ai-think-tank-session-id')
  );

  const { 
    data: currentSession, 
    isLoading, 
    error: queryError 
  } = useSession(currentSessionId);

  const updateSessionMutation = useUpdateSession();
  const [error, setError] = useState<string | null>(null);

  // Persist session ID to localStorage
  useEffect(() => {
    if (currentSessionId) {
      localStorage.setItem('ai-think-tank-session-id', currentSessionId);
    } else {
      localStorage.removeItem('ai-think-tank-session-id');
    }
  }, [currentSessionId]);

  // Update error state
  useEffect(() => {
    if (queryError) {
      setError(queryError instanceof Error ? queryError.message : 'Failed to load session');
    } else {
      setError(null);
    }
  }, [queryError]);

  const advanceToNextPhase = async () => {
    if (!currentSession) {
      throw new Error('No active session');
    }

    const nextPhase = Math.min(currentSession.currentPhase + 1, 6);
    
    try {
      await updateSessionMutation.mutateAsync({
        sessionId: currentSession.id,
        updates: { currentPhase: nextPhase }
      });
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to advance phase';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const getCurrentPhase = (): number => {
    return currentSession?.currentPhase || 1;
  };

  const getCompletedPhases = (): number[] => {
    if (!currentSession) return [];
    
    const currentPhase = currentSession.currentPhase;
    const phases = [];
    
    for (let i = 1; i < currentPhase; i++) {
      phases.push(i);
    }
    
    return phases;
  };

  const isPhaseCompleted = (phase: number): boolean => {
    return getCompletedPhases().includes(phase);
  };

  const contextValue: SessionContextType = {
    currentSessionId,
    currentSession: currentSession || null,
    isLoading,
    error,
    setCurrentSessionId,
    advanceToNextPhase,
    getCurrentPhase,
    getCompletedPhases,
    isPhaseCompleted,
  };

  return (
    <SessionContext.Provider value={contextValue}>
      {children}
    </SessionContext.Provider>
  );
}