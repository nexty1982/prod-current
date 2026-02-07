# Dev Server Performance Guide

## The Problem

When running `npm run dev` from the Windows machine (Z: drive mapping), the dev server at `http://192.168.1.239:5174` is slow because:

1. **Network File System Overhead**: Z: drive is a Samba share mapping to `/var/www/orthodoxmetrics/prod` on the Linux server
2. **1,487 TypeScript Files**: Vite needs to read and transform all these files over the network
3. **File Watching**: Watching file changes over SMB is slow
4. **HMR (Hot Module Replacement)**: Network latency affects real-time updates

## Solution 1: Run Dev Server on Linux (RECOMMENDED)

**This is the fastest and recommended approach.**

### SSH into the Server

```bash
ssh user@192.168.1.239
```

### Navigate and Start Server

```bash
cd /var/www/orthodoxmetrics/prod/front-end
./run-dev-server-linux.sh
```

Or manually:

```bash
cd /var/www/orthodoxmetrics/prod/front-end
npm run clean:cache  # Clear cache
npm run dev          # Start dev server
```

### Access the Dev Server

- **From any machine on network**: http://192.168.1.239:5174
- **From the Linux server**: http://localhost:5174

**Performance**: ⚡ **10-20x faster** than running from Windows

---

## Solution 2: SSH Port Forwarding (FAST + CONVENIENT)

Run the dev server on Linux but access it as if it's running locally on Windows.

### On Windows PowerShell/CMD

```bash
ssh -L 5174:localhost:5174 user@192.168.1.239
```

Then in the SSH session:

```bash
cd /var/www/orthodoxmetrics/prod/front-end
npm run dev
```

### Access the Dev Server

- **On Windows**: http://localhost:5174 (feels like it's running locally!)

**Performance**: ⚡ **Very fast** (same as Solution 1, but more convenient)

---

## Solution 3: Production Build with Preview (MEDIUM SPEED)

If you need to test from Windows but don't need HMR:

```bash
cd Z:\front-end
npm run build
npm run preview
```

This creates an optimized build and serves it. Changes require rebuilding, but it's much faster than dev mode over network.

**Performance**: ⚡ **5x faster** than dev mode over network

---

## Solution 4: Optimize Windows Dev Server (SLOWER, BUT WORKS)

If you must run from Windows/Z: drive:

### 1. Clear Cache

```bash
cd Z:\front-end
npm run clean:cache
```

### 2. Use the Optimized Config

The vite.config.ts has been optimized with:
- Pre-bundled dependencies
- Disabled file polling
- Increased timeouts
- Cached file checks

### 3. Start Dev Server

```bash
npm run dev
```

### 4. Additional Optimizations

**Disable Antivirus Scanning on Z: Drive**
- Windows Defender or other antivirus can slow down network drive access
- Add Z: drive to exclusions

**Close Other Tools Accessing Z: Drive**
- Close any other editors or file explorers accessing the project
- Each tool watching files adds overhead

**Use Wired Connection**
- WiFi adds latency; use ethernet if possible

**Performance**: ⚠️ **Still slower** but better than before (maybe 2-3x improvement)

---

## Diagnostic Tool

Run the diagnostic script to identify bottlenecks:

```bash
cd Z:\front-end
node diagnose-performance.js
```

This will test:
- File system speed
- Network location detection
- Project size
- Provide specific recommendations

---

## Performance Comparison

| Method | Speed | HMR | Convenience |
|--------|-------|-----|-------------|
| **Solution 1: Linux Server** | ⚡⚡⚡⚡⚡ | ✅ | Medium |
| **Solution 2: SSH Forward** | ⚡⚡⚡⚡⚡ | ✅ | High |
| **Solution 3: Build Preview** | ⚡⚡⚡ | ❌ | High |
| **Solution 4: Windows Z: Drive** | ⚡ | ✅ | High |

---

## Recommended Workflow

### For Development

Use **Solution 2** (SSH Port Forwarding):
- Fast as running on Linux
- Convenient (feels like localhost)
- Full HMR support

### For Testing/Demos

Use **Solution 3** (Production Build):
- Fast enough for testing
- Doesn't need SSH
- Closer to production environment

### For Quick Edits

Use **Solution 1** or **4**:
- Small changes can be made from Windows
- Restart server after multiple changes

---

## Technical Details

### Why is Z: Drive Slow?

1. **SMB/CIFS Protocol Overhead**: Network file system protocol adds latency to every file operation
2. **Network Latency**: Even on LAN, round-trip time affects performance
3. **Buffering**: File system operations are not optimized for development workflows
4. **File Watching**: Detecting file changes requires polling over network

### Optimizations Applied

1. **Dependency Pre-bundling**: Common libraries cached in node_modules/.vite
2. **Disabled File Polling**: Uses native file events when possible
3. **Increased Timeouts**: Accommodates network latency
4. **Cached File Checks**: Reduces repeated file system calls
5. **Ignored Directories**: Skips watching node_modules, .git, etc.

---

## Troubleshooting

### Dev Server Won't Start

```bash
# Kill any existing process on port 5174
# On Linux:
lsof -ti:5174 | xargs kill -9

# On Windows:
netstat -ano | findstr :5174
# Then: taskkill /PID <PID> /F
```

### Still Slow After Optimizations

1. Check network connection: `ping 192.168.1.239`
2. Check server load: `ssh user@192.168.1.239 'top -n 1'`
3. Try from different machine to isolate issue
4. Consider upgrading server hardware/network

### HMR Not Working

1. Check firewall allows port 5174
2. Verify browser isn't caching aggressively
3. Try hard refresh (Ctrl+Shift+R)
4. Check browser console for WebSocket errors

---

## Summary

**TL;DR**: Run `npm run dev` on the Linux server (192.168.1.239) instead of from Windows Z: drive for 10-20x better performance.

**Quick Start**:

```bash
# On Windows, connect via SSH with port forwarding
ssh -L 5174:localhost:5174 user@192.168.1.239

# Then run dev server (you'll be in SSH session now)
cd /var/www/orthodoxmetrics/prod/front-end
npm run dev

# Access on Windows at: http://localhost:5174
```
