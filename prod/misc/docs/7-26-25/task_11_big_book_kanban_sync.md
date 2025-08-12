# Task #11 – Big Book ⇄ Kanban Board Task Sync

## 🧠 Objective

Enable full synchronization between `task_*.md` files in the Big Book and the `dev` Kanban board, ensuring all tasks are indexed, tracked, and updateable across both systems.

---

## 📋 Scope of Work

### 1. File Discovery & Metadata Extraction

- Traverse:
  ```
  /var/www/orthodox-church-mgmt/orthodoxmetrics/prod/
  ```
- Target files:
  ```
  task_*.md
  ```
- For each file:
  - Extract metadata: title, creation date, status
  - Parse YAML frontmatter or top section

### 2. Kanban Card Creation

- Add new card to `dev` board
  - Column: default to `To Do`
  - Title: filename (sans extension)
  - Description: summary from `.md`
  - Metadata:
    ```yaml
    kanbanStatus: To Do
    kanbanBoard: dev
    kanbanCreated: 2025-07-26
    kanbanCompleted: null
    ```

### 3. Big Book Updates

- Embed Kanban metadata into each markdown file
- Show Kanban sync badge in Big Book UI

### 4. Completion & Bi-Directional Sync

- Complete via Big Book → mark complete in Kanban
- Complete in Kanban → update `.md` status + date
- Sync metadata both ways:
  - Status
  - Timestamps

### 5. Sync Script

- Create `sync-kanban-tasks.sh`
  - Ensure all `.md` tasks exist in Kanban
  - Detect desync
  - Restore missing cards or flag issues
- Trigger via:
  - Big Book UI
  - OMAI command: `sync kanban`
  - Cron job (optional)

### 6. Edge Case Handling

- Kanban card deleted → recreate from `.md`
- `.md` deleted → archive Kanban card

---

## 🗃 Board

- **Target Board:** `dev`
- **Columns**: To Do, In Progress, Review, Done

---

## ✅ Deliverables

- `sync-kanban-tasks.sh`
- Kanban–Big Book bridge API
- Markdown metadata manager
- UI toggle for status update in Big Book
- Logging to `bigbook-ingest.log`
- Task badge indicators in Big Book entries

---

## 🔐 Permissions

- Only super\_admins and OMAI core system may run sync
- Sync logs viewable via: `Big Book > Logs > Kanban Sync`

---

## 🗂 File Location in Big Book

Saved under: `Big Book > Tasks > 2025-07-26 > Task11_BigBook_Kanban_Sync.md`

---

## 📌 Notes

- Adds structured project management to OrthodoxMetrics via Big Book integration
- Establishes foundation for future AI task routing

