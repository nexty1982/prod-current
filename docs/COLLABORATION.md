# Orthodox Metrics Collaboration Guide

How developers and AI agents work together on this codebase.

## Branching Strategy

**All work happens on feature branches off `dev`.**

### Branch Naming
```
feature/<short-description>    # New features
fix/<short-description>        # Bug fixes
chore/<short-description>      # Maintenance, deps, CI
docs/<short-description>       # Documentation only
```

Examples:
- `feature/baptism-record-export`
- `fix/login-session-timeout`
- `chore/upgrade-react-19`

### Workflow
1. Create branch from `dev`
2. Make changes, commit often
3. Push and open PR
4. CI must pass
5. Get review (see Review Rules below)
6. Squash merge to `dev`

---

## File Claiming (Conflict Prevention)

To prevent multiple agents/developers from editing the same files simultaneously, we use a **claim file**.

### Location
```
.claims/active.json
```

### Format
```json
{
  "claims": [
    {
      "files": ["server/src/routes/authRoutes.js", "server/src/middleware/auth.js"],
      "claimedBy": "claude-code",
      "branch": "fix/session-timeout",
      "claimedAt": "2026-02-03T12:00:00Z",
      "description": "Fixing session timeout handling"
    }
  ]
}
```

### Rules
1. **Before editing**: Check `active.json` for conflicts
2. **Claim files**: Add your claim before starting work
3. **Release claims**: Remove your claim when PR is merged or abandoned
4. **Stale claims**: Claims older than 24 hours without commits can be overridden
5. **Whole directories**: Claim `server/src/routes/*` for broad work

### Checking Claims (script)
```bash
scripts/check-claims.sh <file-path>
# Returns 0 if unclaimed, 1 if claimed by another
```

---

## Review & Merge Rules

### Auto-Merge (AI can merge without human review)
Small, low-risk changes that meet ALL criteria:
- [ ] CI passes (all checks green)
- [ ] Change is one of:
  - Typo/spelling fixes
  - Comment updates
  - Dependency version bumps (patch only)
  - Adding to `.gitignore`
  - Fixing linter warnings
  - Test-only changes
- [ ] Touches ≤ 3 files
- [ ] No changes to auth, payments, or data models

### Human Review Required
Any change that:
- Adds new features or UI
- Modifies authentication/authorization
- Changes database schema or migrations
- Modifies API contracts
- Touches more than 3 files
- Includes any security-sensitive code
- Deletes functionality

### PR Labels
- `auto-merge` - AI can merge after CI passes
- `needs-review` - Requires human approval
- `wip` - Work in progress, don't review yet
- `blocked` - Waiting on something external

---

## CI Requirements

All PRs must pass:
1. **Check** - Repo guard rules (docs location, no prod/ paths)
2. **Build Server** - `npm ci && npm run build` in server/
3. **Build Frontend** - `npm ci && npm run build` in front-end/
4. **E2E Tests** - Playwright tests must pass

---

## AI Agent Guidelines

### Before Starting Work
1. Pull latest `dev`
2. Check `.claims/active.json` for conflicts
3. Create feature branch
4. Add your file claims

### Commit Messages
```
<type>: <short description>

<optional body>

Co-Authored-By: <Agent Name> <noreply@anthropic.com>
```

Types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`

### When Finished
1. Ensure CI passes
2. Determine if auto-merge or needs-review
3. Add appropriate PR label
4. If auto-merge eligible and CI green, merge
5. Release file claims
6. Delete branch

### Communication
- Use PR descriptions to explain changes
- Tag `@nexty1982` for human review when needed
- Leave comments on complex code sections

---

## Directory Ownership (Soft Boundaries)

While anyone can work anywhere, these are suggested domains to minimize conflicts:

| Directory | Primary Owner | Notes |
|-----------|--------------|-------|
| `server/src/routes/` | - | Core API, high coordination needed |
| `server/src/services/` | - | Business logic |
| `front-end/src/views/` | - | Page components |
| `front-end/src/components/` | - | Shared components |
| `.github/workflows/` | - | CI/CD config |
| `docs/` | Any | Documentation |

---

## Quick Reference

```bash
# Start new work
git checkout dev && git pull
git checkout -b feature/my-feature

# Check for claim conflicts
cat .claims/active.json

# Run guards locally before pushing
scripts/check-repo-guards.sh

# Fix misplaced docs automatically
scripts/check-repo-guards.sh --fix
```
