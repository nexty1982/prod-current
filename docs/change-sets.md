# Change Sets — Operator Runbook

The change_set is the delivery container for the OrthodoxMetrics SDLC. It groups OM Daily work items into a single reviewable, stageable, promotable unit that tracks the full journey from development through production deployment.

This document describes how the system works and how to operate it correctly.

## Lifecycle Overview

Every change_set moves through a linear status chain. Two transitions are handled by the deploy script (`om-deploy.sh`), not the UI. One transition reverses direction (rejection). One is a terminal escape hatch (rollback).

```
                                   ┌────────────────────┐
                                   │                    │
  draft ─→ active ─→ ready_for_staging ─→ staged ─→ in_review ─→ approved ─→ promoted
                         ▲                                  │                    │
                         │                                  │                    │
                         │              rejected ◄──────────┘                    │
                         │                  │                                    ▼
                         └──────────────────┘                             rolled_back
```

| Transition | Triggered By | Notes |
|---|---|---|
| draft → active | UI button | Signals work has begun |
| active → ready_for_staging | UI button | Requires: items linked, all required items done/review, git_branch set |
| ready_for_staging → staged | `om-deploy.sh stage` | Builds code, copies to dist-staging, records commit SHA |
| staged → in_review | UI button | Signals review has begun |
| in_review → approved | UI button | Locks approved_commit_sha. Requires review_notes if DB changes present |
| in_review → rejected | UI button | Requires rejection_reason. Clears all staging/approval data |
| approved → promoted | `om-deploy.sh promote` | Deploys to production, verifies commit SHA match |
| rejected → active | UI button | Clears rejection data. Change set returns to active for rework |
| promoted → rolled_back | UI button | Administrative marker only — does not auto-revert code |

### What the UI shows at each status

| Status | UI Action Buttons | CLI Hint |
|---|---|---|
| draft | Activate | — |
| active | Mark Ready | — |
| ready_for_staging | _(none)_ | "Run `om-deploy.sh stage CS-XXXX`" |
| staged | Start Review | — |
| in_review | Approve, Reject | — |
| approved | _(none)_ | "Run `om-deploy.sh promote CS-XXXX`" |
| promoted | Roll Back | — |
| rejected | Activate | Rejection reason displayed |
| rolled_back | _(none)_ | — |

The "Mark Staged" and "Mark Promoted" transitions are intentionally absent from the UI. They require build data (commit SHA, build run ID) that only the deploy script can provide.

## When to Create a Change Set

### One change_set per deploy

A change_set represents one deployment to production. Group work items that should ship together — they will be staged as a unit, reviewed as a unit, and promoted as a unit.

**Create one change_set when:**
- A set of items forms a logical feature or fix
- The items share a single git branch
- You want them reviewed and deployed together

**Create separate change_sets when:**
- Items are on different branches
- One item is urgent (hotfix) and others are not
- Items can be deployed independently and have different review timelines

### Sizing guidance

A good change_set has 2-15 OM Daily items. A single-item change_set is fine for hotfixes. An empty change_set cannot be staged — at least one item must be linked.

## OM Daily Item Grouping

Items are linked to change_sets through the `change_set_items` junction table. There is no `change_set_id` column on `om_daily_items`.

**Rules:**
- An OM Daily item can belong to at most one active change_set (active meaning not promoted, rejected, or rolled_back)
- Items can only be added or removed when the change_set is in `draft` or `active` status
- All **required** items must have OM Daily status of `done` or `review` before the change_set can move to `ready_for_staging`
- Items marked as optional (`is_required = false`) do not block staging

**To add an item:** On the change_set detail page, click "Add Item" and enter the OM Daily item ID number.

**To remove an item:** Click the delete icon next to the item in the linked items table.

## Branch Naming

The deploy script enforces a branch naming convention:

```
feature/<username>/<YYYY-MM-DD>/<description>
```

Examples:
```
feature/nectarios/2026-03-08/portal-polish
feature/admin/2026-03-10/hotfix-session-bug
```

Rules:
- Username: lowercase alphanumeric and hyphens
- Date: ISO format (YYYY-MM-DD)
- Description: lowercase alphanumeric and hyphens

**Branch uniqueness:** Two active change_sets cannot share the same `git_branch`. The system blocks duplicate branch assignment at both create and update time. A branch is freed when its change_set reaches `promoted`, `rejected`, or `rolled_back` status.

**Branch matching during staging:** When running `om-deploy.sh stage CS-XXXX`, if the change_set has a `git_branch` set, the current git branch must match exactly. This prevents accidentally staging the wrong code.

## Deploy Commands

### Stage

```bash
./scripts/om-deploy.sh stage CS-0042
```

