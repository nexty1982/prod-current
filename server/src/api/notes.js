const { getAppPool } = require('../../config/db-compat');
// Notes API Routes for Orthodox Metrics
const express = require('express');
const { promisePool } = require('../../config/db-compat');
const router = express.Router();

// Middleware to check if user is authenticated
const requireAuth = (req, res, next) => {
    if (!req.session.user) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required'
        });
    }
    next();
};

// GET /api/notes - Get all notes for the current user
router.get('/', requireAuth, async (req, res) => {
    try {
        const userId = req.session.user.id;
        const { category, search, archived, pinned } = req.query;

        let query = `
            SELECT 
                n.id,
                n.title,
                n.content,
                n.category,
                n.tags,
                n.color,
                n.is_pinned,
                n.is_archived,
                n.is_shared,
                n.created_at,
                n.updated_at,
                CONCAT(u.first_name, ' ', u.last_name) as created_by_name
            FROM notes n
            JOIN orthodoxmetrics_db.users u ON n.created_by = u.id
            WHERE (n.created_by = ? OR n.id IN (
                SELECT note_id FROM note_shares WHERE shared_with_user_id = ?
            ))
        `;

        const params = [userId, userId];

        // Add filters
        if (category && category !== 'all') {
            query += ` AND n.category = ?`;
            params.push(category);
        }

        if (archived === 'true') {
            query += ` AND n.is_archived = TRUE`;
        } else if (archived === 'false') {
            query += ` AND n.is_archived = FALSE`;
        }

        if (pinned === 'true') {
            query += ` AND n.is_pinned = TRUE`;
        }

        if (search) {
            query += ` AND (n.title LIKE ? OR n.content LIKE ?)`;
            params.push(`%${search}%`, `%${search}%`);
        }

        query += ` ORDER BY n.is_pinned DESC, n.updated_at DESC`;

        const [notes] = await getAppPool().query(query, params);

        // Parse JSON tags and format dates
        const formattedNotes = notes.map(note => ({
            ...note,
            tags: note.tags ? JSON.parse(note.tags) : [],
            is_owner: note.created_by === userId,
            created_at: note.created_at ? new Date(note.created_at).toISOString() : null,
            updated_at: note.updated_at ? new Date(note.updated_at).toISOString() : null,
        }));

        res.json({
            success: true,
            notes: formattedNotes
        });
    } catch (err) {
        console.error('Error fetching notes:', err);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching notes'
        });
    }
});

// GET /api/notes/categories - Get all note categories
router.get('/categories', requireAuth, async (req, res) => {
    try {
        const [categories] = await getAppPool().query(
            'SELECT * FROM note_categories ORDER BY name'
        );

        res.json({
            success: true,
            categories
        });
    } catch (err) {
        console.error('Error fetching categories:', err);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching categories'
        });
    }
});

