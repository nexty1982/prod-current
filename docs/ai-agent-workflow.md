# AI Agent Workflow — OM Daily Integration

## Purpose

Every change made by an AI agent (Claude CLI, Cursor, Windsurf, etc.) must be tracked as an OM Daily item. This creates an auditable trail of all AI-assisted work, enables progress tracking, and integrates with the changelog and GitHub sync systems.

## Core Principle

**One item per logical unit of work.** A single user request that results in multiple file changes is ONE item. A conversation that covers multiple unrelated tasks creates MULTIPLE items.

---

## Workflow

### 1. On New Work Request

When the user asks you to make changes, **before starting work**, create an OM Daily item:

```
POST /api/om-daily/items
{
  "title": "<concise description of the work>",
  "description": "<detailed scope — what files, what changes, why>",
  "task_type": "<see Item Type Guidelines below>",
  "horizon": "<see Horizon Selection below>",
  "status": "in_progress",
  "priority": "<see Priority Guidelines below>",
  "category": "<see Category Guidelines below>",
  "source": "agent",
  "agent_tool": "claude_cli",
  "branch_type": "<see Branch Type below>",
  "tags": ["<relevant tags>"],
  "metadata": {}
}
```

Record the returned `id` — you will need it to update and close the item.

### 2. During Work

If the scope changes significantly or you discover the work is larger than expected, update the item:

```
PUT /api/om-daily/items/:id
{
  "description": "<updated scope>",
  "progress": <0-100>
}
```

### 3. On Completion

When the work is done and verified (builds pass, tests pass, deployed), close the item:

```
PUT /api/om-daily/items/:id
{
  "status": "done",
  "progress": 100,
  "metadata": {
    "filesChanged": ["<list of key files modified>"],
    "summary": "<one-line summary of what was actually done>"
  }
}
```

### 4. On Failure or Cancellation

If the work is abandoned or blocked:

```
PUT /api/om-daily/items/:id
{
  "status": "cancelled",
  "description": "<original description>\n\n**Cancelled:** <reason>"
}
```

---

## Item Type Guidelines

Use the `task_type` field to classify the work:

| task_type | When to use | Example |
|-----------|-------------|---------|
| `task` | General implementation work, the default | "Add pagination to records list" |
| `bugfix` | Fixing broken behavior | "Fix invisible menu text in light mode" |
| `feature` | New user-facing functionality | "Add church onboarding wizard" |
| `enhancement` | Improving existing functionality | "Apply design system to admin pages" |
| `refactor` | Code restructuring without behavior change | "Extract shared form validation logic" |
| `style` | Visual/CSS-only changes | "Update sidebar colors to match brand" |
| `config` | Configuration, env, build changes | "Add new env variable for OCR service" |
| `docs` | Documentation updates | "Update API reference for new endpoints" |
| `chore` | Maintenance, cleanup, dependencies | "Remove unused imports across project" |
| `security` | Security fixes or hardening | "Sanitize user input in search endpoint" |
| `performance` | Speed or resource optimization | "Add database index for record lookups" |

---

## Branch Type Guidelines

Use the `branch_type` field when the work involves code changes:

| branch_type | When to use |
|-------------|-------------|
| `new_feature` | Entirely new functionality that didn't exist |
| `existing_feature` | Modifying or extending existing functionality |
| `bugfix` | Fixing a defect |
| `patch` | Small, targeted fix (hotfix-level) |

---

## Priority Guidelines

| priority | When to use |
|----------|-------------|
| `critical` | Production is broken, data loss risk, security vulnerability |
| `high` | Blocks other work, user-reported issue, deadline-driven |
| `medium` | Standard planned work (default) |
| `low` | Nice-to-have, cleanup, future optimization |

---

## Horizon Selection

The horizon indicates the planning window. Choose based on the expected scope:

| horizon | Use when |
|---------|----------|
| `1` | Quick fix, can be done in the current session (< 1 hour) |
| `2` | Small task, done within a day or two |
| `7` | Standard work item (default — most agent tasks) |
| `14` | Multi-session work, needs iteration |
| `30` | Larger initiative, multi-week |
| `60` | Strategic work, ongoing |
| `90` | Long-term initiative |

---

## Category Guidelines

Use categories to group related work. Use existing categories when possible:

| category | Scope |
|----------|-------|
| `frontend` | React components, CSS, UI changes |
| `backend` | Express routes, middleware, server logic |
| `database` | Schema changes, migrations, queries |
| `ocr` | OCR pipeline, vision, column mapping |
| `auth` | Authentication, authorization, sessions |
| `deployment` | Build, deploy, CI/CD, infrastructure |
| `design-system` | Design tokens, om-components, styling |
| `admin` | Admin panel, control panel, super_admin features |
| `portal` | Church portal, parish-facing features |
| `records` | Sacramental records, data management |
| `crm` | CRM, outreach, church map |
| `ai` | OMAI, AI features, automation |
| `sdlc` | Feature lifecycle, development pipeline |

---

## Title Conventions

Titles should be concise and follow this pattern:

```
<action verb> <what> [<where>]
```

**Good titles:**
- "Fix invisible sidebar text in light mode"
- "Add church onboarding pipeline wizard"
- "Apply design system to admin layout components"
- "Refactor OCR column mapper for multi-language support"

**Bad titles:**
- "Changes" (too vague)
- "Working on the thing the user asked about" (not descriptive)
- "Update AdminControlPanel.tsx, Breadcrumb.tsx, FullLayout.tsx, Header.tsx..." (file list, not purpose)

---

## Description Best Practices

The description should answer:
1. **What** is being changed
2. **Why** it's being changed
3. **Scope** — key files or areas affected

```
Apply the om-design-system styling (purple/gold palette, Georgia serif headings,
Inter body text) to all authenticated admin pages including the breadcrumb,
sidebar, header, and admin control panel.

Scope: Breadcrumb.tsx, AdminControlPanel.tsx, FullLayout.tsx, Header.tsx,
NavItem, NavGroup, SidebarProfile, om-components.css
```

---

## Tags

Use tags for cross-cutting concerns that don't fit neatly into categories:

- `dark-mode` — Changes that affect dark mode
- `responsive` — Mobile/responsive layout work
- `accessibility` — A11y improvements
- `breaking-change` — Could affect other features
- `needs-review` — Warrants human review before deploy
- `multi-file` — Touches many files across the codebase

---

## Multiple Items in One Conversation

If a user makes multiple unrelated requests in one conversation:
- Create a **separate item for each** logical unit of work
- Close each item as its specific work is completed
- Don't bundle unrelated changes into one item

If a single request grows into sub-tasks:
- Keep it as **one item** with updated description
- Use the `progress` field to track completion (e.g., 50% when half the components are updated)

---

## Metadata Field

The `metadata` JSON field is flexible. Use it to store:

```json
{
  "filesChanged": ["path/to/file1.tsx", "path/to/file2.css"],
  "summary": "One-line summary of actual changes made",
  "commitHash": "abc123",
  "buildVerified": true,
  "deployedVia": "om-deploy.sh fe",
  "relatedItems": [42, 43],
  "rollbackInfo": "Revert commit abc123 if sidebar breaks"
}
```

---

## Agent Plans (Assigned Work Plans)

Agent Plans are pre-defined sequences of prompt instructions assigned to a specific AI agent. When a plan is assigned to you, work through its stages in order.

### Checking for Assigned Plans

At the start of a conversation (or when the user asks you to check), query your assigned plans:

```
GET /api/prompt-plans/agent/claude_cli
```

Response:
```json
{
  "agent": "claude_cli",
  "plans": [
    {
      "id": 3,
      "title": "Redesign admin dashboard",
      "status": "active",
      "change_set_code": "CS-0053",
      "step_count": 5,
      "completed_count": 2,
      "next_step": {
        "id": 8,
        "step_number": 3,
        "title": "Apply design system to Sidebar",
        "prompt_text": "Apply the om-design-system styling to the Sidebar and NavItem components...",
        "status": "pending"
      }
    }
  ]
}
```

### Working Through Plan Stages

1. Read the `next_step.prompt_text` — this is your instruction for this stage
2. Execute the work as described in the prompt
3. Track the work as an OM Daily item (per normal workflow above)
4. When complete, the work item is automatically linked to the plan's Change Set

### Agent Identifiers

| Agent | Value |
|-------|-------|
| Claude CLI | `claude_cli` |
| Windsurf | `windsurf` |
| Cursor | `cursor` |
| GitHub Copilot | `github_copilot` |

### Plan + Change Set Integration

When a plan is activated, a Change Set is **automatically created** and linked. As you complete stages, the generated work items are **automatically added** to that Change Set. This means your work flows through the full SDLC pipeline without manual CS management.

---

## Error Handling

- If the OM Daily API is unreachable, **do not block the user's work**. Note the item details in the conversation and create it when the API is available.
- If item creation fails, log the error and continue with the work. Create the item retroactively.
- Always attempt to close items even if the work had issues — use appropriate status (`done`, `cancelled`, or leave as `in_progress` with a description update).
