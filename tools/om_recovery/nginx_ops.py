#!/usr/bin/env python3
"""
OM-Ops - Nginx Operations Module
Manages Nginx configuration and proxy settings.
"""

import os
import sys
import subprocess
import datetime
import shutil
import difflib
from pathlib import Path
from typing import Dict, List, Optional, Tuple

# Configuration
REPO_ROOT = Path("/var/www/orthodoxmetrics/prod")
NGINX_SITES_ENABLED = Path("/etc/nginx/sites-enabled")
NGINX_SITES_AVAILABLE = Path("/etc/nginx/sites-available")
NGINX_ERROR_LOG = Path("/var/log/nginx/error.log")
BACKEND_PORT = 3001
BACKUP_ROOT = Path("/var/backups/OM/nginx")

# Import shared utilities
try:
    script_dir = Path(__file__).parent
    if str(script_dir) not in sys.path:
        sys.path.insert(0, str(script_dir))
    from utils import log_ops, run_cmd, require_confirmation, redact_secrets
except ImportError:
    # Fallback if utils not available
    def log_ops(msg, level="INFO"):
        print(f"[{level}] {msg}")
    def run_cmd(cmd, timeout=30, redact=True, cwd=None):
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout, cwd=str(cwd) if cwd else None)
        return result.returncode, result.stdout, result.stderr
    def require_confirmation(prompt, phrase="YES APPLY"):
        print(f"\n{prompt}\nType '{phrase}' to confirm:")
        return input().strip() == phrase
    def redact_secrets(text):
        return text


def nginx_status() -> Tuple[bool, Dict]:
    """Show Nginx status and version."""
    log_ops("Checking Nginx status")
    
    # Get version
    exit_code, version_out, _ = run_cmd(["nginx", "-v"], timeout=5, redact=False)
    version = version_out.strip() if exit_code == 0 else "unknown"
    
    # Get systemctl status
    exit_code, status_out, _ = run_cmd(["systemctl", "status", "nginx", "--no-pager", "-l"], timeout=5, redact=False)
    
    # Find active config files
    config_files = []
    if NGINX_SITES_ENABLED.exists():
        config_files = [str(f) for f in NGINX_SITES_ENABLED.iterdir() if f.is_file()]
    
    return True, {
        "version": version,
        "status": status_out[:500] if status_out else "unknown",
        "config_files": config_files,
    }


def nginx_validate_config() -> Tuple[bool, str]:
    """Validate Nginx configuration."""
    log_ops("Validating Nginx configuration")
    exit_code, stdout, stderr = run_cmd(["nginx", "-t"], timeout=10, redact=False)
    
    if exit_code == 0:
        return True, stdout
    else:
        # Show last 50 lines on failure
        output = stderr if stderr else stdout
        lines = output.split("\n")
        last_lines = "\n".join(lines[-50:]) if len(lines) > 50 else output
        return False, last_lines


def find_orthodoxmetrics_site_config() -> Optional[Path]:
    """
    Find the active site config for orthodoxmetrics.com.
    
    Specifically matches server_name directive containing orthodoxmetrics.com
    (not just any file with server_name).
    """
    if not NGINX_SITES_ENABLED.exists():
        return None
    
    # Search for orthodoxmetrics config by server_name
    for config_file in NGINX_SITES_ENABLED.iterdir():
        if config_file.is_file():
            try:
                with open(config_file, "r") as f:
                    content = f.read()
                    # Look for server_name directive containing orthodoxmetrics.com
                    lines = content.split("\n")
                    for line in lines:
                        stripped = line.strip()
                        if "server_name" in stripped.lower():
                            # Check if it contains orthodoxmetrics.com
                            if "orthodoxmetrics.com" in stripped.lower():
                                return config_file
            except Exception:
                continue
    
    # Fallback: search for any mention of orthodoxmetrics
    for config_file in NGINX_SITES_ENABLED.iterdir():
        if config_file.is_file():
            try:
                with open(config_file, "r") as f:
                    content = f.read()
                    if "orthodoxmetrics" in content.lower():
                        return config_file
            except Exception:
                continue
    
    return None


def parse_proxy_settings(config_file: Path) -> Dict:
    """Parse API proxy settings from nginx config."""
    if not config_file.exists():
        return {"error": "Config file not found"}
    
    try:
        with open(config_file, "r") as f:
            content = f.read()
    except Exception as e:
        return {"error": str(e)}
    
    settings = {
        "config_file": str(config_file),
        "location_api": None,
        "proxy_pass": None,
        "client_max_body_size": None,
        "proxy_read_timeout": None,
        "proxy_connect_timeout": None,
        "proxy_pass_target": None,
    }
    
    # Parse location /api block
    lines = content.split("\n")
    in_api_block = False
    api_block_lines = []
    
    for i, line in enumerate(lines):
        stripped = line.strip()
        if "location" in stripped and "/api" in stripped:
            in_api_block = True
            api_block_lines = [line]
        elif in_api_block:
            api_block_lines.append(line)
            if stripped == "}" and i > 0 and lines[i-1].strip().startswith("}"):
                break
    
    if api_block_lines:
        settings["location_api"] = "\n".join(api_block_lines)
        
        # Extract proxy_pass
        for line in api_block_lines:
            if "proxy_pass" in line:
                # Extract URL
                match = line.split("proxy_pass")[-1].strip().rstrip(";")
                settings["proxy_pass"] = match
                if "127.0.0.1:3001" in match or "localhost:3001" in match:
                    settings["proxy_pass_target"] = "correct"
                else:
                    settings["proxy_pass_target"] = "different"
            
            if "client_max_body_size" in line:
                settings["client_max_body_size"] = line.split("client_max_body_size")[-1].strip().rstrip(";")
            
            if "proxy_read_timeout" in line:
                settings["proxy_read_timeout"] = line.split("proxy_read_timeout")[-1].strip().rstrip(";")
            
            if "proxy_connect_timeout" in line:
                settings["proxy_connect_timeout"] = line.split("proxy_connect_timeout")[-1].strip().rstrip(";")
    
    return settings


