#!/usr/bin/env python3
"""
Zammad Doctor - Authoritative diagnostic and fix tool for Zammad.

This tool replaces all one-off fix scripts with a single reliable diagnostic
that reads actual logs and provides actionable fixes.

Requirements:
- Always runs in /opt/zammad
- Uses docker compose config --services to detect service names
- Never uses host psql (all DB operations via docker exec)
- Reads actual container logs to diagnose issues
- Provides clear, actionable fixes
"""

import os
import sys
import subprocess
import json
import re
import time
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from datetime import datetime

# Configuration
ZAMMAD_INSTALL_DIR = Path("/opt/zammad")
ZAMMAD_COMPOSE_FILE = ZAMMAD_INSTALL_DIR / "docker-compose.yml"
ZAMMAD_LOCAL_PORT = 3030
ZAMMAD_LOCAL_URL = f"http://127.0.0.1:{ZAMMAD_LOCAL_PORT}"

# Import shared utilities
try:
    script_dir = Path(__file__).parent.parent / "om_recovery"
    if str(script_dir) not in sys.path:
        sys.path.insert(0, str(script_dir))
    from utils import log_ops, run_cmd, redact_secrets
except ImportError:
    def log_ops(msg, level="INFO"):
        print(f"[{level}] {msg}", file=sys.stderr)
    def run_cmd(cmd, timeout=30, redact=True, cwd=None):
        result = subprocess.run(
            cmd, capture_output=True, text=True, timeout=timeout,
            cwd=str(cwd) if cwd else None
        )
        return result.returncode, result.stdout, result.stderr
    def redact_secrets(text):
        return text


