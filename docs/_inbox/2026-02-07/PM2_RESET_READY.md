# ✅ New PM2 Reset Script Ready

> **Created**: February 6, 2026  
> **Location**: `scripts/om-pm2reset.sh`

---

## ⚡ Quick Use

```bash
# On Linux production server
sudo bash /var/www/orthodoxmetrics/prod/scripts/om-pm2reset.sh
```

**What it does**:
1. Stops all PM2 processes
2. Cleans PM2 daemon
3. Starts fresh from `ecosystem.config.js`
4. Saves config
5. Enables startup on boot

**Time**: ~15 seconds  
**Downtime**: ~8 seconds

---

## 📚 Documentation

- **Quick Start**: `docs/OPERATIONS/om-pm2reset-quickstart.md`
- **Full Guide**: `docs/OPERATIONS/om-pm2reset-guide.md`
- **Summary**: `docs/OPERATIONS/om-pm2reset-summary.md`

---

## 🎯 When to Use

✅ Use for:
- PM2 processes stuck or unresponsive
- After major deployments
- Ensuring clean service restart
- PM2 configuration changes

❌ Don't use during:
- Active production traffic (brief downtime)
- When only one service needs restart

---

## 🔍 After Running

```bash
pm2 list        # Verify services online
pm2 logs        # Check for errors
```

---

**Services Managed**:
- `orthodox-backend` - Main API (port 3001)
- `om-librarian` - Documentation indexer

**Status**: ✅ Ready to use
