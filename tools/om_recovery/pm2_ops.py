#!/usr/bin/env python3
"""
OM-Ops - PM2 Operations Module
Manages PM2 processes for orthodox-backend.
"""

import os
import sys
import json
import subprocess
import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple

# Configuration
REPO_ROOT = Path("/var/www/orthodoxmetrics/prod")
BACKEND_DIR = REPO_ROOT / "server"
OPS_LOG = Path("/var/backups/OM/om-ops.log")
PM2_APP_NAME = "orthodox-backend"
PM2_PORT = 3001


def log_ops(message: str, level: str = "INFO"):
    """Log to om-ops.log."""
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    log_entry = f"[{timestamp}] [{level}] {message}\n"
    try:
        OPS_LOG.parent.mkdir(parents=True, exist_ok=True)
        with open(OPS_LOG, "a", encoding="utf-8") as f:
            f.write(log_entry)
    except Exception:
        pass


def run_pm2_command(cmd: List[str], check: bool = False) -> Tuple[bool, str, str]:
    """Run a PM2 command and return success, stdout, stderr."""
    full_cmd = ["pm2"] + cmd
    log_ops(f"Executing: {' '.join(full_cmd)}")
    
    try:
        result = subprocess.run(
            full_cmd,
            capture_output=True,
            text=True,
            check=check,
            cwd=BACKEND_DIR if BACKEND_DIR.exists() else None,
        )
        
        stdout = result.stdout
        stderr = result.stderr
        
        if result.returncode == 0:
            log_ops(f"Success: {stdout[:200]}")
        else:
            log_ops(f"Failed (code {result.returncode}): {stderr[:200]}", "ERROR")
        
        return result.returncode == 0, stdout, stderr
    except Exception as e:
        log_ops(f"Exception running PM2 command: {e}", "ERROR")
        return False, "", str(e)


def check_pm2_installed() -> bool:
    """Check if PM2 is installed."""
    success, _, _ = run_pm2_command(["--version"])
    return success


def find_ecosystem_file() -> Optional[Path]:
    """Find PM2 ecosystem file."""
    candidates = [
        REPO_ROOT / "ecosystem.config.js",
        REPO_ROOT / "ecosystem.config.cjs",
        REPO_ROOT / "pm2.config.js",
        BACKEND_DIR / "ecosystem.config.js",
    ]
    
    for candidate in candidates:
        if candidate.exists():
            return candidate
    
    return None


def find_env_file() -> Optional[Path]:
    """Find environment file for backend."""
    candidates = [
        BACKEND_DIR / ".env.production",
        BACKEND_DIR / ".env",
        REPO_ROOT / ".env.production",
    ]
    
    for candidate in candidates:
        if candidate.exists():
            return candidate
    
    return None


def pm2_status() -> Dict:
    """Get PM2 status for orthodox-backend."""
    success, stdout, _ = run_pm2_command(["status", PM2_APP_NAME])
    
    if not success:
        return {"exists": False, "status": "not_running"}
    
    # Parse PM2 status output
    lines = stdout.strip().split("\n")
    status_info = {"exists": True}
    
    for line in lines:
        if PM2_APP_NAME in line:
            parts = line.split()
            if len(parts) >= 4:
                status_info["status"] = parts[3] if len(parts) > 3 else "unknown"
                status_info["restarts"] = parts[4] if len(parts) > 4 else "0"
                status_info["uptime"] = parts[5] if len(parts) > 5 else "0"
                status_info["memory"] = parts[6] if len(parts) > 6 else "0"
                status_info["cpu"] = parts[7] if len(parts) > 7 else "0"
    
    return status_info


