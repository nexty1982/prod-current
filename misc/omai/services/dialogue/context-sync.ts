import { AgentContext, AgentMessage, AgentTask } from '../types/agent-dialogue';
import { OMAIMemory } from '../types';
import fs from 'fs/promises';
import path from 'path';

export class ContextSync {
  private memoryPath: string;
  private conflictResolution: Map<string, (conflict: any) => any> = new Map();

  constructor() {
    this.memoryPath = path.join(__dirname, '../memory');
    this.initializeConflictResolvers();
  }

  // Initialize conflict resolution strategies
  private initializeConflictResolvers(): void {
    // Schema conflicts - prefer the most recent schema definition
    this.conflictResolution.set('schema', (conflict: any) => {
      const sorted = conflict.versions.sort((a: any, b: any) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      return sorted[0];
    });

    // Translation conflicts - prefer the most specific translation
    this.conflictResolution.set('translation', (conflict: any) => {
      const sorted = conflict.versions.sort((a: any, b: any) => 
        (b.specificity || 0) - (a.specificity || 0)
      );
      return sorted[0];
    });

    // Metadata conflicts - merge properties, prefer non-null values
    this.conflictResolution.set('metadata', (conflict: any) => {
      const merged = { ...conflict.versions[0] };
      for (let i = 1; i < conflict.versions.length; i++) {
        const version = conflict.versions[i];
        for (const [key, value] of Object.entries(version)) {
          if (value !== null && value !== undefined) {
            merged[key] = value;
          }
        }
      }
      return merged;
    });
  }

  // Merge memory updates from multiple agents
  async mergeMemoryUpdates(updates: Array<{
    agentId: string;
    memory: OMAIMemory[];
    context: AgentContext;
  }>): Promise<{
    mergedMemory: OMAIMemory[];
    conflicts: any[];
    summary: string;
  }> {
    console.log(`[OMAI] Merging memory updates from ${updates.length} agents`);

    const allMemory: OMAIMemory[] = [];
    const conflicts: any[] = [];
    const agentMemories = new Map<string, OMAIMemory[]>();

    // Collect all memory entries
    for (const update of updates) {
      agentMemories.set(update.agentId, update.memory);
      allMemory.push(...update.memory);
    }

    // Group by content similarity to detect conflicts
    const groupedMemory = this.groupSimilarMemory(allMemory);
    
    // Resolve conflicts in each group
    const mergedMemory: OMAIMemory[] = [];
    
    for (const group of groupedMemory) {
      if (group.length === 1) {
        // No conflict, add directly
        mergedMemory.push(group[0]);
      } else {
        // Conflict detected, resolve it
        const conflict = this.detectConflict(group);
        if (conflict) {
          conflicts.push(conflict);
          const resolved = await this.resolveConflict(conflict);
          if (resolved) {
            mergedMemory.push(resolved);
          }
        } else {
          // No resolvable conflict, keep all entries
          mergedMemory.push(...group);
        }
      }
    }

    // Save merged memory
    await this.saveMergedMemory(mergedMemory);

    const summary = `Merged ${allMemory.length} memory entries into ${mergedMemory.length} unique entries. Found ${conflicts.length} conflicts.`;

    console.log(`[OMAI] ${summary}`);

    return {
      mergedMemory,
      conflicts,
      summary
    };
  }

  // Group similar memory entries
  private groupSimilarMemory(memory: OMAIMemory[]): OMAIMemory[][] {
    const groups: OMAIMemory[][] = [];
    const processed = new Set<string>();

    for (const entry of memory) {
      if (processed.has(entry.id)) continue;

      const group = [entry];
      processed.add(entry.id);

      // Find similar entries
      for (const other of memory) {
        if (processed.has(other.id)) continue;

        if (this.isSimilarMemory(entry, other)) {
          group.push(other);
          processed.add(other.id);
        }
      }

      groups.push(group);
    }

    return groups;
  }

  // Check if two memory entries are similar
  private isSimilarMemory(a: OMAIMemory, b: OMAIMemory): boolean {
    // Same type and similar content
    if (a.type !== b.type) return false;

    // Check content similarity (simple string similarity for now)
    const similarity = this.calculateSimilarity(a.content, b.content);
    return similarity > 0.8; // 80% similarity threshold
  }

  // Calculate string similarity (simple implementation)
  private calculateSimilarity(a: string, b: string): number {
    const wordsA = new Set(a.toLowerCase().split(/\s+/));
    const wordsB = new Set(b.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...wordsA].filter(x => wordsB.has(x)));
    const union = new Set([...wordsA, ...wordsB]);
    
    return intersection.size / union.size;
  }

  // Detect conflict in a group of memory entries
  private detectConflict(group: OMAIMemory[]): any | null {
    if (group.length <= 1) return null;

    // Check for conflicting metadata
    const metadataConflicts = this.detectMetadataConflicts(group);
    if (metadataConflicts.length > 0) {
      return {
        type: 'metadata',
        entries: group,
        conflicts: metadataConflicts,
        timestamp: new Date()
      };
    }

    // Check for content conflicts
    const contentConflicts = this.detectContentConflicts(group);
    if (contentConflicts.length > 0) {
      return {
        type: 'content',
        entries: group,
        conflicts: contentConflicts,
        timestamp: new Date()
      };
    }

    return null;
  }

