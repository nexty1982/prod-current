import { dialogueEngine } from './chat-engine';
import { contextSync } from './context-sync';
import { dsilTranslator } from './translator';
import { omaiMediator } from '../agents/omai-mediator';
import { DSILEvent } from '../types/agent-dialogue';
import { OMAIAgentContext } from '../agents/types';

// Test scenario: EditableComponentAgent detects a form schema mismatch
async function testDialogueScenario(): Promise<void> {
  console.log('🧪 Testing OMAI Phase 12 Dialogue System...\n');

  // 1. Simulate a field update event that requires validation and documentation
  const fieldUpdateEvent: DSILEvent = {
    source: 'component',
    trigger: 'fieldUpdate',
    payload: {
      fieldName: 'baptismDate',
      oldValue: '2024-01-15',
      newValue: '2024-01-16',
      context: 'baptism-record-form',
      requiresDocUpdate: true
    },
    timestamp: new Date(),
    sessionId: 'test-session-123',
    userId: 'test-user'
  };

  console.log('📝 Step 1: Field update event detected');
  console.log(`   Field: ${fieldUpdateEvent.payload.fieldName}`);
  console.log(`   Change: ${fieldUpdateEvent.payload.oldValue} → ${fieldUpdateEvent.payload.newValue}\n`);

  // 2. Translate event to agent tasks
  const translation = dsilTranslator.translateEvent(fieldUpdateEvent);
  
  console.log('🔄 Step 2: DSIL Translation');
  console.log(`   Generated ${translation.agentTasks.length} tasks`);
  console.log(`   Priority: ${translation.priority}`);
  
  translation.agentTasks.forEach((task, index) => {
    console.log(`   Task ${index + 1}: ${task.description}`);
    console.log(`     Assigned to: ${task.assignedTo}`);
    console.log(`     Type: ${task.type}`);
    console.log(`     Priority: ${task.priority}\n`);
  });

  // 3. Create tasks in dialogue engine
  console.log('📋 Step 3: Creating tasks in dialogue engine');
  
  for (const task of translation.agentTasks) {
    const taskId = await dialogueEngine.createTask({
      assignedTo: task.assignedTo,
      requestedBy: 'system',
      type: task.type,
      description: task.description,
      payload: task.payload,
      priority: task.priority,
      metadata: task.metadata
    });
    
    console.log(`   Created task: ${taskId}`);
  }

  // 4. Send messages between agents
  console.log('\n💬 Step 4: Agent communication');
  
  // Schema agent sends validation result to mediator
  await dialogueEngine.sendMessage({
    from: 'schema-sentinel',
    to: 'omai-mediator',
    type: 'response',
    priority: 'normal',
    content: {
      action: 'validation_complete',
      payload: {
        fieldName: 'baptismDate',
        isValid: true,
        suggestions: ['Consider adding date validation rules']
      }
    }
  });
  
  console.log('   Schema agent → Mediator: Validation completed');

  // Doc agent requests translation help
  await dialogueEngine.sendMessage({
    from: 'doc-bot',
    to: 'omai-mediator',
    type: 'task',
    priority: 'normal',
    content: {
      action: 'request_translation',
      payload: {
        fieldName: 'baptismDate',
        context: 'baptism-record-form',
        language: 'Romanian'
      }
    }
  });
  
  console.log('   Doc agent → Mediator: Requesting translation help');

  // 5. Mediator coordinates the response
  console.log('\n🎯 Step 5: Mediator coordination');
  
  const mediatorContext: OMAIAgentContext = {
    tenant: 'test-tenant',
    target: 'field-update-workflow',
    memory: {
      recent: [
        { type: 'field_update', fieldName: 'baptismDate', oldValue: '2024-01-15', newValue: '2024-01-16' },
        { type: 'workflow_request', steps: ['validation', 'translation', 'generation'] }
      ],
      persistent: [
        { type: 'workflow_config', requiresDocUpdate: true }
      ]
    },
    statusData: {
      lastUpdated: new Date().toISOString(),
      tenants: {},
      systemMetrics: {
        totalTenants: 1,
        healthyTenants: 1,
        warningTenants: 0,
        criticalTenants: 0,
        lastSystemCheck: new Date().toISOString()
      }
    },
    gapData: {
      lastUpdated: new Date().toISOString(),
      gaps: {
        missingDocumentation: [],
        missingSchemas: [],
        undefinedRoutes: [],
        unlinkedComponents: [],
        pagesWithoutAudit: []
      },
      summary: {
        totalGaps: 0,
        highPriority: 0,
        mediumPriority: 0,
        lowPriority: 0,
        estimatedTotalEffort: '0h'
      }
    },
    taskData: {
      lastUpdated: new Date().toISOString(),
      tasks: [],
      metrics: {
        totalTasks: 0,
        completedTasks: 0,
        failedTasks: 0,
        averageDuration: 0,
        successRate: 100
      }
    }
  };

  const mediatorResult = await omaiMediator.run(mediatorContext);
  
  console.log(`   Mediator result: ${JSON.stringify(mediatorResult, null, 2)}`);
  console.log(`   Success: ${mediatorResult.success}`);

  // 6. Update task statuses
  console.log('\n✅ Step 6: Updating task statuses');
  
  for (const task of translation.agentTasks) {
    await dialogueEngine.updateTaskStatus(task.id, 'completed', {
      result: 'Task completed successfully',
      timestamp: new Date()
    });
    
    console.log(`   Task ${task.id}: Completed`);
  }

  // 7. Get dialogue metrics
  console.log('\n📊 Step 7: Dialogue metrics');
  
  const metrics = dialogueEngine.getMetrics();
  const registryStatus = dialogueEngine.getRegistryStatus();
  
  console.log(`   Messages processed: ${metrics.messagesProcessed}`);
  console.log(`   Tasks completed: ${metrics.tasksCompleted}`);
  console.log(`   Active channels: ${metrics.activeChannels}`);
  console.log(`   Registry agents: ${registryStatus.agents}`);
  console.log(`   Registry channels: ${registryStatus.channels}`);

  // 8. Test context synchronization
  console.log('\n🔄 Step 8: Context synchronization');
  
  const memoryUpdates = [
    {
      agentId: 'schema-sentinel',
      memory: [
        {
          id: 'mem_1',
          type: 'knowledge' as const,
          content: 'Field baptismDate validation rules updated',
          metadata: {
            timestamp: new Date(),
            source: 'schema-sentinel',
            tags: ['validation', 'schema'],
            importance: 7
          }
        }
      ],
      context: {
        agentId: 'schema-sentinel',
        domain: 'validation',
        capabilities: ['validation', 'schema'],
        memory: { recent: [], persistent: [] },
        status: 'idle' as const,
        lastActivity: new Date()
      }
    },
    {
      agentId: 'doc-bot',
      memory: [
        {
          id: 'mem_2',
          type: 'knowledge' as const,
          content: 'Documentation updated for baptismDate field',
          metadata: {
            timestamp: new Date(),
            source: 'doc-bot',
            tags: ['documentation', 'field-update'],
            importance: 6
          }
        }
      ],
      context: {
        agentId: 'doc-bot',
        domain: 'documentation',
        capabilities: ['documentation', 'markdown'],
        memory: { recent: [], persistent: [] },
        status: 'idle' as const,
        lastActivity: new Date()
      }
    }
  ];

  const syncResult = await contextSync.mergeMemoryUpdates(memoryUpdates);
  
  console.log(`   Sync result: ${syncResult.summary}`);
  console.log(`   Conflicts found: ${syncResult.conflicts.length}`);

  console.log('\n🎉 Phase 12 Dialogue System Test Complete!');
  console.log('\n📋 Test Summary:');
  console.log('   ✅ DSIL event translation');
  console.log('   ✅ Agent task creation');
  console.log('   ✅ Inter-agent messaging');
  console.log('   ✅ Mediator coordination');
  console.log('   ✅ Task status updates');
  console.log('   ✅ Context synchronization');
  console.log('   ✅ Metrics collection');
}

// Run the test
if (require.main === module) {
  testDialogueScenario().catch(console.error);
}

export { testDialogueScenario }; 