export const OMAIConfig = {
  // Model Configuration
  model: "/models/codellama.gguf",
  backend: "ollama", // or local inference engine
  useGPU: true,
  
  // Memory and Storage Paths
  memoryPath: "./services/om-ai/memory/om-memory.json",
  embeddingDBPath: "./services/om-ai/embeddings/index.db",
  embeddingsPath: "./services/om-ai/embeddings/embeddings.json",
  
  // Plugin Configuration
  pluginsPath: "./services/om-ai/plugins",
  packsPath: "./services/om-ai/packs",
  
  // Development Flags
  debug: process.env.NODE_ENV === 'development',
  logLevel: process.env.OMAI_LOG_LEVEL || 'info',
  
  // Vector Search Configuration
  maxContextLength: 4096,
  similarityThreshold: 0.7,
  maxResults: 5,
  
  // Security Settings
  allowExternalCalls: false,
  maxPromptLength: 8192,
  maxResponseLength: 4096,
  
  // Performance Settings
  batchSize: 10,
  cacheEnabled: true,
  cacheTTL: 3600, // 1 hour
};

export type OMAIConfigType = typeof OMAIConfig; 