const { getAppPool } = require('../../config/db-compat');
// server/routes/components.js
const express = require('express');
const { promisePool } = require('../../config/db-compat');
const router = express.Router();

// Get all components
router.get('/components', async (req, res) => {
  try {
    const [rows] = await getAppPool().query(
      'SELECT id, name, description, type, properties FROM components ORDER BY name'
    );

    res.json({ components: rows });
  } catch (err) {
    console.error('Error fetching components:', err);
    res.status(500).json({ error: 'Server error fetching components' });
  }
});

// Get a single component by ID
router.get('/components/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await getAppPool().query(
      'SELECT id, name, description, type, properties FROM components WHERE id = ?',
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Component not found' });
    }

    res.json({ component: rows[0] });
  } catch (err) {
    console.error('Error fetching component:', err);
    res.status(500).json({ error: 'Server error fetching component' });
  }
});

// Create a new component
router.post('/components', async (req, res) => {
  const { name, description, type, properties } = req.body;

  if (!name || !type) {
    return res.status(400).json({ error: 'Name and type are required' });
  }

  try {
    const [result] = await getAppPool().query(
      'INSERT INTO components (name, description, type, properties) VALUES (?, ?, ?, ?)',
      [name, description || '', type, JSON.stringify(properties || {})]
    );

    const [newComponent] = await getAppPool().query(
      'SELECT id, name, description, type, properties FROM components WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({ component: newComponent[0] });
  } catch (err) {
    console.error('Error creating component:', err);
    res.status(500).json({ error: 'Server error creating component' });
  }
});

// Update a component
router.put('/components/:id', async (req, res) => {
  const { id } = req.params;
  const { name, description, type, properties } = req.body;

  if (!name || !type) {
    return res.status(400).json({ error: 'Name and type are required' });
  }

  try {
    await getAppPool().query(
      'UPDATE components SET name = ?, description = ?, type = ?, properties = ? WHERE id = ?',
      [name, description || '', type, JSON.stringify(properties || {}), id]
    );

    const [updatedComponent] = await getAppPool().query(
      'SELECT id, name, description, type, properties FROM components WHERE id = ?',
      [id]
    );

    if (updatedComponent.length === 0) {
      return res.status(404).json({ error: 'Component not found' });
    }

    res.json({ component: updatedComponent[0] });
  } catch (err) {
    console.error('Error updating component:', err);
    res.status(500).json({ error: 'Server error updating component' });
  }
});

// Delete a component
router.delete('/components/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await getAppPool().query(
      'DELETE FROM components WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Component not found' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting component:', err);
    res.status(500).json({ error: 'Server error deleting component' });
  }
});

module.exports = router;
