# OrthodoxMetrics — Phase 3: Auth Consolidation + Env Alignment + Guardrails
**Mode:** Precise/Code • **Temp:** 0.1 • **Long context:** ON  
**Root:** /var/www/orthodoxmetrics/prod

## Goal
Finish the cutover to **orthodoxmetrics_db** by (1) wiring backend auth on the new DB, (2) aligning environment variables, and (3) adding guardrails (CI + runtime) to prevent regressions. Make **small, verifiable commits**. No hard deletes.

---

## Global Constraints
- No architectural rewrite; minimal diffs.
- No hard deletes; archive to `.archive/YYYY-MM-DD/...` if needed.
- Pause only for destructive schema changes; otherwise proceed.

---

## Step 0 — Preflight & Snapshot (no changes)
```bash
pnpm -v && node -v
git status --porcelain
grep -RIn --exclude-dir=node_modules --exclude-dir=.archive 'orthodoxmetrics_auth_db' .
If repo is dirty with unrelated changes, commit:

bash
Copy
Edit
git add -A && git commit -m "chore: snapshot before phase 3"
Step 1 — Ensure Auth Tables in orthodoxmetrics_db
Create db/sql/03_auth_tables.sql with sessions/refresh_tokens/password_resets (idempotent). Then run:

bash
Copy
Edit
mysql -u root -p < db/sql/03_auth_tables.sql
Verify:

bash
Copy
Edit
mysql -N -e "SHOW TABLES FROM orthodoxmetrics_db LIKE 'users%';"
mysql -N -e "SHOW TABLES FROM orthodoxmetrics_db LIKE 'refresh_tokens';"
Commit: chore(db): add auth support tables in orthodoxmetrics_db

If users is missing, create it (idempotent) and optionally backfill from auth DB.

Step 2 — Backend Auth Rewire (Node/Express on orthodoxmetrics_db)
Create:

server/src/config/db.ts — mysql2/promise pool using env (DB_DATABASE=orthodoxmetrics_db)

server/src/modules/auth/{types.ts,repo.ts,service.ts} — email/password login, refresh rotation, logout

server/src/middleware/requireAuth.ts — JWT access guard

server/src/routes/auth.ts — /api/auth/login, /api/auth/refresh, /api/auth/logout

Mount in server/src/app.ts: app.use(authRoutes);

Install deps:

bash
Copy
Edit
pnpm add mysql2 jsonwebtoken bcryptjs cookie-parser
pnpm add -D @types/jsonwebtoken @types/cookie-parser
Server env (sample only; don’t commit secrets):

ini
Copy
Edit
DB_HOST=localhost
DB_PORT=3306
DB_USER=omx_app
DB_PASSWORD=********
DB_DATABASE=orthodoxmetrics_db
JWT_ACCESS_SECRET=change_me_access_256bit
JWT_REFRESH_SECRET=change_me_refresh_256bit
ACCESS_TOKEN_TTL=900
REFRESH_TOKEN_TTL=2592000
BCRYPT_ROUNDS=12
SESSION_COOKIE_NAME=omx_sid
NODE_ENV=production
Build & commit:

bash
Copy
Edit
pnpm tsc --noEmit
pnpm build
git add -A
git commit -m "feat(auth): implement login/refresh/logout on orthodoxmetrics_db"
Step 3 — Minimal Admin Bootstrap (optional, safe)
If you need an initial admin:

bash
Copy
Edit
node -e "const b=require('bcryptjs');(async()=>{console.log(await b.hash(process.argv[1],12));})();" 'StrongTempPass123!' 
# copy the hash → INSERT only if that email not present
mysql -u root -p -e "INSERT INTO orthodoxmetrics_db.users (email,password_hash,role,status) SELECT 'admin@example.com','<PASTE_HASH>','admin','active' FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM orthodoxmetrics_db.users WHERE email='admin@example.com');"
No commit (sensitive). Log action in ops/audit/FIX_LOG.md.

Step 4 — Frontend Auth Bridge (minimal)
Add a tiny token-aware fetch that uses access token + auto-refresh via cookie:

front-end/src/lib/authClient.ts:

getAccessToken() (in-memory), setAccessToken(t).

apiFetch(url, opts) → if 401, POST /api/auth/refresh, retry once.

Replace direct fetch('/api/...') calls in high-traffic pages with apiFetch.

Build & commit:

bash
Copy
Edit
pnpm --filter front-end tsc --noEmit || true
pnpm --filter front-end build || true
git add -A
git commit -m "feat(frontend): add token-aware api client with refresh retry"
Step 5 — Env Alignment (generate & fix)
Create/Run ops/tools/env-audit.ts (or reuse) to emit:

ops/audit/env_report.json

ops/audit/.env.example (from used keys)

Then:

Add missing keys to server/.env (local only)

Remove unused keys from .env* (or document)

Ensure FE uses VITE_API_BASE_URL consistently (update code or .env)

Commit:

bash
Copy
Edit
git add ops/audit/env_report.json ops/audit/.env.example -f
git commit -m "chore(env): align used vs defined keys and generate .env.example"
Step 6 — Guardrails (CI + Runtime)
6a. CI: .github/workflows/ci.yml

Steps:

pnpm i

pnpm tsc --noEmit

pnpm build

grep -RIn --exclude-dir=node_modules --exclude-dir=.archive 'orthodoxmetrics_auth_db' . must return 1 (no matches)

Commit: ci: enforce build + ban orthodoxmetrics_auth_db refs

6b. PM2 persistence (backend)

Ensure memory flags and startup persist:

bash
Copy
Edit
pm2 restart orthodoxy-backend --node-args="--max-old-space-size=2048"
pm2 set pm2:autodump true
pm2 save
Commit audit artifacts (not secrets):

bash
Copy
Edit
pm2 jlist > ops/audit/pm2.jlist.json || true
git add ops/audit/pm2.jlist.json -f && git commit -m "chore(pm2): snapshot process config"
Step 7 — Verification Suite
bash
Copy
Edit
# Code/search
grep -RIn --exclude-dir=node_modules --exclude-dir=.archive 'orthodoxmetrics_auth_db' . || true

# Login flow
curl -s -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@example.com","password":"StrongTempPass123!"}' | jq .

# Refresh flow (cookie set by login; if not, send body {refresh:"..."}):
curl -s -X POST http://localhost:3000/api/auth/refresh

# Protected example (replace with real route):
ACCESS="<paste_access>"; curl -s -H "Authorization: Bearer $ACCESS" http://localhost:3000/api/admin/users | jq .

# Frontend build
pnpm --filter front-end build
Commit: chore(verify): phase 3 verification snapshot

Acceptance Criteria
Auth endpoints use orthodoxmetrics_db and work E2E (login → refresh → protected).

No orthodoxmetrics_auth_db refs in code/env/CI.

Env keys aligned; .env.example present.

CI blocks regressions; PM2 persists flags.

Minimal diffs; no secrets committed.

Rollback Plan
Revert commits from Phase 3 if needed.

Restore PM2 config: pm2 resurrect.

Keep SQL idempotent; re-run safely.