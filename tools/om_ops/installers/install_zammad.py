#!/usr/bin/env python3
"""
Zammad Production Installer (Idempotent)
Installs Zammad with Docker Compose and Nginx reverse proxy.
"""

import os
import sys
import subprocess
import argparse
import json
import secrets
import string
import shutil
import time
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional, Tuple


# Configuration
NGINX_SITES_ENABLED = Path("/etc/nginx/sites-enabled")
NGINX_SITES_AVAILABLE = Path("/etc/nginx/sites-available")
NGINX_SNIPPETS_DIR = Path("/etc/nginx/snippets")
NGINX_CONF_D = Path("/etc/nginx/conf.d")
BACKUP_ROOT = Path("/var/backups/OM/zammad_install")


class StageTracker:
    """Track installation stages with timing."""
    
    def __init__(self, log_file: Path):
        self.stages: List[Dict] = []
        self.log_file = log_file
        self.log_file.parent.mkdir(parents=True, exist_ok=True)
    
    def start_stage(self, name: str):
        """Start a stage."""
        self.stages.append({
            "name": name,
            "status": "running",
            "start_time": time.time(),
            "duration": None
        })
        self._print_table()
        self._log(f"Stage started: {name}")
    
    def complete_stage(self, name: str, success: bool = True):
        """Complete a stage."""
        for stage in self.stages:
            if stage["name"] == name and stage["status"] == "running":
                stage["status"] = "completed" if success else "failed"
                stage["duration"] = time.time() - stage["start_time"]
                break
        self._print_table()
        status_str = "completed" if success else "failed"
        self._log(f"Stage {status_str}: {name}")
    
    def _print_table(self):
        """Print stage table."""
        print("\n" + "=" * 60)
        print(f"{'Stage':<30} {'Status':<15} {'Duration':<10}")
        print("-" * 60)
        for stage in self.stages:
            duration_str = f"{stage['duration']:.2f}s" if stage['duration'] else "running..."
            status = stage['status'].upper()
            print(f"{stage['name']:<30} {status:<15} {duration_str:<10}")
        print("=" * 60 + "\n")
    
    def _log(self, message: str):
        """Write to log file."""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        try:
            with open(self.log_file, "a", encoding="utf-8") as f:
                f.write(f"[{timestamp}] {message}\n")
        except Exception:
            pass


class InstallerLogger:
    """Logger that writes to both console and log file."""
    
    def __init__(self, log_file: Path):
        self.log_file = log_file
        self.log_file.parent.mkdir(parents=True, exist_ok=True)
    
    def log(self, message: str, level: str = "INFO"):
        """Log a message."""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        log_entry = f"[{timestamp}] [{level}] {message}"
        print(log_entry)
        try:
            with open(self.log_file, "a", encoding="utf-8") as f:
                f.write(log_entry + "\n")
        except Exception:
            pass
    
    def error(self, message: str):
        """Log an error."""
        self.log(message, "ERROR")
    
    def warn(self, message: str):
        """Log a warning."""
        self.log(message, "WARN")


def require_root():
    """Check if running as root."""
    if os.geteuid() != 0:
        print("ERROR: This script must be run as root (use sudo)")
        sys.exit(1)


def run_cmd(cmd: List[str], timeout: int = 60, cwd: Optional[Path] = None) -> Tuple[int, str, str]:
    """Run a command and return exit_code, stdout, stderr."""
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=timeout,
            cwd=str(cwd) if cwd else None,
        )
        return result.returncode, result.stdout, result.stderr
    except subprocess.TimeoutExpired:
        return -1, "", f"Command timed out after {timeout}s"
    except Exception as e:
        return -1, "", str(e)


def generate_password(length: int = 32) -> str:
    """Generate a strong random password."""
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    return ''.join(secrets.choice(alphabet) for _ in range(length))


