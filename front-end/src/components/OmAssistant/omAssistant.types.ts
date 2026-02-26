export interface OmAssistantMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface OmAssistantContext {
  type: 'global' | 'user-guide' | 'dashboard';
  churchId?: number;
  churchName?: string;
  guideContent?: string;
  availableActions?: string[];
}

export interface OmAssistantProps {
  pageContext: OmAssistantContext;
}
