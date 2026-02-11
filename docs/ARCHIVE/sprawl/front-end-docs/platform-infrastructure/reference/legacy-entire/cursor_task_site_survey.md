# Cursor Task — OrthodoxMetrics PROD Site Survey & Cleanup Plan

You are operating on the server **/var/www/orthodoxmetrics/prod**. Produce a **read-only inventory first**, then a **surgical cleanup plan**, plus **optional automation scripts**. Do **not** delete or mutate anything without explicit “APPLY” steps at the end.

## Objectives
1. **Inventory**: Generate a complete, structured survey of the prod tree:
   - Directory map; flagged items: large files (>50MB), node_modules (multiple copies), `.log` files, `.env*` files, duplicate/near-duplicate files, broken symlinks.
   - **Front-end**:
     - Vite/React routing map (actual routes vs files in `src/routes`, `src/pages`).
     - Component usage graph; list unreferenced components and assets.
     - Build errors: run `pnpm tsc --noEmit` and `pnpm vite build` (capture errors/warnings).
     - Imports that reference **nonexistent** files (like `../components/registry/ComponentRegistry`).
   - **Back-end**:
     - Express route map (METHOD + PATH → file).
     - Controllers/services map; list handlers declared but **unreachable**.
     - .env keys actually read by server code (grep/AST), and **unused/missing** keys.
     - List DB connection strings and confirm they target **orthodoxmetrics_db** (not `orthodoxmetrics_auth_db`).
   - **Nginx/PM2** (best-effort):
     - If available, capture PM2 process list and working directories (`pm2 jlist`).
     - If accessible, note Nginx site conf path and upstreams (read-only).

2. **Mismatch & Risk Report**:
   - UI → API → DB mismatches (endpoints called in FE with no BE handler; handlers with no FE caller).
   - Hardcoded paths vs actual file locations.
   - Duplicate environment files and drift (e.g., `.env`, `.env.prod`, `.env.production.local`).
   - Packages installed but unused (and vice versa).

3. **Actionable Cleanup Plan** (no deletions yet):
   - Categorize into **Safe Remove**, **Archive**, **Refactor Needed**, **Investigate**.
   - Generate **atomic scripts** for each category (dry-run + apply), with clear prompts.

4. **Artifacts** (write to repo root or `./ops/survey/`):
   - `ops/survey/omx-survey.json` — machine-readable summary.
   - `ops/survey/omx-survey-report.md` — human report with tables and next steps.
   - `ops/survey/omx-cleanup-dryrun.sh` — prints what would be removed/moved.
   - `ops/survey/omx-cleanup-apply.sh` — performs moves to `./.archive/<date>/` (no hard deletes).
   - `ops/survey/omx-verify.sh` — re-run builds/lints/tests post-cleanup.

## Constraints & Style
- **Read-only first**. No deletes/renames until `omx-cleanup-apply.sh` is explicitly run.
- Use **AST** where helpful (JS/TS) to avoid brittle greps (e.g., build an Express route map from `router.METHOD("path")`).
- Assume monorepo-ish structure: `front-end/` and `server/` exist under `/var/www/orthodoxmetrics/prod`.
- Prefer **idempotent** scripts; all shell scripts must exit nonzero on error (`set -euo pipefail`).
- Keep paths **relative** to `/var/www/orthodoxmetrics/prod`.

## Deliverables & File Layout
Create the following (scaffold if missing):
```
/var/www/orthodoxmetrics/prod/
  ops/
    survey/
      omx-survey.json
      omx-survey-report.md
      omx-cleanup-dryrun.sh
      omx-cleanup-apply.sh
      omx-verify.sh
    tools/
      omx-express-routes.ts
      omx-fe-routes.ts
      omx-component-usage.ts
      omx-env-audit.ts
      omx-dup-finder.ts
      omx-large-files.ts
      omx-broken-symlinks.sh
```
All TS tools should be runnable with `pnpm tsx`. Bash tools with `bash`.

## Implementation Checklist (Step-by-step)

### 1) Bootstrap (package.json dev deps if missing)
- Ensure these devDeps exist (add if missing):
  - `@babel/parser`, `@babel/traverse`, `fast-glob`, `tsx`, `zod`, `globby`, `depcheck`
