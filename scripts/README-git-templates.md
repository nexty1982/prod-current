# Git Branch Template System

This directory contains templates and automation scripts for standardized branch workflows.

## Quick Start

### Option 1: Use Environment Variables
```bash
export TASK_ID="task-123-getall" 
export ISSUE_REF="#456"
./scripts/create-getall-fix-branch.sh
```

### Option 2: Inline Variables
```bash
TASK_ID="task-123-getall" ISSUE_REF="#456" ./scripts/create-getall-fix-branch.sh
```

### Option 3: Use Defaults
```bash
./scripts/create-getall-fix-branch.sh
# Creates branch: fix/church-mgmt-getAll-YYYYMMDD
```

## Files

- `.github/.commit-templates/getall-fix.md` - Commit message template
- `scripts/setup-commit-template.sh` - Creates the commit template
- `scripts/create-getall-fix-branch.sh` - Full workflow automation
- `scripts/README-git-templates.md` - This documentation

## Workflow

1. Make your code changes
2. Set environment variables (optional):
   ```bash
   export TASK_ID="your-task-id"
   export ISSUE_REF="#123"
   ```
3. Run the automation script:
   ```bash
   ./scripts/create-getall-fix-branch.sh
   ```

The script will:
- Fetch latest changes
- Create a new branch
- Stage all changes
- Generate commit message from template
- Commit with the generated message
- Push to origin with upstream tracking

## Template Variables

- `${TASK_ID}` - Task or branch identifier
- `${ISSUE_REF}` - Issue reference (e.g., "#123")

Both variables have fallback defaults if not provided.
