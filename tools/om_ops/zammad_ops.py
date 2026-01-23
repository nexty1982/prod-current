#!/usr/bin/env python3
"""
OM-Ops - Zammad Operations Module
Manages Zammad connectivity checks and integration.
"""

import os
import sys
import subprocess
import json
from pathlib import Path
from typing import Dict, Optional, Tuple

# Configuration
ZAMMAD_INSTALL_DIR = Path("/opt/zammad")
ZAMMAD_COMPOSE_FILE = ZAMMAD_INSTALL_DIR / "docker-compose.yml"
ZAMMAD_BASE_URL = "https://orthodoxmetrics.com/helpdesk"
ZAMMAD_API_BASE = f"{ZAMMAD_BASE_URL}/api/v1"
ZAMMAD_LOCAL_PORT = 3030
ZAMMAD_LOCAL_URL = f"http://127.0.0.1:{ZAMMAD_LOCAL_PORT}"

# Import shared utilities
try:
    script_dir = Path(__file__).parent.parent / "om_recovery"
    if str(script_dir) not in sys.path:
        sys.path.insert(0, str(script_dir))
    from utils import log_ops, run_cmd, redact_secrets
except ImportError:
    # Fallback if utils not available
    def log_ops(msg, level="INFO"):
        print(f"[{level}] {msg}")
    def run_cmd(cmd, timeout=30, redact=True, cwd=None):
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout, cwd=str(cwd) if cwd else None)
        return result.returncode, result.stdout, result.stderr
    def redact_secrets(text):
        return text


def zammad_status() -> Tuple[bool, Dict]:
    """Check Zammad container status."""
    log_ops("Checking Zammad container status")
    
    if not ZAMMAD_COMPOSE_FILE.exists():
        return False, {"error": "docker-compose.yml not found", "install_dir": str(ZAMMAD_INSTALL_DIR)}
    
    exit_code, stdout, stderr = run_cmd(
        ["docker", "compose", "-f", str(ZAMMAD_COMPOSE_FILE), "ps"],
        timeout=10,
        cwd=str(ZAMMAD_INSTALL_DIR)
    )
    
    if exit_code != 0:
        return False, {"error": stderr, "exit_code": exit_code}
    
    # Parse output
    lines = stdout.strip().split("\n")
    services = {}
    if len(lines) > 1:
        for line in lines[1:]:  # Skip header
            parts = line.split()
            if len(parts) >= 2:
                service = parts[0]
                status = parts[1]
                services[service] = status
    
    all_up = all(status == "running" for status in services.values()) if services else False
    
    return all_up, {
        "services": services,
        "all_up": all_up,
        "compose_file": str(ZAMMAD_COMPOSE_FILE)
    }


def zammad_health_check() -> Tuple[bool, Dict]:
    """Check Zammad health via HTTP."""
    log_ops("Checking Zammad health endpoint")
    
    # Check local endpoint
    exit_code, stdout, stderr = run_cmd(
        ["curl", "-s", "-o", "/dev/null", "-w", "%{http_code}", f"{ZAMMAD_LOCAL_URL}/"],
        timeout=10
    )
    
    local_status = None
    if exit_code == 0:
        local_status = stdout.strip()
    
    # Check API health endpoint
    api_exit_code, api_stdout, api_stderr = run_cmd(
        ["curl", "-s", "-f", f"{ZAMMAD_LOCAL_URL}/api/v1/health_check"],
        timeout=10
    )
    
    api_healthy = api_exit_code == 0
    
    return api_healthy and local_status in ["200", "302"], {
        "local_http_status": local_status,
        "api_health_check": api_healthy,
        "local_url": ZAMMAD_LOCAL_URL
    }


def zammad_connectivity_check() -> Tuple[bool, Dict]:
    """Comprehensive Zammad connectivity check."""
    log_ops("Running Zammad connectivity check")
    
    results = {
        "containers": {},
        "health": {},
        "overall": False
    }
    
    # Check container status
    containers_ok, container_info = zammad_status()
    results["containers"] = container_info
    
    # Check health
    health_ok, health_info = zammad_health_check()
    results["health"] = health_info
    
    # Overall status
    results["overall"] = containers_ok and health_ok
    
    return results["overall"], results


def check_zammad_config() -> Dict:
    """Check Zammad configuration state."""
    config = {
        "install_dir_exists": ZAMMAD_INSTALL_DIR.exists(),
        "compose_file_exists": ZAMMAD_COMPOSE_FILE.exists(),
        "secrets_file_exists": (ZAMMAD_INSTALL_DIR / ".secrets.env").exists(),
        "base_url": ZAMMAD_BASE_URL,
        "local_port": ZAMMAD_LOCAL_PORT
    }
    
    return config


if __name__ == "__main__":
    """CLI interface for Zammad operations."""
    import argparse
    
    parser = argparse.ArgumentParser(description="Zammad operations checks")
    parser.add_argument("--status", action="store_true", help="Check container status")
    parser.add_argument("--health", action="store_true", help="Check health endpoint")
    parser.add_argument("--connectivity", action="store_true", help="Full connectivity check")
    parser.add_argument("--config", action="store_true", help="Show configuration")
    
    args = parser.parse_args()
    
    if args.status:
        success, info = zammad_status()
        print(json.dumps(info, indent=2))
        sys.exit(0 if success else 1)
    elif args.health:
        success, info = zammad_health_check()
        print(json.dumps(info, indent=2))
        sys.exit(0 if success else 1)
    elif args.connectivity:
        success, info = zammad_connectivity_check()
        print(json.dumps(info, indent=2))
        sys.exit(0 if success else 1)
    elif args.config:
        config = check_zammad_config()
        print(json.dumps(config, indent=2))
    else:
        parser.print_help()
