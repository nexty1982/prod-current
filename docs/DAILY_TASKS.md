# 📅 Daily Tasks: 2026-02-05
**Status:** 🏗️ System Initialization
**Super Admin Action:** Use the [Export to Sheets] button in the HUD once this file is active.

---

## 🟩 BACKEND (Server Agent)
- [ ] **Infrastructure:** Create `docs/DAILY_TASKS.md` (Self-referential first task).
- [ ] **Provisioning:** Run `node scripts/church-provisioner.js batch sample_churches.json`.
- [ ] **API:** Ensure `/api/system/status` includes `church_count` and `last_git_sha`.

## 🟦 FRONTEND (Windsurf Agent)
- [ ] **Critical:** Create `front-end/src/components/AdminFloatingHUD.tsx` using the provided template.
- [ ] **Integration:** Mount the HUD in `MainLayout.tsx`.
- [ ] **UI Update:** Add the `church_count` indicator to the HUD.

---
### 🛠 SYSTEM LOGS
- **Daily Task File:** [CREATED]
- **HUD Component:** [PENDING]
- **Batch Provisioning:** [PENDING]

## 🟦 FRONTEND (Windsurf Agent)
- [x] **Critical:** Create `AdminFloatingHUD.tsx`.
- [ ] **UI Fix:** Implement dynamic document titles to resolve the "Login" title mismatch on `/church/om-spec`.
- [ ] **Integration:** Ensure the HUD displays the current active route name for verification.

## 🟩 BACKEND (Server Agent)
- [x] **Infrastructure:** Initialize `docs/DAILY_TASKS.md`.
- [ ] **Audit:** Check Nginx headers for cache-control issues that might be serving stale meta tags.
- [ ] **Provisioning:** Run `node scripts/church-provisioner.js test` to verify the new test church appears in the header.

# 📅 Daily Tasks: 2026-02-05
**Current Goal:** Build the Daily Tasks Management UI

---

## 🟦 FRONTEND (Windsurf Agent)
- [ ] **UI:** Create `/devel-tools/daily-tasks` page.
- [ ] **Feature:** Implement the Date Dropdown (Today, Yesterday, Last Week).
- [ ] **Feature:** Add a Markdown Editor with a "Save & Sync" button.
- [ ] **UI Fix:** Ensure the browser tab title updates to "Daily Tasks | OrthodoxMetrics".

## 🟩 BACKEND (Server Agent)
- [ ] **API:** Create File I/O routes to read/write Markdown files in `docs/`.
- [ ] **Storage:** Create `docs/archive` folder to store historical task files.
- [ ] **Logic:** Ensure `bump-version.sh` archives the current `DAILY_TASKS.md` into the dated format at the end of the day.

---
### 🛠 SYSTEM LOGS
- **Daily Tasks Page:** [NOT STARTED]
- **History Dropdown:** [PENDING]
