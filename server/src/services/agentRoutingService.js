/**
 * Agent Routing Service
 *
 * Deterministic routing: given a component and prompt_type, resolve which
 * agent(s) should execute the prompt.
 *
 * Rules are stored in agent_routing_rules and evaluated in priority order.
 * The first matching rule wins. If no rule matches, the system-default
 * agent (lowest default_priority in agent_registry) is used.
 *
 * Core flows:
 *   resolveAgent(component, promptType)  — Find the best agent
 *   resolveAgents(component, promptType) — Find all agents (multi-agent mode)
 *   listRules()                          — All routing rules
 *   createRule()                         — Add a routing rule
 *   updateRule()                         — Modify a routing rule
 *   deleteRule()                         — Remove a routing rule
 */

const { v4: uuidv4 } = require('uuid');
const { getAppPool } = require('../config/db');
const agentRegistry = require('./agentRegistryService');

// ─── Constants ──────────────────────────────────────────────────────────────

const VALID_PROMPT_TYPES = ['plan', 'implementation', 'verification', 'correction', 'migration', 'docs'];

// ─── Route Resolution ───────────────────────────────────────────────────────

/**
 * Resolve which agent should handle a prompt. Returns the primary agent
 * and, if the matching rule enables multi-agent mode, the comparison agents.
 *
 * Match logic (deterministic, first-match-wins):
 *   1. Rules with both component AND prompt_type matching → exact match
 *   2. Rules with component match and null prompt_type → component-only match
 *   3. Rules with null component and prompt_type match → type-only match
 *   4. Rules with both null → catch-all
 *   5. No rule matches → system default agent (lowest priority in registry)
 *
 * @param {string|null} component - Target component (e.g. 'backend', 'frontend')
 * @param {string|null} promptType - Prompt type (e.g. 'implementation', 'verification')
 * @returns {{ primary_agent: object, comparison_agents: object[], rule: object|null, is_multi_agent: boolean }}
 */
async function resolveAgent(component, promptType) {
  const pool = getAppPool();

  // Fetch all active rules ordered by priority
  const [rules] = await pool.query(
    `SELECT r.*, a.name as agent_name, a.status as agent_status
     FROM agent_routing_rules r
     JOIN agent_registry a ON a.id = r.agent_id
     WHERE r.active = 1 AND a.status = 'active'
     ORDER BY r.priority ASC`,
  );

  // Find first matching rule (deterministic)
  let matchedRule = null;
  for (const rule of rules) {
    const componentMatch = rule.component === null || rule.component === component;
    const typeMatch = rule.prompt_type === null || rule.prompt_type === promptType;

    if (componentMatch && typeMatch) {
      matchedRule = rule;
      break;
    }
  }

  if (matchedRule) {
    const primaryAgent = await agentRegistry.getAgent(matchedRule.agent_id);

    let comparisonAgents = [];
    if (matchedRule.is_multi_agent && matchedRule.comparison_agent_ids) {
      const ids = _parseJSON(matchedRule.comparison_agent_ids, []);
      for (const agentId of ids) {
        const agent = await agentRegistry.getAgent(agentId);
        if (agent && agent.status === 'active') {
          comparisonAgents.push(agent);
        }
      }
    }

    return {
      primary_agent: primaryAgent,
      comparison_agents: comparisonAgents,
      rule: _parseRule(matchedRule),
      is_multi_agent: matchedRule.is_multi_agent === 1 && comparisonAgents.length > 0,
    };
  }

  // No rule matched → fall back to system default (lowest priority active agent)
  const [defaults] = await pool.query(
    `SELECT * FROM agent_registry WHERE status = 'active' ORDER BY default_priority ASC LIMIT 1`
  );

  if (defaults.length === 0) {
    throw new Error('No active agents configured. Cannot route prompt.');
  }

  // Parse the raw DB row — getAgent() normally handles this, but the fallback
  // uses a direct query so we must parse JSON fields ourselves.
  const fallbackAgent = {
    ...defaults[0],
    capabilities: _parseJSON(defaults[0].capabilities, []),
    config: _parseJSON(defaults[0].config, null),
  };

  return {
    primary_agent: fallbackAgent,
    comparison_agents: [],
    rule: null,
    is_multi_agent: false,
  };
}

/**
 * Preview route resolution without executing (for UI/debugging).
 */