def generate_safe_proxy_baseline(config_file: Path, max_body_size: str = "50m", timeout: int = 300) -> Tuple[str, str]:
    """
    Generate safe API proxy baseline snippet and unified diff preview.
    
    Returns: (baseline_snippet, unified_diff)
    """
    log_ops("Generating safe API proxy baseline")
    
    # Read current config (for context, not returned)
    try:
        with open(config_file, "r") as f:
            current_content = f.read()
    except Exception as e:
        return "", f"Error reading config: {e}"
    
    # Generate baseline snippet
    baseline_snippet = f"""    location /api/ {{
        proxy_pass http://127.0.0.1:{BACKEND_PORT};
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size {max_body_size};
        proxy_read_timeout {timeout}s;
        proxy_connect_timeout {timeout}s;
    }}"""
    
    # Generate simplified unified diff preview
    unified_diff = f"""--- {config_file}
+++ {config_file} (with baseline)
@@ ... @@
+{baseline_snippet}
"""
    
    return baseline_snippet, unified_diff


def apply_proxy_baseline(config_file: Path, baseline_snippet: str, unified_diff: str = "", dry_run: bool = False) -> Tuple[bool, str]:
    """
    Apply safe API proxy baseline (requires confirmation AFTER preview).
    
    Validates proxy target is http://127.0.0.1:3001 before applying.
    """
    if dry_run:
        log_ops(f"[DRY RUN] Would apply baseline to {config_file}")
        return True, "[DRY RUN] Baseline would be applied"
    
    # Validate proxy target
    if "http://127.0.0.1:3001" not in baseline_snippet:
        return False, "ERROR: Proxy baseline must target http://127.0.0.1:3001"
    
    # Show diff preview
    if unified_diff:
        print("\n=== Unified Diff Preview ===")
        print(unified_diff)
        print("=" * 50)
    
    if not require_confirmation(f"Apply proxy baseline to {config_file}?"):
        return False, "Cancelled by user"
    
    log_ops(f"Applying proxy baseline to {config_file}")
    
    # Backup config file
    BACKUP_ROOT.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d_%H%M%S")
    backup_file = BACKUP_ROOT / f"nginx-site-{timestamp}.conf"
    shutil.copy2(config_file, backup_file)
    log_ops(f"Backed up config to {backup_file}")
    
    # Read current config
    try:
        with open(config_file, "r") as f:
            content = f.read()
    except Exception as e:
        return False, f"Error reading config: {e}"
    
    # Replace or insert location /api/ block
    # Simple approach: find existing location /api/ and replace, or append before closing brace
    lines = content.split("\n")
    new_lines = []
    in_api_block = False
    api_replaced = False
    
    for i, line in enumerate(lines):
        stripped = line.strip()
        
        if "location" in stripped and "/api" in stripped:
            in_api_block = True
            # Insert baseline snippet
            indent = len(line) - len(line.lstrip())
            baseline_lines = baseline_snippet.strip().split("\n")
            for bl in baseline_lines:
                new_lines.append(" " * indent + bl)
            api_replaced = True
        elif in_api_block:
            if stripped == "}":
                in_api_block = False
            # Skip lines in old block
            continue
        else:
            new_lines.append(line)
    
    # If no existing block, append before server closing brace
    if not api_replaced:
        # Find last } before server closing
        for i in range(len(new_lines) - 1, -1, -1):
            if new_lines[i].strip() == "}" and i > 0:
                indent = len(new_lines[i-1]) - len(new_lines[i-1].lstrip())
                baseline_lines = baseline_snippet.strip().split("\n")
                for bl in baseline_lines:
                    new_lines.insert(i, " " * indent + bl)
                break
    
    new_content = "\n".join(new_lines)
    
    # Write new config
    try:
        with open(config_file, "w") as f:
            f.write(new_content)
    except Exception as e:
        # Restore backup
        shutil.copy2(backup_file, config_file)
        return False, f"Error writing config: {e}"
    
    # Validate - NEVER apply if nginx -t fails
    exit_code, stdout, stderr = run_cmd(["nginx", "-t"], timeout=10, redact=False)
    
    if exit_code != 0:
        # Restore backup immediately
        shutil.copy2(backup_file, config_file)
        log_ops(f"Nginx config validation failed, restored backup", "ERROR")
        return False, f"Config validation failed - changes NOT applied:\n{stderr}"
    
    # Reload nginx
    exit_code, reload_out, reload_err = run_cmd(["systemctl", "reload", "nginx"], timeout=10, redact=False)
    
    if exit_code != 0:
        log_ops(f"Nginx reload failed: {reload_err}", "ERROR")
        return False, f"Reload failed: {reload_err}"
    
    log_ops("Proxy baseline applied successfully")
    return True, "Proxy baseline applied and nginx reloaded"


def nginx_tail_logs(log_file: Path = None, lines: int = 200, follow: bool = False) -> Tuple[bool, str]:
    """Tail nginx error logs."""
    if log_file is None:
        log_file = NGINX_ERROR_LOG
    
    if not log_file.exists():
        return False, f"Log file not found: {log_file}"
    
    if follow:
        log_ops(f"Following nginx log: {log_file}")
        try:
            process = subprocess.Popen(
                ["tail", "-f", str(log_file)],
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
        exit_code, stdout, stderr = run_cmd(["tail", "-n", str(lines), str(log_file)], timeout=5, redact=False)
        if exit_code == 0:
            return True, stdout
        else:
            return False, stderr
