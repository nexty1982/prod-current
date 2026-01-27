---

## ✅ Pre-flight (no changes yet)
1) Print a short plan of attack for issues [1]–[6].  
2) Run:
```bash
pnpm -v && node -v
git status --porcelain
```

If repo is dirty with unrelated changes, commit with `chore: snapshot before fixes`.

---

## 1) **DB References: `orthodoxmetrics_auth_db` → `orthodoxmetrics_db`** (Issue [1])

### 1a. Inventory (dry run)

```bash
grep -RIn --exclude-dir=node_modules --exclude-dir=.archive --include='*.{ts,tsx,js,jsx,sql}' 'orthodoxmetrics_auth_db' server || true
```

Save list to `ops/audit/db_refs_before.txt`.

### 1b. Safe migration SQL (reuse from earlier)

- Ensure these are present and executed in DB **before** code changes:
  - `01_migrate_auth_to_app.sql` (moves data + creates compatibility views)
  - `02_provision_church.sql` (new-church flow)
    If missing, create them from previous step and apply:

```bash
mysql -u root -p < 01_migrate_auth_to_app.sql
```

### 1c. Controlled refactor tool

Create **`ops/fix/replace-db-refs.ts`** that:

- Scans `server/src/**` and `server/routes/**` for string literals/backticks mentioning `orthodoxmetrics_auth_db`.
- Skips `node_modules`, `.archive`, backups (`*.backup`, `*_old.*`).
- Provides `--dry` to preview diffs and `--apply` to write.
- Only replaces exact token `orthodoxmetrics_auth_db` → `orthodoxmetrics_db`.

```ts
// ops/fix/replace-db-refs.ts
import fg from 'fast-glob';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const dry = process.argv.includes('--dry');
const globs = [
  'server/**/*.{ts,js,sql}',
  '!**/node_modules/**',
  '!**/.archive/**',
  '!**/*.backup',
  '!**/*_old.*',
];
const FROM = 'orthodoxmetrics_auth_db';
const TO = 'orthodoxmetrics_db';

(async () => {
  const files = await fg(globs, { dot: true });
  let changed = 0,
    totalHits = 0;
  for (const f of files) {
    const p = path.resolve(f);
    const src = fs.readFileSync(p, 'utf8');
    if (!src.includes(FROM)) continue;
    totalHits += (src.match(new RegExp(FROM, 'g')) || []).length;
    const next = src.replaceAll(FROM, TO);
    if (dry) {
      console.log(`--- ${f}`);
      const lines = src.split('\n');
      lines.forEach((line, i) => {
        if (line.includes(FROM)) console.log(`${i + 1}: ${line}`);
      });
    } else {
      fs.writeFileSync(p, next, 'utf8');
      changed++;
      console.log(`✔ updated ${f}`);
    }
  }
  console.log(dry ? `Found ${totalHits} hits.` : `Updated ${changed} files.`);
})();
```

Run preview then apply:

```bash
pnpm add -D fast-glob
pnpm tsx ops/fix/replace-db-refs.ts --dry | tee ops/audit/db_refs_preview.log
pnpm tsx ops/fix/replace-db-refs.ts --apply
```

### 1d. Verify & commit

```bash
pnpm tsc --noEmit || true
pnpm build || true
git add -A
git commit -m "fix(db): point all refs to orthodoxmetrics_db with compat views in place"
```

---

## 2) **Install missing deps** (Issue [2])

Install the list (pin minor versions only if necessary). If any are dev-only, add with `-D`.

```bash
pnpm add @mui/utils react-icons @faker-js/faker react-bootstrap @react-pdf/renderer notistack ag-grid-community react-tabs @dnd-kit/utilities clsx react-chartjs-2
```

If `ag-grid-community` needs `ag-grid-react`:

```bash
pnpm add ag-grid-react
```

Rebuild and commit:

```bash
pnpm tsc --noEmit || true
pnpm build || true
git add -A
git commit -m "fix(deps): add missing runtime deps to restore builds"
```

