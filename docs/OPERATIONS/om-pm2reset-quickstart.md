# OM PM2 Reset - Quick Start

⚡ **One command to reset and restart all PM2 services**

---

## 🚀 Quick Usage

```bash
# On the Linux production server
sudo bash /var/www/orthodoxmetrics/prod/scripts/om-pm2reset.sh
```

That's it! The script will:
1. Stop all PM2 processes
2. Clean up PM2 daemon
3. Start fresh from ecosystem.config.js
4. Save configuration
5. Enable startup on boot

---

## 📋 What Gets Restarted

- **orthodox-backend** - Main API server (port 3001)
- **om-librarian** - Documentation indexer

---

## ⏱️ Duration

- Total time: ~10-15 seconds
- Brief service downtime: ~5-10 seconds
- Services start fresh and clean

---

## 🔍 Check Status After

```bash
pm2 list        # View all processes
pm2 logs        # View live logs
```

---

## 📚 Full Documentation

See: `docs/OPERATIONS/om-pm2reset-guide.md`

---

## ⚠️ When to Use

✅ Use when:
- PM2 processes are stuck
- After major deployments
- Services won't start properly
- Need to ensure clean state

❌ Don't use during:
- Active production traffic
- When only one service needs restart (use `pm2 restart <name>`)

---

**Script**: `scripts/om-pm2reset.sh`  
**Config**: `ecosystem.config.js`