def check_prereqs(logger: InstallerLogger, dry_run: bool = False) -> Tuple[bool, Dict]:
    """Check prerequisites: Docker, Docker Compose, Nginx."""
    logger.log("Checking prerequisites...")
    
    results = {
        "docker": False,
        "docker_compose": False,
        "nginx": False,
        "details": {}
    }
    
    all_present = True
    
    # Check Docker
    exit_code, stdout, stderr = run_cmd(["docker", "--version"], timeout=5)
    if exit_code == 0:
        results["docker"] = True
        results["details"]["docker_version"] = stdout.strip()
        logger.log(f"Docker found: {stdout.strip()}")
    else:
        logger.error("Docker not found. Please install Docker first.")
        all_present = False
        if not dry_run:
            return False, results
    
    # Check Docker Compose
    exit_code, stdout, stderr = run_cmd(["docker", "compose", "version"], timeout=5)
    if exit_code == 0:
        results["docker_compose"] = True
        results["details"]["docker_compose_version"] = stdout.strip()
        logger.log(f"Docker Compose found: {stdout.strip()}")
    else:
        logger.error("Docker Compose not found. Please install Docker Compose first.")
        all_present = False
        if not dry_run:
            return False, results
    
    # Check Nginx
    exit_code, stdout, stderr = run_cmd(["nginx", "-v"], timeout=5)
    if exit_code == 0:
        results["nginx"] = True
        results["details"]["nginx_version"] = stderr.strip() if stderr else stdout.strip()
        logger.log(f"Nginx found: {stderr.strip() if stderr else stdout.strip()}")
    else:
        logger.error("Nginx not found. Please install Nginx first.")
        all_present = False
        if not dry_run:
            return False, results
    
    if not all_present and dry_run:
        logger.warn("Some prerequisites are missing, but continuing in dry-run mode")
    
    return all_present, results


def find_nginx_vhost(domain: str, logger: InstallerLogger, dry_run: bool = False) -> Optional[Path]:
    """Find the nginx vhost file for the given domain."""
    logger.log(f"Searching for nginx vhost for {domain}...")
    
    # Search in sites-enabled
    if NGINX_SITES_ENABLED.exists():
        try:
            for config_file in NGINX_SITES_ENABLED.iterdir():
                if config_file.is_file() and not config_file.name.endswith('.backup'):
                    try:
                        with open(config_file, "r", encoding="utf-8") as f:
                            content = f.read()
                            if f"server_name {domain}" in content or f"server_name {domain};" in content:
                                logger.log(f"Found vhost: {config_file}")
                                return config_file
                    except Exception as e:
                        if not dry_run:
                            logger.warn(f"Error reading {config_file}: {e}")
                        continue
        except Exception as e:
            if not dry_run:
                logger.warn(f"Error accessing {NGINX_SITES_ENABLED}: {e}")
    
    # Search in conf.d
    if NGINX_CONF_D.exists():
        try:
            for config_file in NGINX_CONF_D.iterdir():
                if config_file.is_file():
                    try:
                        with open(config_file, "r", encoding="utf-8") as f:
                            content = f.read()
                            if f"server_name {domain}" in content or f"server_name {domain};" in content:
                                logger.log(f"Found vhost: {config_file}")
                                return config_file
                    except Exception as e:
                        if not dry_run:
                            logger.warn(f"Error reading {config_file}: {e}")
                        continue
        except Exception as e:
            if not dry_run:
                logger.warn(f"Error accessing {NGINX_CONF_D}: {e}")
    
    logger.error(f"No nginx vhost found for {domain}")
    return None


