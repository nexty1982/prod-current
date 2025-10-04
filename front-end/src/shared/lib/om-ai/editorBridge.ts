import ComponentInfo  from '@/hooks/useComponentRegistry';

export interface FixRequest {
  route: string;
  component: string;
  issues: string[];
  props: Record<string, any>;
  currentCode?: string;
  errorDetails?: string;
}

export interface FixResponse {
  success: boolean;
  suggestion?: string;
  codeDiff?: string;
  explanation?: string;
  confidence?: number;
  estimatedTime?: string;
  requiresManualReview?: boolean;
}

export interface OMAIStatus {
  isAvailable: boolean;
  version?: string;
  lastHeartbeat?: string;
  activeAgents?: string[];
}

class EditorBridge {
  private baseUrl: string;
  private isConnected: boolean = false;
  private heartbeatInterval?: NodeJS.Timeout;

  constructor() {
    this.baseUrl = import.meta.env.VITE_OMAI_BASE_URL || 'http://localhost:3001';
  }

  /**
   * Check if OMAI is available and responsive
   */
  async checkStatus(): Promise<OMAIStatus> {
    try {
      const response = await fetch(`${this.baseUrl}/api/status`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // Note: AbortSignal.timeout is not supported in all browsers
      });

      if (response.ok) {
        const data = await response.json();
        this.isConnected = true;
        return {
          isAvailable: true,
          version: data.version,
          lastHeartbeat: new Date().toISOString(),
          activeAgents: data.activeAgents
        };
      }
    } catch (error) {
      console.warn('OMAI not available:', error);
    }

    this.isConnected = false;
    return {
      isAvailable: false
    };
  }

  /**
   * Send a fix request to OMAI
   */
  async sendFixRequest(request: FixRequest): Promise<FixResponse> {
    if (!this.isConnected) {
      return {
        success: false,
        explanation: 'OMAI is not available. Please check the service status.',
        requiresManualReview: true
      };
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/fix`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...request,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          viewport: {
            width: window.innerWidth,
            height: window.innerHeight
          }
        }),
        // Note: AbortSignal.timeout is not supported in all browsers
      });

      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          suggestion: data.suggestion,
          codeDiff: data.codeDiff,
          explanation: data.explanation,
          confidence: data.confidence,
          estimatedTime: data.estimatedTime,
          requiresManualReview: data.requiresManualReview || false
        };
      } else {
        throw new Error(`OMAI responded with status ${response.status}`);
      }
    } catch (error) {
      console.error('Error sending fix request to OMAI:', error);
      return {
        success: false,
        explanation: `Failed to communicate with OMAI: ${error instanceof Error ? error.message : 'Unknown error'}`,
        requiresManualReview: true
      };
    }
  }

  /**
   * Get component analysis from OMAI
   */
  async analyzeComponent(component: ComponentInfo): Promise<FixResponse> {
    const request: FixRequest = {
      route: window.location.pathname,
      component: component.name,
      issues: this.detectIssues(component),
      props: component.props,
      currentCode: this.extractComponentCode(component)
    };

    return this.sendFixRequest(request);
  }

  /**
   * Detect potential issues in a component
   */
  private detectIssues(component: ComponentInfo): string[] {
    const issues: string[] = [];

    // Check for common issues
    if (component.position.width === 0 || component.position.height === 0) {
      issues.push('zero dimensions');
    }

    if (component.cssClasses?.some(cls => cls.includes('error'))) {
      issues.push('error styling detected');
    }

    if (component.props.loading === true) {
      issues.push('loading state');
    }

    if (component.props.error) {
      issues.push('error state');
    }

    // Check for accessibility issues
    if (!component.element.getAttribute('aria-label') && 
        !component.element.getAttribute('title') &&
        component.element.tagName !== 'DIV') {
      issues.push('missing accessibility attributes');
    }

    // Check for responsive issues
    if (component.position.width < 200 && component.position.height > 100) {
      issues.push('potential responsive layout issue');
    }

    return issues;
  }

  /**
   * Extract component code for analysis
   */
  private extractComponentCode(component: ComponentInfo): string {
    // This is a simplified version - in a real implementation,
    // you might want to extract the actual React component code
    return `
Component: ${component.name}
Type: ${component.type}
Props: ${JSON.stringify(component.props, null, 2)}
Classes: ${component.cssClasses?.join(' ') || 'none'}
Tailwind: ${component.tailwindClasses?.join(' ') || 'none'}
API Routes: ${component.apiRoutes?.join(', ') || 'none'}
DB Tables: ${component.dbTables?.join(', ') || 'none'}
    `.trim();
  }

  /**
   * Start heartbeat monitoring
   */
  startHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(async () => {
      await this.checkStatus();
    }, 30000); // Check every 30 seconds
  }

  /**
   * Stop heartbeat monitoring
   */
  stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = undefined;
    }
  }

  /**
   * Get current connection status
   */
  getConnectionStatus(): boolean {
    return this.isConnected;
  }
}

// Export singleton instance
export const editorBridge = new EditorBridge();

// Auto-start heartbeat when module is loaded
if (typeof window !== 'undefined') {
  editorBridge.startHeartbeat();
} 