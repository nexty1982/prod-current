# OM-AI Phase 6: Real-Time Agent Collaboration + Task Execution

## 🎯 Overview

Phase 6 introduces task-oriented agents that can observe component metadata and Big Book rules, auto-suggest improvements, and execute scoped actions. This phase transforms OM-AI from a code generation system into an interactive site intelligence layer that provides automated governance for OrthodoxMetrics architecture.

**Strategic Theme**: "Agents that think with context and act with purpose inside OrthodoxMetrics."

---

## 📁 Implementation Structure

```
services/om-ai/agents/
├── types.ts                    # Agent interfaces and types
├── index.ts                    # Agent registry
├── omai-doc-bot.ts            # Documentation agent
├── omai-api-guardian.ts       # API verification agent
├── omai-schema-mapper.ts      # Database schema agent
└── omai-refactor.ts           # Code quality agent

services/om-ai/
├── runAgentsOnComponent.ts    # Agent execution engine
└── logs/omai-agent-tasks.log  # Agent audit trail

front-end/src/pages/omb/
├── ComponentAgentPanel.tsx    # Agent UI interface
└── OMBEditor.tsx              # Updated with agent tabs

server/routes/omai.js          # Enhanced with agent APIs
```

---

## 🤖 Agent Framework

### 1. Agent Types (`types.ts`)

**Core Interfaces**:
```typescript
interface OMAIAgent {
  name: string;
  description: string;
  category: 'documentation' | 'api' | 'database' | 'ui' | 'security';
  run(input: BoundComponent): Promise<AgentTaskResult>;
}

interface AgentTaskResult {
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
```

### 2. Agent Categories

**Documentation Agents**:
- `omai-doc-bot`: Ensures every component has Big Book documentation
- Checks for missing/outdated documentation
- Can auto-generate documentation files

**API Agents**:
- `omai-api-guardian`: Verifies API routes and backend connections
- Checks if routes are properly registered
- Can generate missing API route files

**Database Agents**:
- `omai-schema-mapper`: Analyzes database schema requirements
- Suggests missing migrations and table structures
- Can generate SQL migration files

**UI Agents**:
- `omai-refactor`: Analyzes code quality and consistency
- Suggests naming improvements and component reuse
- Can apply refactoring suggestions

---

## 🔧 Agent Implementation

### 1. Documentation Agent (`omai-doc-bot.ts`)

**Purpose**: Ensures every new route/component has Big Book documentation

**Features**:
- Checks if documentation exists at `docs/OM-BigBook/pages/components/{component-id}.md`
- Validates documentation is up-to-date with component metadata
- Can auto-generate missing documentation

**Example Output**:
```typescript
{
  agent: "omai-doc-bot",
  componentId: "baptism-records-icon",
  action: "checkDocumentation",
  status: "error",
  result: "❌ Documentation missing",
  recommendation: "Create documentation at docs/OM-BigBook/pages/components/baptism-records-icon.md",
  canAutofix: true,
  autofixAction: "generateDocumentation"
}
```

### 2. API Guardian Agent (`omai-api-guardian.ts`)

**Purpose**: Verifies every OMB component maps to a real backend route and DB table

**Features**:
- Checks if API route file exists at `src/api/auto/{component-id}.ts`
- Validates route registration in server routes index
- Can generate missing API route files

**Example Output**:
```typescript
{
  agent: "omai-api-guardian",
  componentId: "funeral-records-icon",
  action: "verifyApiRoute",
  status: "error",
  result: "❌ API route /api/records/funeral is missing",
  recommendation: "Generate API route file at src/api/auto/funeral-records-icon.ts",
  canAutofix: true,
  autofixAction: "generateApiRoute"
}
```

### 3. Schema Mapper Agent (`omai-schema-mapper.ts`)

**Purpose**: Recommends DB schema if missing, creates migration stub

**Features**:
- Checks for migration files at `migrations/{table}_table.sql`
- Validates schema completeness and structure
- Can generate SQL migration files with suggested fields

**Example Output**:
```typescript
{
  agent: "omai-schema-mapper",
  componentId: "marriage-records-icon",
  action: "checkDatabaseSchema",
  status: "error",
  result: "❌ Database schema for marriage_records is missing",
  recommendation: "Create migration and schema files for marriage_records",
  canAutofix: true,
  autofixAction: "generateSchema",
  metadata: {
    suggestedFields: [
      'id INT PRIMARY KEY AUTO_INCREMENT',
      'created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
      'updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
      'created_by VARCHAR(255)',
      'status ENUM("active", "inactive") DEFAULT "active"'
    ]
  }
}
```

### 4. Refactor Agent (`omai-refactor.ts`)

**Purpose**: Suggests improved field names, UI consistency, component reuse

**Features**:
- Analyzes naming conventions (PascalCase, kebab-case, etc.)
- Checks for component reuse opportunities
- Validates role assignments and security patterns
- Suggests UI/UX improvements