def write_compose(install_dir: Path, port: int, logger: InstallerLogger, dry_run: bool = False, print_only: bool = False) -> bool:
    """Write docker-compose.yml file."""
    logger.log(f"Writing docker-compose.yml to {install_dir}...")
    
    # Use raw string to preserve ${POSTGRES_PASSWORD} and other ${VAR} tokens
    # Replace only the port number placeholder
    compose_template = r"""version: '3.8'

services:
  postgres:
    image: postgres:15
    container_name: zammad-postgres
    restart: unless-stopped
    env_file:
      - .secrets.env
    environment:
      POSTGRES_DB: zammad
      POSTGRES_USER: zammad
    volumes:
      - zammad-postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U zammad"]
      interval: 10s
      timeout: 5s
      retries: 5

  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.11.0
    container_name: zammad-elasticsearch
    restart: unless-stopped
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
    volumes:
      - zammad-elasticsearch-data:/usr/share/elasticsearch/data
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost:9200/_cluster/health || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 5

  zammad:
    image: zammad/zammad:latest
    container_name: zammad-app
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
      elasticsearch:
        condition: service_healthy
    ports:
      - "127.0.0.1:{PORT}:3000"
    env_file:
      - .secrets.env
    environment:
      DATABASE_URL: postgres://zammad:${POSTGRES_PASSWORD}@postgres/zammad
      ELASTICSEARCH_URL: http://elasticsearch:9200
      ELASTICSEARCH_SSL_VERIFY: "false"
    volumes:
      - zammad-data:/opt/zammad
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost:3000/api/v1/health_check || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 5

volumes:
  zammad-postgres-data:
  zammad-elasticsearch-data:
  zammad-data:
"""
    
    # Replace port placeholder (only safe substitution)
    compose_content = compose_template.replace("{PORT}", str(port))
    
    compose_file = install_dir / "docker-compose.yml"
    
    if print_only:
        print(compose_content)
        return True
    
    if dry_run:
        logger.log(f"[DRY RUN] Would write docker-compose.yml to {compose_file}")
        logger.log("Preview (first 30 lines):")
        compose_lines = compose_content.split("\n")
        preview_lines = compose_lines[:30]
        for i, line in enumerate(preview_lines, 1):
            logger.log(f"  {i:3d}: {line}")
        if len(compose_lines) > 30:
            remaining = len(compose_lines) - 30
            logger.log(f"  ... ({remaining} more lines)")
        # Verify ${POSTGRES_PASSWORD} is preserved
        if "${POSTGRES_PASSWORD}" in compose_content:
            logger.log("✓ ${POSTGRES_PASSWORD} token preserved correctly")
        return True
    
    # Check if file exists and is identical
    if compose_file.exists():
        try:
            with open(compose_file, "r", encoding="utf-8") as f:
                existing = f.read()
            if existing.strip() == compose_content.strip():
                logger.log("docker-compose.yml already exists and matches, skipping")
                return True
            else:
                # Backup existing
                backup_file = install_dir / f"docker-compose.yml.backup.{datetime.now().strftime('%Y%m%d_%H%M%S')}"
                if not dry_run:
                    shutil.copy2(compose_file, backup_file)
                    logger.log(f"Backed up existing docker-compose.yml to {backup_file}")
                else:
                    logger.log(f"[DRY RUN] Would backup existing docker-compose.yml to {backup_file}")
        except Exception as e:
            if not dry_run:
                logger.warn(f"Error checking existing compose file: {e}")
    
    try:
        install_dir.mkdir(parents=True, exist_ok=True)
        with open(compose_file, "w", encoding="utf-8") as f:
            f.write(compose_content)
        logger.log(f"Wrote docker-compose.yml to {compose_file}")
        return True
    except Exception as e:
        logger.error(f"Failed to write docker-compose.yml: {e}")
        return False


def write_secrets(install_dir: Path, logger: InstallerLogger, dry_run: bool = False) -> bool:
    """Write or update .secrets.env file."""
    logger.log("Managing secrets file...")
    
    secrets_file = install_dir / ".secrets.env"
    
    # Check if file exists
    if secrets_file.exists():
        logger.log(".secrets.env already exists, preserving existing secrets")
        # Ensure correct permissions
        if not dry_run:
            os.chmod(secrets_file, 0o600)
        return True
    
    # Generate new password
    password = generate_password(32)
    secrets_content = f"POSTGRES_PASSWORD={password}\n"
    
    if dry_run:
        logger.log(f"[DRY RUN] Would create .secrets.env with generated password")
        return True
    
    try:
        install_dir.mkdir(parents=True, exist_ok=True)
        with open(secrets_file, "w", encoding="utf-8") as f:
            f.write(secrets_content)
        os.chmod(secrets_file, 0o600)
        logger.log("Created .secrets.env with generated password (permissions: 0600)")
        return True
    except Exception as e:
        logger.error(f"Failed to write .secrets.env: {e}")
        return False


