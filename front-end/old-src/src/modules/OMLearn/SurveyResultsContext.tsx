import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface SurveyResponse {
  questionId: string;
  answer: string | number;
  reasoning?: string;
  timestamp: Date;
}

interface SurveySession {
  gradeGroupId: string;
  responses: SurveyResponse[];
  startedAt: Date;
  lastUpdated: Date;
  completed: boolean;
}

interface SurveyResultsContextType {
  // Session management
  getSession: (gradeGroupId: string) => SurveySession | null;
  createSession: (gradeGroupId: string) => void;
  updateSession: (gradeGroupId: string, updates: Partial<SurveySession>) => void;
  
  // Response management
  saveResponse: (gradeGroupId: string, response: SurveyResponse) => void;
  getResponses: (gradeGroupId: string) => SurveyResponse[];
  clearResponses: (gradeGroupId: string) => void;
  
  // Analytics
  getProgress: (gradeGroupId: string) => { completed: number; total: number; percentage: number };
  getAllSessions: () => SurveySession[];
  
  // Export/Import
  exportData: () => string;
  importData: (data: string) => void;
}

const SurveyResultsContext = createContext<SurveyResultsContextType | undefined>(undefined);

interface SurveyResultsProviderProps {
  children: ReactNode;
}

const STORAGE_KEY = 'omlearn_survey_results';

export const SurveyResultsProvider: React.FC<SurveyResultsProviderProps> = ({ children }) => {
  const [sessions, setSessions] = useState<SurveySession[]>([]);

  // Load data from localStorage on mount
  useEffect(() => {
    const loadFromStorage = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          // Convert date strings back to Date objects
          const sessionsWithDates = parsed.map((session: any) => ({
            ...session,
            startedAt: new Date(session.startedAt),
            lastUpdated: new Date(session.lastUpdated),
            responses: session.responses.map((response: any) => ({
              ...response,
              timestamp: new Date(response.timestamp)
            }))
          }));
          setSessions(sessionsWithDates);
        }
      } catch (error) {
        console.error('Error loading survey results from storage:', error);
        // If there's an error, start with empty sessions
        setSessions([]);
      }
    };

    loadFromStorage();
  }, []);

  // Save to localStorage whenever sessions change
  useEffect(() => {
    const saveToStorage = () => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
      } catch (error) {
        console.error('Error saving survey results to storage:', error);
      }
    };

    if (sessions.length > 0) {
      saveToStorage();
    }
  }, [sessions]);

  const getSession = (gradeGroupId: string): SurveySession | null => {
    return sessions.find(session => session.gradeGroupId === gradeGroupId) || null;
  };

  const createSession = (gradeGroupId: string) => {
    const existingSession = getSession(gradeGroupId);
    if (!existingSession) {
      const newSession: SurveySession = {
        gradeGroupId,
        responses: [],
        startedAt: new Date(),
        lastUpdated: new Date(),
        completed: false
      };
      setSessions(prev => [...prev, newSession]);
    }
  };

  const updateSession = (gradeGroupId: string, updates: Partial<SurveySession>) => {
    setSessions(prev => prev.map(session => 
      session.gradeGroupId === gradeGroupId 
        ? { ...session, ...updates, lastUpdated: new Date() }
        : session
    ));
  };

  const saveResponse = (gradeGroupId: string, response: SurveyResponse) => {
    // Ensure session exists
    createSession(gradeGroupId);
    
    setSessions(prev => prev.map(session => {
      if (session.gradeGroupId === gradeGroupId) {
        // Check if response already exists for this question
        const existingResponseIndex = session.responses.findIndex(
          r => r.questionId === response.questionId
        );
        
        let updatedResponses;
        if (existingResponseIndex >= 0) {
          // Update existing response
          updatedResponses = [...session.responses];
          updatedResponses[existingResponseIndex] = response;
        } else {
          // Add new response
          updatedResponses = [...session.responses, response];
        }
        
        return {
          ...session,
          responses: updatedResponses,
          lastUpdated: new Date()
        };
      }
      return session;
    }));
  };

  const getResponses = (gradeGroupId: string): SurveyResponse[] => {
    const session = getSession(gradeGroupId);
    return session?.responses || [];
  };

  const clearResponses = (gradeGroupId: string) => {
    setSessions(prev => prev.filter(session => session.gradeGroupId !== gradeGroupId));
  };

  const getProgress = (gradeGroupId: string) => {
    const session = getSession(gradeGroupId);
    if (!session) {
      return { completed: 0, total: 0, percentage: 0 };
    }
    
    // For now, we'll use a default total based on grade group
    // In a real implementation, this would come from the survey definition
    const getDefaultTotal = (gradeGroup: string) => {
      switch (gradeGroup) {
        case 'k-2': return 15;
        case '3-5': return 20;
        case '6-8': return 25;
        case '9-12': return 30;
        default: return 20;
      }
    };
    
    const total = getDefaultTotal(gradeGroupId);
    const completed = session.responses.length;
    const percentage = total > 0 ? (completed / total) * 100 : 0;
    
    return { completed, total, percentage };
  };

  const getAllSessions = (): SurveySession[] => {
    return sessions;
  };

  const exportData = (): string => {
    return JSON.stringify(sessions, null, 2);
  };

  const importData = (data: string) => {
    try {
      const parsed = JSON.parse(data);
      // Validate the data structure
      if (Array.isArray(parsed)) {
        const sessionsWithDates = parsed.map((session: any) => ({
          ...session,
          startedAt: new Date(session.startedAt),
          lastUpdated: new Date(session.lastUpdated),
          responses: session.responses.map((response: any) => ({
            ...response,
            timestamp: new Date(response.timestamp)
          }))
        }));
        setSessions(sessionsWithDates);
      } else {
        throw new Error('Invalid data format');
      }
    } catch (error) {
      console.error('Error importing survey data:', error);
      throw new Error('Failed to import data. Please check the format.');
    }
  };

  const contextValue: SurveyResultsContextType = {
    getSession,
    createSession,
    updateSession,
    saveResponse,
    getResponses,
    clearResponses,
    getProgress,
    getAllSessions,
    exportData,
    importData
  };

  return (
    <SurveyResultsContext.Provider value={contextValue}>
      {children}
    </SurveyResultsContext.Provider>
  );
};

export const useSurveyResults = (): SurveyResultsContextType => {
  const context = useContext(SurveyResultsContext);
  if (context === undefined) {
    throw new Error('useSurveyResults must be used within a SurveyResultsProvider');
  }
  return context;
}; 