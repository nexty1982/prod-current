/**
 * Repository layer for OCR Extractor data access
 * Uses main DB (orthodoxmetrics_db) pool
 */

import mysql from 'mysql2/promise';
import type {
  OcrExtractor,
  OcrExtractorField,
  OcrExtractorWithFields,
  CreateExtractorInput,
  CreateFieldInput,
  UpdateExtractorInput
} from './types.js';

// Get main DB pool
function getPool(): mysql.Pool {
  const { getAppPool } = require('../../config/db-compat');
  return getAppPool();
}

function mapExtractor(row: any): OcrExtractor {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    record_type: row.record_type,
    page_mode: row.page_mode,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

function mapField(row: any): OcrExtractorField {
  return {
    id: row.id,
    extractor_id: row.extractor_id,
    parent_field_id: row.parent_field_id,
    name: row.name,
    key: row.key,
    field_type: row.field_type,
    multiple: Boolean(row.multiple),
    instructions: row.instructions,
    sort_order: row.sort_order,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

export class ExtractorRepo {
  async list(): Promise<OcrExtractor[]> {
    const pool = getPool();
    const [rows] = await pool.query('SELECT * FROM ocr_extractors ORDER BY created_at DESC');
    return (rows as any[]).map(mapExtractor);
  }

  async getById(id: number): Promise<OcrExtractor | null> {
    const pool = getPool();
    const [rows] = await pool.query('SELECT * FROM ocr_extractors WHERE id = ?', [id]);
    if ((rows as any[]).length === 0) return null;
    return mapExtractor((rows as any[])[0]);
  }

  async create(input: CreateExtractorInput): Promise<OcrExtractor> {
    const pool = getPool();
    const conn = await pool.getConnection();
    
    try {
      await conn.beginTransaction();

      // Insert extractor
      const [result] = await conn.execute(
        'INSERT INTO ocr_extractors (name, description, record_type, page_mode) VALUES (?, ?, ?, ?)',
        [input.name, input.description || null, input.record_type || 'custom', input.page_mode || 'single']
      );
      const extractorId = (result as any).insertId;

      // Insert fields if provided
      if (input.fields && input.fields.length > 0) {
        await this.insertFieldsRecursive(conn, extractorId, input.fields, null);
      }

      await conn.commit();

      // Fetch and return created extractor
      const extractor = await this.getById(extractorId);
      if (!extractor) throw new Error('Failed to fetch created extractor');
      return extractor;
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }

  async update(id: number, input: UpdateExtractorInput): Promise<OcrExtractor | null> {
    const pool = getPool();
    const conn = await pool.getConnection();

    try {
      await conn.beginTransaction();

      // Update extractor if fields provided
      const updates: string[] = [];
      const params: any[] = [];

      if (input.name !== undefined) {
        updates.push('name = ?');
        params.push(input.name);
      }
      if (input.description !== undefined) {
        updates.push('description = ?');
        params.push(input.description);
      }
      if (input.record_type !== undefined) {
        updates.push('record_type = ?');
        params.push(input.record_type);
      }
      if (input.page_mode !== undefined) {
        updates.push('page_mode = ?');
        params.push(input.page_mode);
      }

      if (updates.length > 0) {
        params.push(id);
        await conn.execute(
          `UPDATE ocr_extractors SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          params
        );
      }

      // Update fields if provided (delete all and recreate)
      if (input.fields !== undefined) {
        await conn.execute('DELETE FROM ocr_extractor_fields WHERE extractor_id = ?', [id]);
        if (input.fields.length > 0) {
          await this.insertFieldsRecursive(conn, id, input.fields, null);
        }
      }

      await conn.commit();

      return await this.getById(id);
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }

  async delete(id: number): Promise<boolean> {
    const pool = getPool();
    const [result] = await pool.query('DELETE FROM ocr_extractors WHERE id = ?', [id]);
    return (result as any).affectedRows > 0;
  }

  async getFieldsByExtractorId(extractorId: number): Promise<OcrExtractorField[]> {
    const pool = getPool();
    const [rows] = await pool.query(
      'SELECT * FROM ocr_extractor_fields WHERE extractor_id = ? ORDER BY parent_field_id ASC, sort_order ASC',
      [extractorId]
    );
    return (rows as any[]).map(mapField);
  }

  async getWithFields(id: number): Promise<OcrExtractorWithFields | null> {
    const extractor = await this.getById(id);
    if (!extractor) return null;

    const fields = await this.getFieldsByExtractorId(id);
    return { ...extractor, fields };
  }

  private async insertFieldsRecursive(
    conn: mysql.PoolConnection,
    extractorId: number,
    fields: CreateFieldInput[],
    parentId: number | null
  ): Promise<void> {
    for (let i = 0; i < fields.length; i++) {
      const field = fields[i];
      const [result] = await conn.execute(
        `INSERT INTO ocr_extractor_fields 
         (extractor_id, parent_field_id, name, \`key\`, field_type, multiple, instructions, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          extractorId,
          parentId,
          field.name,
          field.key,
          field.field_type,
          field.multiple ? 1 : 0,
          field.instructions || null,
          field.sort_order ?? i
        ]
      );
      const fieldId = (result as any).insertId;

      // Insert children recursively
      if (field.children && field.children.length > 0) {
        await this.insertFieldsRecursive(conn, extractorId, field.children, fieldId);
      }
    }
  }
}

