/**
 * Google Sheets Service for Agent Task Tracking
 *
 * Provides methods to log and update agent tasks in Google Sheets.
 */

import { google, sheets_v4 } from 'googleapis';
import * as path from 'path';

// Configuration
const CREDENTIALS_PATH = '/var/www/orthodoxmetrics/secrets/agenttasks-62c073a72f34.json';
const SPREADSHEET_ID = '1at3lPN30ajgLs1ngxdj23HamFD-3mH-x8Bucevxyc80';
const TASKS_SHEET_NAME = 'Tasks'; // Default sheet name

interface TaskEntry {
  timestamp: string;
  agent: string;
  description: string;
  status: 'IN_PROGRESS' | 'COMPLETE' | 'FAILED' | 'PENDING';
  branch?: string;
  commitSha?: string;
  notes?: string;
}

class GoogleSheetsService {
  private sheets: sheets_v4.Sheets | null = null;
  private initialized = false;

  /**
   * Initialize the Google Sheets API client
   */
  async init(): Promise<void> {
    if (this.initialized) return;

    try {
      const auth = new google.auth.GoogleAuth({
        keyFile: CREDENTIALS_PATH,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });

      const authClient = await auth.getClient();
      this.sheets = google.sheets({ version: 'v4', auth: authClient as any });
      this.initialized = true;
      console.log('✓ Google Sheets service initialized');
    } catch (error: any) {
      console.error('Failed to initialize Google Sheets:', error.message);
      throw error;
    }
  }

  /**
   * Ensure the Tasks sheet exists with proper headers
   */
  async ensureTasksSheet(): Promise<void> {
    await this.init();
    if (!this.sheets) throw new Error('Sheets not initialized');

    try {
      // Check if sheet exists
      const spreadsheet = await this.sheets.spreadsheets.get({
        spreadsheetId: SPREADSHEET_ID,
      });

      const sheetExists = spreadsheet.data.sheets?.some(
        (sheet) => sheet.properties?.title === TASKS_SHEET_NAME
      );

      if (!sheetExists) {
        // Create the sheet
        await this.sheets.spreadsheets.batchUpdate({
          spreadsheetId: SPREADSHEET_ID,
          requestBody: {
            requests: [
              {
                addSheet: {
                  properties: { title: TASKS_SHEET_NAME },
                },
              },
            ],
          },
        });

        // Add headers
        await this.sheets.spreadsheets.values.update({
          spreadsheetId: SPREADSHEET_ID,
          range: `${TASKS_SHEET_NAME}!A1:G1`,
          valueInputOption: 'RAW',
          requestBody: {
            values: [['Timestamp', 'Agent', 'Description', 'Status', 'Branch', 'Commit SHA', 'Notes']],
          },
        });

        console.log('✓ Created Tasks sheet with headers');
      }
    } catch (error: any) {
      console.error('Failed to ensure Tasks sheet:', error.message);
      throw error;
    }
  }

