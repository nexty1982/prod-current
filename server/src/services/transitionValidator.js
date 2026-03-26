/**
 * Transition Validator — canonical SDLC status transition enforcement
 *
 * Validates whether a status transition is allowed and checks prerequisites.
 * Returns structured errors with human-readable messages for the UI.
 *
 * Canonical statuses (8):
 *   backlog → in_progress → self_review → review → staging → done
 *   blocked (from any active status)
 *   cancelled (from any status)
 *
 * Git-trigger mapping:
 *   Backlog      — Manual task creation
 *   In Progress  — Branch created (POST /start-work)
 *   Self Review  — Agent signals completion (POST /agent-complete)
 *   Review       — PR opened (non-draft) or "ready for review"
 *   Staging      — Pull Request approved by a reviewer
 *   Done         — PR merged into main
 *
 * Ownership model:
 *   Each status has a defined owner (admin or agent) and a required exit action.
 *   Transitions are enforced so that only the appropriate actor can move items forward.
 */

const repoService = require('./repoService');

// ── Canonical Status Order ──────────────────────────────────────
const STATUSES = [
  'backlog', 'in_progress', 'self_review',
  'review', 'staging', 'done',
  'blocked', 'cancelled',
];

// ── Allowed Transitions Matrix ──────────────────────────────────
// Key = from_status, Value = array of allowed to_statuses
const ALLOWED_TRANSITIONS = {
  backlog:      ['in_progress', 'blocked', 'cancelled'],
  in_progress:  ['self_review', 'backlog', 'blocked', 'cancelled'],
  self_review:  ['review', 'in_progress', 'blocked', 'cancelled'],
  review:       ['staging', 'in_progress', 'self_review', 'blocked', 'cancelled'],
  staging:      ['done', 'review', 'blocked', 'cancelled'],
  done:         ['backlog'],  // reopening
  blocked:      ['backlog', 'in_progress', 'self_review', 'review', 'staging', 'cancelled'],
  cancelled:    ['backlog'],  // reopening
};

// ── Status display labels ───────────────────────────────────────
const STATUS_LABELS = {
  backlog: 'Backlog',
  in_progress: 'In Progress',
  self_review: 'Self Review',
  review: 'Review',
  staging: 'Staging',
  done: 'Done',
  blocked: 'Blocked',
  cancelled: 'Cancelled',
};

// ── Status Ownership Model ──────────────────────────────────────
// Defines who owns each status and what must happen before exiting.
//
// owner:       Who is responsible while the item is in this status
// exit_action: What concrete action must be taken to move forward
// exit_by:     Who is authorized to perform the exit action
//              'admin' = super_admin via UI, 'agent' = AI agent via API, 'any' = either
//
const STATUS_OWNERSHIP = {
  backlog: {
    owner: 'admin',
    exit_action: 'Assign to agent, create branch (POST /start-work)',
    exit_by: 'admin',
  },
  in_progress: {
    owner: 'agent',
    exit_action: 'Complete implementation, signal completion (POST /agent-complete)',
    exit_by: 'agent',
  },
  self_review: {
    owner: 'agent',
    exit_action: 'Self-check: build, lint, push to remote, open PR',
    exit_by: 'agent',
  },
  review: {
    owner: 'admin',
    exit_action: 'Review PR, test in staging — approve or request changes',
    exit_by: 'admin',
  },
  staging: {
    owner: 'admin',
    exit_action: 'Merge PR into main, deploy to production',
    exit_by: 'admin',
  },
  done: {
    owner: null,
    exit_action: 'Reopen if needed',
    exit_by: 'admin',
  },
  blocked: {
    owner: 'admin',
    exit_action: 'Resolve blocker and move back to previous status',
    exit_by: 'any',
  },
  cancelled: {
    owner: null,
    exit_action: 'Reopen if needed',
    exit_by: 'admin',
  },
};

// ── Actor Type Resolution ────────────────────────────────────────
// Determines if the caller is acting as 'admin' or 'agent'.
//
// Priority:
//   1. Explicit actor_type in request body ('admin' or 'agent')
//   2. source field on item ('agent' → agent, else admin)
//   3. Default: 'admin' (UI calls don't send actor_type)
//
function resolveActorType(requestBody, item) {
  if (requestBody?.actor_type === 'agent') return 'agent';
  if (requestBody?.actor_type === 'admin') return 'admin';
  if (requestBody?.source === 'agent') return 'agent';
  if (item?.source === 'agent' && !requestBody?.actor_type) return 'admin'; // UI overriding agent item
  return 'admin';
}

// ── Prerequisite Checks ─────────────────────────────────────────
// Each check returns null if OK, or an error string if blocked.

const PREREQUISITES = {
  in_progress: (item) => {
    if (!item.repo_target) {
      return 'Cannot move to In Progress — repo_target must be set (omai or orthodoxmetrics).';
    }
    return null;
  },

  self_review: (item) => {
    if (!item.github_branch) {
      return 'Cannot move to Self Review — no branch exists. Start work first.';
    }
    return null;
  },

  review: (item) => {
    if (!item.github_branch) {
      return 'Cannot move to Review — no branch exists.';
    }
    return null;
  },

  staging: (item) => {
    if (!item.github_branch) {
      return 'Cannot move to Staging — no branch exists.';
    }
    return null;
  },

  done: (item) => {
    if (!item.github_branch) {
      return null;
    }
    return null;
  },

  blocked: (item) => {
    if (!item._blocked_reason) {
      return 'Cannot move to Blocked without providing a blocked_reason.';
    }
    return null;
  },
};