**Example Output**:
```typescript
{
  agent: "omai-refactor",
  componentId: "baptism-records-icon",
  action: "analyzeComponentQuality",
  status: "warning",
  result: "⚠️ Found 3 improvement opportunities",
  recommendation: "Component name should follow PascalCase convention\nAPI routes should start with /api/ prefix\nConsider reusing existing components: BaptismRecords, RecordsManager",
  canAutofix: true,
  autofixAction: "applyRefactoring",
  metadata: {
    suggestions: ["Component name should follow PascalCase convention", "API routes should start with /api/ prefix"],
    improvements: ["Rename component to follow naming conventions", "Update route to follow API naming conventions"]
  }
}
```

---

## 🚀 Agent Execution Engine

### 1. Main Runner (`runAgentsOnComponent.ts`)

**Core Functions**:
```typescript
// Run all agents on a component
runAgentsOnComponent(component, options)

// Execute autofix actions
executeAutofix(result, component, user)

// Get agent metrics
getAgentMetrics()
```

**Execution Flow**:
1. **Agent Selection**: Filter agents based on options
2. **Parallel Execution**: Run all selected agents
3. **Result Logging**: Log each agent execution to audit trail
4. **Autofix Handling**: Execute autofix actions if requested
5. **Metrics Update**: Update system metrics

### 2. Autofix Actions

**Supported Actions**:
- `generateDocumentation`: Create Big Book documentation
- `regenerateDocumentation`: Update existing documentation
- `generateApiRoute`: Create API route file
- `registerApiRoute`: Add route to server index
- `generateSchema`: Create database migration
- `updateSchema`: Update existing schema
- `applyRefactoring`: Apply code improvements

**Example Autofix Execution**:
```typescript
// Generate missing API route
await generateApiRoute(component);
// Creates: src/api/auto/{component-id}.ts

// Generate database schema
await generateSchema(component);
// Creates: migrations/{table}_table.sql

// Register API route
await registerApiRoute(component);
// Updates: server/routes/index.js
```

---

## 🖥️ UI Integration

### 1. Component Agent Panel

**Location**: `front-end/src/pages/omb/ComponentAgentPanel.tsx`

**Features**:
- **Agent Results Display**: Accordion-style results with status icons
- **Metrics Summary**: Real-time agent activity metrics
- **Autofix Buttons**: One-click fix buttons for actionable issues
- **Refresh Controls**: Manual refresh and run agents buttons
- **Status Indicators**: Color-coded status (success, warning, error, info)

**Layout**:
- **Header**: Agent activity metrics and controls
- **Results**: Expandable agent result cards
- **Actions**: Auto-fix buttons for each actionable result
- **Summary**: Analysis summary with statistics

### 2. Enhanced OMB Editor

**New Features**:
- **Tabbed Interface**: Switch between "🔍 Plugins" and "🤖 Agents"
- **Agent Panel**: Dedicated agent analysis interface
- **Real-time Updates**: Live agent results and metrics
- **Integrated Workflow**: Seamless plugin → agent → autofix flow

**Tab Structure**:
```typescript
<Tabs value={activeTab} onChange={handleTabChange}>
  <Tab label="🔍 Plugins" />
  <Tab label="🤖 Agents" />
</Tabs>
```

---

## 🔌 API Endpoints

### 1. Agent Execution APIs

**POST `/api/omai/run-agents`**
- Run all agents on a component
- Request: `{ component: BoundComponent }`
- Response: `AgentTaskResult[]`

**GET `/api/omai/agent-results/:componentId`**
- Get agent results for a specific component
- Response: `AgentLogEntry[]`

**POST `/api/omai/autofix`**
- Execute autofix action for a specific agent
- Request: `{ componentId: string, agent: string, action: string }`
- Response: `{ success: boolean, results: AgentTaskResult[] }`

**GET `/api/omai/agent-metrics`**
- Get system-wide agent metrics
- Response: `AgentMetrics`

### 2. Agent Log Entry Format

```typescript
interface AgentLogEntry {
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
```

---

## 📊 Audit Logging

### 1. Log File: `/logs/omai-agent-tasks.log`

**Format**: JSON lines
**Fields**:
- `timestamp`: ISO 8601 timestamp
- `agent`: Agent name
- `componentId`: Component identifier
- `action`: Action performed
- `status`: Execution status
- `result`: Agent result message
- `recommendation`: Suggested improvement
- `canAutofix`: Whether autofix is available
- `autofixAction`: Specific autofix action
- `user`: User who triggered execution
- `metadata`: Additional context data

**Example Entry**:
```json
{
  "timestamp": "2024-01-01T12:00:00.000Z",
  "agent": "omai-doc-bot",
  "componentId": "baptism-records-icon",
  "action": "checkDocumentation",
  "status": "error",
  "result": "❌ Documentation missing",
  "recommendation": "Create documentation at docs/OM-BigBook/pages/components/baptism-records-icon.md",
  "canAutofix": true,
  "autofixAction": "generateDocumentation",
  "user": "super_admin",
  "metadata": {}
}
```

### 2. Agent Metrics

**Metrics Structure**:
```typescript
interface AgentMetrics {
  totalExecutions: number;
  successfulFixes: number;
  warnings: number;
  errors: number;
  averageExecutionTime: number;
  mostActiveAgents: Array<{ agent: string; executions: number }>;
}
```