  // Detect metadata conflicts
  private detectMetadataConflicts(group: OMAIMemory[]): any[] {
    const conflicts: any[] = [];
    const metadataKeys = new Set<string>();

    // Collect all metadata keys
    for (const entry of group) {
      Object.keys(entry.metadata).forEach(key => metadataKeys.add(key));
    }

    // Check for conflicting values
    for (const key of metadataKeys) {
      const values = group.map(entry => entry.metadata[key]).filter(v => v !== undefined);
      const uniqueValues = new Set(values);
      
      if (uniqueValues.size > 1) {
        conflicts.push({
          key,
          values: Array.from(uniqueValues),
          entries: group.map(entry => ({ id: entry.id, value: entry.metadata[key] }))
        });
      }
    }

    return conflicts;
  }

  // Detect content conflicts
  private detectContentConflicts(group: OMAIMemory[]): any[] {
    const conflicts: any[] = [];
    
    // For now, we'll consider it a conflict if content is significantly different
    // This is a simplified approach - in practice, you might want more sophisticated analysis
    const contents = group.map(entry => entry.content);
    const uniqueContents = new Set(contents);
    
    if (uniqueContents.size > 1) {
      conflicts.push({
        type: 'content_variation',
        contents: Array.from(uniqueContents),
        entries: group.map(entry => ({ id: entry.id, content: entry.content }))
      });
    }

    return conflicts;
  }

  // Resolve a conflict
  private async resolveConflict(conflict: any): Promise<OMAIMemory | null> {
    const resolver = this.conflictResolution.get(conflict.type);
    
    if (resolver) {
      try {
        const resolved = resolver(conflict);
        
        // Create a merged memory entry
        const mergedEntry: OMAIMemory = {
          id: `merged_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: conflict.entries[0].type,
          content: resolved.content || conflict.entries[0].content,
          metadata: {
            ...conflict.entries[0].metadata,
            ...resolved.metadata,
            mergedFrom: conflict.entries.map((e: OMAIMemory) => e.id),
            conflictResolved: true,
            resolutionType: conflict.type,
            timestamp: new Date()
          },
          relationships: conflict.entries.flatMap((e: OMAIMemory) => e.relationships || [])
        };

        return mergedEntry;
      } catch (error) {
        console.error('[OMAI] Error resolving conflict:', error);
        return null;
      }
    }

    // No resolver available, return the most recent entry
    const sorted = conflict.entries.sort((a: OMAIMemory, b: OMAIMemory) => 
      new Date(b.metadata.timestamp).getTime() - new Date(a.metadata.timestamp).getTime()
    );
    
    return sorted[0];
  }

  // Save merged memory to file
  private async saveMergedMemory(memory: OMAIMemory[]): Promise<void> {
    try {
      const memoryFile = path.join(this.memoryPath, 'merged-memory.json');
      const content = JSON.stringify(memory, null, 2);
      await fs.writeFile(memoryFile, content, 'utf-8');
      
      console.log(`[OMAI] Saved ${memory.length} merged memory entries`);
    } catch (error) {
      console.error('[OMAI] Error saving merged memory:', error);
    }
  }

  // Hydrate shared context for an agent
  async hydrateContext(agentId: string, context: AgentContext): Promise<AgentContext> {
    try {
      // Load shared memory
      const sharedMemory = await this.loadSharedMemory();
      
      // Filter relevant memory for this agent
      const relevantMemory = sharedMemory.filter(entry => 
        entry.metadata.tags?.some(tag => 
          context.capabilities.includes(tag) || 
          context.domain === tag
        )
      );

      // Update agent context
      const hydratedContext: AgentContext = {
        ...context,
        memory: {
          recent: relevantMemory.slice(-10), // Last 10 relevant entries
          persistent: relevantMemory.filter(entry => 
            entry.metadata.importance >= 7
          )
        },
        lastActivity: new Date()
      };

      console.log(`[OMAI] Hydrated context for ${agentId} with ${relevantMemory.length} relevant memories`);

      return hydratedContext;
    } catch (error) {
      console.error(`[OMAI] Error hydrating context for ${agentId}:`, error);
      return context;
    }
  }

  // Load shared memory from file
  private async loadSharedMemory(): Promise<OMAIMemory[]> {
    try {
      const memoryFile = path.join(this.memoryPath, 'merged-memory.json');
      const content = await fs.readFile(memoryFile, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      console.warn('[OMAI] No shared memory file found, starting fresh');
      return [];
    }
  }

  // Get context sync status
  getStatus(): {
    memoryPath: string;
    conflictResolvers: number;
    lastSync: Date;
  } {
    return {
      memoryPath: this.memoryPath,
      conflictResolvers: this.conflictResolution.size,
      lastSync: new Date()
    };
  }
}

// Export singleton instance
export const contextSync = new ContextSync(); 