**What it does:**
1. Validates change_set is `ready_for_staging`
2. Validates current git branch matches the change_set's `git_branch`
3. Builds backend (TypeScript compile, asset copy, verification)
4. Builds frontend (Vite production build)
5. Copies `front-end/dist` to `front-end/dist-staging` for the version switcher
6. Restarts the backend service
7. Runs health check
8. Transitions change_set to `staged` with the build run ID and commit SHA

**Preconditions:**
- Change_set status must be `ready_for_staging`
- Branch must match (if set on the change_set)
- Only one change_set can be staged at a time (staging slot exclusivity)

**After staging:** Review the staged build using the version switcher (switch to "staging" in the Customizer). Then transition to `in_review` and proceed with approval.

### Promote

```bash
./scripts/om-deploy.sh promote CS-0042
```

**What it does:**
1. Validates change_set is `approved`
2. Validates current HEAD commit matches the `approved_commit_sha` (drift protection)
3. Builds backend + frontend
4. Deploys to production (overwrites `dist`)
5. Restarts the backend service
6. Runs health check
7. Transitions change_set to `promoted` with production build run ID and commit SHA

**Preconditions:**
- Change_set status must be `approved`
- HEAD commit SHA must match what was approved (no new commits since approval)

### Hotfix

```bash
./scripts/om-deploy.sh hotfix CS-0042
```

**What it does:**
1. Validates change_set has at least one linked item
2. If the change_set's `deployment_strategy` is `stage_then_promote` (not `hotfix_direct`), shows a warning and requires confirmation
3. Builds and deploys to production
4. Fast-tracks the change_set through the entire lifecycle: draft → active → ready_for_staging → staged → in_review → approved → promoted
5. Auto-approves with review notes "Hotfix auto-approved"

**When to use:** Emergency production fixes only. The hotfix flow bypasses normal review. The fast-track is recorded in the event log for audit.

## Deployment Strategy

Each change_set has a `deployment_strategy` field:

| Strategy | Workflow | Use Case |
|---|---|---|
| `stage_then_promote` | stage → review → approve → promote | Default. All normal work |
| `hotfix_direct` | hotfix (fast-track) | Emergency fixes that cannot wait for review |

Set the strategy when creating the change_set. If you run `om-deploy.sh hotfix` on a `stage_then_promote` change_set, the script warns you and asks for confirmation before proceeding.

## Rejection and Rework

When a change_set is rejected during review:

1. **Reviewer clicks "Reject"** and provides a required rejection reason
2. **Status becomes `rejected`** — the rejection reason and reviewer are recorded
3. **All staging and approval data is cleared:**
   - `staging_commit_sha` → null
   - `staging_build_run_id` → null
   - `staged_at` → null
   - `approved_commit_sha` → null
   - `approved_at` → null
4. **Reviewer clicks "Activate"** to return the change_set to `active` status
   - Rejection reason and timestamp are cleared
5. **Items can be modified** again (add/remove)
6. **Full re-staging required** — the change_set must go through ready_for_staging → staged → in_review → approved again

The rejection path is `in_review → rejected → active`. Rejected change_sets return to `active`, not `draft`, because the work has already begun.

## Commit SHA Drift Protection

The system tracks three commit SHAs:

| Field | Set When | Purpose |
|---|---|---|
| `staging_commit_sha` | Staged via `om-deploy.sh stage` | Records what code was staged |
| `approved_commit_sha` | Approved in UI | Automatically locked to `staging_commit_sha` value |
| `prod_commit_sha` | Promoted via `om-deploy.sh promote` | Records what code went to production |

**Drift detection:** When promoting, the system checks that the current HEAD commit matches `approved_commit_sha`. If the branch has new commits since approval, promotion is blocked with:

```
Commit SHA drift detected. Approved: <sha>, Promoting: <sha>.
Re-stage and re-approve required.
```

**To resolve drift:** The change_set must be rejected, re-staged, and re-approved with the current code.

## DB-Change Review Requirements

Change_sets that include database changes have additional safeguards:

1. **Set `has_db_changes` to true** when creating or editing the change_set
2. **List migration files** in the `migration_files` field (displayed in the UI as a warning banner)
3. **Review notes are required** when approving — the approve button is disabled until notes are entered

The UI displays a prominent warning banner:

> **Database changes included.**
> Migration files: `add_column.sql`

This ensures migration files are explicitly acknowledged during review.

## Release History

Navigate to `/admin/control-panel/om-daily/change-sets/releases` or click "Release History" from the dashboard.

The release history shows all change_sets that have reached `promoted` or `rolled_back` status, ordered by promotion date descending. Each entry shows:

- Code and title
- Status (Promoted or Rolled Back)
- Change type
- Production commit SHA
- Item count
- Reviewer
- Promotion timestamp