---

## 🔄 Workflow Integration

### 1. Component Analysis Flow

1. **User selects component** in OMB Editor
2. **User clicks "Run Agents"** in Agent Panel
3. **System executes all agents** in parallel
4. **Results displayed** in expandable cards
5. **User reviews recommendations** and suggestions
6. **User clicks "Auto-fix"** for actionable items
7. **System executes autofix** and updates files
8. **Results refreshed** with new status

### 2. Agent Execution Flow

1. **Component validation** and data preparation
2. **Agent selection** based on options
3. **Parallel agent execution** with error handling
4. **Result aggregation** and logging
5. **Autofix execution** if requested
6. **Metrics update** and audit trail
7. **Response formatting** and return

### 3. Autofix Execution Flow

1. **Action validation** and component loading
2. **Specific autofix execution** based on action type
3. **File system operations** (create/update files)
4. **Log entry creation** for audit trail
5. **Success/error response** formatting
6. **UI refresh** with updated results

---

## 🎯 Strategic Outcomes

### 1. Automated Governance

- **Continuous Monitoring**: Agents constantly analyze component health
- **Proactive Detection**: Issues identified before they become problems
- **Automated Remediation**: Self-healing system through autofix actions
- **Quality Assurance**: Consistent code quality and documentation standards

### 2. Intelligent Assistance

- **Context-Aware Suggestions**: Agents understand project structure and patterns
- **Smart Recommendations**: AI-powered improvement suggestions
- **One-Click Fixes**: Automated resolution of common issues
- **Learning System**: Agents improve over time based on patterns

### 3. Development Efficiency

- **Reduced Manual Work**: Automated analysis and fixes
- **Consistent Standards**: Enforced naming conventions and patterns
- **Faster Onboarding**: New developers guided by agent suggestions
- **Quality Maintenance**: Continuous code quality monitoring

### 4. System Intelligence

- **Living Architecture**: Self-monitoring and self-improving system
- **Knowledge Accumulation**: Agent insights build project intelligence
- **Predictive Capabilities**: Anticipate issues before they occur
- **Autonomous Operations**: System can operate independently

---

## ✅ Phase 6 Completion Status

### ✅ Completed Features

- [x] Agent framework with modular agent architecture
- [x] Four specialized agents (doc-bot, api-guardian, schema-mapper, refactor)
- [x] Agent execution engine with autofix capabilities
- [x] Comprehensive audit logging system
- [x] Agent metrics and analytics
- [x] UI integration with tabbed interface
- [x] Backend API routes for agent operations
- [x] Real-time agent results display
- [x] Auto-fix button functionality
- [x] Error handling and validation
- [x] Security features and sandboxing

### 🎯 Ready for Testing

The Phase 6 Agent Collaboration system is now ready for comprehensive testing with:

- **Agent Execution**: Run all agents on components
- **Autofix Actions**: Execute automated fixes
- **Real-time Monitoring**: Live agent results and metrics
- **UI Integration**: Seamless agent panel integration
- **Audit Trail**: Complete logging and tracking
- **Error Recovery**: Robust error handling

---

## 🔗 Access Points

- **OMB Editor**: `/omb/editor` - Visual editor with agent integration
- **Agent Panel**: Tab interface for agent analysis and autofix
- **Agent APIs**: `/api/omai/run-agents` - Agent execution
- **Autofix APIs**: `/api/omai/autofix` - Automated fixes
- **Metrics APIs**: `/api/omai/agent-metrics` - System analytics
- **Results APIs**: `/api/omai/agent-results/:componentId` - Component results
- **Audit Log**: `/logs/omai-agent-tasks.log` - Agent activity history

---

## 🚀 Next Steps (Future Phases)

### Phase 7 Enhancements

1. **Advanced Agents**: Machine learning agents, pattern recognition
2. **Scheduled Agents**: Automated periodic analysis and fixes
3. **Collaborative Agents**: Multi-agent coordination and conflict resolution
4. **Custom Agents**: User-defined agent creation and deployment
5. **Agent Marketplace**: Share and distribute custom agents

### Integration Opportunities

- **Calendar AI Integration**: Schedule agent tasks based on events
- **Performance Monitoring**: Agent-based performance optimization
- **Security Agents**: Automated security scanning and fixes
- **Testing Agents**: Auto-generate and maintain test coverage
- **Deployment Agents**: Automated deployment and rollback management

---

## 🧠 Strategic Impact

Phase 6 transforms OrthodoxMetrics from a static code generation system into a **living, intelligent development platform** that:

- **Thinks**: Agents analyze and understand project context
- **Acts**: Automated fixes and improvements
- **Learns**: Continuous improvement through pattern recognition
- **Collaborates**: Multi-agent coordination for complex tasks
- **Governs**: Automated quality assurance and standards enforcement

This creates a **self-sustaining, self-improving development ecosystem** that scales with the project and maintains quality standards automatically.

---

The Phase 6 Real-Time Agent Collaboration + Task Execution system provides automated governance, intelligent assistance, and continuous improvement capabilities, making OrthodoxMetrics a truly intelligent and autonomous development platform. 