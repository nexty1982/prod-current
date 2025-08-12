import * as fs from 'fs/promises';
import * as path from 'path';
import { OMAIConfig } from '../config';
import { logger } from '../utils/logger';

interface MemoryData {
  rules: string[];
  components: Record<string, string>;
  architecture: Record<string, any>;
  file_patterns: Record<string, string[]>;
  directories: Record<string, string>;
  last_updated: string;
  version: string;
}

interface MemoryQuery {
  type: 'rules' | 'components' | 'architecture' | 'file_patterns' | 'directories';
  query?: string;
}

class MemoryManager {
  private memory: MemoryData | null = null;
  private memoryPath: string;

  constructor() {
    this.memoryPath = OMAIConfig.memoryPath;
  }

  async loadMemory(): Promise<MemoryData> {
    if (this.memory) {
      return this.memory;
    }

    try {
      const data = await fs.readFile(this.memoryPath, 'utf8');
      this.memory = JSON.parse(data);
      logger.info('Memory loaded successfully', { 
        rules: this.memory.rules.length,
        components: Object.keys(this.memory.components).length 
      });
      return this.memory;
    } catch (error) {
      logger.warn('Failed to load memory, creating default', { error: error instanceof Error ? error.message : 'Unknown error' });
      this.memory = this.createDefaultMemory();
      await this.saveMemory();
      return this.memory;
    }
  }

  async saveMemory(): Promise<void> {
    if (!this.memory) {
      throw new Error('No memory to save');
    }

    try {
      // Ensure directory exists
      const dir = path.dirname(this.memoryPath);
      await fs.mkdir(dir, { recursive: true });
      
      await fs.writeFile(this.memoryPath, JSON.stringify(this.memory, null, 2));
      this.memory.last_updated = new Date().toISOString();
      logger.info('Memory saved successfully');
    } catch (error) {
      logger.error('Failed to save memory', { error: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  }

  async queryMemory(query: MemoryQuery): Promise<any> {
    const memory = await this.loadMemory();
    
    switch (query.type) {
      case 'rules':
        if (query.query) {
          return memory.rules.filter(rule => 
            rule.toLowerCase().includes(query.query!.toLowerCase())
          );
        }
        return memory.rules;
      
      case 'components':
        if (query.query) {
          const filtered: Record<string, string> = {};
          Object.entries(memory.components).forEach(([key, value]) => {
            if (key.toLowerCase().includes(query.query!.toLowerCase()) || 
                value.toLowerCase().includes(query.query!.toLowerCase())) {
              filtered[key] = value;
            }
          });
          return filtered;
        }
        return memory.components;
      
      case 'architecture':
        return memory.architecture;
      
      case 'file_patterns':
        return memory.file_patterns;
      
      case 'directories':
        return memory.directories;
      
      default:
        return memory;
    }
  }

  async addRule(rule: string): Promise<void> {
    const memory = await this.loadMemory();
    if (!memory.rules.includes(rule)) {
      memory.rules.push(rule);
      await this.saveMemory();
      logger.info('Rule added to memory', { rule });
    }
  }

  async addComponent(name: string, description: string): Promise<void> {
    const memory = await this.loadMemory();
    memory.components[name] = description;
    await this.saveMemory();
    logger.info('Component added to memory', { name, description });
  }

  async updateArchitecture(section: string, data: any): Promise<void> {
    const memory = await this.loadMemory();
    memory.architecture[section] = data;
    await this.saveMemory();
    logger.info('Architecture updated', { section });
  }

  async getRelevantContext(prompt: string): Promise<string[]> {
    const memory = await this.loadMemory();
    const relevant: string[] = [];
    
    // Check rules for relevance
    memory.rules.forEach(rule => {
      const ruleWords = rule.toLowerCase().split(/\s+/);
      const promptWords = prompt.toLowerCase().split(/\s+/);
      const intersection = ruleWords.filter(word => promptWords.includes(word));
      if (intersection.length > 0) {
        relevant.push(`Rule: ${rule}`);
      }
    });

    // Check components for relevance
    Object.entries(memory.components).forEach(([name, description]) => {
      const componentWords = `${name} ${description}`.toLowerCase().split(/\s+/);
      const promptWords = prompt.toLowerCase().split(/\s+/);
      const intersection = componentWords.filter(word => promptWords.includes(word));
      if (intersection.length > 0) {
        relevant.push(`Component ${name}: ${description}`);
      }
    });

    return relevant;
  }

  private createDefaultMemory(): MemoryData {
    return {
      rules: [
        "Do not use Unstable_Grid2 due to known layout and style conflicts.",
        "All record tables must have a church_id foreign key.",
        "User accounts should be stored in orthodoxmetrics_db; the church database is only for record holding."
      ],
      components: {
        "LoginPage.tsx": "Handles user session with JWT + cookie-based auth.",
        "RecordPreviewPane.tsx": "Displays styled record form preview in real time."
      },
      architecture: {
        database: {
          orthodoxmetrics_db: "Main application database for users and system data",
          church_db: "Database for record holding only, not for user storage"
        },
        frontend: {
          framework: "React with TypeScript",
          ui_library: "Material-UI (avoid Unstable_Grid2)",
          build_tool: "Vite with custom configuration"
        },
        backend: {
          framework: "Node.js with Express",
          database: "MariaDB",
          authentication: "JWT-based with cookie storage"
        }
      },
      file_patterns: {
        source_code: ["*.ts", "*.tsx", "*.js", "*.jsx"],
        documentation: ["*.md", "*.txt"],
        configuration: ["*.json", "*.config.js", "*.env"],
        database: ["*.sql"],
        scripts: ["*.sh", "*.bat"]
      },
      directories: {
        docs: "./docs/OM-BigBook/",
        frontend: "./front-end/src/",
        backend: "./server/",
        services: "./services/",
        scripts: "./scripts/"
      },
      last_updated: new Date().toISOString(),
      version: "1.0.0"
    };
  }
}

const memoryManager = new MemoryManager();

export async function loadMemory(): Promise<MemoryData> {
  return await memoryManager.loadMemory();
}

export async function queryMemory(query: MemoryQuery): Promise<any> {
  return await memoryManager.queryMemory(query);
}

export async function addRule(rule: string): Promise<void> {
  return await memoryManager.addRule(rule);
}

export async function addComponent(name: string, description: string): Promise<void> {
  return await memoryManager.addComponent(name, description);
}

export async function getRelevantContext(prompt: string): Promise<string[]> {
  return await memoryManager.getRelevantContext(prompt);
}

export async function getMemoryStats(): Promise<{
  totalRules: number;
  totalComponents: number;
  lastUpdated: string;
  version: string;
}> {
  const memory = await memoryManager.loadMemory();
  return {
    totalRules: memory.rules.length,
    totalComponents: Object.keys(memory.components).length,
    lastUpdated: memory.last_updated,
    version: memory.version
  };
} 