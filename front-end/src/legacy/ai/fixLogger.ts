import { DetectedIssue } from './errorClassifier';
import { FixResult } from './recoveryActions';

export interface FixRecord {
  id: string;
  componentId: string;
  componentName: string;
  timestamp: string;
  issues: DetectedIssue[];
  appliedFixes: FixResult[];
  confidence: number;
  userRole: string;
  environment: 'development' | 'staging' | 'production';
  success: boolean;
  error?: string;
  retryCount: number;
  beforeSnapshot?: ComponentSnapshot;
  afterSnapshot?: ComponentSnapshot;
  metadata?: Record<string, any>;
}

export interface ComponentSnapshot {
  props: Record<string, any>;
  styles: Record<string, string>;
  classes: string[];
  attributes: Record<string, string>;
  content: string;
  position: { x: number; y: number; width: number; height: number };
}

export interface FixHistoryQuery {
  componentId?: string;
  componentName?: string;
  startDate?: string;
  endDate?: string;
  success?: boolean;
  userRole?: string;
  environment?: string;
  limit?: number;
  offset?: number;
}

export interface FixStatistics {
  totalFixes: number;
  successfulFixes: number;
  failedFixes: number;
  averageConfidence: number;
  mostCommonIssues: Array<{ type: string; count: number }>;
  fixesByComponent: Array<{ componentName: string; count: number }>;
  fixesByStrategy: Array<{ strategy: string; count: number }>;
}

export class FixLogger {
  private storageKey = 'omai_fix_history';
  private maxRecords = 1000; // Maximum number of records to keep in localStorage
  private records: FixRecord[] = [];

  constructor() {
    this.loadRecords();
  }

  /**
   * Log a fix attempt
   */
  async logFix(fixRecord: FixRecord): Promise<void> {
    try {
      // Add before/after snapshots if component element exists
      if (fixRecord.appliedFixes.length > 0) {
        fixRecord.beforeSnapshot = await this.createComponentSnapshot(fixRecord.componentId);
      }

      // Add to records
      this.records.unshift(fixRecord);

      // Limit the number of records
      if (this.records.length > this.maxRecords) {
        this.records = this.records.slice(0, this.maxRecords);
      }

      // Save to storage
      this.saveRecords();

      // Log to console in development
      if (process.env.NODE_ENV === 'development') {
        console.group(`🔧 OMAI Fix Logged: ${fixRecord.componentName}`);
        console.log('Fix ID:', fixRecord.id);
        console.log('Success:', fixRecord.success);
        console.log('Confidence:', fixRecord.confidence);
        console.log('Issues:', fixRecord.issues.length);
        console.log('Applied Fixes:', fixRecord.appliedFixes.length);
        console.log('Timestamp:', fixRecord.timestamp);
        console.groupEnd();
      }

    } catch (error) {
      console.error('Failed to log fix:', error);
    }
  }

  /**
   * Get fix history with optional filtering
   */
  async getFixHistory(query: FixHistoryQuery = {}): Promise<FixRecord[]> {
    let filteredRecords = [...this.records];

    // Apply filters
    if (query.componentId) {
      filteredRecords = filteredRecords.filter(record => 
        record.componentId === query.componentId
      );
    }

    if (query.componentName) {
      filteredRecords = filteredRecords.filter(record => 
        record.componentName.toLowerCase().includes(query.componentName!.toLowerCase())
      );
    }

    if (query.startDate) {
      filteredRecords = filteredRecords.filter(record => 
        record.timestamp >= query.startDate!
      );
    }

    if (query.endDate) {
      filteredRecords = filteredRecords.filter(record => 
        record.timestamp <= query.endDate!
      );
    }

    if (query.success !== undefined) {
      filteredRecords = filteredRecords.filter(record => 
        record.success === query.success
      );
    }

    if (query.userRole) {
      filteredRecords = filteredRecords.filter(record => 
        record.userRole === query.userRole
      );
    }

    if (query.environment) {
      filteredRecords = filteredRecords.filter(record => 
        record.environment === query.environment
      );
    }

    // Apply pagination
    const offset = query.offset || 0;
    const limit = query.limit || filteredRecords.length;

    return filteredRecords.slice(offset, offset + limit);
  }