def pm2_setup() -> Tuple[bool, str]:
    """Setup/re-setup PM2 for orthodox-backend."""
    log_ops("Starting PM2 setup/re-setup")
    
    # Check PM2 installed
    if not check_pm2_installed():
        return False, "PM2 is not installed. Install with: npm install -g pm2"
    
    # Find ecosystem file
    ecosystem_file = find_ecosystem_file()
    env_file = find_env_file()
    
    # Check if app already exists
    status = pm2_status()
    
    if status.get("exists"):
        print(f"PM2 app '{PM2_APP_NAME}' already exists.")
        print("Use 'Restart' or 'Stop' + 'Start' to manage it.")
        return True, "App already exists"
    
    # Start the app
    if ecosystem_file:
        print(f"Starting from ecosystem file: {ecosystem_file}")
        success, stdout, stderr = run_pm2_command(["start", str(ecosystem_file)])
        if success:
            return True, f"Started from ecosystem file: {stdout}"
        else:
            return False, f"Failed to start: {stderr}"
    else:
        # Fallback: start with npm --name orthodox-backend -- start
        # This is safe and unambiguous - never starts a raw string command
        print("No ecosystem file found. Using fallback: pm2 start npm --name orthodox-backend -- start")
        package_json = BACKEND_DIR / "package.json"
        if package_json.exists():
            try:
                with open(package_json, "r") as f:
                    package = json.load(f)
                    scripts = package.get("scripts", {})
                    if "start" in scripts:
                        # Use pm2 start npm --name <name> -- <npm_script>
                        # This is unambiguous and safe
                        success, stdout, stderr = run_pm2_command(
                            ["start", "npm", "--name", PM2_APP_NAME, "--", "start"],
                            check=False
                        )
                        if success:
                            return True, f"Started with npm fallback: {stdout}"
                        else:
                            return False, f"Failed to start with npm fallback: {stderr}"
            except Exception as e:
                return False, f"Error reading package.json: {e}"
        
        return False, "Could not determine how to start orthodox-backend. Please configure PM2 manually."


def pm2_restart() -> Tuple[bool, str]:
    """Restart orthodox-backend."""
    log_ops("Restarting orthodox-backend")
    success, stdout, stderr = run_pm2_command(["restart", PM2_APP_NAME])
    if success:
        return True, f"Restarted: {stdout}"
    else:
        return False, f"Failed to restart: {stderr}"


def pm2_start() -> Tuple[bool, str]:
    """Start orthodox-backend."""
    log_ops("Starting orthodox-backend")
    success, stdout, stderr = run_pm2_command(["start", PM2_APP_NAME])
    if success:
        return True, f"Started: {stdout}"
    else:
        return False, f"Failed to start: {stderr}"


def pm2_stop() -> Tuple[bool, str]:
    """Stop orthodox-backend."""
    log_ops("Stopping orthodox-backend")
    success, stdout, stderr = run_pm2_command(["stop", PM2_APP_NAME])
    if success:
        return True, f"Stopped: {stdout}"
    else:
        return False, f"Failed to stop: {stderr}"


def pm2_logs(lines: int = 200, follow: bool = False) -> Tuple[bool, str]:
    """Get PM2 logs."""
    cmd = ["logs", PM2_APP_NAME, "--lines", str(lines)]
    if follow:
        cmd.append("--raw")
        log_ops("Following PM2 logs (Ctrl+C to stop)")
        try:
            # For follow mode, we need to stream
            process = subprocess.Popen(
                ["pm2"] + cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1,
            )
            
            try:
                for line in process.stdout:
                    print(line, end="")
            except KeyboardInterrupt:
                process.terminate()
                print("\nStopped following logs.")
                return True, "Logs followed (interrupted)"
        except Exception as e:
            return False, f"Error following logs: {e}"
    else:
        success, stdout, stderr = run_pm2_command(cmd)
        if success:
            return True, stdout
        else:
            return False, stderr


def pm2_reset_restarts() -> Tuple[bool, str]:
    """Reset restart count (safe method)."""
    log_ops("Resetting restart count")
    
    # Try PM2 reset command first
    success, stdout, stderr = run_pm2_command(["reset", PM2_APP_NAME])
    if success:
        return True, f"Reset successful: {stdout}"
    
    # If reset doesn't work, offer delete + start
    print("PM2 reset command failed or not available.")
    print("Alternative: Delete and restart the app (requires confirmation)")
    confirm = input("Type YES to proceed with delete + restart: ").strip()
    
    if confirm != "YES":
        return False, "Reset cancelled"
    
    # Stop and delete
    run_pm2_command(["delete", PM2_APP_NAME])
    
    # Re-setup
    return pm2_setup()


def pm2_show_env() -> Tuple[bool, str]:
    """Show PM2 environment (redacted)."""
    success, stdout, stderr = run_pm2_command(["show", PM2_APP_NAME])
    
    if not success:
        return False, stderr
    
    # Redact sensitive values
    lines = stdout.split("\n")
    redacted_lines = []
    
    for line in lines:
        if "=" in line:
            key, value = line.split("=", 1)
            key = key.strip()
            value = value.strip()
            
            # Redact common secret keys
            if any(secret in key.lower() for secret in ["password", "secret", "key", "token", "auth"]):
                redacted_lines.append(f"{key}=<REDACTED>")
            else:
                redacted_lines.append(line)
        else:
            redacted_lines.append(line)
    
    return True, "\n".join(redacted_lines)
