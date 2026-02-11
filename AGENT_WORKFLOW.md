# OrthodoxMetrics Official Agent Development Workflow

This document defines how all AI agents must operate within this repository.

If a change violates this workflow, the work is invalid and must be redone.

---

## 1. Branching Rules

Agents **MUST NOT** commit directly to `dev` or `main`.

All work begins on a properly named local branch:

```text
{type}/{agentColor}/{yyyy-mm-dd}/{short-scope}
```

### Types
- `feature` — new functionality
- `bugfix` — fixes broken behavior
- `patch` — significant structural/architectural work

### Agent colors
Assigned by the repo owner:
- `blue`
- `green`
- `yellow`

### Examples
```text
feature/blue/2026-02-11/refactor-console-sessions
bugfix/green/2026-02-11/search-focus-fix
patch/yellow/2026-02-11/dynamic-record-engine-hardening
```

---

## 2. What Counts as a Patch

A patch is **not**:
- minor refactor
- small UI tweak
- single-file cleanup
- cosmetic update

A patch **is** work that meets at least **two**:
- touches 5+ files
- spans multiple directories
- modifies core system logic (auth, dynamic records, schema engine, refactor-console, build system, etc.)
- requires a DB migration
- changes shared infrastructure
- alters deployment pipeline
- introduces architectural change

If it doesn't meet the criteria, use `feature` or `bugfix`.

---

## 3. Required Workflow Sequence

### Step 1 — Create the branch
```bash
git checkout dev
git pull
git checkout -b {branchName}
```

### Step 2 — Commit format
Commit messages must start with:

```text
[FEATURE|BUGFIX|PATCH] (blue|green|yellow) OrthodoxMetrics
```

Recommended body:
- 1–3 bullets, clear and specific

Example:
```text
[FEATURE] (blue) OrthodoxMetrics

- Added server-side refactor sessions with persistence
- Implemented SHA256 hashing + diff3 validation
- Added PR branch naming enforcement workflow
```

### Step 3 — Preflight validation (before PR)
- TypeScript compile passes
- Backend build passes
- Frontend build passes
- Working tree is clean (only committed changes)
- No new console errors

### Step 4 — PR rules
- Base branch: `dev`
- **Agents may NOT merge their own PRs**
- All merges are performed by the repo owner (**gatekeeping is mandatory**)

PR title format:
```text
{TYPE}: {short summary} ({agentColor} - yyyy-mm-dd)
```

---

## 4. Release Workflow (Owner Only)

Release branch:
```text
release/{version}
```

Process:
1. Merge `dev` → `release/{version}`
2. Final validation
3. Tag and push:
```bash
git tag -a vX.Y.Z -m "OrthodoxMetrics vX.Y.Z"
git push origin vX.Y.Z
```

---

## 5. Versioning (SemVer)

```text
MAJOR.MINOR.PATCH
```

- PATCH — bug fixes only
- MINOR — new features
- MAJOR — breaking changes / schema changes

---

## 6. File Creation & Directory Rules

Agents must NOT create files arbitrarily.

### Forbidden locations (no direct file creation)
- `server/` (i.e., `server/<file>`)
- `front-end/` (i.e., `front-end/<file>`)
- repository root `/` (except allowlisted top-level files)

Allowed patterns:
- `server/src/...` (or existing server module directories)
- `front-end/src/...`

### Prohibited behaviors
- random utilities at repo root
- vague filenames (`temp.ts`, `new.ts`, `helper.ts`, etc.)
- duplicating logic instead of extending existing modules
- circular dependencies

---

## 7. Hook Installation (Required)

All agents must run this once per clone:

```bash
bash tools/githooks/install.sh
```

---

## 8. Enforcement

Violations:
- must be rejected
- must not be merged
- must be redone under the correct workflow