async function previewRoute(component, promptType) {
  const resolution = await resolveAgent(component, promptType);
  return {
    component,
    prompt_type: promptType,
    primary_agent: {
      id: resolution.primary_agent.id,
      name: resolution.primary_agent.name,
      provider: resolution.primary_agent.provider,
    },
    comparison_agents: resolution.comparison_agents.map(a => ({
      id: a.id,
      name: a.name,
      provider: a.provider,
    })),
    matched_rule: resolution.rule ? {
      id: resolution.rule.id,
      rule_name: resolution.rule.rule_name,
      priority: resolution.rule.priority,
    } : null,
    is_multi_agent: resolution.is_multi_agent,
  };
}

// ─── Rule CRUD ──────────────────────────────────────────────────────────────

async function listRules(filters = {}) {
  const pool = getAppPool();
  const where = ['1=1'];
  const params = [];

  if (filters.active !== undefined) {
    where.push('r.active = ?');
    params.push(filters.active ? 1 : 0);
  }
  if (filters.component) {
    where.push('r.component = ?');
    params.push(filters.component);
  }

  const [rows] = await pool.query(
    `SELECT r.*, a.name as agent_name, a.provider as agent_provider
     FROM agent_routing_rules r
     JOIN agent_registry a ON a.id = r.agent_id
     WHERE ${where.join(' AND ')}
     ORDER BY r.priority ASC`,
    params
  );

  return rows.map(_parseRule);
}

async function createRule({ rule_name, component, prompt_type, agent_id, priority, is_multi_agent, comparison_agent_ids }) {
  if (!rule_name || !agent_id) {
    throw new Error('rule_name and agent_id are required');
  }
  if (prompt_type && !VALID_PROMPT_TYPES.includes(prompt_type)) {
    throw new Error(`Invalid prompt_type: ${prompt_type}. Valid: ${VALID_PROMPT_TYPES.join(', ')}`);
  }

  // Verify agent exists
  const agent = await agentRegistry.getAgent(agent_id);
  if (!agent) throw new Error(`Agent not found: ${agent_id}`);

  // Verify comparison agents exist
  if (is_multi_agent && comparison_agent_ids) {
    for (const cId of comparison_agent_ids) {
      const ca = await agentRegistry.getAgent(cId);
      if (!ca) throw new Error(`Comparison agent not found: ${cId}`);
    }
  }

  const pool = getAppPool();
  const id = uuidv4();

  await pool.query(
    `INSERT INTO agent_routing_rules
     (id, rule_name, component, prompt_type, agent_id, priority, is_multi_agent, comparison_agent_ids)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id, rule_name,
      component || null,
      prompt_type || null,
      agent_id,
      priority || 50,
      is_multi_agent ? 1 : 0,
      comparison_agent_ids ? JSON.stringify(comparison_agent_ids) : null,
    ]
  );

  return { rule_id: id };
}

async function updateRule(id, updates) {
  const pool = getAppPool();
  const allowed = ['rule_name', 'component', 'prompt_type', 'agent_id', 'priority', 'is_multi_agent', 'comparison_agent_ids', 'active'];
  const sets = [];
  const params = [];

  for (const key of allowed) {
    if (updates[key] !== undefined) {
      sets.push(`${key} = ?`);
      if (key === 'comparison_agent_ids') {
        params.push(updates[key] ? JSON.stringify(updates[key]) : null);
      } else if (key === 'is_multi_agent' || key === 'active') {
        params.push(updates[key] ? 1 : 0);
      } else {
        params.push(updates[key]);
      }
    }
  }

  if (sets.length === 0) throw new Error('No valid fields to update');

  params.push(id);
  const [result] = await pool.query(
    `UPDATE agent_routing_rules SET ${sets.join(', ')} WHERE id = ?`,
    params
  );

  if (result.affectedRows === 0) throw new Error('Rule not found');
  return { success: true };
}

async function deleteRule(id) {
  const pool = getAppPool();
  const [result] = await pool.query('DELETE FROM agent_routing_rules WHERE id = ?', [id]);
  if (result.affectedRows === 0) throw new Error('Rule not found');
  return { success: true };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function _parseRule(row) {
  return {
    ...row,
    comparison_agent_ids: _parseJSON(row.comparison_agent_ids, []),
  };
}

function _parseJSON(str, fallback) {
  try { return JSON.parse(str || 'null') || fallback; } catch { return fallback; }
}

// ─── Exports ────────────────────────────────────────────────────────────────

module.exports = {
  VALID_PROMPT_TYPES,
  resolveAgent,
  previewRoute,
  listRules,
  createRule,
  updateRule,
  deleteRule,
};
