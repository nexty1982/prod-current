/**
 * Transition Validator — canonical SDLC status transition enforcement
 *
 * Validates whether a status transition is allowed and checks prerequisites.
 * Returns structured errors with human-readable messages for the UI.
 *
 * Canonical statuses (12):
 *   backlog → triaged → planned → scheduled → in_progress →
 *   self_review → testing → review_ready → approved → done
 *   blocked (from any active status)
 *   cancelled (from any status)
 *
 * Ownership model:
 *   Each status has a defined owner (admin or agent) and a required exit action.
 *   Transitions are enforced so that only the appropriate actor can move items forward.
 */

const repoService = require('./repoService');

// ── Canonical Status Order ──────────────────────────────────────
const STATUSES = [
  'backlog', 'triaged', 'planned', 'scheduled',
  'in_progress', 'self_review', 'testing',
  'review_ready', 'approved', 'done',
  'blocked', 'cancelled',
];

// ── Allowed Transitions Matrix ──────────────────────────────────
// Key = from_status, Value = array of allowed to_statuses
const ALLOWED_TRANSITIONS = {
  backlog:      ['triaged', 'planned', 'blocked', 'cancelled'],
  triaged:      ['planned', 'scheduled', 'backlog', 'blocked', 'cancelled'],
  planned:      ['scheduled', 'triaged', 'backlog', 'blocked', 'cancelled'],
  scheduled:    ['in_progress', 'planned', 'blocked', 'cancelled'],
  in_progress:  ['self_review', 'testing', 'blocked', 'cancelled'],
  self_review:  ['testing', 'in_progress', 'blocked', 'cancelled'],
  testing:      ['review_ready', 'in_progress', 'self_review', 'blocked', 'cancelled'],
  review_ready: ['approved', 'testing', 'in_progress', 'blocked', 'cancelled'],
  approved:     ['done', 'testing', 'blocked', 'cancelled'],
  done:         ['backlog'],  // reopening
  blocked:      ['backlog', 'triaged', 'planned', 'scheduled', 'in_progress',
                 'self_review', 'testing', 'review_ready', 'cancelled'],
  cancelled:    ['backlog'],  // reopening
};

// ── Status display labels ───────────────────────────────────────
const STATUS_LABELS = {
  backlog: 'Backlog',
  triaged: 'Triaged',
  planned: 'Planned',
  scheduled: 'Scheduled',
  in_progress: 'In Progress',
  self_review: 'Self Review',
  testing: 'Testing',
  review_ready: 'Review Ready',
  approved: 'Approved',
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
    exit_action: 'Triage: review priority, assign category, set horizon',
    exit_by: 'admin',
  },
  triaged: {
    owner: 'admin',
    exit_action: 'Plan: define implementation approach, set repo_target',
    exit_by: 'admin',
  },
  planned: {
    owner: 'admin',
    exit_action: 'Schedule: set start/end dates, assign to agent',
    exit_by: 'admin',
  },
  scheduled: {
    owner: 'admin',
    exit_action: 'Start work: agent picks up item and creates branch',
    exit_by: 'agent',
  },
  in_progress: {
    owner: 'agent',
    exit_action: 'Complete implementation: commit all changes, signal completion',
    exit_by: 'agent',
  },
  self_review: {
    owner: 'agent',
    exit_action: 'Self-check: verify build, lint, no regressions — push to remote',
    exit_by: 'agent',
  },
  testing: {
    owner: 'agent',
    exit_action: 'Verify: run tests, confirm CI passes — mark ready for review',
    exit_by: 'agent',
  },
  review_ready: {
    owner: 'admin',
    exit_action: 'Review: inspect changes, test in staging — approve or reject',
    exit_by: 'admin',
  },
  approved: {
    owner: 'admin',
    exit_action: 'Deploy: merge to main, deploy to production, close item',
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
  scheduled: (item) => {
    if (!item.schedule_start || !item.schedule_end) {
      return 'Cannot move to Scheduled until schedule_start and schedule_end are set.';
    }
    return null;
  },

  in_progress: (item) => {
    // Branch must exist or will be created by the transition handler
    // Just validate repo_target is set
    if (!item.repo_target) {
      return 'Cannot move to In Progress — repo_target must be set (omai or orthodoxmetrics).';
    }
    return null;
  },

  self_review: (item) => {
    if (!item.github_branch) {
      return 'Cannot move to Self Review — no branch exists. Start work first.';
    }
    // Check that changes exist (branch should have commits)
    return null;
  },

  testing: (item) => {
    if (!item.github_branch) {
      return 'Cannot move to Testing — no branch exists.';
    }
    // Backend will verify push status during transition
    return null;
  },

  review_ready: (item) => {
    if (!item.github_branch) {
      return 'Cannot move to Review Ready — no branch exists.';
    }
    return null;
  },

  approved: (item) => {
    if (!item.github_branch) {
      return 'Cannot move to Approved — no branch exists.';
    }
    return null;
  },

  done: (item) => {
    if (!item.github_branch) {
      // Allow done without branch for items that don't need one
      return null;
    }
    // Backend will verify clean working tree during transition
    return null;
  },

  blocked: (item) => {
    // Must provide a reason
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
      case 'testing': {
        // Branch must be pushed to remote
        const existsRemote = repoService.branchExistsRemote(item.repo_target, item.github_branch);
        if (!existsRemote) {
          errors.push('Cannot move to Testing — branch has not been pushed to remote.');
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
