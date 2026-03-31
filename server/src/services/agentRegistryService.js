/**
 * Agent Registry Service
 *
 * CRUD operations for execution agents (Claude, GPT, etc.).
 * Each agent has a provider, model_id, capabilities, and priority.
 *
 * Core flows:
 *   listAgents()       — All agents, optionally filtered
 *   getAgent(id)       — Single agent by ID
 *   createAgent()      — Register a new agent
 *   updateAgent()      — Modify agent config
 *   setStatus()        — Activate/deactivate/deprecate
 *   getByCapability()  — Find agents matching a capability
 */

const { v4: uuidv4 } = require('uuid');
const { getAppPool } = require('../config/db');

// ─── Constants ──────────────────────────────────────────────────────────────

const VALID_STATUSES = ['active', 'inactive', 'deprecated'];
const VALID_PROVIDERS = ['anthropic', 'openai', 'google', 'local'];

// ─── Read Operations ────────────────────────────────────────────────────────

/**
 * List all agents, optionally filtered by status or provider.
 */
async function listAgents(filters = {}) {
  const pool = getAppPool();
  const where = ['1=1'];
  const params = [];

  if (filters.status) {
    where.push('status = ?');
    params.push(filters.status);
  }
  if (filters.provider) {
    where.push('provider = ?');
    params.push(filters.provider);
  }
  if (filters.capability) {
    where.push('JSON_CONTAINS(capabilities, ?)');
    params.push(JSON.stringify(filters.capability));
  }

  const [rows] = await pool.query(
    `SELECT * FROM agent_registry
     WHERE ${where.join(' AND ')}
     ORDER BY default_priority ASC, name ASC`,
    params
  );

  return rows.map(_parseAgent);
}

/**
 * Get a single agent by ID.
 */
async function getAgent(id) {
  const pool = getAppPool();
  const [rows] = await pool.query('SELECT * FROM agent_registry WHERE id = ?', [id]);
  if (rows.length === 0) return null;
  return _parseAgent(rows[0]);
}

/**
 * Get a single agent by name (case-insensitive).
 */
async function getAgentByName(name) {
  const pool = getAppPool();
  const [rows] = await pool.query('SELECT * FROM agent_registry WHERE LOWER(name) = LOWER(?)', [name]);
  if (rows.length === 0) return null;
  return _parseAgent(rows[0]);
}

/**
 * Find all active agents with a specific capability.
 */
async function getByCapability(capability) {
  const pool = getAppPool();
  const [rows] = await pool.query(
    `SELECT * FROM agent_registry
     WHERE status = 'active' AND JSON_CONTAINS(capabilities, ?)
     ORDER BY default_priority ASC`,
    [JSON.stringify(capability)]
  );
  return rows.map(_parseAgent);
}

// ─── Write Operations ───────────────────────────────────────────────────────

/**
 * Register a new execution agent.
 */
async function createAgent({ name, provider, model_id, capabilities, default_priority, config, cost_per_1k_input, cost_per_1k_output }) {
  if (!name || !provider || !model_id) {
    throw new Error('name, provider, and model_id are required');
  }
  if (!VALID_PROVIDERS.includes(provider)) {
    throw new Error(`Invalid provider: ${provider}. Valid: ${VALID_PROVIDERS.join(', ')}`);
  }

  const pool = getAppPool();
  const id = uuidv4();

  await pool.query(
    `INSERT INTO agent_registry
     (id, name, provider, model_id, capabilities, default_priority, config, cost_per_1k_input, cost_per_1k_output)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id, name, provider, model_id,
      JSON.stringify(capabilities || []),
      default_priority || 50,
      config ? JSON.stringify(config) : null,
      cost_per_1k_input || null,
      cost_per_1k_output || null,
    ]
  );

  return { agent_id: id, name };
}

/**
 * Update an existing agent.
 */
async function updateAgent(id, updates) {
  const pool = getAppPool();
  const allowed = ['name', 'provider', 'model_id', 'capabilities', 'default_priority', 'config', 'cost_per_1k_input', 'cost_per_1k_output'];
  const sets = [];
  const params = [];

  for (const key of allowed) {
    if (updates[key] !== undefined) {
      sets.push(`${key} = ?`);
      params.push(
        (key === 'capabilities' || key === 'config')
          ? JSON.stringify(updates[key])
          : updates[key]
      );
    }
  }

  if (sets.length === 0) throw new Error('No valid fields to update');

  params.push(id);
  const [result] = await pool.query(
    `UPDATE agent_registry SET ${sets.join(', ')} WHERE id = ?`,
    params
  );

  if (result.affectedRows === 0) throw new Error('Agent not found');
  return { success: true };
}

/**
 * Change agent status.
 */
async function setStatus(id, status) {
  if (!VALID_STATUSES.includes(status)) {
    throw new Error(`Invalid status: ${status}. Valid: ${VALID_STATUSES.join(', ')}`);
  }

  const pool = getAppPool();
  const [result] = await pool.query(
    'UPDATE agent_registry SET status = ? WHERE id = ?',
    [status, id]
  );

  if (result.affectedRows === 0) throw new Error('Agent not found');
  return { success: true };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function _parseAgent(row) {
  return {
    ...row,
    capabilities: _parseJSON(row.capabilities, []),
    config: _parseJSON(row.config, null),
  };
}

function _parseJSON(str, fallback) {
  try { return JSON.parse(str || 'null') || fallback; } catch { return fallback; }
}

// ─── Exports ────────────────────────────────────────────────────────────────

module.exports = {
  VALID_STATUSES,
  VALID_PROVIDERS,
  listAgents,
  getAgent,
  getAgentByName,
  getByCapability,
  createAgent,
  updateAgent,
  setStatus,
};
