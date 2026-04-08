# AI Agent Development Workflow

> **Last Updated:** 2026-04-01
> **Applies to:** All AI agents (Claude CLI, Cursor, Windsurf)

---

## 0. Enter Your Workspace

Before doing anything, navigate to your assigned worktree:

```bash
# Claude CLI
cd /var/www/omai-workspaces/agent-claude

# Cursor
cd /var/www/omai-workspaces/agent-cursor

# Windsurf
cd /var/www/omai-workspaces/agent-windsurf
```

**Never work from `/var/www/omai/` directly — it is deploy-only.**
Pre-commit hooks will block you if you try.

---

## 1. Authenticate (omsvc service account)

```bash
TOKEN=$(curl -s -X POST http://127.0.0.1:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"nickeypain@gmail.com","password":"OmSvc2026!"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))")
```

Token is valid for 15 minutes. Re-login if needed.

---

## 2. Check for Assigned Plans

```bash
curl -H "Authorization: Bearer $TOKEN" http://127.0.0.1:3001/api/prompt-plans/agent/claude_cli
```

If a plan exists, follow `next_step.prompt_text` instead of creating your own item.

---

## 3. Create OMAI Daily Work Item

```bash
curl -s -X POST http://127.0.0.1:7060/api/omai-daily/items \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"title":"Short description","task_type":"bugfix","status":"backlog",
       "source":"agent","agent_tool":"claude_cli","priority":"medium",
       "category":"om-frontend","description":"What and why"}'
```

- Do this proactively at the start of every task, without being asked
- Valid `task_type`: feature, enhancement, bugfix, refactor, migration, chore, spike, docs
- Valid `category`: om-frontend, om-backend, om-database, om-ocr, om-records, om-admin, om-portal, om-auth, om-devops, omai-frontend, omai-backend, omai-sdlc, omai-ai, docs
- Status must be `backlog` (not todo)

---

## 4. Start Work (creates branch, sets in_progress)

**Ensure you are in your workspace directory before calling this.**

```bash
curl -s -X POST http://127.0.0.1:7060/api/omai-daily/items/:id/start-work \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"branch_type":"bugfix","agent_tool":"claude_cli"}'
```

This creates and checks out a branch in the format `<type>/omd-<id>/<date>/<slug>`.

| branch_type                         | Branch prefix |
|-------------------------------------|---------------|
| feature / enhancement / spike       | `feature`     |
| bugfix                              | `fix`         |
| refactor / migration / chore / docs | `chore`       |

After this step, confirm you're on the right branch:

```bash
git branch --show-current
# Should show something like: fix/omd-42/2026-04-01/login-crash
```

---

## 5. Do the Work

- Make code changes, commit to the branch **from your workspace**
- For large tasks, update progress (0-100) via PATCH
- Apply changes to both `src/` and `dist/` for JS files (immediate effect)
- TS changes: edit `src/`, then rebuild

**Push your branch to the remote regularly:**

```bash
git push -u origin HEAD
```

---

## 6. Signal Agent Complete (moves to self_review)

```bash
curl -s -X POST http://127.0.0.1:7060/api/omai-daily/items/:id/agent-complete \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"agent_tool":"claude_cli","summary":"Brief description of what was done"}'
```

Always call this when finished. Idempotent — safe to call multiple times.

---

## 7. Create Pull Request

After agent-complete, open a PR against `main` on GitHub:

```bash
# Ensure all changes are pushed
git push origin HEAD

# Create the PR using the GitHub CLI
gh pr create \
  --base main \
  --head "$(git branch --show-current)" \
  --title "OMD-<id>: Short description of change" \
  --body "## Summary
<Brief description of what was done and why>

## OMAI Daily Item
- **Item ID:** <id>
- **Task Type:** <bugfix|feature|etc>
- **Category:** <category>

## Changes
- <bullet list of key changes>

## Testing
- <how this was tested>

## Agent
- **Tool:** claude_cli
- **Workspace:** /var/www/omai-workspaces/agent-claude" \
  --label "agent-pr"
```

**PR Rules:**
- One PR per work item — matches the one-branch-per-item rule
- PR title must include the OMD item ID
- Never self-merge — admin review is required
- If `main` has diverged, rebase your branch before creating the PR:
  ```bash
  git fetch origin main
  git rebase origin/main
  git push --force-with-lease
  ```

---

## 8. Deploy (if applicable)

```bash
/var/omai-ops/scripts/orthodoxmetrics/om-deploy.sh       # full
/var/omai-ops/scripts/orthodoxmetrics/om-deploy.sh be    # backend only
/var/omai-ops/scripts/orthodoxmetrics/om-deploy.sh fe    # frontend only
```

Never manually build/copy/restart. Always use the deploy script.

---

## 9. (Admin step) Review & Merge

These are admin-owned steps — agents cannot self-approve:

1. **Review** → Admin reviews the PR on GitHub (auto-set by PR opened webhook)
2. **Staging** → Admin approves the PR (auto-set by PR approved webhook)
3. **Done** → Admin merges the PR (auto-set by PR merged webhook)

The merge uses `--ff-only` via the deploy script. If the PR can't fast-forward, the agent will be asked to rebase.

---

## SDLC Status Flow (Canonical 9-Status Model)

```
draft → backlog → in_progress → self_review → review → staging → done
                                      ↑ agent stops here (calls agent-complete)
blocked (from any active status)
cancelled (from any status)
```

> `draft` is the structured intake holding pen. Items are shaped here before backlog promotion.
> Agents create items at `backlog` (skipping draft). The full intake flow is for UI-created items.

---

## Workspace Rules

| Directory | Purpose | Who writes |
|---|---|---|
| `/var/www/omai/` | Production deploy target | Deploy script only |
| `/var/www/omai-workspaces/agent-claude/` | Claude CLI worktree | Claude |
| `/var/www/omai-workspaces/agent-cursor/` | Cursor worktree | Cursor |
| `/var/www/omai-workspaces/agent-windsurf/` | Windsurf worktree | Windsurf |

- Agents **must not** `cd` into `/var/www/omai/` to make changes
- Agents **must not** check out `main` in their worktree
- Agents **must not** commit to another agent's branch
- All three rules are enforced by git hooks (see `omai-workspace-guard.sh`)

---

## Key Rules

- Agents own: `in_progress`, `self_review`
- Admins own: `backlog`, `review`, `staging`, `done`
- `blocked` and `cancelled` — any actor
- Agents pass `actor_type: "agent"` in status calls
- One branch per item, one PR per branch
- `complete-work` uses `git merge --ff-only` — rebase if main has diverged
- Clean working tree required before complete-work
- If abandoned, set status `"cancelled"` with reason
- Backend enforces transition matrix — invalid transitions are rejected
