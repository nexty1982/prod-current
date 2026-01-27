# FreeScout Gating - Current Setup Documentation

**Date:** 2026-01-23  
**Purpose:** Document FreeScout integration as work-order gate for OM-Ops

## FreeScout Runtime Details

### URL
- **Base URL:** `https://orthodoxmetrics.com/helpdesk/`
- **Public Access:** Available at `/helpdesk/` path via Nginx reverse proxy
- **Container:** `freescout-app` running on `127.0.0.1:3080`

### API Access
- **Status:** To be configured (API & Webhooks module must be enabled in FreeScout admin)
- **Authentication Method:** API Key (via `X-FreeScout-API-Key` header or query parameter)
- **API Documentation:** https://api-docs.freescout.net/
- **Ticket Identification:** Numeric ticket ID (conversation ID)

### Configuration
- **Location:** `/opt/freescout/.env` (contains DB credentials, admin password)
- **API Key:** To be retrieved from FreeScout admin panel after enabling API module

## OM-Ops Enforcement Points

### 1. Build & Deploy Menu (Menu 15)
- **Location:** `tools/om_recovery/build_ops.py`
- **Function:** `handle_build_deploy_submenu()`
- **Current State:** Has TODO comments for ticket enforcement hooks
- **Actions Requiring Tickets:**
  - Build Backend (option 1)
  - Build Frontend (option 2)
  - Build Ops Hub (option 3)
  - Build ALL (option 4)

### 2. Preflight Discovery (Menu 17)
- **Location:** `tools/om_recovery/om_recovery.py`
- **Function:** `handle_preflight_discovery()`
- **Current State:** No ticket enforcement
- **Action:** Runs connectivity checks (non-blocking)

## Current OM-Ops Input/Logging

### User Input
- Uses `get_user_input()` and `require_confirmation()` utilities
- Menu-driven interface with `render_screen()` for UI

### Logging/Artifacts
- **Build Operations:** Logs to `/var/backups/OM/build_ops/runs/<timestamp>/`
  - `run.json` - Structured build results
  - Stage-specific log files (`backend_install.log`, `backend_build.log`, etc.)
- **Preflight Discovery:** Results stored in memory, displayed on screen
- **Changelog Integration:** Auto-appends successful build actions

## Implementation Plan

1. **FreeScout Client Helper** (`tools/om_ops/freescout_client.py`)
   - Validate connectivity
   - Fetch ticket by ID
   - Verify ticket status (not closed/invalid)

2. **Configuration**
   - Read API key from environment variable or config file
   - Config flag: `REQUIRE_TICKET=true|false` (default: false for soft enforcement)

3. **Enforcement Flow**
   - Prompt for ticket ID before impactful actions
   - Validate ticket exists and is valid
   - Log ticket ID in artifacts
   - Block action if hard enforcement enabled and no ticket

4. **Artifact Linking**
   - Include ticket ID in `run.json`
   - Print ticket URL in summary output
   - Optional: Post note back to FreeScout ticket
