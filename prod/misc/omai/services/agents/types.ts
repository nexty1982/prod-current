import { BoundComponent } from '../../../front-end/src/pages/omb/types';

export interface AgentTaskResult {
  agent: string;
  componentId: string;
  action: string;
  status: 'success' | 'warning' | 'error' | 'info';
  result: string;
  recommendation?: string;
  canAutofix: boolean;
  autofixAction?: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface OMAIAgent {
  id: string;
  name: string;
  domain: string; // records, ui, api, docs, tenants, testing
  run(input: OMAIAgentContext): Promise<OMAITaskResult>;
  triggers: string[]; // file change, schedule, anomaly
  canAutofix: boolean;
  capabilities: string[]; // detect, recommend, autofix, generate, report
}

export interface OMAIAgentContext {
  tenant?: string;
  target?: string;
  memory?: any;
  embeddings?: any;
  statusData?: TenantStatusData;
  gapData?: GapReportData;
  taskData?: TaskData;
}

export interface OMAITaskResult {
  success: boolean;
  output: string;
  actions?: string[];
  filesCreated?: string[];
  filesModified?: string[];
  issuesFound?: number;
  recommendations?: string[];
  error?: string;
  duration?: number;
}

export interface TenantStatusData {
  lastUpdated: string;
  tenants: Record<string, TenantStatus>;
  systemMetrics: SystemMetrics;
}

export interface TenantStatus {
  records: DomainStatus;
  docs: DomainStatus;
  routes: DomainStatus;
  ui: DomainStatus;
  dbSync: DomainStatus;
  lastAudit: string | null;
  overallHealth: 'good' | 'needs_sync' | 'critical';
}

export interface DomainStatus {
  status: 'healthy' | 'warning' | 'critical';
  lastCheck: string;
  issues: string[];
}

export interface SystemMetrics {
  totalTenants: number;
  healthyTenants: number;
  warningTenants: number;
  criticalTenants: number;
  lastSystemCheck: string;
}

export interface TaskData {
  lastUpdated: string;
  tasks: TaskEntry[];
  metrics: TaskMetrics;
}

export interface TaskEntry {
  id: string;
  agent: string;
  tenant?: string;
  action: string;
  target: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  timestamp: string;
  result?: TaskResult;
  duration?: number;
}

export interface TaskResult {
  success: boolean;
  output: string;
  filesCreated?: string[];
  issuesFound?: number;
  error?: string;
  retryCount?: number;
}

export interface TaskMetrics {
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  averageDuration: number;
  successRate: number;
}

export interface GapReportData {
  lastUpdated: string;
  gaps: SystemGaps;
  summary: GapSummary;
}

export interface SystemGaps {
  missingDocumentation: GapItem[];
  missingSchemas: GapItem[];
  undefinedRoutes: GapItem[];
  unlinkedComponents: GapItem[];
  pagesWithoutAudit: GapItem[];
}

export interface GapItem {
  component?: string;
  recordType?: string;
  endpoint?: string;
  page?: string;
  tenant: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  estimatedEffort: string;
  assignedAgent: string;
}

export interface GapSummary {
  totalGaps: number;
  highPriority: number;
  mediumPriority: number;
  lowPriority: number;
  estimatedTotalEffort: string;
}

export interface AgentMetrics {
  lastUpdated: string;
  agentMetrics: Record<string, AgentMetric>;
  systemMetrics: SystemMetrics;
  topUnresolvedIssues: UnresolvedIssue[];
}

export interface AgentMetric {
  tasksRun: number;
  successRate: number;
  averageDuration: number;
  lastRun: string;
  commonFailures: string[];
  topIssues: string[];
}

export interface UnresolvedIssue {
  issue: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignedAgent: string;
  daysOpen: number;
}

export interface AgentExecutionOptions {
  agents?: string[];
  includeAutofix?: boolean;
  user?: string;
}

export interface AgentLogEntry {
  timestamp: string;
  agent: string;
  componentId: string;
  action: string;
  status: string;
  result: string;
  recommendation?: string;
  canAutofix: boolean;
  autofixAction?: string;
  user: string;
  metadata?: Record<string, any>;
} 