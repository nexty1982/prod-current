// Core AI Types
export interface OMAIResponse {
  success: boolean;
  response: string;
  context?: string[];
  metadata?: {
    model: string;
    duration: number;
    tokens: number;
    confidence: number;
  };
  error?: string;
}

export interface OMAIPrompt {
  text: string;
  context?: string[];
  metadata?: {
    source: string;
    timestamp: Date;
    user?: string;
  };
}

// Plugin System Types
export interface OMAIPlugin {
  name: string;
  description: string;
  version: string;
  author: string;
  dependencies?: string[];
  run: (input: any, metadata?: any) => Promise<any>;
  validate?: (input: any) => boolean;
}

export interface PluginContext {
  fileContents: string;
  filePath: string;
  fileType: string;
  metadata: any;
  config: any;
}

// Memory System Types
export interface OMAIMemory {
  id: string;
  type: 'conversation' | 'knowledge' | 'execution' | 'error';
  content: string;
  metadata: {
    timestamp: Date;
    source: string;
    tags: string[];
    importance: number; // 1-10
  };
  relationships?: string[]; // IDs of related memories
}

// Embedding Types
export interface EmbeddingEntry {
  id: string;
  content: string;
  embedding: number[];
  metadata: {
    source: string;
    fileType: string;
    timestamp: Date;
    tags: string[];
  };
  similarity?: number;
}

// Knowledge Pack Types
export interface KnowledgePack {
  id: string;
  name: string;
  description: string;
  version: string;
  domain: string;
  content: {
    schemas: any[];
    examples: any[];
    rules: any[];
    templates: any[];
  };
  metadata: {
    author: string;
    created: Date;
    updated: Date;
    dependencies: string[];
  };
}

// Vector Search Types
export interface SearchResult {
  id: string;
  content: string;
  similarity: number;
  metadata: any;
}

export interface SearchQuery {
  text: string;
  filters?: {
    fileType?: string[];
    tags?: string[];
    dateRange?: {
      start: Date;
      end: Date;
    };
  };
  limit?: number;
  threshold?: number;
}

// Logging Types
export interface OMAILogEntry {
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  metadata?: any;
  userId?: string;
  sessionId?: string;
}

// Security Types
export interface SecurityContext {
  userId?: string;
  permissions: string[];
  sessionId: string;
  requestId: string;
  timestamp: Date;
}

// Performance Types
export interface PerformanceMetrics {
  promptLength: number;
  responseLength: number;
  processingTime: number;
  memoryUsage: number;
  gpuUsage?: number;
  cacheHit: boolean;
}

// Configuration Types
export interface ModelConfig {
  name: string;
  path: string;
  type: 'gguf' | 'onnx' | 'tensorrt';
  parameters: {
    temperature: number;
    topP: number;
    maxTokens: number;
    stopSequences: string[];
  };
}

export interface VectorConfig {
  type: 'json' | 'chromadb' | 'pinecone';
  path: string;
  dimensions: number;
  similarity: 'cosine' | 'euclidean' | 'dot';
} 