// ── Repo-Level Checks (async, need git ops) ─────────────────────

async function checkRepoPrerequisites(toStatus, item) {
  const errors = [];

  if (!item.repo_target || !item.github_branch) return errors;

  try {
    switch (toStatus) {
      case 'review': {
        // Branch must be pushed to remote
        const existsRemote = repoService.branchExistsRemote(item.repo_target, item.github_branch);
        if (!existsRemote) {
          errors.push('Cannot move to Review — branch has not been pushed to remote.');
        }
        break;
      }
      case 'done': {
        if (item.github_branch) {
          // Working tree must be clean
          const snapshot = repoService.getSnapshot(item.repo_target);
          if (snapshot.current_branch === item.github_branch && !snapshot.is_clean) {
            errors.push('Cannot move to Done — working tree is dirty. Commit all changes first.');
          }
          // Branch must exist on remote
          const existsRemote = repoService.branchExistsRemote(item.repo_target, item.github_branch);
          if (!existsRemote) {
            errors.push('Cannot move to Done — branch has not been pushed to remote.');
          }
        }
        break;
      }
    }
  } catch (err) {
    // Git command failures should not block — log and continue
    console.warn(`[transitionValidator] Repo check warning for ${toStatus}:`, err.message);
  }

  return errors;
}

// ── Main Validation Function ────────────────────────────────────

/**
 * Validate a status transition.
 *
 * @param {string} fromStatus - Current status
 * @param {string} toStatus - Desired status
 * @param {object} item - The full item record from DB (with _blocked_reason if transitioning to blocked)
 * @param {object} opts - { skipRepoChecks: boolean, actorType: 'admin'|'agent' }
 * @returns {{ valid: boolean, errors: string[], fromLabel: string, toLabel: string }}
 */
async function validateTransition(fromStatus, toStatus, item, opts = {}) {
  const errors = [];

  // Same status → no-op
  if (fromStatus === toStatus) {
    return { valid: true, errors: [], fromLabel: STATUS_LABELS[fromStatus], toLabel: STATUS_LABELS[toStatus] };
  }

  // Check status values are valid
  if (!STATUSES.includes(fromStatus)) {
    errors.push(`Invalid current status: ${fromStatus}`);
  }
  if (!STATUSES.includes(toStatus)) {
    errors.push(`Invalid target status: ${toStatus}`);
  }
  if (errors.length > 0) {
    return { valid: false, errors, fromLabel: fromStatus, toLabel: toStatus };
  }

  // Check transition is allowed
  const allowed = ALLOWED_TRANSITIONS[fromStatus] || [];
  if (!allowed.includes(toStatus)) {
    errors.push(
      `Cannot transition from ${STATUS_LABELS[fromStatus]} to ${STATUS_LABELS[toStatus]}. ` +
      `Allowed: ${allowed.map(s => STATUS_LABELS[s]).join(', ')}.`
    );
  }

  // ── Actor / Ownership enforcement ──────────────────────────────
  // Check that the caller has the right actor type to exit the current status.
  // 'blocked' and 'cancelled' transitions are always allowed by any actor.
  const actorType = opts.actorType || 'admin';
  if (toStatus !== 'blocked' && toStatus !== 'cancelled') {
    const ownership = STATUS_OWNERSHIP[fromStatus];
    if (ownership && ownership.exit_by !== 'any' && ownership.exit_by !== actorType) {
      const ownerLabel = ownership.exit_by === 'admin' ? 'a super_admin (via UI)' : 'an AI agent';
      errors.push(
        `Cannot exit ${STATUS_LABELS[fromStatus]} — this status must be actioned by ${ownerLabel}. ` +
        `Required action: ${ownership.exit_action}`
      );
    }
  }

  // Check item-level prerequisites
  const prereqCheck = PREREQUISITES[toStatus];
  if (prereqCheck) {
    const prereqError = prereqCheck(item);
    if (prereqError) errors.push(prereqError);
  }

  // Check repo-level prerequisites (async)
  if (!opts.skipRepoChecks && errors.length === 0) {
    const repoErrors = await checkRepoPrerequisites(toStatus, item);
    errors.push(...repoErrors);
  }

  return {
    valid: errors.length === 0,
    errors,
    fromLabel: STATUS_LABELS[fromStatus] || fromStatus,
    toLabel: STATUS_LABELS[toStatus] || toStatus,
  };
}

/**
 * Get all valid next statuses for a given current status, optionally filtered by actor type
 */
function getValidNextStatuses(fromStatus, actorType) {
  const transitions = (ALLOWED_TRANSITIONS[fromStatus] || []).map(s => {
    const ownership = STATUS_OWNERSHIP[fromStatus];
    const allowed = !ownership || ownership.exit_by === 'any' || ownership.exit_by === actorType ||
                    s === 'blocked' || s === 'cancelled';
    return {
      status: s,
      label: STATUS_LABELS[s],
      allowed_for_actor: allowed,
    };
  });

  // If actorType provided, filter to only allowed transitions
  if (actorType) {
    return transitions.filter(t => t.allowed_for_actor);
  }
  return transitions;
}

// ── Exports ─────────────────────────────────────────────────────

module.exports = {
  STATUSES,
  STATUS_LABELS,
  STATUS_OWNERSHIP,
  ALLOWED_TRANSITIONS,
  validateTransition,
  getValidNextStatuses,
  resolveActorType,
};
