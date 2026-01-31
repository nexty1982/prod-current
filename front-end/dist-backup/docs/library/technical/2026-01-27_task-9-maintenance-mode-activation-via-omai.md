# Task #9 – Maintenance Mode Activation via OMAI

## 🔧 Objective

Allow **OMAI** to programmatically toggle OrthodoxMetrics.com into a controlled **Maintenance Mode**, with optional user messaging and recovery triggers.

---

## 🎯 Core Goals

- Enable super\_admins (or OMAI) to activate and deactivate maintenance mode.
- Gracefully suspend site access for regular users.
- Show a custom offline/maintenance message with optional countdown or update status.
- Allow dev/admin roles to bypass maintenance and continue site access.
- Auto-log maintenance events to the Big Book for recordkeeping.

---

## 💡 Implementation Outline

### 🧠 OMAI Interface

- `OMAI.maintenance.activate(message, estimatedTime, reason)`
- `OMAI.maintenance.deactivate()`
- `OMAI.maintenance.status()`

### 🔐 Access Rules

- Public access routes return HTTP 503 with maintenance screen
- Authenticated admins/devs get full site access (with banner alert)
- Exceptions allowed via `maintenance.allowlist`

### 🖥️ Maintenance Page

- Rendered using `maintenance.html` template
- Supports live countdown, status, message, and expected recovery time
- Can pull dynamic content from `maintenance.json`

### 🗂 Files/Flags

- `/etc/omai/maintenance.flag` → presence enables mode
- `/etc/omai/maintenance.json` → customizable fields:
  ```json
  {
    "status": "Database upgrade in progress",
    "eta": "2025-07-27T03:00:00Z",
    "allowlist": ["192.168.1.10", "frjames@ssppoc.org"]
  }
  ```

### 🧪 Activation Options

- CLI: `omai-maintenance on/off --message="Upgrade" --eta="3am"`
- API: `/api/admin/maintenance` (POST/DELETE)
- UI: Superadmin Panel → Maintenance Control Tab

### 📚 Logging

- Big Book entry added under `System Logs > Maintenance Events`
- Tracks activator, reason, duration, affected services

---

## 📝 Status

**Planned** – Waiting for Cursor implementation and backend hook-in.

---

## 🔐 Security Notes

- Must validate API call permissions.
- Maintenance toggle must not disrupt internal services (OMAI, DB, backups).
- Ensure Nginx/PM2 recognizes maintenance flag for full-stack response.

---

## 📍 File Location

Saved under: `Big Book > Tasks > 2025-07-26 > Task9_MaintenanceMode.md`

