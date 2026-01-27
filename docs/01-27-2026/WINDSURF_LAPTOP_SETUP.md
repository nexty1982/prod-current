# Windsurf Laptop Setup Guide - Remote SSH Access

## Date: January 27, 2026

## Overview

This guide will help you set up Windsurf on your laptop (Windows 11) to work remotely on the OrthodoxMetrics server via SSH.

**Benefits of Remote SSH**:
- Work directly on the server (same as your desktop)
- No file syncing needed
- Access to all server tools (git, npm, pm2, docker)
- Consistent environment across all devices

---

## Prerequisites

- ✅ Windows 11 laptop
- ✅ Server access: `next@orthodoxmetrics.com`
- ✅ Internet connection

---

## Part 1: Install Windsurf on Laptop

### Step 1: Download Windsurf

1. Go to: https://codeium.com/windsurf
2. Download **Windsurf for Windows**
3. Run the installer
4. Follow installation wizard (default settings are fine)

### Step 2: Launch Windsurf

- Open Windsurf from Start Menu or Desktop shortcut
- First launch may take a moment to initialize

---

## Part 2: Configure SSH Access

### Step 1: Generate SSH Key on Laptop

**Open PowerShell** (as regular user, not admin):

```powershell
# Generate SSH key
ssh-keygen -t ed25519 -C "your_email@example.com"

# When prompted:
# - File location: Press Enter (use default: C:\Users\YourName\.ssh\id_ed25519)
# - Passphrase: Press Enter (no passphrase) OR enter a secure passphrase
```

**Expected Output**:
```
Generating public/private ed25519 key pair.
Your identification has been saved in C:\Users\YourName\.ssh\id_ed25519
Your public key has been saved in C:\Users\YourName\.ssh\id_ed25519.pub
```

### Step 2: Copy Public Key to Server

**Option A: Using ssh-copy-id (if available)**:
```powershell
ssh-copy-id next@orthodoxmetrics.com
```

**Option B: Manual Method** (recommended for Windows):

1. **Display your public key**:
```powershell
type $env:USERPROFILE\.ssh\id_ed25519.pub
```

2. **Copy the output** (entire line starting with `ssh-ed25519`)

3. **Connect to server** (from your desktop or existing SSH session):
```bash
ssh next@orthodoxmetrics.com
```

4. **Add key to authorized_keys**:
```bash
# Create .ssh directory if it doesn't exist
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# Add your public key
nano ~/.ssh/authorized_keys
# Paste your public key on a new line
# Save: Ctrl+X, Y, Enter

# Set correct permissions
chmod 600 ~/.ssh/authorized_keys
```

5. **Exit server**:
```bash
exit
```

### Step 3: Test SSH Connection from Laptop

**In PowerShell**:
```powershell
ssh next@orthodoxmetrics.com
```

**Expected Result**: You should connect without password prompt

If successful, type `exit` to disconnect.

---

## Part 3: Configure Windsurf Remote SSH

### Step 1: Install Remote SSH Extension

1. Open Windsurf
2. Click **Extensions** icon (left sidebar) or press `Ctrl+Shift+X`
3. Search for: **Remote - SSH**
4. Click **Install** on "Remote - SSH" by Microsoft
5. Wait for installation to complete

### Step 2: Configure SSH Host

1. Press `F1` or `Ctrl+Shift+P` to open Command Palette
2. Type: **Remote-SSH: Open SSH Configuration File**
3. Select: `C:\Users\YourName\.ssh\config`

4. **Add this configuration**:
```
Host orthodoxmetrics
    HostName orthodoxmetrics.com
    User next
    Port 22
    IdentityFile ~/.ssh/id_ed25519
    ServerAliveInterval 60
    ServerAliveCountMax 3
```

5. **Save the file**: `Ctrl+S`

### Step 3: Connect to Server

1. Press `F1` or `Ctrl+Shift+P`
2. Type: **Remote-SSH: Connect to Host**
3. Select: **orthodoxmetrics** (from your config)
4. Windsurf will open a new window and connect to the server
5. First connection will prompt: "Are you sure you want to continue?" → Click **Continue**

