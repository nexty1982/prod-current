// OMAI Phase 12 - Dialogue System Exports

// Core dialogue components
export { DialogueEngine, dialogueEngine } from './chat-engine';
export { ContextSync, contextSync } from './context-sync';
export { DSILTranslator, dsilTranslator } from './translator';

// Types
export * from '../types/agent-dialogue';

// Test utilities
export { testDialogueScenario } from './test-dialogue';

// Dialogue system initialization
export async function initializeDialogueSystem(agentRegistry: Map<string, any>): Promise<void> {
  console.log('[OMAI] Initializing Phase 12 Dialogue System...');
  
  try {
    // Start dialogue engine
    await dialogueEngine.startDialogueEngine(agentRegistry);
    
    // Register agent capabilities with translator
    for (const [agentId, agent] of agentRegistry) {
      if (agent.capabilities) {
        dsilTranslator.registerAgentCapabilities(agentId, agent.capabilities);
      }
    }
    
    console.log('[OMAI] Dialogue system initialized successfully');
    console.log(`[OMAI] Registered ${agentRegistry.size} agents`);
    console.log(`[OMAI] Available DSIL triggers: ${dsilTranslator.getAvailableTriggers().join(', ')}`);
    
  } catch (error) {
    console.error('[OMAI] Failed to initialize dialogue system:', error);
    throw error;
  }
}

// Dialogue system status
export function getDialogueStatus(): {
  engine: any;
  translator: any;
  contextSync: any;
} {
  return {
    engine: dialogueEngine.getRegistryStatus(),
    translator: dsilTranslator.getTranslationStats(),
    contextSync: contextSync.getStatus()
  };
}

// Dialogue system shutdown
export function shutdownDialogueSystem(): void {
  console.log('[OMAI] Shutting down dialogue system...');
  dialogueEngine.stop();
  console.log('[OMAI] Dialogue system shutdown complete');
} 