def write_nginx_snippet(path: str, port: int, logger: InstallerLogger, dry_run: bool = False) -> bool:
    """Write nginx snippet for Zammad."""
    logger.log(f"Writing nginx snippet for path {path}...")
    
    snippet_file = NGINX_SNIPPETS_DIR / "orthodoxmetrics-helpdesk.conf"
    
    # Ensure path starts with / and ends with /
    nginx_path = path if path.startswith("/") else f"/{path}"
    nginx_path = nginx_path if nginx_path.endswith("/") else f"{nginx_path}/"
    
    snippet_content = f"""# Zammad Helpdesk reverse proxy
# Auto-generated by install_zammad.py
location {nginx_path} {{
    proxy_pass http://127.0.0.1:{port}/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-Host $host;
    proxy_set_header Connection "";
    proxy_buffering off;
    proxy_read_timeout 300s;
    proxy_connect_timeout 300s;
    
    # WebSocket support
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}}
"""
    
    if dry_run:
        logger.log(f"[DRY RUN] Would write nginx snippet to {snippet_file}")
        return True
    
    # Check if file exists and is identical
    if snippet_file.exists():
        try:
            with open(snippet_file, "r", encoding="utf-8") as f:
                existing = f.read()
            if existing.strip() == snippet_content.strip():
                logger.log("Nginx snippet already exists and matches, skipping")
                return True
        except Exception as e:
            logger.warn(f"Error checking existing snippet: {e}")
    
    try:
        NGINX_SNIPPETS_DIR.mkdir(parents=True, exist_ok=True)
        with open(snippet_file, "w", encoding="utf-8") as f:
            f.write(snippet_content)
        logger.log(f"Wrote nginx snippet to {snippet_file}")
        return True
    except Exception as e:
        logger.error(f"Failed to write nginx snippet: {e}")
        return False


def patch_nginx_vhost(vhost_file: Path, snippet_path: str, logger: InstallerLogger, 
                      dry_run: bool = False, yes: bool = False) -> bool:
    """Patch nginx vhost to include the snippet."""
    logger.log(f"Patching nginx vhost: {vhost_file}...")
    
    snippet_include = "include /etc/nginx/snippets/orthodoxmetrics-helpdesk.conf;"
    
    if dry_run:
        logger.log(f"[DRY RUN] Would add include statement to {vhost_file}")
        return True
    
    # Read current content
    try:
        with open(vhost_file, "r", encoding="utf-8") as f:
            content = f.read()
    except Exception as e:
        logger.error(f"Failed to read vhost file: {e}")
        return False
    
    # Check if include already exists
    if snippet_include in content:
        logger.log("Nginx vhost already includes the snippet, skipping")
        return True
    
    # Backup vhost file
    backup_file = vhost_file.parent / f"{vhost_file.name}.backup.{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    try:
        shutil.copy2(vhost_file, backup_file)
        logger.log(f"Backed up vhost to {backup_file}")
    except Exception as e:
        logger.error(f"Failed to backup vhost file: {e}")
        return False
    
    # Ask for confirmation unless --yes flag
    if not yes:
        print(f"\n⚠️  This will modify {vhost_file}")
        print(f"   Backup created at: {backup_file}")
        print(f"   Will add: {snippet_include}")
        response = input("\nProceed? (yes/no): ").strip().lower()
        if response not in ["yes", "y"]:
            logger.log("User cancelled nginx vhost modification")
            return False
    
    # Insert include statement inside server block
    lines = content.split("\n")
    new_lines = []
    in_server_block = False
    include_added = False
    server_brace_count = 0
    found_first_location = False
    
    for i, line in enumerate(lines):
        stripped = line.strip()
        
        # Detect server block start
        if stripped.startswith("server") and "{" in stripped:
            in_server_block = True
            server_brace_count = stripped.count("{") - stripped.count("}")
        
        # Track brace count
        if in_server_block:
            server_brace_count += stripped.count("{") - stripped.count("}")
        
        new_lines.append(line)
        
        # Add include after first location block ends
        if in_server_block and not include_added:
            if stripped.startswith("location"):
                found_first_location = True
            elif found_first_location and stripped == "}" and server_brace_count == 1:
                # We're closing the first location block, add include after it
                indent = len(line) - len(line.lstrip())
                new_lines.append(" " * indent + snippet_include)
                include_added = True
        
        # Detect server block end
        if in_server_block and stripped == "}" and server_brace_count == 0:
            in_server_block = False
            # If we haven't added include yet, add it before closing brace
            if not include_added:
                indent = len(line) - len(line.lstrip())
                # Insert before the closing brace
                new_lines.pop()  # Remove the closing brace line
                new_lines.append(" " * indent + snippet_include)
                new_lines.append(line)  # Add closing brace back
                include_added = True
    
    new_content = "\n".join(new_lines)
    
    # Write new content
    try:
        with open(vhost_file, "w", encoding="utf-8") as f:
            f.write(new_content)
        logger.log(f"Updated nginx vhost: {vhost_file}")
        return True
    except Exception as e:
        logger.error(f"Failed to write vhost file: {e}")
        # Restore backup
        try:
            shutil.copy2(backup_file, vhost_file)
            logger.log("Restored backup after write failure")
        except Exception:
            pass
        return False