Click any row to view the full detail page with event timeline.

## Rollback Status

Marking a change_set as `rolled_back` is an **administrative status marker**. It does not automatically revert code.

**To handle a production rollback:**
1. Deploy a code revert or restore from snapshot using standard procedures
2. On the change_set detail page, click "Roll Back" to mark the status
3. The change_set appears in release history with "Rolled Back" label

The `rolled_back` status is terminal — a rolled-back change_set cannot be re-promoted. Create a new change_set for any follow-up work.

## Staging Slot Exclusivity

Only one change_set can occupy the staging slot at a time. The staging slot is occupied when a change_set has status `staged` or `in_review`.

If you attempt to stage a second change_set while the slot is occupied:

```
Staging slot occupied by CS-0041. Only one change_set can be staged at a time.
Promote or reject CS-0041 first.
```

**To free the slot:** Either promote or reject the currently staged change_set.

## Code Format

Change_sets are assigned a stable short code on creation: `CS-XXXX` where XXXX is the zero-padded database ID.

- CS-0001, CS-0042, CS-0123
- Codes are unique and permanent
- Both the UI and CLI accept either the numeric ID or the CS code

## Permissions

All change_set operations require `super_admin` role. This includes:
- Creating, reading, updating change_sets
- Adding/removing items
- All status transitions
- Viewing release history

The feature is registered at stage 3 (Review) in the feature registry, making it visible only to super_admin users.

## Common Mistakes to Avoid

### 1. Staging without items
An empty change_set cannot be staged. Always link at least one OM Daily item before marking ready. The system blocks this with: "Cannot stage an empty change_set."

### 2. Forgetting to set the git branch
`ready_for_staging` requires a `git_branch`. Set it when creating the change_set or update it while still in draft/active status.

### 3. Making commits after approval
Any new commit after approval causes SHA drift. The promote command will fail. You must reject, re-stage, and re-approve.

### 4. Trying to stage/promote from the UI
These transitions are CLI-only via `om-deploy.sh`. The UI shows informational hints telling you which command to run.

### 5. Running `om-deploy.sh stage` on the wrong branch
If the change_set has a `git_branch` set and your current branch does not match, staging is blocked. Switch to the correct branch first.

### 6. Staging while another change_set is in review
The staging slot is shared. Promote or reject the existing staged change_set before staging a new one.

### 7. Updating metadata after staging
Title, description, priority, and other metadata can only be edited in `draft` or `active` status. Plan your metadata before marking ready.

### 8. Using hotfix for non-emergencies
The hotfix flow bypasses review. Use `stage_then_promote` for all normal work. Hotfixes are recorded in the audit log and should be justified.

### 9. Assuming rollback reverts code
Marking a change_set as `rolled_back` is a bookkeeping action. You must separately deploy a code revert or restore from backup.

### 10. Adding the same item to multiple active change_sets
An OM Daily item can only belong to one non-terminal change_set. If an item is already in an active change_set, you'll see: "Item 42 is already in active change_set CS-0003 (active)."

## API Reference

All endpoints are at `/api/admin/change-sets` and require `super_admin` authentication.

| Method | Path | Description |
|---|---|---|
| GET | `/` | List change_sets with optional `status`, `change_type`, `priority` filters |
| GET | `/releases` | Release history (promoted/rolled_back only) |
| POST | `/memberships` | Batch lookup: which change_set owns which OM Daily items |
| GET | `/:id` | Get single change_set (accepts numeric ID or CS-XXXX code) |
| POST | `/` | Create new change_set |
| PUT | `/:id` | Update metadata (draft/active only) |
| POST | `/:id/transition` | Status transition |
| POST | `/:id/items` | Add OM Daily item |
| DELETE | `/:id/items/:itemId` | Remove OM Daily item |
| POST | `/:id/notes` | Add note to event timeline |
| GET | `/:id/events` | Fetch event timeline |

## Event Timeline

Every action on a change_set is recorded in the append-only event log:

| Event Type | When |
|---|---|
| `created` | Change_set created |
| `item_added` | OM Daily item linked |
| `item_removed` | OM Daily item unlinked |
| `status_changed` | draft→active, active→ready_for_staging, rejected→active |
| `staged` | Transitioned to staged via deploy script |
| `review_started` | Transitioned to in_review |
| `approved` | Approved by reviewer |
| `rejected` | Rejected by reviewer |
| `promoted` | Deployed to production via deploy script |
| `rolled_back` | Marked as rolled back |
| `note_added` | Manual note added |

Each event records: user, timestamp, from_status, to_status, message, and optional metadata (build run IDs, commit SHAs).

Status transitions and their audit events are written in the same database transaction — a status change cannot persist without its event record.