- Add NPM scripts:
```jsonc
{
  "scripts": {
    "survey:routes:be": "tsx ops/tools/omx-express-routes.ts",
    "survey:routes:fe": "tsx ops/tools/omx-fe-routes.ts",
    "survey:usage:fe": "tsx ops/tools/omx-component-usage.ts",
    "survey:env": "tsx ops/tools/omx-env-audit.ts",
    "survey:dups": "tsx ops/tools/omx-dup-finder.ts",
    "survey:large": "tsx ops/tools/omx-large-files.ts",
    "survey:symlinks": "bash ops/tools/omx-broken-symlinks.sh",
    "survey:depcheck": "depcheck --json",
    "survey:all": "pnpm -s survey:routes:be && pnpm -s survey:routes:fe && pnpm -s survey:usage:fe && pnpm -s survey:env && pnpm -s survey:dups && pnpm -s survey:large && pnpm -s survey:symlinks"
  }
}
```

### 2) Back-end Express Route Map — `ops/tools/omx-express-routes.ts`
- Parse `server/src/**/*.{ts,js}` for `router.<method>("/api/...")` and build a JSON: `{ method, path, file }[]`.
- Detect handlers that are never `use`d or exported (`unused_back`).

### 3) Front-end Route Map — `ops/tools/omx-fe-routes.ts`
- Parse `front-end/src/**/*.{tsx,ts,jsx,js}` for `<Route path="...">` (React Router) and any `fetch/axios` calls to `/api/...`.
- Output pages with their API calls; flag calls to non-existent BE routes.

### 4) Component Usage Graph — `ops/tools/omx-component-usage.ts`
- Build an import graph; output components not referenced anywhere.
- Also search for imports pointing to **missing files** (e.g., the ComponentRegistry error).

### 5) Env Audit — `ops/tools/omx-env-audit.ts`
- Collect keys from `.env*` files in repo.
- Search code for `process.env.X` and config loaders; report **unused** keys and **missing** keys.
- Highlight any references to `orthodoxmetrics_auth_db`; recommend switching to `orthodoxmetrics_db`.

### 6) Duplicates/Large/Broken
- `ops/tools/omx-dup-finder.ts`: same-hash file duplicates (SHA-1) for `/front-end/src/assets`, `/public`, etc.
- `ops/tools/omx-large-files.ts`: list files > 50MB with path and size.
- `ops/tools/omx-broken-symlinks.sh`: `find . -xtype l -print`.

### 7) Aggregate → `ops/survey/omx-survey.json` + `omx-survey-report.md`
- Combine all tool outputs into a single JSON.
- Render a markdown report with tables:
  - **Routes FE ↔ BE**, **Missing handlers**, **FE calls to nowhere**, **Unreferenced components**, **Missing imports**, **Env drift**, **Duplicates**, **Large files**, **Broken symlinks**, **Depcheck unused**.
- Include **Recommended Actions** with exact file paths.

### 8) Cleanup Scripts
- `ops/survey/omx-cleanup-dryrun.sh`: move candidates into `./.archive/$(date +%F)/...` but **echo only** by default.
- `ops/survey/omx-cleanup-apply.sh`: same as dry-run but actually `mkdir -p` and `git mv` (if repo) or `mv`.
- `ops/survey/omx-verify.sh`: runs `pnpm tsc --noEmit`, `pnpm -s -w vite build` or relevant build scripts, and a quick health check script if available.

### 9) Acceptance Criteria
- `ops/survey/omx-survey-report.md` exists with:
  - A complete BE/FE route matrix and mismatch list.
  - A list of **missing imports** and the files that reference them.
  - Env key audit with **unused** and **missing** keys.
  - Duplicates/large/broken symlink lists.
- Cleanup scripts are **idempotent** and no-op if nothing to do.
- No files are deleted outright; all removals go to `.archive/<date>/`.

## Commands to Execute (in order)
From `/var/www/orthodoxmetrics/prod`:
```bash
# 1) Install dev tools (skip if already present)
pnpm add -D @babel/parser @babel/traverse fast-glob tsx zod globby depcheck

# 2) Scaffold folders
mkdir -p ops/survey ops/tools

# 3) Implement the tools & scripts as specified (you write these now)
#    Then run the survey:
pnpm -s survey:all > ops/survey/omx-survey-run.log 2>&1 || true

# 4) Aggregate & generate reports (your code writes these):
#    ops/survey/omx-survey.json
#    ops/survey/omx-survey-report.md

# 5) Review the report, then dry run the cleanup:
bash ops/survey/omx-cleanup-dryrun.sh

# 6) Apply (only after manual review):
bash ops/survey/omx-cleanup-apply.sh

# 7) Verify build after cleanup:
bash ops/survey/omx-verify.sh
```

## Notes
- Treat **prod** as fragile. Any “apply” steps must be explicit and reversible.
- Prefer **relative paths** in reports; include absolute path header for clarity.
- If you detect references to `orthodoxmetrics_auth_db`, flag them and suggest the consolidated path (`orthodoxmetrics_db`).

---

**Now do it.** Create the tools, run the inventory, and output the two report files under `ops/survey/`.