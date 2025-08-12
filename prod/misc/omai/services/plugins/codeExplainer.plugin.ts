import { OMAIPlugin, PluginContext } from '../types';
import { askOMAI } from '../index';
import { logger } from '../utils/logger';

const codeExplainerPlugin: OMAIPlugin = {
  name: "codeExplainer",
  description: "Explains React/TypeScript components and code structure",
  version: "1.0.0",
  author: "OM-AI Team",
  dependencies: [],
  
  validate: (input: any): boolean => {
    return input && typeof input === 'string' && input.length > 0;
  },
  
  run: async (fileContents: string, metadata?: any): Promise<any> => {
    try {
      logger.info('Code explainer plugin started', { 
        fileType: metadata?.fileType,
        contentLength: fileContents.length 
      });
      
      // Determine the type of code analysis needed
      const analysisType = determineAnalysisType(fileContents, metadata);
      
      // Build the analysis prompt
      const prompt = buildAnalysisPrompt(fileContents, analysisType, metadata);
      
      // Get explanation from OM-AI
      const explanation = await askOMAI(prompt);
      
      // Structure the response
      const result = {
        success: true,
        explanation,
        analysisType,
        metadata: {
          fileType: metadata?.fileType || 'unknown',
          componentName: extractComponentName(fileContents),
          hasProps: fileContents.includes('interface') || fileContents.includes('type'),
          hasState: fileContents.includes('useState') || fileContents.includes('useEffect'),
          hasHooks: fileContents.includes('use'),
          linesOfCode: fileContents.split('\n').length
        }
      };
      
      logger.info('Code explainer plugin completed', { 
        analysisType,
        explanationLength: explanation.length 
      });
      
      return result;
      
    } catch (error) {
      logger.error('Code explainer plugin failed', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        explanation: 'Failed to analyze code'
      };
    }
  }
};

function determineAnalysisType(content: string, metadata?: any): string {
  const lowerContent = content.toLowerCase();
  
  if (lowerContent.includes('react') || lowerContent.includes('jsx') || lowerContent.includes('tsx')) {
    return 'react-component';
  }
  
  if (lowerContent.includes('interface') || lowerContent.includes('type') || lowerContent.includes('export')) {
    return 'typescript';
  }
  
  if (lowerContent.includes('function') || lowerContent.includes('const') || lowerContent.includes('let')) {
    return 'javascript';
  }
  
  if (lowerContent.includes('sql') || lowerContent.includes('select') || lowerContent.includes('insert')) {
    return 'sql';
  }
  
  if (lowerContent.includes('import') || lowerContent.includes('require')) {
    return 'module';
  }
  
  return 'general';
}

function buildAnalysisPrompt(content: string, analysisType: string, metadata?: any): string {
  const componentName = extractComponentName(content);
  const fileType = metadata?.fileType || 'unknown';
  
  let prompt = `Analyze this ${fileType} code and provide a comprehensive explanation:\n\n`;
  prompt += `File Type: ${fileType}\n`;
  prompt += `Analysis Type: ${analysisType}\n`;
  
  if (componentName) {
    prompt += `Component Name: ${componentName}\n`;
  }
  
  prompt += `\nCode:\n${content}\n\n`;
  
  // Add specific analysis instructions based on type
  switch (analysisType) {
    case 'react-component':
      prompt += `Please explain:\n`;
      prompt += `1. What this React component does\n`;
      prompt += `2. Its props and state management\n`;
      prompt += `3. Any hooks or lifecycle methods used\n`;
      prompt += `4. Potential improvements or optimizations\n`;
      break;
      
    case 'typescript':
      prompt += `Please explain:\n`;
      prompt += `1. The TypeScript types and interfaces defined\n`;
      prompt += `2. The structure and purpose of the code\n`;
      prompt += `3. Any type safety considerations\n`;
      break;
      
    case 'sql':
      prompt += `Please explain:\n`;
      prompt += `1. What this SQL query does\n`;
      prompt += `2. The database operations performed\n`;
      prompt += `3. Potential performance considerations\n`;
      break;
      
    default:
      prompt += `Please provide a clear explanation of what this code does, its purpose, and any important details.`;
  }
  
  return prompt;
}

function extractComponentName(content: string): string | null {
  // Try to extract React component name
  const componentMatch = content.match(/export\s+(?:default\s+)?(?:function|const)\s+(\w+)/);
  if (componentMatch) {
    return componentMatch[1];
  }
  
  // Try to extract class component name
  const classMatch = content.match(/export\s+(?:default\s+)?class\s+(\w+)/);
  if (classMatch) {
    return classMatch[1];
  }
  
  // Try to extract function name
  const functionMatch = content.match(/function\s+(\w+)/);
  if (functionMatch) {
    return functionMatch[1];
  }
  
  return null;
}

export default codeExplainerPlugin; 