def docker_up(install_dir: Path, logger: InstallerLogger, dry_run: bool = False) -> bool:
    """Bring up docker compose services."""
    logger.log("Bringing up Docker Compose services...")
    
    if dry_run:
        logger.log("[DRY RUN] Would run: docker compose up -d")
        return True
    
    exit_code, stdout, stderr = run_cmd(
        ["docker", "compose", "up", "-d"],
        timeout=300,
        cwd=install_dir
    )
    
    if exit_code != 0:
        logger.error(f"Docker Compose failed:\n{stderr}")
        return False
    
    logger.log("Docker Compose services started successfully")
    return True


def nginx_reload(logger: InstallerLogger, dry_run: bool = False) -> bool:
    """Reload nginx configuration."""
    logger.log("Reloading nginx...")
    
    if dry_run:
        logger.log("[DRY RUN] Would run: nginx -t && systemctl reload nginx")
        return True
    
    # Validate config first
    exit_code, stdout, stderr = run_cmd(["nginx", "-t"], timeout=10)
    if exit_code != 0:
        logger.error(f"Nginx config validation failed:\n{stderr}")
        return False
    
    # Reload nginx
    exit_code, stdout, stderr = run_cmd(["systemctl", "reload", "nginx"], timeout=10)
    if exit_code != 0:
        logger.error(f"Nginx reload failed:\n{stderr}")
        return False
    
    logger.log("Nginx reloaded successfully")
    return True


def verify(port: int, domain: str, path: str, logger: InstallerLogger, dry_run: bool = False) -> Tuple[bool, Dict]:
    """Verify installation with health checks."""
    logger.log("Running verification checks...")
    
    results = {
        "docker_compose": False,
        "nginx": False,
        "details": {}
    }
    
    if dry_run:
        logger.log("[DRY RUN] Would verify installation")
        return True, results
    
    # Check Docker Compose health
    logger.log(f"Checking Docker Compose service at http://127.0.0.1:{port}/...")
    exit_code, stdout, stderr = run_cmd(
        ["curl", "-s", "-o", "/dev/null", "-w", "%{http_code}", f"http://127.0.0.1:{port}/"],
        timeout=10
    )
    
    if exit_code == 0 and stdout.strip() in ["200", "302"]:
        results["docker_compose"] = True
        results["details"]["docker_compose_status_code"] = stdout.strip()
        logger.log(f"✓ Docker Compose health check passed (HTTP {stdout.strip()})")
    else:
        logger.error(f"✗ Docker Compose health check failed (exit_code: {exit_code}, output: {stdout})")
        results["details"]["docker_compose_error"] = stderr
    
    # Check Nginx proxy
    nginx_path = path if path.startswith("/") else f"/{path}"
    nginx_path = nginx_path if nginx_path.endswith("/") else f"{nginx_path}/"
    url = f"https://{domain}{nginx_path}"
    
    logger.log(f"Checking Nginx proxy at {url}...")
    exit_code, stdout, stderr = run_cmd(
        ["curl", "-s", "-I", "-k", url],
        timeout=10
    )
    
    if exit_code == 0:
        # Check for 200 or 302 in headers
        if "200" in stdout or "302" in stdout:
            results["nginx"] = True
            results["details"]["nginx_status_code"] = "200/302"
            logger.log(f"✓ Nginx proxy health check passed")
        else:
            logger.warn(f"Nginx proxy returned unexpected status:\n{stdout}")
            results["details"]["nginx_response"] = stdout
    else:
        logger.error(f"✗ Nginx proxy health check failed:\n{stderr}")
        results["details"]["nginx_error"] = stderr
    
    success = results["docker_compose"] and results["nginx"]
    return success, results


