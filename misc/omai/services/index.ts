import { OMAIConfig } from './config';
import { OMAIResponse, OMAIPrompt, SecurityContext } from './types';
import { getContextForPrompt } from './embeddings/context-loader';
import { runLocalLLM, runLocalLLMWithMetadata } from './llm/localRunner';
import { logger } from './utils/logger';

/**
 * Main OM-AI function that processes prompts with context retrieval
 */
export async function askOMAI(prompt: string, securityContext?: SecurityContext): Promise<string> {
  const startTime = Date.now();
  
  try {
    logger.info('OM-AI request received', { prompt: prompt.substring(0, 100) + '...' });
    
    // Validate input
    if (!prompt || prompt.length > OMAIConfig.maxPromptLength) {
      throw new Error(`Prompt too long or empty. Max length: ${OMAIConfig.maxPromptLength}`);
    }
    
    // Get relevant context from vector store and memory
    logger.debug('Retrieving context for prompt');
    const contextResult = await getContextForPrompt(prompt);
    const { context, sources, memoryContext } = contextResult;
    
    // Build final prompt with context
    const allContext = [...context, ...memoryContext];
    const contextText = allContext.length > 0 
      ? `\n\nRelevant Context:\n${allContext.join('\n\n')}\n\n`
      : '';
    
    const finalPrompt = `${contextText}User: ${prompt}\n\nOM-AI:`;
    
    logger.debug('Executing LLM with context', { 
      contextCount: context.length,
      finalPromptLength: finalPrompt.length 
    });
    
    // Execute LLM
    const response = await runLocalLLM(finalPrompt);
    
    const duration = Date.now() - startTime;
    logger.info('OM-AI response generated', { 
      duration,
      responseLength: response.length,
      vectorContextUsed: context.length > 0,
      memoryContextUsed: memoryContext.length > 0,
      sourcesCount: sources.length
    });
    
    return response;
    
  } catch (error) {
    logger.error('OM-AI execution failed', { error: error instanceof Error ? error.message : 'Unknown error' });
    throw error;
  }
}

/**
 * Enhanced version with full metadata
 */
export async function askOMAIWithMetadata(
  prompt: string, 
  securityContext?: SecurityContext
): Promise<OMAIResponse> {
  const startTime = Date.now();
  
  try {
    logger.info('OM-AI request with metadata received', { prompt: prompt.substring(0, 100) + '...' });
    
    // Validate input
    if (!prompt || prompt.length > OMAIConfig.maxPromptLength) {
      return {
        success: false,
        response: '',
        error: `Prompt too long or empty. Max length: ${OMAIConfig.maxPromptLength}`
      };
    }
    
    // Get relevant context from vector store and memory
    const contextResult = await getContextForPrompt(prompt);
    const { context, sources, memoryContext } = contextResult;
    
    // Build final prompt
    const allContext = [...context, ...memoryContext];
    const contextText = allContext.length > 0 
      ? `\n\nRelevant Context:\n${allContext.join('\n\n')}\n\n`
      : '';
    
    const finalPrompt = `${contextText}User: ${prompt}\n\nOM-AI:`;
    
    // Execute LLM with metadata
    const response = await runLocalLLMWithMetadata(finalPrompt);
    
    const duration = Date.now() - startTime;
    logger.info('OM-AI response with metadata generated', { 
      duration,
      responseLength: response.response.length,
      vectorContextUsed: context.length > 0,
      memoryContextUsed: memoryContext.length > 0,
      sourcesCount: sources.length
    });
    
    return {
      ...response,
      context: context.length > 0 ? context : undefined,
      sources: sources.length > 0 ? sources : undefined,
      memoryContext: memoryContext.length > 0 ? memoryContext : undefined
    };
    
  } catch (error) {
    logger.error('OM-AI execution with metadata failed', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    
    return {
      success: false,
      response: '',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Health check for the OM-AI system
 */
export async function getOMAIHealth(): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy';
  components: {
    llm: any;
    embeddings: any;
    logger: boolean;
  };
  timestamp: Date;
}> {
  try {
    const { getLLMHealth } = await import('./llm/localRunner');
    const { getEmbeddingsStats } = await import('./embeddings/context-loader');
    
    const [llmHealth, embeddingsStats] = await Promise.all([
      getLLMHealth(),
      getEmbeddingsStats()
    ]);
    
    const overallStatus = llmHealth.status === 'healthy' ? 'healthy' : 'degraded';
    
    return {
      status: overallStatus,
      components: {
        llm: llmHealth,
        embeddings: embeddingsStats,
        logger: true
      },
      timestamp: new Date()
    };
  } catch (error) {
    logger.error('Health check failed', { error: error instanceof Error ? error.message : 'Unknown error' });
    
    return {
      status: 'unhealthy',
      components: {
        llm: { status: 'unhealthy' },
        embeddings: { totalEmbeddings: 0 },
        logger: false
      },
      timestamp: new Date()
    };
  }
}

/**
 * Get system statistics
 */
export async function getOMAIStats(): Promise<{
  totalRequests: number;
  averageResponseTime: number;
  embeddingsCount: number;
  lastRequest: Date;
}> {
  try {
    const { getPerformanceMetrics } = await import('./llm/localRunner');
    const { getEmbeddingsStats } = await import('./embeddings/context-loader');
    
    const [metrics, embeddingsStats] = await Promise.all([
      getPerformanceMetrics(),
      getEmbeddingsStats()
    ]);
    
    const totalRequests = metrics.length;
    const averageResponseTime = totalRequests > 0 
      ? metrics.reduce((sum, m) => sum + m.processingTime, 0) / totalRequests 
      : 0;
    
    return {
      totalRequests,
      averageResponseTime,
      embeddingsCount: embeddingsStats.totalEmbeddings,
      lastRequest: totalRequests > 0 ? new Date() : new Date(0)
    };
  } catch (error) {
    logger.error('Failed to get stats', { error: error instanceof Error ? error.message : 'Unknown error' });
    
    return {
      totalRequests: 0,
      averageResponseTime: 0,
      embeddingsCount: 0,
      lastRequest: new Date(0)
    };
  }
}

// Export configuration for external use
export { OMAIConfig } from './config';
export * from './types'; 