// POST /api/notes - Create a new note
router.post('/', requireAuth, async (req, res) => {
    try {
        const { title, content, category, tags, color, is_pinned } = req.body;
        const userId = req.session.user.id;

        // Validation
        if (!title || !content) {
            return res.status(400).json({
                success: false,
                message: 'Title and content are required'
            });
        }

        const [result] = await getAppPool().query(
            `INSERT INTO notes (title, content, category, tags, color, is_pinned, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                title,
                content,
                category || 'General',
                tags ? JSON.stringify(tags) : null,
                color || '#ffffff',
                is_pinned || false,
                userId
            ]
        );

        // Fetch the created note
        const [newNote] = await getAppPool().query(
            `SELECT n.*, CONCAT(u.first_name, ' ', u.last_name) as created_by_name 
             FROM notes n
             JOIN orthodoxmetrics_db.users u ON n.created_by = u.id 
             WHERE n.id = ?`,
            [result.insertId]
        );

        const formattedNote = {
            ...newNote[0],
            tags: newNote[0].tags ? JSON.parse(newNote[0].tags) : [],
            is_owner: true,
            created_at: newNote[0].created_at ? new Date(newNote[0].created_at).toISOString() : null,
            updated_at: newNote[0].updated_at ? new Date(newNote[0].updated_at).toISOString() : null,
        };

        res.status(201).json({
            success: true,
            message: 'Note created successfully',
            note: formattedNote
        });
    } catch (err) {
        console.error('Error creating note:', err);
        res.status(500).json({
            success: false,
            message: 'Server error while creating note'
        });
    }
});

// GET /api/notes/:id - Get a specific note
router.get('/:id', requireAuth, async (req, res) => {
    try {
        const noteId = req.params.id;
        const userId = req.session.user.id;

        const [note] = await getAppPool().query(
            `SELECT n.*, CONCAT(u.first_name, ' ', u.last_name) as created_by_name 
             FROM notes n
             JOIN orthodoxmetrics_db.users u ON n.created_by = u.id 
             WHERE n.id = ? AND (n.created_by = ? OR n.id IN (
                 SELECT note_id FROM note_shares WHERE shared_with_user_id = ?
             ))`,
            [noteId, userId, userId]
        );

        if (note.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Note not found'
            });
        }

        const formattedNote = {
            ...note[0],
            tags: note[0].tags ? JSON.parse(note[0].tags) : [],
            is_owner: note[0].created_by === userId,
            created_at: note[0].created_at ? new Date(note[0].created_at).toISOString() : null,
            updated_at: note[0].updated_at ? new Date(note[0].updated_at).toISOString() : null,
        };

        res.json({
            success: true,
            note: formattedNote
        });
    } catch (err) {
        console.error('Error fetching note:', err);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching note'
        });
    }
});

// PUT /api/notes/:id - Update a note
router.put('/:id', requireAuth, async (req, res) => {
    try {
        const noteId = req.params.id;
        const userId = req.session.user.id;
        const { title, content, category, tags, color, is_pinned, is_archived } = req.body;

        // Check if user owns the note or has write permission
        const [note] = await getAppPool().query(
            `SELECT n.*, ns.permission 
             FROM notes n
             LEFT JOIN note_shares ns ON n.id = ns.note_id AND ns.shared_with_user_id = ?
             WHERE n.id = ? AND (n.created_by = ? OR ns.permission = 'write')`,
            [userId, noteId, userId]
        );

        if (note.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Note not found or you do not have permission to edit'
            });
        }

        // Build update query dynamically
        const updates = [];
        const params = [];

        if (title !== undefined) {
            updates.push('title = ?');
            params.push(title);
        }
        if (content !== undefined) {
            updates.push('content = ?');
            params.push(content);
        }
        if (category !== undefined) {
            updates.push('category = ?');
            params.push(category);
        }
        if (tags !== undefined) {
            updates.push('tags = ?');
            params.push(JSON.stringify(tags));
        }
        if (color !== undefined) {
            updates.push('color = ?');
            params.push(color);
        }
        if (is_pinned !== undefined) {
            updates.push('is_pinned = ?');
            params.push(is_pinned);
        }
        if (is_archived !== undefined) {
            updates.push('is_archived = ?');
            params.push(is_archived);
        }

        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No updates provided'
            });
        }

        params.push(noteId);

        await getAppPool().query(
            `UPDATE notes SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
            params
        );

        // Fetch updated note
        const [updatedNote] = await getAppPool().query(
            `SELECT n.*, CONCAT(u.first_name, ' ', u.last_name) as created_by_name 
             FROM notes n
             JOIN orthodoxmetrics_db.users u ON n.created_by = u.id 
             WHERE n.id = ?`,
            [noteId]
        );

        const formattedNote = {
            ...updatedNote[0],
            tags: updatedNote[0].tags ? JSON.parse(updatedNote[0].tags) : [],
            is_owner: updatedNote[0].created_by === userId,
            created_at: updatedNote[0].created_at ? new Date(updatedNote[0].created_at).toISOString() : null,
            updated_at: updatedNote[0].updated_at ? new Date(updatedNote[0].updated_at).toISOString() : null,
        };

        res.json({
            success: true,
            message: 'Note updated successfully',
            note: formattedNote
        });
    } catch (err) {
        console.error('Error updating note:', err);
        res.status(500).json({
            success: false,
            message: 'Server error while updating note'
        });
    }
});

// DELETE /api/notes/:id - Delete a note
router.delete('/:id', requireAuth, async (req, res) => {
    try {
        const noteId = req.params.id;
        const userId = req.session.user.id;

        // Check if user owns the note
        const [note] = await getAppPool().query(
            'SELECT created_by FROM notes WHERE id = ? AND created_by = ?',
            [noteId, userId]
        );

        if (note.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Note not found or you do not have permission to delete'
            });
        }

        await getAppPool().query('DELETE FROM notes WHERE id = ?', [noteId]);

        res.json({
            success: true,
            message: 'Note deleted successfully'
        });
    } catch (err) {
        console.error('Error deleting note:', err);
        res.status(500).json({
            success: false,
            message: 'Server error while deleting note'
        });
    }
});