def main():
    """Main installer function."""
    parser = argparse.ArgumentParser(
        description="Install Zammad with Docker Compose and Nginx reverse proxy"
    )
    parser.add_argument(
        "--domain",
        required=True,
        help="Domain name (e.g., orthodoxmetrics.com)"
    )
    parser.add_argument(
        "--path",
        default="/helpdesk",
        help="URL path for Zammad (default: /helpdesk)"
    )
    parser.add_argument(
        "--port",
        type=int,
        default=3030,
        help="Port to bind Zammad container (default: 3030)"
    )
    parser.add_argument(
        "--install-dir",
        default="/opt/zammad",
        help="Installation directory (default: /opt/zammad)"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print actions without executing"
    )
    parser.add_argument(
        "--yes",
        action="store_true",
        help="Non-interactive mode (skip confirmations)"
    )
    parser.add_argument(
        "--print-compose",
        action="store_true",
        help="Print docker-compose.yml content to stdout and exit"
    )
    
    args = parser.parse_args()
    
    # Handle --print-compose early
    if args.print_compose:
        install_dir = Path(args.install_dir)
        logger_temp = InstallerLogger(Path("/dev/null"))  # Dummy logger
        write_compose(install_dir, args.port, logger_temp, dry_run=False, print_only=True)
        sys.exit(0)
    
    # Check root
    if not args.dry_run:
        require_root()
    
    # Setup logging
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    if args.dry_run:
        # Use a temp path for dry-run that won't be written to
        log_file = Path("/tmp/zammad_install_dryrun.log")
    else:
        run_dir = BACKUP_ROOT / "runs" / timestamp
        run_dir.mkdir(parents=True, exist_ok=True)
        log_file = run_dir / "install.log"
    logger = InstallerLogger(log_file)
    
    logger.log("=" * 60)
    logger.log("Zammad Installer Starting")
    logger.log("=" * 60)
    logger.log(f"Domain: {args.domain}")
    logger.log(f"Path: {args.path}")
    logger.log(f"Port: {args.port}")
    logger.log(f"Install Dir: {args.install_dir}")
    logger.log(f"Dry Run: {args.dry_run}")
    
    # Stage tracker
    stages = StageTracker(log_file)
    
    # Run report
    run_report = {
        "timestamp": timestamp,
        "domain": args.domain,
        "path": args.path,
        "port": args.port,
        "install_dir": args.install_dir,
        "dry_run": args.dry_run,
        "commands": [],
        "stages": []
    }
    
    install_dir = Path(args.install_dir)
    
    # Stage 1: Check prerequisites
    stages.start_stage("Check Prerequisites")
    success, prereq_results = check_prereqs(logger, args.dry_run)
    # Mark as failed if prerequisites are missing (even in dry-run)
    prereqs_ok = prereq_results.get("docker", False) and prereq_results.get("docker_compose", False) and prereq_results.get("nginx", False)
    stages.complete_stage("Check Prerequisites", prereqs_ok)
    run_report["stages"].append({"name": "Check Prerequisites", "success": prereqs_ok})
    run_report["prerequisites"] = prereq_results
    if not prereqs_ok and not args.dry_run:
        logger.error("Prerequisites check failed - missing required tools")
        sys.exit(1)
    
    # Stage 2: Write secrets
    stages.start_stage("Write Secrets")
    success = write_secrets(install_dir, logger, args.dry_run)
    stages.complete_stage("Write Secrets", success)
    run_report["stages"].append({"name": "Write Secrets", "success": success})
    if not success:
        logger.error("Failed to write secrets")
        sys.exit(1)
    
    # Stage 3: Write Docker Compose
    stages.start_stage("Write Docker Compose")
    success = write_compose(install_dir, args.port, logger, args.dry_run, print_only=False)
    stages.complete_stage("Write Docker Compose", success)
    run_report["stages"].append({"name": "Write Docker Compose", "success": success})
    if not success:
        logger.error("Failed to write docker-compose.yml")
        sys.exit(1)
    
    # Stage 4: Write Nginx snippet
    stages.start_stage("Write Nginx Snippet")
    success = write_nginx_snippet(args.path, args.port, logger, args.dry_run)
    stages.complete_stage("Write Nginx Snippet", success)
    run_report["stages"].append({"name": "Write Nginx Snippet", "success": success})
    if not success:
        logger.error("Failed to write nginx snippet")
        sys.exit(1)
    
    # Stage 5: Patch Nginx vhost
    stages.start_stage("Patch Nginx Vhost")
    vhost_file = find_nginx_vhost(args.domain, logger, args.dry_run)
    if not vhost_file:
        if args.dry_run:
            logger.warn(f"[DRY RUN] Could not find nginx vhost for {args.domain}, but continuing")
            success = True  # Don't fail in dry-run
        else:
            logger.error(f"Could not find nginx vhost for {args.domain}")
            success = False
            sys.exit(1)
    else:
        success = patch_nginx_vhost(vhost_file, args.path, logger, args.dry_run, args.yes)
    stages.complete_stage("Patch Nginx Vhost", success)
    run_report["stages"].append({"name": "Patch Nginx Vhost", "success": success})
    if not success and not args.dry_run:
        logger.error("Failed to patch nginx vhost")
        sys.exit(1)
    
    # Stage 6: Docker Compose up
    stages.start_stage("Docker Compose Up")
    success = docker_up(install_dir, logger, args.dry_run)
    stages.complete_stage("Docker Compose Up", success)
    run_report["stages"].append({"name": "Docker Compose Up", "success": success})
    if not success:
        logger.error("Failed to start Docker Compose services")
        sys.exit(1)
    
    # Stage 7: Reload Nginx
    stages.start_stage("Reload Nginx")
    success = nginx_reload(logger, args.dry_run)
    stages.complete_stage("Reload Nginx", success)
    run_report["stages"].append({"name": "Reload Nginx", "success": success})
    if not success:
        logger.error("Failed to reload nginx")
        sys.exit(1)
    
    # Stage 8: Verify
    stages.start_stage("Verify Installation")
    success, verify_results = verify(args.port, args.domain, args.path, logger, args.dry_run)
    stages.complete_stage("Verify Installation", success)
    run_report["stages"].append({"name": "Verify Installation", "success": success})
    run_report["verification"] = verify_results
    
    # Write run report
    if not args.dry_run:
        report_file = run_dir / "run.json"
        try:
            with open(report_file, "w", encoding="utf-8") as f:
                json.dump(run_report, f, indent=2)
            logger.log(f"Run report written to {report_file}")
        except Exception as e:
            logger.warn(f"Failed to write run report: {e}")
    else:
        logger.log("[DRY RUN] Would write run report")
    
    # Final summary
    logger.log("=" * 60)
    if args.dry_run:
        logger.log("Dry-run completed successfully!")
        logger.log("No changes were made to the system.")
    elif success:
        logger.log("Installation completed successfully!")
        logger.log(f"Zammad should be available at: https://{args.domain}{args.path}")
        logger.log(f"Logs: {log_file}")
        if not args.dry_run:
            report_file = BACKUP_ROOT / "runs" / timestamp / "run.json"
            logger.log(f"Report: {report_file}")
    else:
        logger.error("Installation completed with errors")
        logger.error(f"Check logs at: {log_file}")
        if not args.dry_run:
            sys.exit(1)
    
    logger.log("=" * 60)


if __name__ == "__main__":
    main()
