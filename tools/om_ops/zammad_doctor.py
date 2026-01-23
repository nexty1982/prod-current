#!/usr/bin/env python3
"""
Zammad Doctor - Standalone authoritative diagnostic tool for Zammad.

This tool replaces all one-off fix scripts with a single reliable diagnostic
that reads actual logs and provides actionable fixes.

Requirements:
- Standalone (no external dependencies beyond Python stdlib)
- Always uses explicit paths (/opt/zammad/docker-compose.yml)
- Never uses host psql
- Reads actual container logs to diagnose issues
- Provides clear PASS/FAIL per check with actionable fixes
"""

import os
import sys
import subprocess
import json
import re
import time
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional, Tuple

# Configuration
ZAMMAD_COMPOSE_FILE = Path("/opt/zammad/docker-compose.yml")
ZAMMAD_LOCAL_PORT = 3030
ZAMMAD_LOCAL_URL = f"http://127.0.0.1:{ZAMMAD_LOCAL_PORT}"


def log(msg: str, level: str = "INFO"):
    """Simple logging to stderr."""
    prefix = {
        "INFO": "ℹ",
        "WARN": "⚠",
        "ERROR": "✗",
        "SUCCESS": "✓"
    }.get(level, "•")
    print(f"{prefix} {msg}", file=sys.stderr)


def run_cmd(cmd: List[str], timeout: int = 30, cwd: Optional[Path] = None) -> Tuple[int, str, str]:
    """Run a command and return exit code, stdout, stderr."""
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=timeout,
            cwd=str(cwd) if cwd else None
        )
        return result.returncode, result.stdout, result.stderr
    except subprocess.TimeoutExpired:
        return -1, "", f"Command timed out after {timeout}s"
    except Exception as e:
        return -1, "", str(e)


def redact_secrets(text: str) -> str:
    """Redact sensitive information from text."""
    # Redact POSTGRES_PASSWORD=...
    text = re.sub(r'POSTGRES_PASSWORD=[^\s\n]+', 'POSTGRES_PASSWORD=***', text, flags=re.I)
    # Redact token=...
    text = re.sub(r'token=[^\s\n]+', 'token=***', text, flags=re.I)
    # Redact password=...
    text = re.sub(r'password=[^\s\n]+', 'password=***', text, flags=re.I)
    return text