  /**
   * Log a new agent task (creates a row on task start)
   */
  async logAgentTask(task: Omit<TaskEntry, 'timestamp'>): Promise<number> {
    await this.ensureTasksSheet();
    if (!this.sheets) throw new Error('Sheets not initialized');

    const timestamp = new Date().toISOString();
    const row = [
      timestamp,
      task.agent,
      task.description,
      task.status,
      task.branch || '',
      task.commitSha || '',
      task.notes || '',
    ];

    try {
      const response = await this.sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: `${TASKS_SHEET_NAME}!A:G`,
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
          values: [row],
        },
      });

      // Extract row number from the updated range
      const updatedRange = response.data.updates?.updatedRange || '';
      const rowMatch = updatedRange.match(/!A(\d+):/);
      const rowNumber = rowMatch ? parseInt(rowMatch[1], 10) : -1;

      console.log(`✓ Logged task at row ${rowNumber}: ${task.description}`);
      return rowNumber;
    } catch (error: any) {
      console.error('Failed to log agent task:', error.message);
      throw error;
    }
  }

  /**
   * Mark a task complete by finding it via description
   */
  async markTaskCompleteByDescription(
    description: string,
    status: 'COMPLETE' | 'FAILED' = 'COMPLETE',
    notes?: string
  ): Promise<boolean> {
    await this.init();
    if (!this.sheets) throw new Error('Sheets not initialized');

    try {
      // Get all rows
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${TASKS_SHEET_NAME}!A:G`,
      });

      const rows = response.data.values || [];

      // Find the row with matching description (column C, index 2)
      // Search from bottom up to find the most recent match
      let targetRowIndex = -1;
      for (let i = rows.length - 1; i >= 1; i--) {
        if (rows[i][2] === description && rows[i][3] !== 'COMPLETE' && rows[i][3] !== 'FAILED') {
          targetRowIndex = i;
          break;
        }
      }

      if (targetRowIndex === -1) {
        console.log(`No pending task found with description: ${description}`);
        return false;
      }

      // Update the status (column D) and notes (column G)
      const rowNumber = targetRowIndex + 1; // Sheets are 1-indexed
      const updates: { range: string; values: string[][] }[] = [
        {
          range: `${TASKS_SHEET_NAME}!D${rowNumber}`,
          values: [[status]],
        },
      ];

      if (notes) {
        updates.push({
          range: `${TASKS_SHEET_NAME}!G${rowNumber}`,
          values: [[notes]],
        });
      }

      await this.sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
          valueInputOption: 'RAW',
          data: updates,
        },
      });

      console.log(`✓ Marked task as ${status} at row ${rowNumber}: ${description}`);
      return true;
    } catch (error: any) {
      console.error('Failed to mark task complete:', error.message);
      throw error;
    }
  }

  /**
   * Get all tasks (for sync verification)
   */
  async getAllTasks(): Promise<TaskEntry[]> {
    await this.init();
    if (!this.sheets) throw new Error('Sheets not initialized');

    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${TASKS_SHEET_NAME}!A:G`,
      });

      const rows = response.data.values || [];

      // Skip header row
      return rows.slice(1).map((row) => ({
        timestamp: row[0] || '',
        agent: row[1] || '',
        description: row[2] || '',
        status: (row[3] || 'PENDING') as TaskEntry['status'],
        branch: row[4] || undefined,
        commitSha: row[5] || undefined,
        notes: row[6] || undefined,
      }));
    } catch (error: any) {
      console.error('Failed to get all tasks:', error.message);
      throw error;
    }
  }

  /**
   * Sync tasks from a markdown file to Google Sheets
   */
  async syncFromMarkdown(markdownContent: string, agent: string = 'sync-script'): Promise<void> {
    await this.ensureTasksSheet();

    // Parse markdown checkboxes
    const taskRegex = /^\s*[-*]\s*\[([ xX])\]\s*(.+)$/gm;
    let match;
    const tasks: { description: string; completed: boolean }[] = [];

    while ((match = taskRegex.exec(markdownContent)) !== null) {
      tasks.push({
        description: match[2].trim(),
        completed: match[1].toLowerCase() === 'x',
      });
    }

    console.log(`Found ${tasks.length} tasks in markdown`);

    // Get existing tasks
    const existingTasks = await this.getAllTasks();
    const existingDescriptions = new Set(existingTasks.map((t) => t.description));

    // Add new tasks and update status
    for (const task of tasks) {
      if (!existingDescriptions.has(task.description)) {
        // New task - add it
        await this.logAgentTask({
          agent,
          description: task.description,
          status: task.completed ? 'COMPLETE' : 'PENDING',
        });
      } else if (task.completed) {
        // Existing task marked complete in markdown
        await this.markTaskCompleteByDescription(task.description, 'COMPLETE');
      }
    }

    console.log('✓ Markdown sync complete');
  }
}

// Export singleton instance
export const googleSheetsService = new GoogleSheetsService();

// Export types
export type { TaskEntry };