// POST /api/notes/:id/share - Share a note with another user
router.post('/:id/share', requireAuth, async (req, res) => {
    try {
        const noteId = req.params.id;
        const userId = req.session.user.id;
        const { shared_with_user_id, permission } = req.body;

        // Check if user owns the note
        const [note] = await getAppPool().query(
            'SELECT created_by FROM notes WHERE id = ? AND created_by = ?',
            [noteId, userId]
        );

        if (note.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Note not found or you do not have permission to share'
            });
        }

        // Check if target user exists
        const [targetUser] = await getAppPool().query(
            'SELECT id FROM orthodoxmetrics_db.users WHERE id = ?',
            [shared_with_user_id]
        );

        if (targetUser.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Target user not found'
            });
        }

        // Share the note
        await getAppPool().query(
            `INSERT INTO note_shares (note_id, shared_with_user_id, permission, shared_by)
             VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE permission = VALUES(permission)`,
            [noteId, shared_with_user_id, permission || 'read', userId]
        );

        // Update note as shared
        await getAppPool().query(
            'UPDATE notes SET is_shared = TRUE WHERE id = ?',
            [noteId]
        );

        res.json({
            success: true,
            message: 'Note shared successfully'
        });
    } catch (err) {
        console.error('Error sharing note:', err);
        res.status(500).json({
            success: false,
            message: 'Server error while sharing note'
        });
    }
});

// POST /api/notes/bulk-delete - Delete multiple notes
router.post('/bulk-delete', requireAuth, async (req, res) => {
    try {
        const { noteIds } = req.body;
        const userId = req.session.user.id;

        if (!Array.isArray(noteIds) || noteIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Note IDs array is required'
            });
        }

        // Delete only notes owned by the user
        const placeholders = noteIds.map(() => '?').join(',');
        const [result] = await getAppPool().query(
            `DELETE FROM notes WHERE id IN (${placeholders}) AND created_by = ?`,
            [...noteIds, userId]
        );

        res.json({
            success: true,
            message: `${result.affectedRows} notes deleted successfully`
        });
    } catch (err) {
        console.error('Error bulk deleting notes:', err);
        res.status(500).json({
            success: false,
            message: 'Server error while deleting notes'
        });
    }
});

// Handle direct /notes routes (without /api prefix) for backward compatibility
// These routes redirect to or handle the same logic as the /api/notes routes

// POST /notes - Create a new note (without /api prefix)
router.post('/add', requireAuth, async (req, res) => {
    try {
        const { title, content, category, tags, color, is_pinned } = req.body;
        const userId = req.session.user.id;

        // Validation
        if (!title) {
            return res.status(400).json({
                success: false,
                message: 'Title is required'
            });
        }

        const [result] = await getAppPool().query(
            `INSERT INTO notes (title, content, category, tags, color, is_pinned, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                title,
                content || '',
                category || 'General',
                tags ? JSON.stringify(tags) : null,
                color || '#ffffff',
                is_pinned || false,
                userId
            ]
        );

        // Fetch the created note
        const [newNote] = await getAppPool().query(
            `SELECT n.*, CONCAT(u.first_name, ' ', u.last_name) as created_by_name 
             FROM notes n
             JOIN orthodoxmetrics_db.users u ON n.created_by = u.id 
             WHERE n.id = ?`,
            [result.insertId]
        );

        const formattedNote = {
            ...newNote[0],
            tags: newNote[0].tags ? JSON.parse(newNote[0].tags) : [],
            is_owner: true,
            created_at: newNote[0].created_at ? new Date(newNote[0].created_at).toISOString() : null,
            updated_at: newNote[0].updated_at ? new Date(newNote[0].updated_at).toISOString() : null,
        };

        res.status(201).json({
            status: 200,
            msg: 'Success',
            data: formattedNote
        });
    } catch (err) {
        console.error('Error creating note:', err);
        res.status(500).json({
            status: 400,
            msg: 'Internal server error',
            error: err.message
        });
    }
});

module.exports = router;
