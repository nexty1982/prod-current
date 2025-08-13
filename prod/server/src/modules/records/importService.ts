/**
 * Import Service for Sacrament Records
 * Handles CSV, JSON, SQL, and XML imports with idempotency
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { parse } from 'fast-csv';
import * as xml2js from 'xml2js';
import { RowDataPacket } from 'mysql2';
import { getAppPool } from '../../../config/db';

export type ImportFormat = 'csv' | 'json' | 'sql' | 'xml';
export type RecordType = 'baptisms' | 'marriages' | 'funerals';

export interface ImportJob {
  id?: number;
  church_id: number;
  type: RecordType;
  format: ImportFormat;
  filename: string;
  size: number;
  status: 'pending' | 'running' | 'done' | 'error';
  total_rows?: number;
  processed_rows?: number;
  inserted_rows?: number;
  updated_rows?: number;
  skipped_rows?: number;
  error_rows?: number;
  started_at?: Date;
  finished_at?: Date;
  error_text?: string;
  created_by?: number;
}

export interface FieldMapping {
  [sourceField: string]: string; // source field -> canonical field
}

export class ImportService {
  /**
   * Detect file format from filename and mime type
   */
  static detectFormat(filename: string, mimeType?: string): ImportFormat {
    const ext = path.extname(filename).toLowerCase();
    
    if (ext === '.csv' || mimeType === 'text/csv') return 'csv';
    if (ext === '.json' || mimeType === 'application/json') return 'json';
    if (ext === '.sql' || mimeType === 'application/sql') return 'sql';
    if (ext === '.xml' || mimeType === 'application/xml' || mimeType === 'text/xml') return 'xml';
    
    // Default to CSV if uncertain
    return 'csv';
  }

  /**
   * Create a new import job
   */
  static async createJob(job: ImportJob): Promise<number> {
    const pool = await getAppPool();
    const [result] = await pool.execute(
      `INSERT INTO import_jobs 
       (church_id, type, format, filename, size, status, created_by, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [job.church_id, job.type, job.format, job.filename, job.size, 'pending', job.created_by]
    );
    return (result as any).insertId;
  }

  /**
   * Update job status
   */
  static async updateJob(jobId: number, updates: Partial<ImportJob>): Promise<void> {
    const pool = await getAppPool();
    const fields: string[] = [];
    const values: any[] = [];
    
    Object.entries(updates).forEach(([key, value]) => {
      if (key !== 'id') {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });
    
    if (fields.length > 0) {
      values.push(jobId);
      await pool.execute(
        `UPDATE import_jobs SET ${fields.join(', ')}, updated_at = NOW() WHERE id = ?`,
        values
      );
    }
  }

  /**
   * Store uploaded file
   */
  static async storeFile(jobId: number, filePath: string, originalName: string, mimeType?: string): Promise<void> {
    const pool = await getAppPool();
    const fileContent = fs.readFileSync(filePath);
    const sha1Hash = crypto.createHash('sha1').update(fileContent).digest('hex');
    
    await pool.execute(
      `INSERT INTO import_files (job_id, storage_path, original_name, mime_type, sha1_hash) 
       VALUES (?, ?, ?, ?, ?)`,
      [jobId, filePath, originalName, mimeType, sha1Hash]
    );
  }

  /**
   * Parse CSV file and return preview
   */
  static async parseCSVPreview(filePath: string, limit: number = 100): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const results: any[] = [];
      let count = 0;
      
      fs.createReadStream(filePath)
        .pipe(parse({ headers: true, maxRows: limit }))
        .on('data', (data) => {
          results.push(data);
          count++;
          if (count >= limit) {
            this.destroy();
          }
        })
        .on('end', () => resolve(results))
        .on('error', reject);
    });
  }

  /**
   * Parse JSON file and return preview
   */
  static async parseJSONPreview(filePath: string, limit: number = 100): Promise<any[]> {
    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);
    
    if (Array.isArray(data)) {
      return data.slice(0, limit);
    } else if (data && typeof data === 'object') {
      // Handle single object or nested structure
      const records = data.records || data.data || data.items || [data];
      return Array.isArray(records) ? records.slice(0, limit) : [records];
    }
    
    return [];
  }

  /**
   * Parse XML file and return preview
   */
  static async parseXMLPreview(filePath: string, limit: number = 100): Promise<any[]> {
    const content = fs.readFileSync(filePath, 'utf8');
    const parser = new xml2js.Parser({ explicitArray: false });
    const result = await parser.parseStringPromise(content);
    
    // Try to find the records array in common locations
    const records = result.records || result.data || result.root?.records || 
                   result.root?.data || result.items || [];
    
    if (Array.isArray(records)) {
      return records.slice(0, limit);
    } else if (records && typeof records === 'object') {
      return [records];
    }
    
    return [];
  }

  /**
   * Parse SQL file and extract INSERT statements
   */
  static async parseSQLPreview(filePath: string, limit: number = 100): Promise<any[]> {
    const content = fs.readFileSync(filePath, 'utf8');
    const records: any[] = [];
    
    // Match INSERT INTO statements for allowed tables
    const insertRegex = /INSERT\s+INTO\s+(?:`?(?:baptism|marriage|funeral)_records`?)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/gi;
    let match;
    let count = 0;
    
    while ((match = insertRegex.exec(content)) !== null && count < limit) {
      const columns = match[1].split(',').map(c => c.trim().replace(/`/g, ''));
      const values = match[2].split(',').map(v => v.trim().replace(/^['"]|['"]$/g, ''));
      
      const record: any = {};
      columns.forEach((col, idx) => {
        record[col] = values[idx] === 'NULL' ? null : values[idx];
      });
      
      records.push(record);
      count++;
    }
    
    return records;
  }

  /**
   * Compute source hash for deduplication
   */
  static computeSourceHash(type: RecordType, record: any): string {
    let hashData = '';
    
    switch (type) {
      case 'baptisms':
        hashData = `${record.first_name || ''}|${record.last_name || ''}|${record.baptism_date || ''}|${record.certificate_no || ''}|${record.book_no || ''}|${record.page_no || ''}|${record.entry_no || ''}`;
        break;
      case 'marriages':
        hashData = `${record.groom_first || ''}|${record.groom_last || ''}|${record.bride_first || ''}|${record.bride_last || ''}|${record.marriage_date || ''}|${record.certificate_no || ''}|${record.book_no || ''}|${record.page_no || ''}|${record.entry_no || ''}`;
        break;
      case 'funerals':
        hashData = `${record.first_name || ''}|${record.last_name || ''}|${record.funeral_date || record.death_date || ''}|${record.certificate_no || ''}|${record.book_no || ''}|${record.page_no || ''}|${record.entry_no || ''}`;
        break;
    }
    
    return crypto.createHash('sha1').update(hashData).digest('hex');
  }

  /**
   * Map fields from source to canonical schema
   */
  static mapFields(sourceRecord: any, mapping: FieldMapping): any {
    const mappedRecord: any = {};
    
    Object.entries(mapping).forEach(([sourceField, targetField]) => {
      if (sourceRecord[sourceField] !== undefined) {
        mappedRecord[targetField] = sourceRecord[sourceField];
      }
    });
    
    return mappedRecord;
  }

  /**
   * Import records into database
   */
  static async importRecords(
    jobId: number,
    churchId: number,
    type: RecordType,
    records: any[],
    mapping?: FieldMapping
  ): Promise<void> {
    const pool = await getAppPool();
    const tableName = `${type.slice(0, -1)}_records`; // Remove 's' from type
    
    let processed = 0;
    let inserted = 0;
    let updated = 0;
    let skipped = 0;
    let errors = 0;
    
    await this.updateJob(jobId, { 
      status: 'running', 
      started_at: new Date(),
      total_rows: records.length 
    });
    
    for (const sourceRecord of records) {
      try {
        // Apply field mapping if provided
        const record = mapping ? this.mapFields(sourceRecord, mapping) : sourceRecord;
        
        // Add church_id and compute source hash
        record.church_id = churchId;
        record.source_hash = this.computeSourceHash(type, record);
        
        // Prepare fields for insert/update
        const fields = Object.keys(record).filter(k => k !== 'id');
        const values = fields.map(f => record[f]);
        const placeholders = fields.map(() => '?').join(', ');
        const updateFields = fields.filter(f => f !== 'church_id' && f !== 'source_hash')
          .map(f => `${f} = VALUES(${f})`).join(', ');
        
        // Upsert query
        const query = `
          INSERT INTO ${tableName} (${fields.join(', ')}) 
          VALUES (${placeholders})
          ON DUPLICATE KEY UPDATE 
            ${updateFields},
            updated_at = NOW()
        `;
        
        const [result] = await pool.execute(query, values);
        
        if ((result as any).affectedRows === 1) {
          inserted++;
        } else if ((result as any).affectedRows === 2) {
          updated++;
        } else {
          skipped++;
        }
        
        processed++;
        
        // Update progress every 10 records
        if (processed % 10 === 0) {
          await this.updateJob(jobId, { 
            processed_rows: processed,
            inserted_rows: inserted,
            updated_rows: updated,
            skipped_rows: skipped,
            error_rows: errors
          });
        }
        
      } catch (error) {
        errors++;
        console.error(`Error importing record:`, error);
      }
    }
    
    // Final update
    await this.updateJob(jobId, {
      status: 'done',
      finished_at: new Date(),
      processed_rows: processed,
      inserted_rows: inserted,
      updated_rows: updated,
      skipped_rows: skipped,
      error_rows: errors
    });
  }

  /**
   * Get import job details
   */
  static async getJob(jobId: number): Promise<ImportJob | null> {
    const pool = await getAppPool();
    const [rows] = await pool.execute(
      'SELECT * FROM import_jobs WHERE id = ?',
      [jobId]
    ) as [RowDataPacket[], any];
    
    return rows.length > 0 ? rows[0] as ImportJob : null;
  }

  /**
   * Get recent import jobs for a church
   */
  static async getRecentJobs(churchId: number, limit: number = 10): Promise<ImportJob[]> {
    const pool = await getAppPool();
    const [rows] = await pool.execute(
      'SELECT * FROM import_jobs WHERE church_id = ? ORDER BY created_at DESC LIMIT ?',
      [churchId, limit]
    ) as [RowDataPacket[], any];
    
    return rows as ImportJob[];
  }
}
