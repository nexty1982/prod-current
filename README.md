# prod-current — Fresh Start Plan

## Overview

This repository was reset on **2026-02-16** using the production files from `/var/www/orthodoxmetrics/prod` as the single source of truth. All previous git history, branches, and pull requests were intentionally removed to simplify the repository and start fresh.

---

## Why We Started Fresh

The original repository and its branches had grown too complicated to continue using GitHub effectively as a source code repository. Rather than trying to untangle the history, we chose to:

- Wipe all git history
- Use the current production files as the new baseline
- Force-push a single clean commit to GitHub
- Delete all old remote branches

---

## What Was Preserved

| Preserved ✅ | Removed 🗑️ |
|---|---|
| All production files from `/var/www/orthodoxmetrics/prod` | All previous git history and commits |
| `.gitignore` | All old branches (local and remote) |
| `.htaccess`, `.env.example`, and other config templates | Old pull requests and merge conflicts |
| Current working state of the application | Stale references and orphaned objects |

---

## Fresh Start Procedure

The following procedure was used to reset the repository. It is documented here for future reference in case it ever needs to be repeated.

### Prerequisites

- `git` installed on the server
- SSH key configured for push access to `git@github.com:nexty1982/prod-current.git` (or use HTTPS)
- Access to the production files at `/var/www/orthodoxmetrics/prod`

### Step-by-Step

#### Step 1 — Backup

Create a full copy of the production directory before making any changes.

```bash
cd /var/www/orthodoxmetrics
cp -a prod prod-backup-$(date +%Y%m%d%H%M%S)
```

#### Step 2 — Review Important Files

Verify that `.gitignore` and other critical dotfiles are present and correct.

```bash
cd /var/www/orthodoxmetrics/prod
cat .gitignore
ls -la .env* .htaccess* .editorconfig 2>/dev/null
git remote -v
git branch -a
```

#### Step 3 — Remove Old Git History & Reinitialize

Delete the `.git` directory and initialize a fresh repository.

```bash
cd /var/www/orthodoxmetrics/prod
rm -rf .git
git init
git branch -M main
```

#### Step 4 — Stage, Review, and Commit

Stage all files, carefully review what will be committed, and create the initial commit.

```bash
cd /var/www/orthodoxmetrics/prod
git add .
git status    # <-- REVIEW THIS CAREFULLY for secrets, vendor files, etc.
git commit -m "Fresh start: initialize repository from production files"
```

> ⚠️ **Important:** Before committing, review `git status` for files that should not be tracked (e.g., `.env`, `vendor/`, `node_modules/`, log files, database dumps). If found, add them to `.gitignore` and unstage them:
>
> ```bash
> echo ".env" >> .gitignore
> git rm --cached .env
> git add .
> ```

#### Step 5 — Connect Remote & Force-Push

Point the fresh repo at GitHub and force-push to overwrite all remote history.

```bash
cd /var/www/orthodoxmetrics/prod
git remote add origin git@github.com:nexty1982/prod-current.git
git push --force origin main
```

#### Step 6 — Delete Old Remote Branches

List and remove any leftover branches on GitHub.

```bash
git ls-remote --heads origin
# Delete each old branch (replace with actual names):
# git push origin --delete <branch-name>
```

#### Step 7 — Set Default Branch on GitHub

1. Go to [Repository Branch Settings](https://github.com/nexty1982/prod-current/settings/branches)
2. Set the default branch to `main`

#### Step 8 — Verify

```bash
git log --oneline          # Should show 1 commit
git branch -a              # Should show only main
git remote -v              # Should point to GitHub
git pull origin main       # Should say "Already up to date."
```

#### Step 9 — Remove Backup

Once everything is verified and working:

```bash
rm -rf /var/www/orthodoxmetrics/prod-backup-*
```

---

## Automated Script

A `fresh-start.sh` script is available that automates the entire procedure above with interactive confirmations at each step. To use it:

```bash
chmod +x fresh-start.sh
./fresh-start.sh
```

The script includes:

- Color-coded output
- Safety pauses before destructive operations
- Automatic backup with timestamp
- `git status` review before committing
- Automatic detection and deletion of old remote branches
- Final verification checks

See [`fresh-start.sh`](fresh-start.sh) for the full source.

---

## Post-Reset Workflow

Going forward, this repository follows a simple workflow:

1. **Make changes** in `/var/www/orthodoxmetrics/prod`
2. **Stage and commit** changes locally:
   ```bash
   cd /var/www/orthodoxmetrics/prod
   git add .
   git commit -m "Description of changes"
   ```
3. **Push to GitHub:**
   ```bash
   git push origin main
   ```

---

## Repository Details

| Field | Value |
|---|---|
| **Repository** | [nexty1982/prod-current](https://github.com/nexty1982/prod-current) |
| **Default Branch** | `main` |
| **Server Path** | `/var/www/orthodoxmetrics/prod` |
| **Remote URL** | `git@github.com:nexty1982/prod-current.git` |
| **Reset Date** | 2026-02-16 |