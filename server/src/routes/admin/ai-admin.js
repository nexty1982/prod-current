// server/routes/admin/ai-admin.js — AI Admin Panel API (commands + training responses)
const express = require('express');
const router = express.Router();
const { promisePool } = require('../../config/db');
const { requireAuth, requireRole } = require('../../middleware/auth');

const requireAdmin = requireRole(['admin', 'super_admin']);

function ok(data) { return { success: true, data }; }
function fail(error) { return { success: false, error }; }

// ═══════════════════════════════════════════════════════════════════════════════
// COMMAND BUILDER — CRUD for omai_commands
// ═══════════════════════════════════════════════════════════════════════════════

// GET /commands — list all commands
router.get('/commands', requireAuth, requireAdmin, async (req, res) => {
    try {
        const [rows] = await promisePool.query(
            'SELECT * FROM omai_commands ORDER BY category, command_key'
        );
        // Parse JSON fields
        const commands = rows.map(r => ({
            ...r,
            patterns: tryParse(r.patterns),
            requires_parameters: tryParse(r.requires_parameters),
            allowed_roles: tryParse(r.allowed_roles),
        }));
        res.json(ok({ commands }));
    } catch (err) {
        console.error('❌ ai-admin commands list:', err);
        res.status(500).json(fail(err.message));
    }
});