class ZammadDoctor:
    """Zammad diagnostic tool."""
    
    def __init__(self, full: bool = False, write_report: bool = False):
        self.full = full
        self.write_report = write_report
        self.checks: List[Dict] = []
        self.report_dir = Path("/var/backups/OM/zammad_doctor/runs") / datetime.now().strftime("%Y%m%d_%H%M%S")
        
    def check_compose_file_exists(self) -> bool:
        """Check if compose file exists."""
        exists = ZAMMAD_COMPOSE_FILE.exists()
        self.checks.append({
            "check": "compose_file_exists",
            "status": "PASS" if exists else "FAIL",
            "message": f"Compose file exists: {ZAMMAD_COMPOSE_FILE}" if exists else f"Compose file missing: {ZAMMAD_COMPOSE_FILE}",
            "action": None if exists else f"Create {ZAMMAD_COMPOSE_FILE} or fix path"
        })
        return exists
    
    def check_compose_config(self) -> Tuple[bool, List[str]]:
        """Check compose config and get services."""
        # Try config --services first (doesn't require .env)
        exit_code, stdout, stderr = run_cmd(
            ["docker", "compose", "-f", str(ZAMMAD_COMPOSE_FILE), "config", "--services"],
            timeout=10
        )
        
        if exit_code != 0:
            # If that fails due to .env, try without env_file expansion
            # Check if error is about .env permission
            if "permission denied" in stderr.lower() or ".env" in stderr.lower():
                # Try to get services by parsing compose file directly
                try:
                    with open(ZAMMAD_COMPOSE_FILE, 'r') as f:
                        content = f.read()
                    # Extract service names - look for top-level keys under "services:"
                    import re
                    # Find the services section
                    services_match = re.search(r'^services:\s*\n(.*?)(?=^volumes:|^networks:|$)', content, re.MULTILINE | re.DOTALL)
                    if services_match:
                        services_section = services_match.group(1)
                        # Find service names (indented with 2 spaces, followed by colon)
                        services = re.findall(r'^  (\w+):\s*$', services_section, re.MULTILINE)
                        # Filter out common non-service keys
                        exclude = {'volumes', 'networks', 'env_file', 'environment', 'depends_on', 'ports', 'command', 'healthcheck'}
                        services = [s for s in services if s not in exclude]
                        if services:
                            self.checks.append({
                                "check": "compose_config",
                                "status": "PASS",
                                "message": f"Compose file valid, services: {', '.join(services)} (parsed from file)",
                                "action": None
                            })
                            return True, services
                except Exception as e:
                    pass
            
            self.checks.append({
                "check": "compose_config",
                "status": "FAIL",
                "message": f"Failed to parse compose file: {stderr}",
                "action": "Fix docker-compose.yml syntax errors or .env permissions"
            })
            return False, []
        
        services = [s.strip() for s in stdout.strip().split("\n") if s.strip()]
        self.checks.append({
            "check": "compose_config",
            "status": "PASS",
            "message": f"Compose file valid, services: {', '.join(services)}",
            "action": None
        })
        return True, services
    
    def check_container_status(self, services: List[str]) -> Dict[str, Dict]:
        """Check container status."""
        # Try docker compose ps first
        exit_code, stdout, stderr = run_cmd(
            ["docker", "compose", "-f", str(ZAMMAD_COMPOSE_FILE), "ps", "--format", "json"],
            timeout=10
        )
        
        containers = {}
        used_fallback = False
        
        if exit_code != 0:
            # If compose ps fails due to .env permission, try docker ps directly
            if "permission denied" in stderr.lower() or ".env" in stderr.lower():
                # Use docker ps to get containers by name pattern
                exit_code2, stdout2, stderr2 = run_cmd(
                    ["docker", "ps", "-a", "--format", "json", "--filter", "name=zammad-"],
                    timeout=10
                )
                if exit_code2 == 0 and stdout2.strip():
                    # Parse docker ps output
                    used_fallback = True
                    for line in stdout2.strip().split("\n"):
                        if not line.strip():
                            continue
                        try:
                            data = json.loads(line)
                            name = data.get("Names", "")
                            # Extract service name from container name (zammad-postgres -> postgres)
                            if name.startswith("zammad-"):
                                service = name.replace("zammad-", "")
                                status = data.get("Status", "")
                                containers[service] = {
                                    "status": status,
                                    "health": "",
                                    "name": name,
                                    "id": data.get("ID", "")
                                }
                        except (json.JSONDecodeError, KeyError):
                            continue
        
        if not used_fallback and exit_code == 0:
            # Parse docker compose ps output
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
        
        if not containers and exit_code != 0:
            self.checks.append({
                "check": "container_status",
                "status": "FAIL",
                "message": f"Failed to get container status: {stderr}",
                "action": "Check Docker daemon is running: systemctl status docker"
            })
            return containers
        
        # Check for restarting/unhealthy containers
        restarting = []
        unhealthy = []
        for service, info in containers.items():
            status_lower = info.get("status", "").lower()
            health_lower = info.get("health", "").lower()
            if "restarting" in status_lower:
                restarting.append(service)
            elif health_lower and "unhealthy" in health_lower:
                unhealthy.append(service)
        
        # Individual container checks
        for service, info in containers.items():
            status = info.get("status", "")
            health = info.get("health", "")
            status_lower = status.lower()
            health_lower = health.lower() if health else ""
            
            # PASS if Up and healthy (or no health check)
            is_up = "up" in status_lower and "restarting" not in status_lower
            is_healthy = not health_lower or "healthy" in health_lower or health_lower == ""
            
            if is_up and is_healthy:
                self.checks.append({
                    "check": f"container_{service}",
                    "status": "PASS",
                    "message": f"{service}: {status}" + (f" ({health})" if health else ""),
                    "action": None
                })
            else:
                self.checks.append({
                    "check": f"container_{service}",
                    "status": "FAIL",
                    "message": f"{service}: {status}" + (f" ({health})" if health else ""),
                    "action": f"Check logs: docker logs {info.get('name', service)}"
                })
        
        # Overall container status check
        all_up = len(restarting) == 0 and len(unhealthy) == 0 and len(containers) > 0
        
        self.checks.append({
            "check": "container_status",
            "status": "PASS" if all_up else "FAIL",
            "message": f"Containers: {len(containers)} total, {len(restarting)} restarting, {len(unhealthy)} unhealthy" + 
                      (f" (restarting: {', '.join(restarting)})" if restarting else "") +
                      (f" (unhealthy: {', '.join(unhealthy)})" if unhealthy else ""),
            "action": None if all_up else f"Check logs for {restarting[0] if restarting else unhealthy[0] if unhealthy else 'zammad'} service"
        })
        
        return containers
    
    def check_logs(self, service: str = "zammad") -> Tuple[str, List[Dict]]:
        """Get logs and diagnose issues."""
        # Try container name first
        exit_code, stdout, stderr = run_cmd(
            ["docker", "logs", "--tail", "300", f"zammad-{service}"],
            timeout=15
        )
        
        if exit_code != 0:
            # Fallback to compose logs
            exit_code, stdout, stderr = run_cmd(
                ["docker", "compose", "-f", str(ZAMMAD_COMPOSE_FILE), "logs", "--tail", "300", service],
                timeout=15
            )
        
        logs = stdout if exit_code == 0 else stderr
        issues = []
        
        # Diagnose common issues
        # Bundler gem errors (CRITICAL - must be first)
        if re.search(r"Bundler::GemNotFound|Could not find.*in locally installed gems|bundler.*gem.*not found", logs, re.I):
            issues.append({
                "type": "bundler_gem_not_found",
                "severity": "critical",
                "message": "Bundler cannot find required gems (likely volume mount overwriting app code)",
                "fix": "Remove volume mount that overwrites /opt/zammad. Only mount subdirectories like /opt/zammad/storage and /opt/zammad/log"
            })
        
        if re.search(r"issue connecting to your database|database.*password|PG::|ActiveRecord::ConnectionNotEstablished", logs, re.I):
            issues.append({
                "type": "database_auth",
                "severity": "critical",
                "message": "Database authentication failure",
                "fix": "Update PostgreSQL password: docker exec -e PGPASSWORD='...' zammad-postgres psql -U postgres -c \"ALTER USER zammad WITH PASSWORD '...';\""
            })
        
        if re.search(r"redis.*connect|Redis::CannotConnectError|REDIS_URL.*not|There was an error trying to connect to Redis", logs, re.I):
            issues.append({
                "type": "redis_missing",
                "severity": "critical",
                "message": "Redis connection failure",
                "fix": "Ensure Redis service exists in docker-compose.yml and REDIS_URL is set to redis://redis:6379"
            })
        
        if re.search(r"elasticsearch.*connect|Elasticsearch.*error|Connection refused.*9200", logs, re.I):
            issues.append({
                "type": "elasticsearch",
                "severity": "warning",
                "message": "Elasticsearch connection issue",
                "fix": "Check elasticsearch service health: docker compose ps elasticsearch"
            })
        
        if re.search(r"migration.*error|ActiveRecord::StatementInvalid|PG::.*permission", logs, re.I):
            issues.append({
                "type": "migration",
                "severity": "critical",
                "message": "Database migration failure",
                "fix": "Check database permissions and run migrations: docker exec zammad-app bundle exec rails db:migrate"
            })
        
        if re.search(r"address.*already.*use|bind.*failed|EADDRINUSE|port.*in use", logs, re.I):
            issues.append({
                "type": "port_conflict",
                "severity": "critical",
                "message": "Port binding conflict",
                "fix": "Check for other services using port 3030: ss -tlnp | grep 3030"
            })
        
        if re.search(r"exited.*code.*0|no.*command|entrypoint.*failed", logs, re.I):
            issues.append({
                "type": "missing_command",
                "severity": "critical",
                "message": "Container exiting immediately (no command or entrypoint failed)",
                "fix": "Add command to zammad service: command: [\"rails\", \"server\", \"-b\", \"0.0.0.0\", \"-p\", \"3000\"]"
            })
        
        log_snippet = logs[-1000:] if len(logs) > 1000 else logs
        if issues:
            self.checks.append({
                "check": "logs",
                "status": "FAIL",
                "message": f"Found {len(issues)} issue(s) in logs",
                "action": issues[0]["fix"] if issues else None,
                "log_snippet": log_snippet[-500:] if self.full else None
            })
        else:
            self.checks.append({
                "check": "logs",
                "status": "PASS",
                "message": "No critical errors in recent logs",
                "action": None
            })
        
        return logs, issues
    
    def check_port_listening(self) -> bool:
        """Check if port 3030 is listening."""
        exit_code, stdout, stderr = run_cmd(
            ["ss", "-tlnp"],
            timeout=5
        )
        
        listening = exit_code == 0 and f":{ZAMMAD_LOCAL_PORT} " in stdout
        
        self.checks.append({
            "check": "port_listening",
            "status": "PASS" if listening else "FAIL",
            "message": f"Port {ZAMMAD_LOCAL_PORT} listening" if listening else f"Port {ZAMMAD_LOCAL_PORT} not listening",
            "action": None if listening else "Check zammad container is running and port mapping is correct"
        })
        
        return listening
    
    def check_http_response(self) -> Tuple[bool, Optional[str], Optional[str]]:
        """Check HTTP response."""
        exit_code, stdout, stderr = run_cmd(
            ["curl", "-sS", "-I", ZAMMAD_LOCAL_URL],
            timeout=10
        )
        
        if exit_code != 0:
            self.checks.append({
                "check": "http_response",
                "status": "FAIL",
                "message": f"HTTP request failed: {stderr}",
                "action": "Check zammad container logs and ensure Rails server is running"
            })
            return False, None, stderr
        
        # Extract status line
        status_line = None
        headers = stdout
        for line in stdout.split("\n"):
            if line.startswith("HTTP/"):
                status_line = line.strip()
                break
        
        status_code = None
        if status_line:
            match = re.search(r'(\d{3})', status_line)
            if match:
                status_code = match.group(1)
        
        http_ok = status_code in ["200", "301", "302"]
        
        self.checks.append({
            "check": "http_response",
            "status": "PASS" if http_ok else "FAIL",
            "message": f"HTTP {status_code}" if status_code else "No HTTP status code",
            "action": None if http_ok else "Check zammad application logs for startup errors",
            "headers": headers if self.full else None
        })
        
        return http_ok, status_code, headers
    
    def diagnose(self) -> Dict:
        """Run full diagnosis."""
        log("Starting Zammad diagnosis...")
        
        diagnosis = {
            "timestamp": datetime.now().isoformat(),
            "compose_file": str(ZAMMAD_COMPOSE_FILE),
            "checks": [],
            "healthy": False
        }
        
        # Check 1: Compose file exists
        if not self.check_compose_file_exists():
            diagnosis["checks"] = self.checks
            diagnosis["healthy"] = False
            return diagnosis
        
        # Check 2: Compose config
        config_ok, services = self.check_compose_config()
        if not config_ok:
            diagnosis["checks"] = self.checks
            diagnosis["healthy"] = False
            return diagnosis
        
        diagnosis["services"] = services
        
        # Check 3: Container status
        containers = self.check_container_status(services)
        diagnosis["containers"] = containers
        
        # Check 4: Logs (if zammad service exists)
        if "zammad" in services:
            logs, issues = self.check_logs("zammad")
            diagnosis["log_issues"] = issues
            if self.full:
                diagnosis["logs"] = logs[-2000:]
        
        # Check 5: Port listening
        port_ok = self.check_port_listening()
        diagnosis["port_listening"] = port_ok
        
        # Check 6: HTTP response
        http_ok, status_code, headers = self.check_http_response()
        diagnosis["http_status"] = status_code
        if self.full and headers:
            diagnosis["http_headers"] = headers
        
        # Overall health
        all_passed = all(c["status"] == "PASS" for c in self.checks)
        diagnosis["checks"] = self.checks
        diagnosis["healthy"] = all_passed
        
        return diagnosis
    
    def print_report(self, diagnosis: Dict):
        """Print human-readable report."""
        print("═══════════════════════════════════════════════════════════")
        print("  Zammad Doctor - Diagnostic Report")
        print("═══════════════════════════════════════════════════════════")
        print(f"Timestamp: {diagnosis.get('timestamp', 'N/A')}")
        print(f"Compose File: {diagnosis.get('compose_file', 'N/A')}")
        print("")
        
        # Print checks
        for check in diagnosis.get("checks", []):
            status = check.get("status", "UNKNOWN")
            message = check.get("message", "")
            action = check.get("action")
            
            status_icon = "✓" if status == "PASS" else "✗"
            print(f"{status_icon} [{status}] {check.get('check', 'unknown')}: {message}")
            
            if action:
                print(f"   → Action: {action}")
            
            if check.get("log_snippet") and self.full:
                print(f"   Log snippet:")
                for line in check["log_snippet"].split("\n")[-10:]:
                    print(f"     {line}")
            print("")
        
        # Overall status
        healthy = diagnosis.get("healthy", False)
        print("═══════════════════════════════════════════════════════════")
        if healthy:
            print("✅ ZAMMAD IS HEALTHY")
        else:
            print("❌ ZAMMAD HAS ISSUES - See actions above")
        print("═══════════════════════════════════════════════════════════")
    
    def write_report_files(self, diagnosis: Dict):
        """Write report files to disk."""
        if not self.write_report:
            return
        
        self.report_dir.mkdir(parents=True, exist_ok=True)
        
        # Write JSON
        json_file = self.report_dir / "diagnosis.json"
        with open(json_file, 'w') as f:
            json.dump(diagnosis, f, indent=2)
        
        # Write Markdown
        md_file = self.report_dir / "diagnosis.md"
        with open(md_file, 'w') as f:
            f.write("# Zammad Doctor Report\n\n")
            f.write(f"**Timestamp:** {diagnosis.get('timestamp', 'N/A')}\n\n")
            f.write(f"**Compose File:** {diagnosis.get('compose_file', 'N/A')}\n\n")
            f.write(f"**Overall Status:** {'✅ HEALTHY' if diagnosis.get('healthy') else '❌ HAS ISSUES'}\n\n")
            f.write("## Checks\n\n")
            
            for check in diagnosis.get("checks", []):
                status = check.get("status", "UNKNOWN")
                f.write(f"### {check.get('check', 'unknown')}\n\n")
                f.write(f"- **Status:** {status}\n")
                f.write(f"- **Message:** {check.get('message', '')}\n")
                if check.get("action"):
                    f.write(f"- **Action:** {check.get('action')}\n")
                f.write("\n")
        
        log(f"Report written to: {self.report_dir}")


def main():
    """CLI entry point."""
    import argparse
    
    parser = argparse.ArgumentParser(
        description="Zammad Doctor - Standalone diagnostic tool"
    )
    parser.add_argument("--status", action="store_true", help="Check container status only")
    parser.add_argument("--logs", action="store_true", help="Check logs only")
    parser.add_argument("--http", action="store_true", help="Check HTTP only")
    parser.add_argument("--full", action="store_true", help="Include full logs and headers")
    parser.add_argument("--write-report", action="store_true", help="Write report files to disk")
    parser.add_argument("--json", action="store_true", help="Output JSON")
    
    args = parser.parse_args()
    
    doctor = ZammadDoctor(full=args.full, write_report=args.write_report)
    diagnosis = doctor.diagnose()
    
    if args.json:
        print(json.dumps(diagnosis, indent=2))
    else:
        doctor.print_report(diagnosis)
    
    if args.write_report:
        doctor.write_report_files(diagnosis)
    
    sys.exit(0 if diagnosis.get("healthy", False) else 1)


if __name__ == "__main__":
    main()
