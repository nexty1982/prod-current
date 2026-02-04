# Task #11 – OMAI as Watchdog & Secretary

## 🔍 Objective

Elevate OMAI's responsibility to serve as an **active server watchdog** and **personal communication assistant**, monitoring log files and system state across both the **orthodoxmetrics.com stack** and the underlying **Ubuntu server infrastructure**.

---

## 🕵️ What OMAI Will Do

1. **Continuously Monitor:**
   - Apache/Nginx logs
   - PM2 logs
   - `syslog`, `auth.log`, `kern.log`, `dmesg`
   - MySQL/MariaDB logs
   - OMAI internal logs and errors

2. **Parse, Evaluate, and Classify Issues:**
   - Use severity heuristics (info, warning, error, critical)
   - Use ML/NLP to detect patterns indicating degraded performance or attack vectors
   - Track unusual patterns (e.g. CPU spikes, repeated auth failures, memory issues)

3. **Communicate with the Admin (Me):**
   - Provide **nightly summaries** and **instant alerts** for critical events
   - Appear in Notifications System
   - Allow OMAI to say things like:
     - "We've had 6 failed sudo attempts in the last 4 hours from IP 192.168.1.72"
     - "Disk space usage on `/var` is 91%"
     - "Three backend services crashed and restarted within the last hour"
     - "There are unprocessed OCR jobs piling up"

4. **Recommendations & Pre-Actions:**
   - Suggest possible fixes with links to one-click scripts
   - Offer "Would you like me to restart the service?"
   - Add issues to the Big Book or log them automatically as events

---

## 🔹 Settings UI Enhancements

Add a new **"System Watchdog"** section in OMAI's settings:

- Enable/Disable Watchdog
- Alert Level: `info`, `warning`, `error`, `critical`
- Log Scan Frequency: `5m`, `15m`, `1h`, `daily`
- Allowlist/Blocklist for specific files or services
- Quiet Hours (e.g., 1am–6am)

---

## ⚖️ Permissions

- Root-level access required (prompt for sudo on first setup)
- OMAI's watchdog service runs as its own daemon
- Any logs flagged as sensitive or private are never sent or displayed without clearance

---

## 📂 Storage and Logging

- All parsed log events and alerts stored in `Big Book > System Logs > Watchdog`
- Encrypted backup of logs per day
- System generates trend reports over time (error frequency, response time spikes, etc.)

---

## ✅ Status

**Planned** – Awaiting Cursor to:
- Implement log scanning daemon
- Hook it into OMAI event loop
- Populate UI & Notification logic

---

## 🔒 Future Extensions

- Integrate with external logging systems (e.g., Sentry, Grafana)
- AI-predicted failure detection based on behavior drift
- Weekly email or Telegram summary

---

## 🔍 File Location
Saved under: `Big Book > Tasks > 2025-07-26 > Task11_OMAI_Watchdog.md`

