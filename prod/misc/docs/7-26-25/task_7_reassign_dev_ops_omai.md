# Task #7 – Reassigned: DevOps Testing Automation

## ✅ Overview

The responsibility for OrthodoxMetrics DevOps testing automation has been reassigned from *Ninja* to **OMAI**. This decision follows reliability concerns and aligns with the vision for an intelligent, AI-driven operations platform.

---

## 🧠 New Owner: OMAI (Orthodox Metrics AI)

OMAI will oversee the coordination, intelligence, and automated verification of DevOps testing across the full stack:

- 🧪 Code, configuration, and schema change tracking
- 🚦 Sandbox creation and update simulation
- 📊 Test result scoring and risk classification
- 📁 Logging results in the Big Book > DevOps Logs
- 🔔 Notification via Admin Panel and alerts

---

## 🔧 Implementation Prompt for Cursor

```ts
// 📦 Task Reassignment: OrthodoxMetrics DevOps Testing Automation
// New Owner: OMAI (Orchestrator + AI Insight System)
// Implementer: Cursor

🔹 Purpose:
Create a secure, reliable, and intelligent DevOps automation system fully controlled and managed by OMAI.

🔹 Scope:
1. Remove Ninja from the DevOps testing pipeline responsibility.
2. Establish a new module `OMAI.DevOpsOrchestrator` with the following responsibilities:
   - Detect code, config, and database schema changes
   - Create an isolated sandbox (via Docker or file-based chroot)
   - Run a full suite of frontend and backend tests
   - Score the update for risk, functionality impact, and coverage
   - Store results in Big Book > DevOps Logs
   - Display results in the Admin Dashboard > DevOps Panel
3. Allow super_admins to:
   - Schedule regular runs (cron-style)
   - Trigger manual test runs
   - Approve/Reject deployments to production
   - Roll back to last passing state
   - Set “safe window” periods where no deploys are allowed
4. Set up `OMAI.notify()` for error conditions or regression detections

🔹 Tech Requirements:
- Use `simple-git` for Git change diffs
- Use `Puppeteer` or `Playwright` to simulate user behavior (logins, CRUD, certificate views)
- Use shell scripting to validate PM2, Nginx, DB health
- Support config for:
   - `devops.poll_interval`
   - `max_update_batch_size`
   - `deployment_branch`
   - `test_user_ids`, `test_roles`

🔹 Bonus:
Include a visual status page for OMAI to report current test environments, their status, and update history.
```

---

## 🗂️ File Location

Saved under: `Big Book > Tasks > 2025-07-26 > Task7_Reassign_DevOps_OMAI.md`

---

## 📝 Status

**Queued for development**

- Awaiting Cursor to begin implementation
- To be linked with OMAI monitoring and notification system

---

## ⛔ Previous Owner: Ninja

All DevOps-related tasks and test scripting responsibilities are now revoked from Ninja as of 2025-07-26.