// POST /commands — create command
router.post('/commands', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { command_key, category, patterns, description, action, safety, context_aware,
                requires_hands_on, requires_confirmation, requires_parameters, allowed_roles } = req.body;
        if (!command_key || !category || !action) {
            return res.status(400).json(fail('command_key, category, and action are required'));
        }
        const [result] = await promisePool.query(
            `INSERT INTO omai_commands (command_key, category, patterns, description, action, safety,
             context_aware, requires_hands_on, requires_confirmation, requires_parameters, allowed_roles)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [command_key, category, JSON.stringify(patterns || []), description || null,
             action, safety || 'safe', context_aware ? 1 : 0, requires_hands_on ? 1 : 0,
             requires_confirmation ? 1 : 0, JSON.stringify(requires_parameters || null),
             JSON.stringify(allowed_roles || null)]
        );
        res.json(ok({ id: result.insertId, command_key }));
    } catch (err) {
        console.error('❌ ai-admin create command:', err);
        res.status(500).json(fail(err.message));
    }
});

// PUT /commands/:id — update command
router.put('/commands/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { command_key, category, patterns, description, action, safety, context_aware,
                requires_hands_on, requires_confirmation, requires_parameters, allowed_roles, is_active } = req.body;
        await promisePool.query(
            `UPDATE omai_commands SET command_key=?, category=?, patterns=?, description=?, action=?,
             safety=?, context_aware=?, requires_hands_on=?, requires_confirmation=?,
             requires_parameters=?, allowed_roles=?, is_active=? WHERE id=?`,
            [command_key, category, JSON.stringify(patterns || []), description || null,
             action, safety || 'safe', context_aware ? 1 : 0, requires_hands_on ? 1 : 0,
             requires_confirmation ? 1 : 0, JSON.stringify(requires_parameters || null),
             JSON.stringify(allowed_roles || null), is_active !== false ? 1 : 0, id]
        );
        res.json(ok({ id: parseInt(id) }));
    } catch (err) {
        console.error('❌ ai-admin update command:', err);
        res.status(500).json(fail(err.message));
    }
});

// DELETE /commands/:id — delete command
router.delete('/commands/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
        await promisePool.query('DELETE FROM omai_commands WHERE id = ?', [req.params.id]);
        res.json(ok({ deleted: true }));
    } catch (err) {
        console.error('❌ ai-admin delete command:', err);
        res.status(500).json(fail(err.message));
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// TRAINING RESPONSES — CRUD for omai_training_responses
// ═══════════════════════════════════════════════════════════════════════════════

// GET /training — list all training responses
router.get('/training', requireAuth, requireAdmin, async (req, res) => {
    try {
        const [rows] = await promisePool.query(
            'SELECT * FROM omai_training_responses ORDER BY category, id'
        );
        const responses = rows.map(r => ({
            ...r,
            variables: tryParse(r.variables),
        }));
        res.json(ok({ responses }));
    } catch (err) {
        console.error('❌ ai-admin training list:', err);
        res.status(500).json(fail(err.message));
    }
});

// POST /training — create training response
router.post('/training', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { question_pattern, variables, response_template, category, is_public } = req.body;
        if (!question_pattern || !response_template) {
            return res.status(400).json(fail('question_pattern and response_template are required'));
        }
        const [result] = await promisePool.query(
            `INSERT INTO omai_training_responses (question_pattern, variables, response_template, category, is_public)
             VALUES (?, ?, ?, ?, ?)`,
            [question_pattern, JSON.stringify(variables || null), response_template,
             category || 'general', is_public !== false ? 1 : 0]
        );
        res.json(ok({ id: result.insertId }));
    } catch (err) {
        console.error('❌ ai-admin create training:', err);
        res.status(500).json(fail(err.message));
    }
});

// PUT /training/:id — update training response
router.put('/training/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { question_pattern, variables, response_template, category, is_public, is_active } = req.body;
        await promisePool.query(
            `UPDATE omai_training_responses SET question_pattern=?, variables=?, response_template=?,
             category=?, is_public=?, is_active=? WHERE id=?`,
            [question_pattern, JSON.stringify(variables || null), response_template,
             category || 'general', is_public !== false ? 1 : 0, is_active !== false ? 1 : 0, id]
        );
        res.json(ok({ id: parseInt(id) }));
    } catch (err) {
        console.error('❌ ai-admin update training:', err);
        res.status(500).json(fail(err.message));
    }
});

// DELETE /training/:id — delete training response
router.delete('/training/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
        await promisePool.query('DELETE FROM omai_training_responses WHERE id = ?', [req.params.id]);
        res.json(ok({ deleted: true }));
    } catch (err) {
        console.error('❌ ai-admin delete training:', err);
        res.status(500).json(fail(err.message));
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// PUBLIC — get matching training response (no auth needed for public pages)
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/training/match', async (req, res) => {
    try {
        const { q } = req.query;
        if (!q) return res.status(400).json(fail('q parameter required'));
        const [rows] = await promisePool.query(
            'SELECT * FROM omai_training_responses WHERE is_active = 1 AND is_public = 1'
        );
        // Simple keyword matching — find best match
        const query = q.toLowerCase();
        let bestMatch = null;
        let bestScore = 0;
        for (const row of rows) {
            const pattern = row.question_pattern.toLowerCase().replace(/\{[^}]+\}/g, '');
            const words = pattern.split(/\s+/).filter(w => w.length > 2);
            const score = words.filter(w => query.includes(w)).length / words.length;
            if (score > bestScore) { bestScore = score; bestMatch = row; }
        }
        if (bestMatch && bestScore > 0.3) {
            // Extract variable values from the query
            const vars = tryParse(bestMatch.variables) || [];
            let response = bestMatch.response_template;
            for (const v of vars) {
                const numMatch = q.match(/\d[\d,]*/);
                if (numMatch) {
                    response = response.replace(new RegExp(`\\{${v.name}\\}`, 'g'), numMatch[0]);
                }
            }
            res.json(ok({ matched: true, response, question: bestMatch.question_pattern, category: bestMatch.category }));
        } else {
            res.json(ok({ matched: false }));
        }
    } catch (err) {
        console.error('❌ ai-admin training match:', err);
        res.status(500).json(fail(err.message));
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// CATEGORIES — get distinct categories for dropdowns
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/categories', requireAuth, requireAdmin, async (req, res) => {
    try {
        const [cmdCats] = await promisePool.query('SELECT DISTINCT category FROM omai_commands ORDER BY category');
        const [trCats] = await promisePool.query('SELECT DISTINCT category FROM omai_training_responses ORDER BY category');
        res.json(ok({
            commandCategories: cmdCats.map(r => r.category),
            trainingCategories: trCats.map(r => r.category),
        }));
    } catch (err) {
        res.status(500).json(fail(err.message));
    }
});

function tryParse(val) {
    if (!val) return null;
    if (typeof val === 'object') return val;
    try { return JSON.parse(val); } catch { return val; }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EMAIL SUBMISSIONS — History for a church
// ═══════════════════════════════════════════════════════════════════════════════

// GET /email-submissions/:churchId — recent email submissions for a church
router.get('/email-submissions/:churchId', requireAuth, requireAdmin, async (req, res) => {
    try {
        const churchId = parseInt(req.params.churchId);
        if (!churchId || isNaN(churchId)) {
            return res.status(400).json(fail('Invalid church ID'));
        }

        const [rows] = await promisePool.query(`
            SELECT es.id, es.church_id, es.sender_email, es.user_id, es.subject,
                   es.record_type, es.status, es.rejection_reason,
                   es.created_record_id, es.processing_time_ms,
                   es.created_at, es.updated_at,
                   u.first_name as sender_first_name,
                   u.last_name as sender_last_name
            FROM email_submissions es
            LEFT JOIN orthodoxmetrics_db.users u ON es.user_id = u.id
            WHERE es.church_id = ?
            ORDER BY es.created_at DESC
            LIMIT 50
        `, [churchId]);

        res.json(ok({ submissions: rows, total: rows.length }));
    } catch (err) {
        console.error('❌ ai-admin email-submissions:', err);
        res.status(500).json(fail(err.message));
    }
});

module.exports = router;
