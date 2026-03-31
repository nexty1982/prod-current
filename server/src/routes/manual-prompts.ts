/**
 * Manual Prompts API — CRUD for pasted prompt documents with parsed metadata.
 *
 * Endpoints:
 *   POST   /api/manual-prompts          — Create (parse + save)
 *   GET    /api/manual-prompts          — List (search, filter, paginate)
 *   GET    /api/manual-prompts/:id      — Single prompt detail
 *   PUT    /api/manual-prompts/:id      — Update metadata or body
 *   GET    /api/manual-prompts/families — Prompt ID family groupings
 */

import { Router, Request, Response } from 'express';
const router = Router();
const { requireAuth } = require('../middleware/auth');
const { getAppPool } = require('../config/db');

// ─── Header field patterns ───────────────────────────────

const HEADER_PATTERNS: Record<string, RegExp> = {
  prompt_id:     /^Prompt\s*ID\s*:\s*(.+)/i,
  work_item_id:  /^Work\s*Item\s*ID\s*:\s*(.+)/i,
  change_set_id: /^Change\s*Set\s*ID\s*:\s*(.+)/i,
  branch_name:   /^Branch\s*(?:Name|Rule\s*\/\s*Discipline)\s*:\s*(.+)/i,
  prompt_scope:  /^Prompt\s*Scope\s*:\s*(.+)/i,
  parent_prompt: /^Parent\s*Prompt\s*:\s*(.+)/i,
  depends_on:    /^Depends\s*On\s*:\s*(.+)/i,
};

interface ParsedMeta {
  prompt_id: string | null;
  work_item_id: string | null;
  change_set_id: string | null;
  branch_name: string | null;
  prompt_scope: string | null;
  parent_prompt: string | null;
  depends_on: string | null;
}

function parsePromptText(raw: string): ParsedMeta {
  const meta: ParsedMeta = {
    prompt_id: null,
    work_item_id: null,
    change_set_id: null,
    branch_name: null,
    prompt_scope: null,
    parent_prompt: null,
    depends_on: null,
  };

  const lines = raw.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    for (const [field, pattern] of Object.entries(HEADER_PATTERNS)) {
      const match = trimmed.match(pattern);
      if (match) {
        let value = match[1].trim();
        // Treat "None", "N/A", empty as null
        if (/^(none|n\/a|null|—|-|)$/i.test(value)) value = '';
        if (value) {
          (meta as any)[field] = value;
        }
        break;
      }
    }
  }

  return meta;
}

/** Extract the base family prefix from a prompt ID for grouping.
 *  e.g. "PROMPT-MANUAL-PROMPT-CREATOR-001" → "PROMPT-MANUAL-PROMPT-CREATOR"
 */
function promptFamily(promptId: string): string | null {
  if (!promptId) return null;
  // Strip trailing numeric segment (e.g. -001, -02, -1)
  const match = promptId.match(/^(.+?)-(\d+)$/);
  return match ? match[1] : null;
}

// ─── Parse (preview only, no save) ───────────────────────

router.post('/parse', requireAuth, async (req: Request, res: Response) => {
  try {
    const { raw_body } = req.body;
    if (!raw_body || typeof raw_body !== 'string' || !raw_body.trim()) {
      return res.status(400).json({ error: 'raw_body is required' });
    }
    const meta = parsePromptText(raw_body);
    const family = meta.prompt_id ? promptFamily(meta.prompt_id) : null;
    return res.json({ parsed: meta, family, char_count: raw_body.length, line_count: raw_body.split('\n').length });
  } catch (err: any) {
    console.error('manual-prompts parse error:', err);
    return res.status(500).json({ error: 'Parse failed' });
  }
});

// ─── Create ──────────────────────────────────────────────

