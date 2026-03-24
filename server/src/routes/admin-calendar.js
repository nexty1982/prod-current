// server/src/routes/admin-calendar.js — Admin/SuperAdmin calendar events API
const express = require('express');
const router = express.Router({ mergeParams: true });
const { getAppPool } = require('../config/db');
const { requireAuth, requireRole } = require('../middleware/auth');

// All routes require admin or super_admin
router.use(requireAuth);
router.use(requireRole(['admin', 'super_admin']));

// ── GET /api/admin/calendar/events?start=&end= ────────────────
// Returns events for the authenticated user within a date range
router.get('/events', async (req, res) => {
  try {
    const userId = req.user?.id || req.session?.user?.id;
    const { start, end } = req.query;

    if (!start || !end) {
      return res.status(400).json({ success: false, message: 'start and end query params required.' });
    }

    const pool = getAppPool();
    const [rows] = await pool.query(
      `SELECT e.*, a.contact_name AS appointment_contact, a.contact_email AS appointment_email,
              a.appointment_type, a.status AS appointment_status
       FROM admin_calendar_events e
       LEFT JOIN crm_appointments a ON e.appointment_id = a.id
       WHERE e.user_id = ? AND e.start_at < ? AND (e.end_at > ? OR (e.end_at IS NULL AND e.start_at >= ?))
       ORDER BY e.start_at`,
      [userId, end, start, start]
    );

    const events = rows.map(r => ({
      id: String(r.id),
      title: r.title,
      start: r.all_day ? r.start_at.toISOString().split('T')[0] : r.start_at.toISOString(),
      end: r.end_at ? (r.all_day ? r.end_at.toISOString().split('T')[0] : r.end_at.toISOString()) : undefined,
      allDay: !!r.all_day,
      color: r.color || '#1e88e5',
      description: r.description || '',
      eventType: r.event_type,
      isAvailableSlot: !!r.is_available_slot,
      appointmentId: r.appointment_id,
      appointmentContact: r.appointment_contact,
      appointmentEmail: r.appointment_email,
      appointmentType: r.appointment_type,
      appointmentStatus: r.appointment_status,
    }));

    res.json({ success: true, events });
  } catch (error) {
    console.error('Calendar events fetch error:', error);
    res.status(500).json({ success: false, message: 'Failed to load events.' });
  }
});

// ── POST /api/admin/calendar/events ────────────────────────────
// Create a new event
router.post('/events', async (req, res) => {
  try {
    const userId = req.user?.id || req.session?.user?.id;
    const { title, description, start, end, allDay, color, eventType, isAvailableSlot } = req.body;

    if (!title || !start) {
      return res.status(400).json({ success: false, message: 'Title and start are required.' });
    }

    const pool = getAppPool();
    const [result] = await pool.query(
      `INSERT INTO admin_calendar_events
       (user_id, title, description, start_at, end_at, all_day, color, event_type, is_available_slot)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId, title, description || null,
        start, end || null, allDay ? 1 : 0,
        color || '#1e88e5', eventType || 'general',
        isAvailableSlot ? 1 : 0,
      ]
    );

    res.json({ success: true, id: result.insertId });
  } catch (error) {
    console.error('Calendar event create error:', error);
    res.status(500).json({ success: false, message: 'Failed to create event.' });
  }
});

// ── PUT /api/admin/calendar/events/:id ─────────────────────────
// Update an event (only if owned by current user)
router.put('/events/:id', async (req, res) => {
  try {
    const userId = req.user?.id || req.session?.user?.id;
    const eventId = parseInt(req.params.id);
    const { title, description, start, end, allDay, color, eventType, isAvailableSlot } = req.body;

    const pool = getAppPool();

    // Verify ownership
    const [existing] = await pool.query(
      'SELECT id FROM admin_calendar_events WHERE id = ? AND user_id = ?',
      [eventId, userId]
    );
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }

    const fields = [];
    const params = [];

    if (title !== undefined) { fields.push('title = ?'); params.push(title); }
    if (description !== undefined) { fields.push('description = ?'); params.push(description || null); }
    if (start !== undefined) { fields.push('start_at = ?'); params.push(start); }
    if (end !== undefined) { fields.push('end_at = ?'); params.push(end || null); }
    if (allDay !== undefined) { fields.push('all_day = ?'); params.push(allDay ? 1 : 0); }
    if (color !== undefined) { fields.push('color = ?'); params.push(color); }
    if (eventType !== undefined) { fields.push('event_type = ?'); params.push(eventType); }
    if (isAvailableSlot !== undefined) { fields.push('is_available_slot = ?'); params.push(isAvailableSlot ? 1 : 0); }

    if (fields.length === 0) {
      return res.json({ success: true, message: 'Nothing to update.' });
    }

    params.push(eventId, userId);
    await pool.query(
      `UPDATE admin_calendar_events SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`,
      params
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Calendar event update error:', error);
    res.status(500).json({ success: false, message: 'Failed to update event.' });
  }
});

// ── DELETE /api/admin/calendar/events/:id ──────────────────────
router.delete('/events/:id', async (req, res) => {
  try {
    const userId = req.user?.id || req.session?.user?.id;
    const eventId = parseInt(req.params.id);

    const pool = getAppPool();
    const [result] = await pool.query(
      'DELETE FROM admin_calendar_events WHERE id = ? AND user_id = ?',
      [eventId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Calendar event delete error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete event.' });
  }
});

// ── GET /api/admin/calendar/appointments ───────────────────────
// Returns CRM appointments (upcoming, for the calendar overlay)
router.get('/appointments', async (req, res) => {
  try {
    const { start, end } = req.query;
    const pool = getAppPool();

    let where = "WHERE a.status NOT IN ('cancelled')";
    const params = [];
    if (start) { where += ' AND a.scheduled_date >= ?'; params.push(start); }
    if (end) { where += ' AND a.scheduled_date <= ?'; params.push(end); }

    const [rows] = await pool.query(
      `SELECT a.*, i.church_name_entered, i.contact_role
       FROM crm_appointments a
       LEFT JOIN crm_inquiries i ON a.inquiry_id = i.id
       ${where}
       ORDER BY a.scheduled_date, a.scheduled_time`,
      params
    );

    const events = rows.map(r => ({
      id: `appt-${r.id}`,
      title: `${r.appointment_type === 'demo' ? 'Demo' : r.appointment_type}: ${r.contact_name}`,
      start: `${r.scheduled_date.toISOString().split('T')[0]}T${r.scheduled_time}`,
      end: (() => {
        const s = new Date(`${r.scheduled_date.toISOString().split('T')[0]}T${r.scheduled_time}`);
        s.setMinutes(s.getMinutes() + (r.duration_min || 30));
        return s.toISOString();
      })(),
      allDay: false,
      color: r.status === 'completed' ? '#43a047' : r.status === 'no_show' ? '#e53935' : '#fb8c00',
      description: `${r.contact_email}${r.church_name_entered ? ` — ${r.church_name_entered}` : ''}`,
      eventType: r.appointment_type,
      isAppointment: true,
      appointmentId: r.id,
      appointmentStatus: r.status,
      contactName: r.contact_name,
      contactEmail: r.contact_email,
    }));

    res.json({ success: true, events });
  } catch (error) {
    console.error('Calendar appointments fetch error:', error);
    res.status(500).json({ success: false, message: 'Failed to load appointments.' });
  }
});

module.exports = router;
