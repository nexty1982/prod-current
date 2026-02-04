/**
 * Browse API Routes for Sacrament Records
 */

import { Router, Request, Response } from 'express';
import { getAppPool } from '../../config/db';
import { RowDataPacket } from 'mysql2';

const router = Router();

/**
 * GET /api/records/:type
 * Get paginated list of records with filters
 */
router.get('/api/records/:type', async (req: any, res: Response) => {
  try {
    const { type } = req.params;
    const { 
      q, // search query
      dateFrom,
      dateTo,
      certificate,
      book,
      page,
      entry,
      limit = 50,
      offset = 0,
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = req.query;

    // Validate type
    if (!['baptisms', 'marriages', 'funerals'].includes(type)) {
      return res.status(400).json({ error: 'Invalid record type' });
    }

    const churchId = req.tenantId || req.user?.church_id;
    if (!churchId) {
      return res.status(403).json({ error: 'Church context required' });
    }

    const tableName = `${type.slice(0, -1)}_records`;
    const pool = await getAppPool();
    
    // Build WHERE conditions
    const conditions: string[] = ['church_id = ?'];
    const params: any[] = [churchId];

    // Search query
    if (q) {
      if (type === 'marriages') {
        conditions.push('(groom_first_name LIKE ? OR groom_last_name LIKE ? OR bride_first_name LIKE ? OR bride_last_name LIKE ?)');
        params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
      } else {
        conditions.push('(first_name LIKE ? OR last_name LIKE ?)');
        params.push(`%${q}%`, `%${q}%`);
      }
    }

    // Date range
    const dateField = type === 'baptisms' ? 'baptism_date' : 
                     type === 'marriages' ? 'marriage_date' : 
                     'funeral_date';
    
    if (dateFrom) {
      conditions.push(`${dateField} >= ?`);
      params.push(dateFrom);
    }
    if (dateTo) {
      conditions.push(`${dateField} <= ?`);
      params.push(dateTo);
    }

    // Certificate, book, page, entry
    if (certificate) {
      conditions.push('certificate_no = ?');
      params.push(certificate);
    }
    if (book) {
      conditions.push('book_no = ?');
      params.push(book);
    }
    if (page) {
      conditions.push('page_no = ?');
      params.push(page);
    }
    if (entry) {
      conditions.push('entry_no = ?');
      params.push(entry);
    }

    const whereClause = conditions.join(' AND ');

    // Get total count
    const [countResult] = await pool.execute(
      `SELECT COUNT(*) as total FROM ${tableName} WHERE ${whereClause}`,
      params
    ) as [RowDataPacket[], any];
    const total = countResult[0].total;

    // Get records
    const validSortColumns = ['created_at', 'updated_at', dateField, 'first_name', 'last_name'];
    const sortColumn = validSortColumns.includes(String(sortBy)) ? sortBy : 'created_at';
    const order = sortOrder === 'ASC' ? 'ASC' : 'DESC';

    const [records] = await pool.execute(
      `SELECT * FROM ${tableName} 
       WHERE ${whereClause}
       ORDER BY ${sortColumn} ${order}
       LIMIT ? OFFSET ?`,
      [...params, parseInt(String(limit)), parseInt(String(offset))]
    ) as [RowDataPacket[], any];

    res.json({
      success: true,
      type,
      records,
      total,
      limit: parseInt(String(limit)),
      offset: parseInt(String(offset))
    });

  } catch (error: any) {
    console.error('Browse error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch records' });
  }
});

/**
 * GET /api/records/:type/:id
 * Get single record details
 */
router.get('/api/records/:type/:id', async (req: any, res: Response) => {
  try {
    const { type, id } = req.params;

    // Validate type
    if (!['baptisms', 'marriages', 'funerals'].includes(type)) {
      return res.status(400).json({ error: 'Invalid record type' });
    }

    const churchId = req.tenantId || req.user?.church_id;
    if (!churchId) {
      return res.status(403).json({ error: 'Church context required' });
    }

    const tableName = `${type.slice(0, -1)}_records`;
    const pool = await getAppPool();

    const [records] = await pool.execute(
      `SELECT * FROM ${tableName} WHERE id = ? AND church_id = ?`,
      [id, churchId]
    ) as [RowDataPacket[], any];

    if (records.length === 0) {
      return res.status(404).json({ error: 'Record not found' });
    }

    res.json({
      success: true,
      type,
      record: records[0]
    });

  } catch (error: any) {
    console.error('Get record error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch record' });
  }
});

export default router;
