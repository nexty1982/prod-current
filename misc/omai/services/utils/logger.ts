import { OMAIConfig } from '../config';
import { OMAILogEntry } from '../types';
import * as fs from 'fs/promises';
import * as path from 'path';

class OMAILogger {
  private logLevel: 'debug' | 'info' | 'warn' | 'error';
  private logFile: string;

  constructor() {
    this.logLevel = OMAIConfig.logLevel as 'debug' | 'info' | 'warn' | 'error';
    this.logFile = path.join(process.cwd(), 'services/om-ai/logs/omai.log');
  }

  private getLevelNumber(level: string): number {
    const levels = { debug: 0, info: 1, warn: 2, error: 3 };
    return levels[level as keyof typeof levels] || 0;
  }

  private async writeLog(entry: OMAILogEntry): Promise<void> {
    try {
      // Ensure log directory exists
      const logDir = path.dirname(this.logFile);
      await fs.mkdir(logDir, { recursive: true });
      
      // Format log entry
      const logLine = `[${entry.timestamp.toISOString()}] ${entry.level.toUpperCase()}: ${entry.message}${entry.metadata ? ` | ${JSON.stringify(entry.metadata)}` : ''}\n`;
      
      // Append to log file
      await fs.appendFile(this.logFile, logLine);
      
      // Also log to console in development
      if (OMAIConfig.debug) {
        console.log(logLine.trim());
      }
    } catch (error) {
      console.error('Failed to write log entry:', error);
    }
  }

  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string, metadata?: any): void {
    if (this.getLevelNumber(level) >= this.getLevelNumber(this.logLevel)) {
      const entry: OMAILogEntry = {
        timestamp: new Date(),
        level,
        message,
        metadata,
        sessionId: `session_${Date.now()}`,
        userId: 'system'
      };
      
      this.writeLog(entry);
    }
  }

  debug(message: string, metadata?: any): void {
    this.log('debug', message, metadata);
  }

  info(message: string, metadata?: any): void {
    this.log('info', message, metadata);
  }

  warn(message: string, metadata?: any): void {
    this.log('warn', message, metadata);
  }

  error(message: string, metadata?: any): void {
    this.log('error', message, metadata);
  }

  async getRecentLogs(limit: number = 100): Promise<OMAILogEntry[]> {
    try {
      const data = await fs.readFile(this.logFile, 'utf8');
      const lines = data.split('\n').filter(line => line.trim());
      
      return lines
        .slice(-limit)
        .map(line => {
          const match = line.match(/\[(.*?)\] (\w+): (.*?)( \| (.*))?$/);
          if (match) {
            return {
              timestamp: new Date(match[1]),
              level: match[2].toLowerCase() as 'debug' | 'info' | 'warn' | 'error',
              message: match[3],
              metadata: match[5] ? JSON.parse(match[5]) : undefined
            };
          }
          return null;
        })
        .filter(Boolean) as OMAILogEntry[];
    } catch (error) {
      return [];
    }
  }

  async clearLogs(): Promise<void> {
    try {
      await fs.writeFile(this.logFile, '');
    } catch (error) {
      console.error('Failed to clear logs:', error);
    }
  }
}

export const logger = new OMAILogger(); 