**Expected**: New Windsurf window with green "SSH: orthodoxmetrics" in bottom-left corner

### Step 4: Open Workspace

1. In the connected Windsurf window:
2. Click **File → Open Folder** or press `Ctrl+K Ctrl+O`
3. Enter path: `/var/www/orthodoxmetrics/prod`
4. Click **OK**
5. If prompted "Do you trust the authors?", click **Yes, I trust the authors**

**Expected**: File explorer shows your project files on the server

---

## Part 4: Configure Git on Server (If Not Already Done)

**In Windsurf's integrated terminal** (`Ctrl+` ` or Terminal → New Terminal):

```bash
# Set your git identity
git config --global user.name "Your Name"
git config --global user.email "your_email@example.com"

# Verify
git config --global --list
```

---

## Part 5: Install Recommended Extensions

While connected to the server, install these extensions:

1. **ESLint** - JavaScript/TypeScript linting
2. **Prettier** - Code formatting
3. **GitLens** - Enhanced Git features
4. **Docker** - If you work with containers
5. **Thunder Client** - API testing (alternative to Postman)

**To Install**:
- Press `Ctrl+Shift+X`
- Search for extension name
- Click **Install in SSH: orthodoxmetrics**

---

## Part 6: Verify Setup

### Test 1: File Access
- Open a file in the explorer (e.g., `package.json`)
- Make a small edit
- Save with `Ctrl+S`
- File should save on the server

### Test 2: Terminal Access
- Open terminal: `Ctrl+` `
- Run: `pwd`
- Should show: `/var/www/orthodoxmetrics/prod`
- Run: `git status`
- Should show current branch and status

### Test 3: Git Operations
```bash
# Check current branch
git branch

# Should show:
# * dev
#   main
```

---

## Part 7: Daily Workflow

### Connecting to Server

1. **Open Windsurf on laptop**
2. Press `F1` → **Remote-SSH: Connect to Host**
3. Select **orthodoxmetrics**
4. Wait for connection (green indicator in bottom-left)
5. **File → Open Folder** → `/var/www/orthodoxmetrics/prod`

### Working on a Ticket

```bash
# 1. Ensure you're on dev branch
git checkout dev
git pull origin dev

# 2. Create feature branch
git checkout -b feature/FS-123-description

# 3. Make changes in Windsurf editor

# 4. Commit changes
git add .
git commit -m "[FS-123] feat: description"

# 5. Push to GitHub
git push -u origin feature/FS-123-description

# 6. Create PR on GitHub
```

### Disconnecting

- Simply close Windsurf window
- Or: `F1` → **Remote-SSH: Close Remote Connection**

---

## Troubleshooting

### Issue: "Permission denied (publickey)"

**Cause**: SSH key not properly configured

**Solution**:
1. Verify public key is in server's `~/.ssh/authorized_keys`
2. Check key permissions on laptop:
```powershell
icacls $env:USERPROFILE\.ssh\id_ed25519
```
3. Regenerate key if needed (Part 2, Step 1)

### Issue: "Could not establish connection to server"

**Cause**: Network or SSH configuration issue

**Solution**:
1. Test basic SSH: `ssh next@orthodoxmetrics.com` in PowerShell
2. Check server is accessible: `ping orthodoxmetrics.com`
3. Verify SSH config file syntax
4. Check firewall isn't blocking SSH (port 22)

### Issue: "Extension host terminated unexpectedly"

**Cause**: Server-side extension crash

**Solution**:
1. Disconnect from server
2. Reconnect: `F1` → **Remote-SSH: Connect to Host**
3. If persists, reload window: `F1` → **Developer: Reload Window**

### Issue: Slow performance

**Cause**: Network latency or large workspace

**Solution**:
1. Check internet connection speed
2. Exclude large directories from search:
   - Settings → Search: Exclude
   - Add: `**/node_modules`, `**/dist-*`, `**/.git`
3. Disable unused extensions

### Issue: Can't save files

**Cause**: Permission issues

**Solution**:
```bash
# On server, check file ownership
ls -la /var/www/orthodoxmetrics/prod