router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const { raw_body, meta_overrides } = req.body;
    if (!raw_body || typeof raw_body !== 'string' || !raw_body.trim()) {
      return res.status(400).json({ error: 'raw_body is required' });
    }

    const pool = getAppPool();
    const parsed = parsePromptText(raw_body);

    // Allow manual overrides to take precedence over parsed values
    const meta = { ...parsed, ...(meta_overrides || {}) };

    // Duplicate check: exact same prompt_id + raw_body
    if (meta.prompt_id) {
      const [existing] = await pool.query(
        'SELECT id, raw_body, revision FROM manual_prompts WHERE prompt_id = ? ORDER BY revision DESC LIMIT 1',
        [meta.prompt_id]
      );
      if (existing.length > 0) {
        if (existing[0].raw_body === raw_body) {
          return res.status(409).json({
            error: 'duplicate',
            message: 'This exact prompt already exists',
            existing_id: existing[0].id,
          });
        }
        // Same prompt_id but different body → new revision
        meta.prompt_id = meta.prompt_id; // keep same ID
        const newRevision = existing[0].revision + 1;
        const [result] = await pool.query(
          `INSERT INTO manual_prompts
           (prompt_id, work_item_id, change_set_id, branch_name, prompt_scope, parent_prompt, depends_on, raw_body, source, revision, created_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pasted', ?, ?)`,
          [meta.prompt_id, meta.work_item_id, meta.change_set_id, meta.branch_name, meta.prompt_scope,
           meta.parent_prompt, meta.depends_on, raw_body, newRevision, (req as any).session?.userId || null]
        );
        const [rows] = await pool.query('SELECT * FROM manual_prompts WHERE id = ?', [result.insertId]);
        return res.status(201).json({ prompt: rows[0], is_revision: true, revision: newRevision });
      }
    }

    const [result] = await pool.query(
      `INSERT INTO manual_prompts
       (prompt_id, work_item_id, change_set_id, branch_name, prompt_scope, parent_prompt, depends_on, raw_body, source, revision, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pasted', 1, ?)`,
      [meta.prompt_id, meta.work_item_id, meta.change_set_id, meta.branch_name, meta.prompt_scope,
       meta.parent_prompt, meta.depends_on, raw_body, (req as any).session?.userId || null]
    );

    const [rows] = await pool.query('SELECT * FROM manual_prompts WHERE id = ?', [result.insertId]);
    return res.status(201).json({ prompt: rows[0], is_revision: false });
  } catch (err: any) {
    console.error('manual-prompts create error:', err);
    return res.status(500).json({ error: 'Failed to save prompt' });
  }
});

// ─── List ────────────────────────────────────────────────

