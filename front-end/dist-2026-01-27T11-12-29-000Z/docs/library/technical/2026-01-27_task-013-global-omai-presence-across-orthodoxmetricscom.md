# Task #013 – Global OMAI Presence Across OrthodoxMetrics.com

## 🎯 Objective

Enable the OMAI assistant to appear on **every page** of the OrthodoxMetrics site **for superadmins only**, providing context-aware AI assistance, command execution, and full-page interaction.

---

## 📌 Overview

This task extends OMAI beyond a single dashboard page and embeds it site-wide using a floating, persistent interface that tracks current location, user context, and active components.

---

## 🧩 Features & Requirements

### 1. Global OMAI Component

- Create `GlobalOMAI.tsx`
- Inject into `App.tsx` or top-level layout file
- Must detect user role via session
- Display for `role = super_admin` only

### 2. Assistant Display Controls

- Floating icon in bottom-right corner
- Toggle open/close
- Drag-and-drop support for repositioning
- Sticky position across route changes

### 3. Context Awareness

- Automatically pass:
  - `window.location.pathname`
  - current user session info
  - route component name (if mappable)
  - known database model used (if known)
- Display context summary in assistant UI

### 4. Command Input & Execution

- OMAI should accept typed commands:
  - `restart pm2`
  - `log status`
  - `open debug panel`
  - `explain this page`
- Use `.omai-commands.json` as the source of available mappings
- Map commands → real actions via `omai-handler.js`

### 5. Interaction History & Memory

- Store last 10 custom commands per user
- Allow re-run from dropdown
- Show previous execution result inline

### 6. Security Measures

- Prevent destructive actions unless `Hands-On` mode is enabled
- Require confirmation for shell-level commands
- Log all executed commands to `omai-command.log`

---

## ✅ Deliverables

- `GlobalOMAI.tsx`
- `.omai-commands.json` file
- Updated `App.tsx` with OMAI injector
- `omai-handler.js` or API backend
- Logging module for all OMAI interactions

---

## 🚀 Phase Plan

| Phase | Task                                              |
| ----- | ------------------------------------------------- |
| P1    | Create base component with toggle + drag UI       |
| P2    | Inject globally in layout wrapper                 |
| P3    | Integrate session context and page awareness      |
| P4    | Build command input + handler with backend bridge |
| P5    | Enable memory storage and security wrapper        |
| P6    | Link logging + confirm command execution          |

---

## 🔐 Permissions & Roles

- Visible only to users with `super_admin` role
- Only `super_admins` can enable "Hands-On Mode"
- Logging visible in `Big Book → Logs → OMAI`

---

## 📁 Location in Big Book

Saved under:

```
Big Book > Tasks > 2025-07-26 > task_013_omai_global_presence.md
```

---

## 🔄 Kanban Sync Metadata

```yaml
kanbanStatus: To Do
kanbanBoard: dev
kanbanCreated: 2025-07-26
kanbanCompleted: null
```

---

## 🧠 Notes

- Once implemented, this creates a persistent AI command layer usable anywhere on the site
- Future extension: dynamic per-page OMAI modules or walkthroughs

