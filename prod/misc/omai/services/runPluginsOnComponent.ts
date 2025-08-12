import { BoundComponent } from '../../front-end/src/pages/omb/types';
import plugins from './plugins/index';

export interface PluginResult {
  pluginName: string;
  description: string;
  result: string;
  timestamp: string;
}

export async function runPluginsOnComponent(component: BoundComponent): Promise<PluginResult[]> {
  const results: PluginResult[] = [];
  
  for (const plugin of plugins) {
    try {
      const result = await plugin.run(component);
      results.push({
        pluginName: plugin.name,
        description: plugin.description,
        result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      results.push({
        pluginName: plugin.name,
        description: plugin.description,
        result: `❌ Plugin execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString()
      });
    }
  }
  
  return results;
}

export async function savePluginResults(componentId: string, results: PluginResult[]): Promise<void> {
  try {
    const response = await fetch('/api/omai/plugin-results', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        componentId,
        results
      })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to save plugin results: ${response.status}`);
    }
  } catch (error) {
    console.error('Failed to save plugin results:', error);
    throw error;
  }
} 