---

## 3) **Archive large backup files** (Issue [3])

Move to a dated `.archive` folder; don’t delete.

```bash
mkdir -p .archive/$(date +%F)/front-end/docs
git mv front-end/docs/backup_2025-07-19T06-00-00-106Z_full.tar.gz .archive/$(date +%F)/front-end/docs/ || mv front-end/docs/backup_2025-07-19T06-00-00-106Z_full.tar.gz .archive/$(date +%F)/front-end/docs/ 2>/dev/null || true
git mv front-end/docs/files_complete_2025-07-19T06-00-00-106Z.tar.gz .archive/$(date +%F)/front-end/docs/ || mv front-end/docs/files_complete_2025-07-19T06-00-00-106Z.tar.gz .archive/$(date +%F)/front-end/docs/ 2>/dev/null || true
git add -A
git commit -m "chore(archive): move large tarballs out of code path"
```

---

## 4) **Remove unused deps** (Issue [4])

Generate report first, then remove confidently unused items.

```bash
pnpm dlx depcheck --json > ops/audit/depcheck.json || true
# Optional: parse and remove automatically if confident, else remove manually:
# Example removals (edit based on depcheck):
pnpm remove @fortawesome/fontawesome-free @tabler/icons bootstrap papaparse pdfmake file-saver uuid sharp tesseract.js jimp canvas react-redux react-csv react-table react-select @reduxjs/toolkit zustand || true
git add -A
git commit -m "chore(deps): remove unused packages per depcheck"
```

---

## 5) **Build config fixes** (Issue [5])

If missing, create minimal **tsconfig.json** and **vite.config.ts** for front-end.

**`front-end/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["DOM", "ES2020"],
    "jsx": "react-jsx",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "baseUrl": "./src",
    "paths": { "*": ["./*"] },
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

**`front-end/vite.config.ts`**

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  server: { port: 5173 },
});
```

Ensure `front-end/index.html` exists. Rebuild & commit:

```bash
pnpm --filter front-end tsc --noEmit || true
pnpm --filter front-end build || true
git add -A
git commit -m "chore(build): add minimal tsconfig and vite config for FE"
```

---

## 6) **PM2 instability triage** (Issue [6])

Capture diagnostics, then apply quick hardening (node flags; restart policy).

```bash
pm2 jlist > ops/audit/pm2.jlist.json || true
pm2 logs --lines 200 orthodoxy-backend > ops/audit/pm2_backend.logs 2>&1 || true
pm2 describe orthodoxy-backend > ops/audit/pm2_backend.describe 2>&1 || true
```

If memory-related crashes suspected, adjust ecosystem or start script with:

```bash
# Example only — edit process name/file
pm2 restart orthodoxy-backend --node-args="--max-old-space-size=2048"
pm2 set pm2:autodump true
pm2 save
```

Commit audit artifacts:

```bash
git add ops/audit/pm2* -f || true
git commit -m "chore(pm2): capture diagnostics and apply interim memory headroom"
```

---

## 7) **Env alignment** (Issue [7]) — queued after [1]–[6]

- Generate `.env.example` from used keys; align FE `VITE_*` with actual usage.
- Verify server-side SMTP keys are present.
- Commit with: `chore(env): align used vs defined keys and add .env.example`.

---

## 8) **Dead code cleanup** (Issue [8]) — safe archive only

Move `*.backup`, `*_corrupted.*` into `.archive/<date>/` and commit.

---

## 9) **Route organization (Issue [9])** — plan only

Create `ops/audit/route_refactor_plan.md` with a suggested split by feature. Do not perform a big refactor in PROD without a branch and tests.

---

## Verification after each commit

Always run:

```bash
pnpm tsc --noEmit || true
pnpm build || true
```

Update `ops/audit/FIX_LOG.md` with what changed and why.

**Proceed autonomously through steps (1) to (6).** Pause if any step becomes destructive or fails repeatedly.
