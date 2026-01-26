// omlearn.api.ts - Backend API endpoints for OMLearn module

export interface SurveyResponse {
  questionId: string;
  answer: string | number;
  reasoning?: string;
  timestamp: Date;
  userId?: string;
  sessionId?: string;
}

export interface SurveySession {
  id: string;
  gradeGroupId: string;
  userId: string;
  responses: SurveyResponse[];
  startedAt: Date;
  lastUpdated: Date;
  completed: boolean;
  metadata?: {
    userAgent?: string;
    ipAddress?: string;
    location?: string;
  };
}

export interface OMAIAnalysis {
  sessionId: string;
  reasoningPattern: string;
  moralFramework: string;
  cognitiveLevel: string;
  recommendations: string[];
  confidence: number;
  timestamp: Date;
}

export interface SurveySubmission {
  sessionId: string;
  gradeGroupId: string;
  responses: SurveyResponse[];
  metadata: {
    completionTime: number;
    userAgent: string;
    ipAddress?: string;
  };
}

// API Client Class
class OMLearnAPI {
  private baseURL: string;

  constructor(baseURL: string = '/api/omlearn') {
    this.baseURL = baseURL;
  }

  // Survey Management
  async getSurveys(): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseURL}/surveys`);
      if (!response.ok) throw new Error('Failed to fetch surveys');
      return await response.json();
    } catch (error) {
      console.error('Error fetching surveys:', error);
      throw error;
    }
  }

  async getSurvey(gradeGroupId: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseURL}/surveys/${gradeGroupId}`);
      if (!response.ok) throw new Error('Failed to fetch survey');
      return await response.json();
    } catch (error) {
      console.error('Error fetching survey:', error);
      throw error;
    }
  }

  // Session Management
  async createSession(gradeGroupId: string): Promise<SurveySession> {
    try {
      const response = await fetch(`${this.baseURL}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gradeGroupId })
      });
      if (!response.ok) throw new Error('Failed to create session');
      return await response.json();
    } catch (error) {
      console.error('Error creating session:', error);
      throw error;
    }
  }

  async getSession(sessionId: string): Promise<SurveySession> {
    try {
      const response = await fetch(`${this.baseURL}/sessions/${sessionId}`);
      if (!response.ok) throw new Error('Failed to fetch session');
      return await response.json();
    } catch (error) {
      console.error('Error fetching session:', error);
      throw error;
    }
  }

  async updateSession(sessionId: string, updates: Partial<SurveySession>): Promise<SurveySession> {
    try {
      const response = await fetch(`${this.baseURL}/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (!response.ok) throw new Error('Failed to update session');
      return await response.json();
    } catch (error) {
      console.error('Error updating session:', error);
      throw error;
    }
  }

  // Response Management
  async saveResponse(sessionId: string, response: SurveyResponse): Promise<void> {
    try {
      const apiResponse = await fetch(`${this.baseURL}/sessions/${sessionId}/responses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(response)
      });
      if (!apiResponse.ok) throw new Error('Failed to save response');
    } catch (error) {
      console.error('Error saving response:', error);
      throw error;
    }
  }

  async getResponses(sessionId: string): Promise<SurveyResponse[]> {
    try {
      const response = await fetch(`${this.baseURL}/sessions/${sessionId}/responses`);
      if (!response.ok) throw new Error('Failed to fetch responses');
      return await response.json();
    } catch (error) {
      console.error('Error fetching responses:', error);
      throw error;
    }
  }

  // Survey Submission
  async submitSurvey(submission: SurveySubmission): Promise<void> {
    try {
      const response = await fetch(`${this.baseURL}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submission)
      });
      if (!response.ok) throw new Error('Failed to submit survey');
    } catch (error) {
      console.error('Error submitting survey:', error);
      throw error;
    }
  }

  // OMAI Integration
  async analyzeResponses(sessionId: string): Promise<OMAIAnalysis> {
    try {
      const response = await fetch(`${this.baseURL}/analyze/${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('Failed to analyze responses');
      return await response.json();
    } catch (error) {
      console.error('Error analyzing responses:', error);
      throw error;
    }
  }

  async getAnalysis(sessionId: string): Promise<OMAIAnalysis> {
    try {
      const response = await fetch(`${this.baseURL}/analysis/${sessionId}`);
      if (!response.ok) throw new Error('Failed to fetch analysis');
      return await response.json();
    } catch (error) {
      console.error('Error fetching analysis:', error);
      throw error;
    }
  }

  // User Progress
  async getUserProgress(userId: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseURL}/progress/${userId}`);
      if (!response.ok) throw new Error('Failed to fetch user progress');
      return await response.json();
    } catch (error) {
      console.error('Error fetching user progress:', error);
      throw error;
    }
  }

  async getUserSessions(userId: string): Promise<SurveySession[]> {
    try {
      const response = await fetch(`${this.baseURL}/users/${userId}/sessions`);
      if (!response.ok) throw new Error('Failed to fetch user sessions');
      return await response.json();
    } catch (error) {
      console.error('Error fetching user sessions:', error);
      throw error;
    }
  }

  // Data Export/Import
  async exportUserData(userId: string): Promise<string> {
    try {
      const response = await fetch(`${this.baseURL}/export/${userId}`);
      if (!response.ok) throw new Error('Failed to export user data');
      return await response.text();
    } catch (error) {
      console.error('Error exporting user data:', error);
      throw error;
    }
  }

  async importUserData(userId: string, data: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseURL}/import/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data })
      });
      if (!response.ok) throw new Error('Failed to import user data');
    } catch (error) {
      console.error('Error importing user data:', error);
      throw error;
    }
  }

  // Analytics and Reporting
  async getAnalytics(gradeGroupId?: string): Promise<any> {
    try {
      const url = gradeGroupId 
        ? `${this.baseURL}/analytics?gradeGroup=${gradeGroupId}`
        : `${this.baseURL}/analytics`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch analytics');
      return await response.json();
    } catch (error) {
      console.error('Error fetching analytics:', error);
      throw error;
    }
  }

  async getReport(sessionId: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseURL}/reports/${sessionId}`);
      if (!response.ok) throw new Error('Failed to fetch report');
      return await response.json();
    } catch (error) {
      console.error('Error fetching report:', error);
      throw error;
    }
  }

  // OMAI Memory Integration
  async syncToOMAI(sessionId: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseURL}/sync-omai/${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('Failed to sync with OMAI');
    } catch (error) {
      console.error('Error syncing with OMAI:', error);
      throw error;
    }
  }

  async getOMAIInsights(sessionId: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseURL}/omai-insights/${sessionId}`);
      if (!response.ok) throw new Error('Failed to fetch OMAI insights');
      return await response.json();
    } catch (error) {
      console.error('Error fetching OMAI insights:', error);
      throw error;
    }
  }

  // Error handling utility
  private handleError(error: any): never {
    console.error('OMLearn API Error:', error);
    throw new Error(error.message || 'An unexpected error occurred');
  }
}