# If needed, fix permissions
sudo chown -R next:www-data /var/www/orthodoxmetrics/prod
```

---

## Tips & Best Practices

### 1. Use Integrated Terminal
- All commands run directly on server
- No need to switch between Windsurf and separate SSH client

### 2. Git Integration
- Source Control panel (`Ctrl+Shift+G`) shows changes
- Stage, commit, and push directly from UI
- View diffs inline

### 3. Keyboard Shortcuts
- `Ctrl+P` - Quick file open
- `Ctrl+Shift+F` - Search across files
- `Ctrl+` ` - Toggle terminal
- `F1` - Command palette
- `Ctrl+Shift+P` - Command palette (alternative)

### 4. Multiple Terminals
- Click `+` in terminal panel for new terminal
- Useful for running dev server in one, git commands in another

### 5. Port Forwarding
If you need to access server ports locally:
- `F1` → **Forward a Port**
- Enter port number (e.g., 3000 for API server)
- Access via `localhost:3000` on laptop

### 6. Save Workspace
- **File → Save Workspace As**
- Save as `orthodoxmetrics.code-workspace`
- Next time: **File → Open Workspace** for quick access

---

## Switching Between Desktop and Laptop

### On Desktop (Windows 11)
- Continue using Windsurf as you currently do
- Same SSH connection method
- Same workspace location

### On Laptop
- Follow this guide to set up
- Connect via Remote SSH
- Work on same files (no syncing needed)

### Best Practice
- Always `git pull` before starting work
- Always `git push` when done
- This keeps both machines in sync via GitHub

---

## Advanced: SSH Config for Multiple Servers

If you work with multiple servers, add them all to SSH config:

```
Host orthodoxmetrics
    HostName orthodoxmetrics.com
    User next
    IdentityFile ~/.ssh/id_ed25519

Host staging
    HostName staging.orthodoxmetrics.com
    User next
    IdentityFile ~/.ssh/id_ed25519

Host dev-server
    HostName dev.orthodoxmetrics.com
    User next
    IdentityFile ~/.ssh/id_ed25519
```

Then connect to any with: `F1` → **Remote-SSH: Connect to Host** → Select server

---

## Security Notes

### SSH Key Security
- **Never share** your private key (`id_ed25519`)
- **Only share** public key (`id_ed25519.pub`)
- Use passphrase for extra security (optional)

### Server Access
- Your laptop now has same access as desktop
- Keep laptop secure (lock screen, encryption)
- Revoke key if laptop is lost/stolen:
```bash
# On server, edit authorized_keys
nano ~/.ssh/authorized_keys
# Remove the laptop's public key line
```

---

## Quick Reference Card

### Connect to Server
```
F1 → Remote-SSH: Connect to Host → orthodoxmetrics
```

### Open Workspace
```
Ctrl+K Ctrl+O → /var/www/orthodoxmetrics/prod
```

### Common Git Commands
```bash
git status                    # Check status
git checkout dev              # Switch to dev
git pull origin dev           # Update from remote
git checkout -b feature/FS-X  # Create feature branch
git add .                     # Stage changes
git commit -m "[FS-X] msg"    # Commit
git push origin branch-name   # Push to GitHub
```

### Windsurf Shortcuts
```
Ctrl+P          Quick file open
Ctrl+Shift+F    Search in files
Ctrl+`          Toggle terminal
Ctrl+Shift+G    Source control
F1              Command palette
```

---

## Support

- **Windsurf Docs**: https://docs.codeium.com/windsurf
- **SSH Issues**: Check server logs or create FreeScout ticket
- **Git Issues**: See `/docs/SDLC_QUICK_REFERENCE.md`

---

**Setup Guide Version**: 1.0  
**Last Updated**: January 27, 2026  
**Platform**: Windows 11 Laptop → Remote SSH to Server