  /**
   * Get a specific fix record by ID
   */
  async getFixById(fixId: string): Promise<FixRecord | null> {
    return this.records.find(record => record.id === fixId) || null;
  }

  /**
   * Get fix statistics
   */
  async getFixStatistics(query: FixHistoryQuery = {}): Promise<FixStatistics> {
    const records = await this.getFixHistory(query);

    const totalFixes = records.length;
    const successfulFixes = records.filter(r => r.success).length;
    const failedFixes = totalFixes - successfulFixes;
    const averageConfidence = records.length > 0 
      ? records.reduce((sum, r) => sum + r.confidence, 0) / records.length 
      : 0;

    // Most common issues
    const issueCounts: Record<string, number> = {};
    records.forEach(record => {
      record.issues.forEach(issue => {
        issueCounts[issue.type] = (issueCounts[issue.type] || 0) + 1;
      });
    });

    const mostCommonIssues = Object.entries(issueCounts)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Fixes by component
    const componentCounts: Record<string, number> = {};
    records.forEach(record => {
      componentCounts[record.componentName] = (componentCounts[record.componentName] || 0) + 1;
    });

    const fixesByComponent = Object.entries(componentCounts)
      .map(([componentName, count]) => ({ componentName, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Fixes by strategy
    const strategyCounts: Record<string, number> = {};
    records.forEach(record => {
      record.appliedFixes.forEach(fix => {
        const strategyName = fix.strategy.name;
        strategyCounts[strategyName] = (strategyCounts[strategyName] || 0) + 1;
      });
    });

    const fixesByStrategy = Object.entries(strategyCounts)
      .map(([strategy, count]) => ({ strategy, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalFixes,
      successfulFixes,
      failedFixes,
      averageConfidence,
      mostCommonIssues,
      fixesByComponent,
      fixesByStrategy
    };
  }

  /**
   * Rollback a specific fix
   */
  async rollbackFix(fixId: string): Promise<boolean> {
    try {
      const fixRecord = await this.getFixById(fixId);
      
      if (!fixRecord) {
        throw new Error(`Fix record not found: ${fixId}`);
      }

      if (!fixRecord.beforeSnapshot) {
        throw new Error('No before snapshot available for rollback');
      }

      // Apply rollback using the before snapshot
      const success = await this.applySnapshot(fixRecord.componentId, fixRecord.beforeSnapshot);

      if (success) {
        // Log the rollback
        await this.logFix({
          id: this.generateFixId(),
          componentId: fixRecord.componentId,
          componentName: fixRecord.componentName,
          timestamp: new Date().toISOString(),
          issues: [],
          appliedFixes: [],
          confidence: 1.0,
          userRole: fixRecord.userRole,
          environment: fixRecord.environment,
          success: true,
          retryCount: 0,
          metadata: {
            rollbackOf: fixId,
            rollbackReason: 'Manual rollback requested'
          }
        });
      }

      return success;

    } catch (error) {
      console.error('Failed to rollback fix:', error);
      return false;
    }
  }

  /**
   * Create a snapshot of a component's current state
   */
  private async createComponentSnapshot(componentId: string): Promise<ComponentSnapshot | undefined> {
    try {
      // Find the component element
      const element = document.querySelector(`[data-component-id="${componentId}"]`) as HTMLElement;
      
      if (!element) {
        return undefined;
      }

      const computedStyle = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();

      // Extract props from data attributes
      const props: Record<string, any> = {};
      for (const attr of element.attributes) {
        if (attr.name.startsWith('data-prop-')) {
          const propName = attr.name.replace('data-prop-', '');
          try {
            props[propName] = JSON.parse(attr.value);
          } catch {
            props[propName] = attr.value;
          }
        }
      }

      // Extract styles
      const styles: Record<string, string> = {};
      const styleProperties = [
        'display', 'position', 'width', 'height', 'margin', 'padding',
        'border', 'background', 'color', 'font-size', 'font-weight',
        'overflow', 'z-index', 'opacity', 'visibility'
      ];

      for (const prop of styleProperties) {
        styles[prop] = computedStyle.getPropertyValue(prop);
      }

      // Extract classes
      const classes = Array.from(element.classList);

      // Extract attributes
      const attributes: Record<string, string> = {};
      for (const attr of element.attributes) {
        if (!attr.name.startsWith('data-prop-')) {
          attributes[attr.name] = attr.value;
        }
      }

      return {
        props,
        styles,
        classes,
        attributes,
        content: element.textContent || '',
        position: {
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height
        }
      };

    } catch (error) {
      console.error('Failed to create component snapshot:', error);
      return undefined;
    }
  }

  /**
   * Apply a snapshot to restore component state
   */
  private async applySnapshot(componentId: string, snapshot: ComponentSnapshot): Promise<boolean> {
    try {
      const element = document.querySelector(`[data-component-id="${componentId}"]`) as HTMLElement;
      
      if (!element) {
        return false;
      }

      // Apply styles
      for (const [property, value] of Object.entries(snapshot.styles)) {
        element.style.setProperty(property, value);
      }

      // Apply classes
      element.className = snapshot.classes.join(' ');

      // Apply attributes
      for (const [name, value] of Object.entries(snapshot.attributes)) {
        element.setAttribute(name, value);
      }

      // Apply props (if they can be set via data attributes)
      for (const [propName, propValue] of Object.entries(snapshot.props)) {
        element.setAttribute(`data-prop-${propName}`, JSON.stringify(propValue));
      }

      return true;

    } catch (error) {
      console.error('Failed to apply snapshot:', error);
      return false;
    }
  }

  /**
   * Export fix history as JSON
   */
  async exportFixHistory(query: FixHistoryQuery = {}): Promise<string> {
    const records = await this.getFixHistory(query);
    return JSON.stringify(records, null, 2);
  }

  /**
   * Import fix history from JSON
   */
  async importFixHistory(jsonData: string): Promise<number> {
    try {
      const records: FixRecord[] = JSON.parse(jsonData);
      const validRecords = records.filter(record => this.validateFixRecord(record));
      
      this.records.unshift(...validRecords);
      
      // Limit the number of records
      if (this.records.length > this.maxRecords) {
        this.records = this.records.slice(0, this.maxRecords);
      }

      this.saveRecords();
      return validRecords.length;

    } catch (error) {
      console.error('Failed to import fix history:', error);
      return 0;
    }
  }

  /**
   * Clear all fix history
   */
  async clearFixHistory(): Promise<void> {
    this.records = [];
    this.saveRecords();
  }

  /**
   * Validate a fix record
   */
  private validateFixRecord(record: any): record is FixRecord {
    return (
      record &&
      typeof record.id === 'string' &&
      typeof record.componentId === 'string' &&
      typeof record.componentName === 'string' &&
      typeof record.timestamp === 'string' &&
      Array.isArray(record.issues) &&
      Array.isArray(record.appliedFixes) &&
      typeof record.confidence === 'number' &&
      typeof record.userRole === 'string' &&
      typeof record.environment === 'string' &&
      typeof record.success === 'boolean' &&
      typeof record.retryCount === 'number'
    );
  }

  /**
   * Load records from storage
   */
  private loadRecords(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.records = Array.isArray(parsed) ? parsed : [];
      }
    } catch (error) {
      console.error('Failed to load fix history from storage:', error);
      this.records = [];
    }
  }

  /**
   * Save records to storage
   */
  private saveRecords(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.records));
    } catch (error) {
      console.error('Failed to save fix history to storage:', error);
    }
  }

  /**
   * Generate unique fix ID
   */
  private generateFixId(): string {
    return `fix_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get storage usage statistics
   */
  getStorageStats(): { used: number; available: number; percentage: number } {
    try {
      const used = new Blob([JSON.stringify(this.records)]).size;
      const available = 5 * 1024 * 1024; // 5MB localStorage limit
      const percentage = (used / available) * 100;

      return { used, available, percentage };
    } catch (error) {
      return { used: 0, available: 0, percentage: 0 };
    }
  }
} 