// Export singleton instance
export const omlearnAPI = new OMLearnAPI();

// Future: Configuration options
export interface OMLearnConfig {
  baseURL: string;
  timeout: number;
  retryAttempts: number;
  enableCaching: boolean;
  enableOfflineMode: boolean;
}

// Future: Advanced API client with configuration
export class AdvancedOMLearnAPI extends OMLearnAPI {
  private config: OMLearnConfig;
  private cache: Map<string, any> = new Map();

  constructor(config: Partial<OMLearnConfig> = {}) {
    super(config.baseURL);
    this.config = {
      baseURL: '/api/omlearn',
      timeout: 30000,
      retryAttempts: 3,
      enableCaching: true,
      enableOfflineMode: false,
      ...config
    };
  }

  // Future: Cached requests
  async getSurveyCached(gradeGroupId: string): Promise<any> {
    if (this.config.enableCaching) {
      const cacheKey = `survey-${gradeGroupId}`;
      if (this.cache.has(cacheKey)) {
        return this.cache.get(cacheKey);
      }
    }
    
    const survey = await this.getSurvey(gradeGroupId);
    
    if (this.config.enableCaching) {
      const cacheKey = `survey-${gradeGroupId}`;
      this.cache.set(cacheKey, survey);
    }
    
    return survey;
  }

  // Future: Offline mode support
  async saveResponseOffline(sessionId: string, response: SurveyResponse): Promise<void> {
    if (this.config.enableOfflineMode) {
      // Store in localStorage for later sync
      const offlineResponses = JSON.parse(localStorage.getItem('omlearn_offline_responses') || '[]');
      offlineResponses.push({ sessionId, response, timestamp: new Date().toISOString() });
      localStorage.setItem('omlearn_offline_responses', JSON.stringify(offlineResponses));
    } else {
      await this.saveResponse(sessionId, response);
    }
  }

  // Future: Sync offline data
  async syncOfflineData(): Promise<void> {
    if (this.config.enableOfflineMode) {
      const offlineResponses = JSON.parse(localStorage.getItem('omlearn_offline_responses') || '[]');
      
      for (const item of offlineResponses) {
        try {
          await this.saveResponse(item.sessionId, item.response);
        } catch (error) {
          console.error('Error syncing offline response:', error);
        }
      }
      
      localStorage.removeItem('omlearn_offline_responses');
    }
  }
}

export default omlearnAPI; 