router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const pool = getAppPool();
    const { search, parent, limit: rawLimit, offset: rawOffset } = req.query;
    const limit = Math.min(parseInt(rawLimit as string) || 50, 200);
    const offset = parseInt(rawOffset as string) || 0;

    let where = '1=1';
    const params: any[] = [];

    if (search && typeof search === 'string' && search.trim()) {
      where += ' AND (prompt_id LIKE ? OR prompt_scope LIKE ? OR work_item_id LIKE ?)';
      const s = `%${search.trim()}%`;
      params.push(s, s, s);
    }
    if (parent && typeof parent === 'string') {
      where += ' AND parent_prompt = ?';
      params.push(parent);
    }

    const [countRows] = await pool.query(`SELECT COUNT(*) as total FROM manual_prompts WHERE ${where}`, params);
    const total = countRows[0].total;

    const [rows] = await pool.query(
      `SELECT id, prompt_id, work_item_id, change_set_id, branch_name, prompt_scope,
              parent_prompt, depends_on, source, revision, created_at, updated_at,
              LENGTH(raw_body) as body_length
       FROM manual_prompts WHERE ${where}
       ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return res.json({ prompts: rows, total, limit, offset });
  } catch (err: any) {
    console.error('manual-prompts list error:', err);
    return res.status(500).json({ error: 'Failed to list prompts' });
  }
});

// ─── Families (group by prompt_id prefix) ────────────────

router.get('/families', requireAuth, async (req: Request, res: Response) => {
  try {
    const pool = getAppPool();
    const [rows] = await pool.query(
      `SELECT prompt_id, prompt_scope, revision, created_at
       FROM manual_prompts
       WHERE prompt_id IS NOT NULL
       ORDER BY prompt_id, revision`
    );

    // Group by family prefix
    const families: Record<string, any[]> = {};
    for (const row of rows as any[]) {
      const family = promptFamily(row.prompt_id) || row.prompt_id;
      if (!families[family]) families[family] = [];
      families[family].push(row);
    }

    return res.json({ families });
  } catch (err: any) {
    console.error('manual-prompts families error:', err);
    return res.status(500).json({ error: 'Failed to list families' });
  }
});

// ─── Detail ──────────────────────────────────────────────

router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const pool = getAppPool();
    const [rows] = await pool.query('SELECT * FROM manual_prompts WHERE id = ?', [req.params.id]);
    if (!rows || (rows as any[]).length === 0) {
      return res.status(404).json({ error: 'Not found' });
    }

    const prompt = (rows as any[])[0];

    // Find related prompts (same family or parent/child)
    const related: any[] = [];
    if (prompt.prompt_id) {
      const family = promptFamily(prompt.prompt_id);
      if (family) {
        const [familyRows] = await pool.query(
          `SELECT id, prompt_id, prompt_scope, revision, created_at
           FROM manual_prompts WHERE prompt_id LIKE ? AND id != ?
           ORDER BY revision`,
          [`${family}%`, prompt.id]
        );
        related.push(...(familyRows as any[]).map((r: any) => ({ ...r, relation: 'family' })));
      }
    }
    if (prompt.parent_prompt) {
      const [parentRows] = await pool.query(
        `SELECT id, prompt_id, prompt_scope, revision, created_at
         FROM manual_prompts WHERE prompt_id = ?`,
        [prompt.parent_prompt]
      );
      related.push(...(parentRows as any[]).map((r: any) => ({ ...r, relation: 'parent' })));
    }
    // Find children
    if (prompt.prompt_id) {
      const [childRows] = await pool.query(
        `SELECT id, prompt_id, prompt_scope, revision, created_at
         FROM manual_prompts WHERE parent_prompt = ?`,
        [prompt.prompt_id]
      );
      related.push(...(childRows as any[]).map((r: any) => ({ ...r, relation: 'child' })));
    }

    return res.json({ prompt, related });
  } catch (err: any) {
    console.error('manual-prompts detail error:', err);
    return res.status(500).json({ error: 'Failed to get prompt' });
  }
});

// ─── Update ──────────────────────────────────────────────

router.put('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const pool = getAppPool();
    const { prompt_id, work_item_id, change_set_id, branch_name, prompt_scope, parent_prompt, depends_on } = req.body;

    const fields: string[] = [];
    const values: any[] = [];

    if (prompt_id !== undefined)    { fields.push('prompt_id = ?');     values.push(prompt_id || null); }
    if (work_item_id !== undefined) { fields.push('work_item_id = ?');  values.push(work_item_id || null); }
    if (change_set_id !== undefined){ fields.push('change_set_id = ?'); values.push(change_set_id || null); }
    if (branch_name !== undefined)  { fields.push('branch_name = ?');   values.push(branch_name || null); }
    if (prompt_scope !== undefined) { fields.push('prompt_scope = ?');   values.push(prompt_scope || null); }
    if (parent_prompt !== undefined){ fields.push('parent_prompt = ?');  values.push(parent_prompt || null); }
    if (depends_on !== undefined)   { fields.push('depends_on = ?');    values.push(depends_on || null); }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(req.params.id);
    await pool.query(`UPDATE manual_prompts SET ${fields.join(', ')} WHERE id = ?`, values);
    const [rows] = await pool.query('SELECT * FROM manual_prompts WHERE id = ?', [req.params.id]);
    return res.json({ prompt: (rows as any[])[0] });
  } catch (err: any) {
    console.error('manual-prompts update error:', err);
    return res.status(500).json({ error: 'Failed to update prompt' });
  }
});

export default router;