class ZammadDoctor:
    """Zammad diagnostic and fix tool."""
    
    def __init__(self, compose_dir: Path = ZAMMAD_INSTALL_DIR, full: bool = False):
        self.compose_dir = compose_dir
        self.compose_file = compose_dir / "docker-compose.yml"
        self.full = full
        self.services: List[str] = []
        self.issues: List[Dict] = []
        self.fixes: List[str] = []
        
    def ensure_compose_dir(self) -> bool:
        """Ensure we're in the correct compose directory."""
        if not self.compose_dir.exists():
            log_ops(f"ERROR: Zammad directory not found: {self.compose_dir}", "ERROR")
            return False
        if not self.compose_file.exists():
            log_ops(f"ERROR: docker-compose.yml not found: {self.compose_file}", "ERROR")
            return False
        return True
    
    def get_services(self) -> List[str]:
        """Get service names from docker compose config."""
        if self.services:
            return self.services
        
        exit_code, stdout, stderr = run_cmd(
            ["docker", "compose", "-f", str(self.compose_file), "config", "--services"],
            timeout=10,
            cwd=str(self.compose_dir)
        )
        
        if exit_code != 0:
            log_ops(f"Failed to get services: {stderr}", "ERROR")
            return []
        
        self.services = [s.strip() for s in stdout.strip().split("\n") if s.strip()]
        return self.services
    
    def get_container_status(self) -> Dict[str, Dict]:
        """Get container status for all services."""
        services = self.get_services()
        if not services:
            return {}
        
        exit_code, stdout, stderr = run_cmd(
            ["docker", "compose", "-f", str(self.compose_file), "ps", "--format", "json"],
            timeout=10,
            cwd=str(self.compose_dir)
        )
        
        if exit_code != 0:
            log_ops(f"Failed to get container status: {stderr}", "ERROR")
            return {}
        
        containers = {}
        for line in stdout.strip().split("\n"):
            if not line.strip():
                continue
            try:
                data = json.loads(line)
                service = data.get("Service", "")
                status = data.get("State", "")
                health = data.get("Health", "")
                containers[service] = {
                    "status": status,
                    "health": health,
                    "name": data.get("Name", ""),
                    "id": data.get("ID", "")
                }
            except json.JSONDecodeError:
                continue
        
        return containers
    
    def get_container_logs(self, service: str, lines: int = 400) -> str:
        """Get logs for a specific service."""
        # Try container name first
        exit_code, stdout, stderr = run_cmd(
            ["docker", "logs", "--tail", str(lines), f"zammad-{service}"],
            timeout=15
        )
        
        if exit_code == 0:
            return stdout
        
        # Fallback to compose logs
        exit_code, stdout, stderr = run_cmd(
            ["docker", "compose", "-f", str(self.compose_file), "logs", "--tail", str(lines), service],
            timeout=15,
            cwd=str(self.compose_dir)
        )
        
        return stdout if exit_code == 0 else stderr
    
    def check_port_listening(self) -> bool:
        """Check if port 3030 is listening."""
        exit_code, stdout, stderr = run_cmd(
            ["ss", "-tlnp"],
            timeout=5
        )
        
        if exit_code != 0:
            return False
        
        return f":{ZAMMAD_LOCAL_PORT} " in stdout
    
    def check_http_response(self) -> Tuple[bool, Optional[str], Optional[str]]:
        """Check HTTP response from Zammad."""
        exit_code, stdout, stderr = run_cmd(
            ["curl", "-s", "-o", "/dev/null", "-w", "%{http_code}", "-I", ZAMMAD_LOCAL_URL],
            timeout=10
        )
        
        if exit_code != 0:
            return False, None, stderr
        
        status_code = stdout.strip()
        
        # Get full headers
        exit_code2, headers, _ = run_cmd(
            ["curl", "-s", "-I", ZAMMAD_LOCAL_URL],
            timeout=10
        )
        
        return status_code in ["200", "302", "301"], status_code, headers if exit_code2 == 0 else None
    
    def diagnose_restart_loop(self, logs: str) -> List[Dict]:
        """Diagnose restart loop from logs."""
        issues = []
        
        # Database connection errors
        if re.search(r"issue connecting to your database|database.*password|PG::|ActiveRecord::", logs, re.I):
            issues.append({
                "type": "database_auth",
                "severity": "critical",
                "message": "Database authentication failure",
                "fix": "Update PostgreSQL password using docker exec inside container"
            })
        
        # Redis connection errors
        if re.search(r"redis.*connect|Redis::CannotConnectError|REDIS_URL", logs, re.I):
            issues.append({
                "type": "redis_missing",
                "severity": "critical",
                "message": "Redis connection failure",
                "fix": "Add Redis service to docker-compose.yml and REDIS_URL to zammad environment"
            })
        
        # Elasticsearch errors
        if re.search(r"elasticsearch.*connect|Elasticsearch.*error", logs, re.I):
            issues.append({
                "type": "elasticsearch",
                "severity": "warning",
                "message": "Elasticsearch connection issue",
                "fix": "Check elasticsearch service health"
            })
        
        # Migration errors
        if re.search(r"migration.*error|ActiveRecord::StatementInvalid", logs, re.I):
            issues.append({
                "type": "migration",
                "severity": "critical",
                "message": "Database migration failure",
                "fix": "Check database permissions and run migrations manually"
            })
        
        # Port binding errors
        if re.search(r"address.*already.*use|bind.*failed|EADDRINUSE", logs, re.I):
            issues.append({
                "type": "port_conflict",
                "severity": "critical",
                "message": "Port binding conflict",
                "fix": "Check for other services using port 3030"
            })
        
        # Missing command/entrypoint
        if re.search(r"exited.*code.*0|no.*command|entrypoint", logs, re.I):
            issues.append({
                "type": "missing_command",
                "severity": "critical",
                "message": "Container exiting immediately (no command)",
                "fix": "Add command: [\"rails\", \"server\", \"-b\", \"0.0.0.0\", \"-p\", \"3000\"] to zammad service"
            })
        
        return issues
    
    def check_redis_service(self) -> bool:
        """Check if Redis service exists in compose."""
        if not self.compose_file.exists():
            return False
        
        with open(self.compose_file, 'r') as f:
            content = f.read()
        
        return 'redis:' in content or 'redis:' in content.lower()
    
    def check_redis_env(self) -> bool:
        """Check if REDIS_URL is set in zammad service."""
        if not self.compose_file.exists():
            return False
        
        with open(self.compose_file, 'r') as f:
            content = f.read()
        
        # Check zammad service environment
        zammad_section = re.search(r'zammad:.*?environment:(.*?)(?=\n\s+\w+:|$)', content, re.DOTALL | re.I)
        if zammad_section:
            return 'REDIS_URL' in zammad_section.group(1)
        
        return False
    
    def check_image_tag(self) -> Tuple[str, bool]:
        """Check if image tag is pinned (not latest)."""
        if not self.compose_file.exists():
            return "", False
        
        with open(self.compose_file, 'r') as f:
            content = f.read()
        
        match = re.search(r'image:\s*(zammad/zammad:[^\s]+)', content, re.I)
        if match:
            tag = match.group(1)
            is_pinned = ':latest' not in tag.lower()
            return tag, is_pinned
        
        return "", False
    
    def diagnose(self) -> Dict:
        """Run full diagnosis."""
        if not self.ensure_compose_dir():
            return {"error": "Zammad directory or compose file not found"}
        
        diagnosis = {
            "timestamp": datetime.now().isoformat(),
            "compose_dir": str(self.compose_dir),
            "compose_file": str(self.compose_file),
            "services": self.get_services(),
            "containers": {},
            "port_listening": False,
            "http_status": None,
            "http_headers": None,
            "issues": [],
            "fixes": [],
            "healthy": False
        }
        
        # Check container status
        containers = self.get_container_status()
        diagnosis["containers"] = containers
        
        # Check for restarting containers
        restarting = []
        for service, info in containers.items():
            if "restarting" in info.get("status", "").lower():
                restarting.append(service)
        
        # Get logs for restarting services
        if restarting:
            for service in restarting:
                logs = self.get_container_logs(service, 400)
                issues = self.diagnose_restart_loop(logs)
                diagnosis["issues"].extend(issues)
                
                if self.full:
                    diagnosis[f"{service}_logs"] = logs[-2000:]  # Last 2000 chars
        
        # Check port
        diagnosis["port_listening"] = self.check_port_listening()
        
        # Check HTTP
        http_ok, status, headers = self.check_http_response()
        diagnosis["http_status"] = status
        diagnosis["http_headers"] = headers
        
        # Check Redis configuration
        if not self.check_redis_service():
            diagnosis["issues"].append({
                "type": "redis_missing",
                "severity": "critical",
                "message": "Redis service not found in docker-compose.yml",
                "fix": "Add Redis service to docker-compose.yml"
            })
        elif not self.check_redis_env():
            diagnosis["issues"].append({
                "type": "redis_env_missing",
                "severity": "critical",
                "message": "REDIS_URL not set in zammad service environment",
                "fix": "Add REDIS_URL: redis://redis:6379 to zammad environment"
            })
        
        # Check image tag
        image_tag, is_pinned = self.check_image_tag()
        diagnosis["image_tag"] = image_tag
        if not is_pinned:
            diagnosis["issues"].append({
                "type": "image_not_pinned",
                "severity": "warning",
                "message": f"Using :latest tag ({image_tag}) - should pin to specific version",
                "fix": "Pin image to specific version, e.g., zammad/zammad:6.3.0-1"
            })
        
        # Determine overall health
        critical_issues = [i for i in diagnosis["issues"] if i.get("severity") == "critical"]
        diagnosis["healthy"] = (
            len(restarting) == 0 and
            http_ok and
            diagnosis["port_listening"] and
            len(critical_issues) == 0
        )
        
        return diagnosis
    
    def print_diagnosis(self, diagnosis: Dict):
        """Print human-readable diagnosis."""
        print("═══════════════════════════════════════════════════════════")
        print("  Zammad Doctor - Diagnostic Report")
        print("═══════════════════════════════════════════════════════════")
        print(f"Timestamp: {diagnosis.get('timestamp', 'N/A')}")
        print(f"Compose Directory: {diagnosis.get('compose_dir', 'N/A')}")
        print("")
        
        # Services
        services = diagnosis.get("services", [])
        print(f"Services: {', '.join(services) if services else 'None found'}")
        print("")
        
        # Container status
        print("=== Container Status ===")
        containers = diagnosis.get("containers", {})
        for service, info in containers.items():
            status = info.get("status", "unknown")
            health = info.get("health", "")
            status_icon = "✓" if "up" in status.lower() and "restarting" not in status.lower() else "✗"
            print(f"{status_icon} {service:20} {status:15} {health}")
        print("")
        
        # Port and HTTP
        print("=== Network Status ===")
        port_ok = diagnosis.get("port_listening", False)
        print(f"Port {ZAMMAD_LOCAL_PORT} listening: {'✓' if port_ok else '✗'}")
        
        http_status = diagnosis.get("http_status")
        if http_status:
            http_ok = http_status in ["200", "302", "301"]
            print(f"HTTP Status: {'✓' if http_ok else '✗'} {http_status}")
        else:
            print("HTTP Status: ✗ No response")
        print("")
        
        # Issues
        issues = diagnosis.get("issues", [])
        if issues:
            print("=== Issues Found ===")
            for i, issue in enumerate(issues, 1):
                severity = issue.get("severity", "unknown").upper()
                msg = issue.get("message", "Unknown issue")
                print(f"{i}. [{severity}] {msg}")
                if issue.get("fix"):
                    print(f"   Fix: {issue['fix']}")
            print("")
        else:
            print("=== Issues ===")
            print("✓ No issues detected")
            print("")
        
        # Image tag
        image_tag = diagnosis.get("image_tag", "")
        if image_tag:
            is_pinned = ":latest" not in image_tag.lower()
            print(f"=== Image Tag ===")
            print(f"Current: {image_tag}")
            print(f"Pinned: {'✓' if is_pinned else '✗ (using :latest)'}")
            print("")
        
        # Overall health
        healthy = diagnosis.get("healthy", False)
        print("═══════════════════════════════════════════════════════════")
        if healthy:
            print("✅ ZAMMAD IS HEALTHY")
        else:
            print("❌ ZAMMAD HAS ISSUES - See fixes above")
        print("═══════════════════════════════════════════════════════════")


def main():
    """CLI entry point."""
    import argparse
    
    parser = argparse.ArgumentParser(
        description="Zammad Doctor - Authoritative diagnostic tool"
    )
    parser.add_argument(
        "--full",
        action="store_true",
        help="Include full container logs in output"
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Output JSON instead of human-readable format"
    )
    parser.add_argument(
        "--compose-dir",
        type=Path,
        default=ZAMMAD_INSTALL_DIR,
        help=f"Zammad compose directory (default: {ZAMMAD_INSTALL_DIR})"
    )
    
    args = parser.parse_args()
    
    doctor = ZammadDoctor(compose_dir=args.compose_dir, full=args.full)
    diagnosis = doctor.diagnose()
    
    if args.json:
        print(json.dumps(diagnosis, indent=2))
        sys.exit(0 if diagnosis.get("healthy", False) else 1)
    else:
        doctor.print_diagnosis(diagnosis)
        sys.exit(0 if diagnosis.get("healthy", False) else 1)


if __name__ == "__main__":
    main()
