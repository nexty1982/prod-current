// OMAI CLI Tool: omaiLearner.ts
// Command-line tool for ingestion, re-index, and debug

export class OMAILearnerCLI {
  constructor() {}

  // Trigger ingestion
  async ingest(paths: string[]): Promise<void> {
    // TODO: Call KnowledgeIndexer and FileToKnowledge
  }

  // Re-index knowledge
  async reindex(): Promise<void> {
    // TODO: Rebuild knowledge index and graph
  }

  // Debug a component or route
  async debug(target: string): Promise<void> {
    // TODO: Use QueryEngine for diagnostics
  }
} 