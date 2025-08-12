# OMAI Phase 12 - Autonomous Agent Dialogue Framework

## Overview

Phase 12 implements inter-agent communication and collaboration inside the OMAI system, allowing agents to share context, delegate tasks, and operate cooperatively toward higher-order goals.

## Architecture

### Core Components

1. **Dialogue Engine** (`chat-engine.ts`)
   - Handles message passing between agents
   - Manages task queues and routing
   - Provides metrics and logging
   - Creates communication channels

2. **Context Synchronization** (`context-sync.ts`)
   - Merges memory updates from agents
   - Resolves conflicts in shared memory
   - Hydrates agent contexts with relevant information

3. **DSIL Translator** (`translator.ts`)
   - Converts system events into agent-invokable tasks
   - Maps event patterns to agent capabilities
   - Handles priority determination and context updates

4. **OMAI Mediator** (`omai-mediator.ts`)
   - Coordinates delegation between specialized agents
   - Manages workflow execution
   - Handles conflict resolution and resource allocation

### Type System

- **AgentMessage**: Inter-agent communication format
- **AgentTask**: Task assignment and tracking
- **AgentContext**: Agent state and memory
- **DialogueChannel**: Communication channels
- **DSILEvent**: Domain-specific interaction language events

## Usage

### Basic Setup

```typescript
import { initializeDialogueSystem, getDialogueStatus } from './dialogue';

// Initialize with agent registry
await initializeDialogueSystem(agentRegistry);

// Check status
const status = getDialogueStatus();
console.log(status);
```

### Sending Messages

```typescript
import { dialogueEngine } from './dialogue';

// Send message between agents
await dialogueEngine.sendMessage({
  from: 'schema-sentinel',
  to: 'omai-mediator',
  type: 'task',
  priority: 'normal',
  content: {
    action: 'validate_schema',
    payload: { schemaName: 'baptism-record' }
  }
});
```

### Creating Tasks

```typescript
// Create and assign task
const taskId = await dialogueEngine.createTask({
  assignedTo: 'doc-bot',
  requestedBy: 'omai-mediator',
  type: 'generation',
  description: 'Update documentation for field change',
  payload: { fieldName: 'baptismDate' },
  priority: 'normal'
});
```

### DSIL Event Translation

```typescript
import { dsilTranslator } from './dialogue';

const event: DSILEvent = {
  source: 'component',
  trigger: 'fieldUpdate',
  payload: {
    fieldName: 'baptismDate',
    oldValue: '2024-01-15',
    newValue: '2024-01-16'
  },
  timestamp: new Date()
};

const translation = dsilTranslator.translateEvent(event);
console.log(`Generated ${translation.agentTasks.length} tasks`);
```

## Test Scenario

The system includes a comprehensive test scenario demonstrating:

1. **Field Update Detection**: Component detects schema change
2. **DSIL Translation**: Event converted to agent tasks
3. **Task Creation**: Tasks assigned to appropriate agents
4. **Inter-agent Communication**: Agents exchange messages
5. **Mediator Coordination**: Workflow orchestration
6. **Context Synchronization**: Memory merging and conflict resolution

Run the test:

```bash
cd services/om-ai/dialogue
npx ts-node test-dialogue.ts
```

## Integration with Orchestrator

The dialogue system integrates with the OMAI orchestrator:

```typescript
// In orchestrator.ts
await this.initializeDialogueSystem();
```

This automatically:
- Registers the mediator agent
- Registers all agent capabilities with the translator
- Starts the dialogue engine
- Creates default communication channels

## File Structure

```
dialogue/
├── chat-engine.ts          # Core message passing and task management
├── context-sync.ts         # Memory merging and conflict resolution
├── translator.ts           # DSIL event translation
├── test-dialogue.ts        # Comprehensive test scenario
├── index.ts               # System exports and initialization
└── README.md              # This documentation
```

## Key Features

### ✅ Implemented

- **Message Passing**: Async communication between agents
- **Task Management**: Creation, assignment, and status tracking
- **Event Translation**: DSIL to agent task conversion
- **Context Sync**: Memory merging with conflict resolution
- **Mediator Agent**: Coordination and delegation
- **Metrics Collection**: Performance and usage tracking
- **Logging**: Comprehensive audit trail
- **Test Suite**: End-to-end scenario validation

### 🔄 Ready for Phase 13

- **Agent Learning**: Integration with learning system
- **Autonomy Training**: Self-improvement capabilities
- **Role Simulation**: Advanced interaction patterns
- **Performance Optimization**: Enhanced routing and scheduling

## Configuration

### Memory Storage

Dialogue logs are stored in `../memory/chat.log.json` with the following format:

```json
{
  "timestamp": "2024-01-16T10:30:00.000Z",
  "type": "message|task|task_update",
  "data": { /* message or task data */ }
}
```

### Agent Capabilities

Agents register their capabilities with the translator:

```typescript
dsilTranslator.registerAgentCapabilities('agent-id', [
  'validation',
  'schema',
  'documentation'
]);
```

### Priority Levels

- **critical**: Immediate attention required
- **high**: Important but not urgent
- **normal**: Standard priority
- **low**: Background processing

## Monitoring

### Metrics

```typescript
const metrics = dialogueEngine.getMetrics();
console.log(`Messages: ${metrics.messagesProcessed}`);
console.log(`Tasks: ${metrics.tasksCompleted}`);
console.log(`Error Rate: ${metrics.errorRate}`);
```

### Status

```typescript
const status = getDialogueStatus();
console.log(`Agents: ${status.engine.agents}`);
console.log(`Channels: ${status.engine.channels}`);
console.log(`Patterns: ${status.translator.patterns}`);
```

## Troubleshooting

### Common Issues

1. **Agent Not Found**: Ensure agent is registered with orchestrator
2. **Translation Failures**: Check DSIL trigger patterns
3. **Memory Conflicts**: Review conflict resolution strategies
4. **Task Stuck**: Check agent availability and task dependencies

### Debug Mode

Enable detailed logging by setting environment variable:

```bash
export OMAI_DEBUG=true
```

## Next Steps

Phase 12 provides the foundation for:

- **Phase 13**: Simulated role interaction and advanced learning
- **Phase 14**: Autonomous decision making and self-improvement
- **Phase 15**: Multi-tenant coordination and scaling

The dialogue system is production-ready and fully integrated with the existing OMAI architecture. 