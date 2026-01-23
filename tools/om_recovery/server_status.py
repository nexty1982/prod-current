#!/usr/bin/env python3
"""
OM-Ops - Server Status Module
Comprehensive end-to-end health check with performance metrics over time windows.
"""

import os
import sys
import json
import subprocess
import datetime
import socket
import platform
import urllib.request
import urllib.error
import time
import re
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from collections import defaultdict

# Configuration
REPO_ROOT = Path("/var/www/orthodoxmetrics/prod")
BACKEND_DIR = REPO_ROOT / "server"
FRONTEND_DIR = REPO_ROOT / "front-end"
BACKUP_ROOT = Path("/var/backups/OM")
SERVER_STATUS_ROOT = BACKUP_ROOT / "server_status"
SNAPSHOTS_DIR = SERVER_STATUS_ROOT / "snapshots"
REPORTS_DIR = SERVER_STATUS_ROOT / "reports"
BACKEND_PORT = 3001
OPS_HUB_PORT = 3010
PM2_APP_NAME = "orthodox-backend"
PM2_OPS_HUB_NAME = "om-ops-hub"
EXTERNAL_URL = "https://orthodoxmetrics.com"

# Time windows for history (in hours)
TIME_WINDOWS = {
    "1h": 1,
    "3h": 3,
    "6h": 6,
    "12h": 12,
    "24h": 24,
    "7d": 24 * 7,
    "30d": 24 * 30,
}

# Exclude directories for LOC counting
LOC_EXCLUDE_DIRS = {
    "template", "vendor", "build", "node_modules", "dist", ".git",
    ".vite", ".cache", ".tmp", "logs", "_cursor_session_backup",
    ".venv", ".venv_image"
}

# Import shared utilities
try:
    script_dir = Path(__file__).parent
    if str(script_dir) not in sys.path:
        sys.path.insert(0, str(script_dir))
    from utils import run_cmd, log_ops, redact_secrets
except ImportError:
    def run_cmd(cmd, timeout=30, redact=True, cwd=None):
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout, cwd=str(cwd) if cwd else None)
        return result.returncode, result.stdout, result.stderr
    def log_ops(msg, level="INFO"):
        print(f"[{level}] {msg}")
    def redact_secrets(text):
        return text

# Import PM2 ops if available
try:
    from pm2_ops import pm2_status, pm2_info
except ImportError:
    pm2_status = None
    pm2_info = None

# Import DB credentials helper (from om_recovery.py)
def get_db_credentials():
    """Extract database credentials from env files (not stored in output)."""
    credentials = {}
    env_files = [
        BACKEND_DIR / ".env.production",
        REPO_ROOT / ".env.production",
        BACKEND_DIR / ".env",
    ]
    
    for env_file in env_files:
        if env_file.exists():
            try:
                with open(env_file, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if "=" in line and not line.startswith("#"):
                            key, value = line.split("=", 1)
                            key = key.strip()
                            value = value.strip().strip('"').strip("'")
                            
                            if key in ["DB_HOST", "MYSQL_HOST"] and "host" not in credentials:
                                credentials["host"] = value or "localhost"
                            elif key in ["DB_PORT", "MYSQL_PORT"] and "port" not in credentials:
                                credentials["port"] = value or "3306"
                            elif key in ["DB_USER", "MYSQL_USER"] and "user" not in credentials:
                                credentials["user"] = value
                            elif key in ["DB_PASSWORD", "MYSQL_PASSWORD"] and "password" not in credentials:
                                credentials["password"] = value
                            elif key in ["DB_NAME", "MYSQL_DATABASE"] and "database" not in credentials:
                                credentials["database"] = value
                            elif key in ["DB_AUTH_NAME", "AUTH_DB_NAME"] and "auth_database" not in credentials:
                                credentials["auth_database"] = value
            except Exception:
                pass
    
    # Set defaults
    credentials.setdefault("host", "localhost")
    credentials.setdefault("port", "3306")
    credentials.setdefault("user", "root")
    credentials.setdefault("database", "orthodoxmetrics_db")
    credentials.setdefault("auth_database", "orthodoxmetrics_auth_db")
    
    return credentials


def run_cmd_safe(cmd: List[str], timeout: int = 10, max_output: int = 1000) -> Tuple[bool, str]:
    """Run command safely with timeout and output limits."""
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=timeout,
            errors="replace"
        )
        output = result.stdout + result.stderr
        if len(output) > max_output:
            output = output[:max_output] + f"\n... (truncated, max {max_output} chars)"
        return result.returncode == 0, output
    except subprocess.TimeoutExpired:
        return False, f"Command timed out after {timeout}s"
    except Exception as e:
        return False, str(e)


def get_system_basics() -> Dict:
    """Collect basic system information."""
    basics = {
        "timestamp": datetime.datetime.now().isoformat(),
        "hostname": socket.gethostname(),
        "timezone": datetime.datetime.now().astimezone().tzname(),
    }
    
    # Uptime
    success, output = run_cmd_safe(["uptime"], timeout=5)
    if success:
        basics["uptime"] = output.strip()
        # Parse load average
        parts = output.split("load average:")
        if len(parts) > 1:
            load_avg = parts[1].strip().split(",")
            if len(load_avg) >= 3:
                basics["load_avg"] = {
                    "1min": load_avg[0].strip(),
                    "5min": load_avg[1].strip(),
                    "15min": load_avg[2].strip(),
                }
    
    # Disk usage
    success, output = run_cmd_safe(["df", "-h"], timeout=5)
    if success:
        basics["disk"] = {}
        lines = output.split("\n")
        key_mounts = ["/", "/var/www", "/var/backups", "/var/log"]
        for line in lines:
            for mount in key_mounts:
                if mount in line:
                    parts = line.split()
                    if len(parts) >= 5:
                        basics["disk"][mount] = {
                            "size": parts[1],
                            "used": parts[2],
                            "avail": parts[3],
                            "use_percent": parts[4],
                        }
    
    # Memory
    success, output = run_cmd_safe(["free", "-h"], timeout=5)
    if success:
        basics["memory"] = {}
        lines = output.split("\n")
        for line in lines:
            if line.startswith("Mem:"):
                parts = line.split()
                if len(parts) >= 4:
                    basics["memory"] = {
                        "total": parts[1],
                        "used": parts[2],
                        "free": parts[3],
                    }
            elif line.startswith("Swap:"):
                parts = line.split()
                if len(parts) >= 4:
                    basics["memory"]["swap"] = {
                        "total": parts[1],
                        "used": parts[2],
                        "free": parts[3],
                    }
    
    # Top processes (CPU)
    success, output = run_cmd_safe(["ps", "aux", "--sort=-%cpu"], timeout=5, max_output=2000)
    if success:
        lines = output.split("\n")
        basics["top_cpu"] = []
        for line in lines[1:6]:  # Skip header, top 5
            if line.strip():
                parts = line.split(None, 10)
                if len(parts) >= 11:
                    basics["top_cpu"].append({
                        "user": parts[0],
                        "cpu": parts[2],
                        "mem": parts[3],
                        "command": parts[10][:50],
                    })
    
    # Top processes (Memory)
    success, output = run_cmd_safe(["ps", "aux", "--sort=-%mem"], timeout=5, max_output=2000)
    if success:
        lines = output.split("\n")
        basics["top_mem"] = []
        for line in lines[1:6]:  # Skip header, top 5
            if line.strip():
                parts = line.split(None, 10)
                if len(parts) >= 11:
                    basics["top_mem"].append({
                        "user": parts[0],
                        "cpu": parts[2],
                        "mem": parts[3],
                        "command": parts[10][:50],
                    })
    
    return basics


def check_network_health() -> Dict:
    """Check network connectivity and latency."""
    network = {
        "ping": {},
        "dns": {},
        "tcp": {},
    }
    
    # Ping gateway (default route)
    success, output = run_cmd_safe(["ip", "route", "show", "default"], timeout=3)
    if success:
        gateway = None
        for line in output.split("\n"):
            if "default via" in line:
                parts = line.split()
                if len(parts) >= 3:
                    gateway = parts[2]
                    break
        
        if gateway:
            success, output = run_cmd_safe(["ping", "-c", "3", "-W", "2", gateway], timeout=5)
            if success:
                # Parse ping output
                lines = output.split("\n")
                for line in lines:
                    if "min/avg/max" in line:
                        parts = line.split("=")[1].split("/")
                        if len(parts) >= 3:
                            network["ping"]["gateway"] = {
                                "min": parts[0].strip(),
                                "avg": parts[1].strip(),
                                "max": parts[2].split()[0].strip(),
                            }
    
    # Ping external DNS servers
    for dns_server in ["1.1.1.1", "8.8.8.8"]:
        success, output = run_cmd_safe(["ping", "-c", "3", "-W", "2", dns_server], timeout=5)
        if success:
            lines = output.split("\n")
            for line in lines:
                if "min/avg/max" in line:
                    parts = line.split("=")[1].split("/")
                    if len(parts) >= 3:
                        network["ping"][dns_server] = {
                            "min": parts[0].strip(),
                            "avg": parts[1].strip(),
                            "max": parts[2].split()[0].strip(),
                        }
    
    # DNS resolution for orthodoxmetrics.com
    try:
        import socket
        start = time.time()
        ip = socket.gethostbyname("orthodoxmetrics.com")
        dns_time = (time.time() - start) * 1000
        network["dns"]["orthodoxmetrics.com"] = {
            "resolved": True,
            "ip": ip,
            "time_ms": round(dns_time, 2),
        }
    except Exception as e:
        network["dns"]["orthodoxmetrics.com"] = {
            "resolved": False,
            "error": str(e)[:100],
        }
    
    # TCP connect checks
    for port, name in [(3001, "backend"), (80, "http"), (443, "https")]:
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(2)
            start = time.time()
            result = sock.connect_ex(("127.0.0.1", port))
            connect_time = (time.time() - start) * 1000
            sock.close()
            network["tcp"][f"localhost:{port}"] = {
                "reachable": result == 0,
                "time_ms": round(connect_time, 2),
            }
        except Exception as e:
            network["tcp"][f"localhost:{port}"] = {
                "reachable": False,
                "error": str(e)[:100],
            }
    
    return network


def check_external_reachability() -> Dict:
    """Check external URL accessibility with curl timing."""
    reachability = {
        "internal_backend": {},
        "internal_nginx": {},
        "external": {},
    }
    
    # Internal backend direct
    try:
        start = time.time()
        with urllib.request.urlopen(f"http://127.0.0.1:{BACKEND_PORT}/", timeout=5) as response:
            status_code = response.getcode()
            total_time = (time.time() - start) * 1000
            reachability["internal_backend"] = {
                "status_code": status_code,
                "time_total_ms": round(total_time, 2),
                "reachable": True,
            }
    except Exception as e:
        reachability["internal_backend"] = {
            "reachable": False,
            "error": str(e)[:100],
        }
    
    # Internal nginx
    try:
        start = time.time()
        with urllib.request.urlopen("http://localhost/", timeout=5) as response:
            status_code = response.getcode()
            total_time = (time.time() - start) * 1000
            reachability["internal_nginx"] = {
                "status_code": status_code,
                "time_total_ms": round(total_time, 2),
                "reachable": True,
            }
    except Exception as e:
        reachability["internal_nginx"] = {
            "reachable": False,
            "error": str(e)[:100],
        }
    
    # External URL with curl timing
    success, output = run_cmd_safe([
        "curl", "-o", "/dev/null", "-s", "-w",
        "%{time_namelookup},%{time_connect},%{time_starttransfer},%{time_total},%{http_code}",
        EXTERNAL_URL
    ], timeout=10)
    
    if success:
        parts = output.strip().split(",")
        if len(parts) >= 5:
            reachability["external"] = {
                "url": EXTERNAL_URL,
                "time_namelookup_ms": round(float(parts[0]) * 1000, 2),
                "time_connect_ms": round(float(parts[1]) * 1000, 2),
                "time_starttransfer_ms": round(float(parts[2]) * 1000, 2),
                "time_total_ms": round(float(parts[3]) * 1000, 2),
                "http_code": int(parts[4]),
                "reachable": int(parts[4]) < 500,
            }
    else:
        reachability["external"] = {
            "url": EXTERNAL_URL,
            "reachable": False,
            "error": output[:100],
        }
    
    return reachability


def check_backend_health() -> Dict:
    """Check backend (PM2) health."""
    backend = {
        "pm2": {},
        "health_endpoint": {},
        "logs": {},
    }
    
    # PM2 status
    if pm2_status:
        try:
            pm2_data = pm2_status()
            backend["pm2"] = pm2_data
        except Exception as e:
            backend["pm2"]["error"] = str(e)[:200]
    else:
        # Fallback: use pm2 info command
        success, output = run_cmd_safe(["pm2", "info", PM2_APP_NAME], timeout=5)
        if success:
            backend["pm2"]["available"] = True
            # Parse key info
            lines = output.split("\n")
            for line in lines[:50]:
                if "status" in line.lower() and "online" in line.lower():
                    backend["pm2"]["status"] = "online"
                elif "restart time" in line.lower():
                    parts = line.split()
                    if parts:
                        backend["pm2"]["restarts"] = parts[-1]
                elif "uptime" in line.lower() and ":" in line:
                    backend["pm2"]["uptime"] = line.split(":")[-1].strip()
        else:
            backend["pm2"]["available"] = False
    
    # Health endpoint
    health_endpoints = [
        f"http://127.0.0.1:{BACKEND_PORT}/api/system/health",
        f"http://127.0.0.1:{BACKEND_PORT}/health",
        f"http://127.0.0.1:{BACKEND_PORT}/",
    ]
    
    for endpoint in health_endpoints:
        try:
            start = time.time()
            with urllib.request.urlopen(endpoint, timeout=5) as response:
                status_code = response.getcode()
                response_time = (time.time() - start) * 1000
                backend["health_endpoint"] = {
                    "endpoint": endpoint,
                    "status_code": status_code,
                    "response_time_ms": round(response_time, 2),
                    "reachable": True,
                }
                break
        except Exception:
            continue
    
    if not backend["health_endpoint"]:
        backend["health_endpoint"]["reachable"] = False
    
    # PM2 error log location (don't dump, just show path and last few lines)
    pm2_log_path = Path.home() / ".pm2" / "logs" / f"{PM2_APP_NAME}-error.log"
    if pm2_log_path.exists():
        backend["logs"]["error_log_path"] = str(pm2_log_path)
        try:
            # Get last 10 lines
            success, output = run_cmd_safe(["tail", "-n", "10", str(pm2_log_path)], timeout=3)
            if success:
                lines = output.split("\n")
                backend["logs"]["error_log_last_lines"] = len([l for l in lines if l.strip()])
                backend["logs"]["error_log_sample"] = "\n".join(lines[-3:])  # Last 3 lines
        except:
            pass
    else:
        backend["logs"]["error_log_path"] = "not found"
    
    return backend


def check_nginx_health() -> Dict:
    """Check Nginx health."""
    nginx = {
        "config_valid": False,
        "site_config": {},
        "error_log": {},
    }
    
    # Config validation
    success, output = run_cmd_safe(["nginx", "-t"], timeout=5)
    nginx["config_valid"] = success
    if not success:
        nginx["config_error"] = output[:500]
    
    # Site config
    site_config = Path("/etc/nginx/sites-enabled/orthodoxmetrics.com")
    if site_config.exists():
        nginx["site_config"]["path"] = str(site_config)
        nginx["site_config"]["exists"] = True
        try:
            content = site_config.read_text()
            nginx["site_config"]["size_bytes"] = len(content)
            # Check for key directives
            if "server_name" in content:
                nginx["site_config"]["server_name_configured"] = True
            if "proxy_pass" in content:
                nginx["site_config"]["proxy_configured"] = True
        except Exception as e:
            nginx["site_config"]["error"] = str(e)[:100]
    else:
        nginx["site_config"]["exists"] = False
    
    # Error log (bounded)
    error_log = Path("/var/log/nginx/error.log")
    if error_log.exists():
        nginx["error_log"]["path"] = str(error_log)
        nginx["error_log"]["exists"] = True
        try:
            # Get last 5 error lines
            success, output = run_cmd_safe(["tail", "-n", "5", str(error_log)], timeout=3)
            if success:
                lines = [l for l in output.split("\n") if l.strip()]
                nginx["error_log"]["recent_lines_count"] = len(lines)
                if lines:
                    nginx["error_log"]["last_line"] = lines[-1][:200]
        except:
            pass
    else:
        nginx["error_log"]["exists"] = False
    
    return nginx


def check_database_health() -> Dict:
    """Check MariaDB/MySQL health (no secrets)."""
    db = {
        "service": {},
        "connection": {},
        "version": {},
        "databases": {},
    }
    
    # Service status (systemctl or docker)
    success, output = run_cmd_safe(["systemctl", "is-active", "mariadb"], timeout=3)
    if success and "active" in output.lower():
        db["service"]["running"] = True
        db["service"]["method"] = "systemctl"
    else:
        # Check docker
        success, output = run_cmd_safe(["docker", "ps", "--filter", "name=mysql", "--format", "{{.Names}}"], timeout=3)
        if success and output.strip():
            db["service"]["running"] = True
            db["service"]["method"] = "docker"
            db["service"]["containers"] = output.strip().split("\n")
        else:
            db["service"]["running"] = False
    
    # Connection check (using credentials, but don't print password)
    try:
        credentials = get_db_credentials()
        # Test connection with mysql client
        cmd = [
            "mysql",
            "-h", credentials["host"],
            "-P", credentials["port"],
            "-u", credentials["user"],
            "-e", "SELECT 1;",
            credentials["database"],
        ]
        env = os.environ.copy()
        if credentials.get("password"):
            env["MYSQL_PWD"] = credentials["password"]
        
        success, output = run_cmd_safe(cmd, timeout=5)
        db["connection"]["connectable"] = success
        if success:
            db["connection"]["host"] = credentials["host"]
            db["connection"]["port"] = credentials["port"]
            db["connection"]["database"] = credentials["database"]
    except Exception as e:
        db["connection"]["connectable"] = False
        db["connection"]["error"] = str(e)[:100]
    
    # Server version
    try:
        credentials = get_db_credentials()
        cmd = [
            "mysql",
            "-h", credentials["host"],
            "-P", credentials["port"],
            "-u", credentials["user"],
            "-e", "SELECT VERSION();",
        ]
        env = os.environ.copy()
        if credentials.get("password"):
            env["MYSQL_PWD"] = credentials["password"]
        
        success, output = run_cmd_safe(cmd, timeout=5)
        if success:
            lines = output.split("\n")
            for line in lines:
                if "VERSION()" not in line and line.strip():
                    db["version"] = line.strip()
                    break
    except Exception as e:
        db["version"] = "unknown"
    
    # Database presence check
    try:
        credentials = get_db_credentials()
        cmd = [
            "mysql",
            "-h", credentials["host"],
            "-P", credentials["port"],
            "-u", credentials["user"],
            "-e", "SHOW DATABASES;",
        ]
        env = os.environ.copy()
        if credentials.get("password"):
            env["MYSQL_PWD"] = credentials["password"]
        
        success, output = run_cmd_safe(cmd, timeout=5)
        if success:
            databases = []
            for line in output.split("\n"):
                line = line.strip()
                if line and line not in ["Database", "information_schema", "performance_schema", "mysql", "sys"]:
                    databases.append(line)
            db["databases"]["count"] = len(databases)
            db["databases"]["list"] = databases[:10]  # Limit to 10
            
            # Check for key tables in orthodoxmetrics_db
            if credentials["database"] in databases:
                cmd_tables = [
                    "mysql",
                    "-h", credentials["host"],
                    "-P", credentials["port"],
                    "-u", credentials["user"],
                    "-e", f"SHOW TABLES FROM {credentials['database']};",
                ]
                success_tables, output_tables = run_cmd_safe(cmd_tables, timeout=5)
                if success_tables:
                    tables = [l.strip() for l in output_tables.split("\n") if l.strip() and "Tables_in" not in l]
                    db["databases"]["orthodoxmetrics_db_tables_count"] = len(tables)
                    db["databases"]["orthodoxmetrics_db_tables_sample"] = tables[:5]  # Sample
    except Exception as e:
        db["databases"]["error"] = str(e)[:100]
    
    return db


def count_codebase_loc() -> Dict:
    """Count lines of code (excluding Modernize template and build artifacts)."""
    loc = {
        "total_loc": 0,
        "by_directory": {},
        "excluded_dirs": list(LOC_EXCLUDE_DIRS),
        "definition": "Unique code lines excluding template/vendor/build/node_modules/dist/.git",
    }
    
    def should_exclude(path: Path) -> bool:
        """Check if path should be excluded."""
        parts = path.parts
        for part in parts:
            if part in LOC_EXCLUDE_DIRS or part.startswith("."):
                return True
        return False
    
    def count_lines_in_file(file_path: Path) -> int:
        """Count non-empty lines in a file."""
        try:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                return sum(1 for line in f if line.strip())
        except:
            return 0
    
    # Walk through repo
    if not REPO_ROOT.exists():
        return loc
    
    for root, dirs, files in os.walk(REPO_ROOT):
        root_path = Path(root)
        
        # Filter out excluded directories
        dirs[:] = [d for d in dirs if not should_exclude(root_path / d)]
        
        # Skip excluded directories
        if should_exclude(root_path):
            continue
        
        # Count lines in files
        for file in files:
            file_path = root_path / file
            if should_exclude(file_path):
                continue
            
            # Only count common code file extensions
            if file_path.suffix in [".js", ".ts", ".jsx", ".tsx", ".py", ".php", ".java", ".go", ".rs", ".rb"]:
                lines = count_lines_in_file(file_path)
                if lines > 0:
                    # Get relative directory
                    rel_dir = str(file_path.parent.relative_to(REPO_ROOT))
                    if rel_dir == ".":
                        rel_dir = "root"
                    
                    loc["by_directory"][rel_dir] = loc["by_directory"].get(rel_dir, 0) + lines
                    loc["total_loc"] += lines
    
    return loc


def run_status_probe() -> Dict:
    """Run full status probe and return structured dict."""
    probe = {
        "timestamp": datetime.datetime.now().isoformat(),
        "system": get_system_basics(),
        "network": check_network_health(),
        "reachability": check_external_reachability(),
        "backend": check_backend_health(),
        "nginx": check_nginx_health(),
        "database": check_database_health(),
        "codebase": count_codebase_loc(),
    }
    
    return probe


def save_snapshot(probe: Dict) -> Tuple[bool, Path]:
    """Save probe as snapshot JSON file."""
    try:
        SNAPSHOTS_DIR.mkdir(parents=True, exist_ok=True)
        
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        snapshot_path = SNAPSHOTS_DIR / f"snapshot_{timestamp}.json"
        
        with open(snapshot_path, "w", encoding="utf-8") as f:
            json.dump(probe, f, indent=2)
        
        return True, snapshot_path
    except Exception as e:
        return False, Path(str(e))


def load_snapshots(window_hours: int) -> List[Dict]:
    """Load snapshots within time window."""
    if not SNAPSHOTS_DIR.exists():
        return []
    
    cutoff_time = datetime.datetime.now() - datetime.timedelta(hours=window_hours)
    snapshots = []
    
    for snapshot_file in sorted(SNAPSHOTS_DIR.glob("snapshot_*.json"), reverse=True):
        try:
            # Parse timestamp from filename
            timestamp_str = snapshot_file.stem.replace("snapshot_", "")
            file_time = datetime.datetime.strptime(timestamp_str, "%Y%m%d_%H%M%S")
            
            if file_time >= cutoff_time:
                with open(snapshot_file, "r", encoding="utf-8") as f:
                    snapshot = json.load(f)
                    snapshot["_file_path"] = str(snapshot_file)
                    snapshot["_file_time"] = file_time.isoformat()
                    snapshots.append(snapshot)
        except Exception:
            continue
    
    return snapshots


def aggregate_snapshots(snapshots: List[Dict], window_name: str) -> Dict:
    """Aggregate snapshots into metrics for a time window."""
    if not snapshots:
        return {
            "window": window_name,
            "samples": 0,
            "status": "insufficient_data",
        }
    
    agg = {
        "window": window_name,
        "samples": len(snapshots),
        "first_sample": snapshots[-1]["timestamp"],
        "last_sample": snapshots[0]["timestamp"],
    }
    
    # Extract metrics
    cpu_loads = []
    mem_useds = []
    disk_useds = []
    backend_restarts = []
    external_times = []
    
    for snap in snapshots:
        # CPU load
        if "system" in snap and "load_avg" in snap["system"]:
            try:
                cpu_loads.append(float(snap["system"]["load_avg"]["1min"]))
            except:
                pass
        
        # Memory used
        if "system" in snap and "memory" in snap["system"]:
            try:
                mem_str = snap["system"]["memory"].get("used", "0")
                mem_str = mem_str.replace("G", "").replace("M", "").replace("K", "")
                mem_useds.append(float(mem_str))
            except:
                pass
        
        # Disk usage
        if "system" in snap and "disk" in snap["system"]:
            for mount, disk_info in snap["system"]["disk"].items():
                if mount == "/":
                    try:
                        use_pct = disk_info.get("use_percent", "0%").replace("%", "")
                        disk_useds.append(float(use_pct))
                    except:
                        pass
        
        # Backend restarts
        if "backend" in snap and "pm2" in snap["backend"]:
            try:
                restarts = int(snap["backend"]["pm2"].get("restarts", 0))
                backend_restarts.append(restarts)
            except:
                pass
        
        # External reachability time
        if "reachability" in snap and "external" in snap["reachability"]:
            ext = snap["reachability"]["external"]
            if ext.get("reachable") and "time_total_ms" in ext:
                external_times.append(ext["time_total_ms"])
    
    # Compute aggregates
    if cpu_loads:
        agg["cpu_load"] = {
            "avg": round(sum(cpu_loads) / len(cpu_loads), 2),
            "max": round(max(cpu_loads), 2),
        }
    
    if mem_useds:
        agg["memory_used"] = {
            "avg": round(sum(mem_useds) / len(mem_useds), 2),
            "max": round(max(mem_useds), 2),
        }
    
    if disk_useds:
        agg["disk_used_percent"] = {
            "avg": round(sum(disk_useds) / len(disk_useds), 2),
            "max": round(max(disk_useds), 2),
        }
    
    if backend_restarts:
        agg["backend_restarts"] = {
            "total": backend_restarts[0] - backend_restarts[-1] if len(backend_restarts) > 1 else 0,
            "current": backend_restarts[0],
        }
    
    if external_times:
        sorted_times = sorted(external_times)
        p95_idx = int(len(sorted_times) * 0.95)
        agg["external_response_time_ms"] = {
            "avg": round(sum(external_times) / len(external_times), 2),
            "p95": round(sorted_times[p95_idx] if p95_idx < len(sorted_times) else sorted_times[-1], 2),
            "max": round(max(external_times), 2),
        }
    
    return agg


def render_status_dashboard(probe: Dict, ui_screen=None) -> List[str]:
    """Render status dashboard as lines."""
    lines = []
    
    lines.append("=" * 80)
    lines.append("SERVER STATUS DASHBOARD")
    lines.append("=" * 80)
    lines.append("")
    
    # System Basics
    lines.append("SYSTEM BASICS")
    lines.append("-" * 80)
    if "system" in probe:
        sys = probe["system"]
        lines.append(f"Timestamp: {sys.get('timestamp', 'unknown')}")
        lines.append(f"Hostname: {sys.get('hostname', 'unknown')}")
        lines.append(f"Uptime: {sys.get('uptime', 'unknown')}")
        if "load_avg" in sys:
            la = sys["load_avg"]
            lines.append(f"Load Average: {la.get('1min', '?')} / {la.get('5min', '?')} / {la.get('15min', '?')}")
        if "memory" in sys:
            mem = sys["memory"]
            lines.append(f"Memory: {mem.get('used', '?')} / {mem.get('total', '?')}")
        if "disk" in sys:
            lines.append("Disk Usage:")
            for mount, disk_info in sys["disk"].items():
                lines.append(f"  {mount}: {disk_info.get('used', '?')} / {disk_info.get('size', '?')} ({disk_info.get('use_percent', '?')})")
    lines.append("")
    
    # Network Health
    lines.append("NETWORK HEALTH")
    lines.append("-" * 80)
    if "network" in probe:
        net = probe["network"]
        if "ping" in net:
            lines.append("Ping Latency:")
            for target, ping_info in net["ping"].items():
                if "avg" in ping_info:
                    lines.append(f"  {target}: {ping_info['avg']}ms avg")
        if "dns" in net:
            for domain, dns_info in net["dns"].items():
                if dns_info.get("resolved"):
                    lines.append(f"DNS {domain}: {dns_info.get('ip', '?')} ({dns_info.get('time_ms', '?')}ms)")
        if "tcp" in net:
            lines.append("TCP Connect:")
            for target, tcp_info in net["tcp"].items():
                status = "✓" if tcp_info.get("reachable") else "✗"
                lines.append(f"  {status} {target}: {tcp_info.get('time_ms', '?')}ms")
    lines.append("")
    
    # External Reachability
    lines.append("EXTERNAL REACHABILITY")
    lines.append("-" * 80)
    if "reachability" in probe:
        reach = probe["reachability"]
        if "external" in reach:
            ext = reach["external"]
            status = "✓" if ext.get("reachable") else "✗"
            lines.append(f"{status} {ext.get('url', '?')}: HTTP {ext.get('http_code', '?')}")
            if "time_total_ms" in ext:
                lines.append(f"  Total Time: {ext['time_total_ms']}ms")
                lines.append(f"  DNS: {ext.get('time_namelookup_ms', '?')}ms, Connect: {ext.get('time_connect_ms', '?')}ms")
    lines.append("")
    
    # Backend Health
    lines.append("BACKEND HEALTH")
    lines.append("-" * 80)
    if "backend" in probe:
        backend = probe["backend"]
        if "pm2" in backend:
            pm2 = backend["pm2"]
            status = "✓" if pm2.get("status") == "online" else "✗"
            lines.append(f"{status} PM2 Status: {pm2.get('status', 'unknown')}")
            lines.append(f"  Restarts: {pm2.get('restarts', '?')}")
            lines.append(f"  Uptime: {pm2.get('uptime', '?')}")
        if "health_endpoint" in backend:
            he = backend["health_endpoint"]
            status = "✓" if he.get("reachable") else "✗"
            lines.append(f"{status} Health Endpoint: {he.get('endpoint', '?')} (HTTP {he.get('status_code', '?')})")
    lines.append("")
    
    # Nginx Health
    lines.append("NGINX HEALTH")
    lines.append("-" * 80)
    if "nginx" in probe:
        nginx = probe["nginx"]
        status = "✓" if nginx.get("config_valid") else "✗"
        lines.append(f"{status} Config Valid: {nginx.get('config_valid', False)}")
        if "site_config" in nginx:
            sc = nginx["site_config"]
            lines.append(f"  Site Config: {sc.get('path', 'not found')}")
    lines.append("")
    
    # Database Health
    lines.append("DATABASE HEALTH")
    lines.append("-" * 80)
    if "database" in probe:
        db = probe["database"]
        status = "✓" if db.get("service", {}).get("running") else "✗"
        lines.append(f"{status} Service Running: {db.get('service', {}).get('running', False)}")
        status = "✓" if db.get("connection", {}).get("connectable") else "✗"
        lines.append(f"{status} Connection: {db.get('connection', {}).get('connectable', False)}")
        if "version" in db:
            lines.append(f"  Version: {db.get('version', 'unknown')}")
        if "databases" in db:
            db_info = db["databases"]
            lines.append(f"  Databases: {db_info.get('count', 0)}")
    lines.append("")
    
    # Codebase Metrics
    lines.append("CODEBASE METRICS")
    lines.append("-" * 80)
    if "codebase" in probe:
        cb = probe["codebase"]
        lines.append(f"Total LOC: {cb.get('total_loc', 0):,}")
        lines.append(f"Excluded: {', '.join(cb.get('excluded_dirs', []))}")
        if "by_directory" in cb and cb["by_directory"]:
            lines.append("Top Directories:")
            sorted_dirs = sorted(cb["by_directory"].items(), key=lambda x: x[1], reverse=True)[:5]
            for dir_name, loc_count in sorted_dirs:
                lines.append(f"  {dir_name}: {loc_count:,} LOC")
    lines.append("")
    
    lines.append("=" * 80)
    
    return lines


def run_server_status_menu(ui_screen=None):
    """Run Server Status interactive menu."""
    # Try to use UI screen if available
    try:
        script_dir = Path(__file__).parent
        if str(script_dir) not in sys.path:
            sys.path.insert(0, str(script_dir))
        from ui_screen import render_screen, clear_screen, get_user_input, wait_for_enter
        UI_SCREEN_AVAILABLE = True
    except ImportError:
        UI_SCREEN_AVAILABLE = False
        def render_screen(*args, **kwargs):
            pass
        def clear_screen():
            os.system("clear" if os.name != "nt" else "cls")
        def get_user_input(prompt="Select option: "):
            return input(prompt).strip()
        def wait_for_enter(message="Press Enter to continue..."):
            input(message)
    
    while True:
        clear_screen()
        render_screen(
            title="Server Status",
            breadcrumb="OM-Ops › Server Status",
            body_lines=[
                "",
                "[1] Run full status check now",
                "[2] Save snapshot",
                "[3] View history (1h/3h/6h/12h/24h/7d/30d)",
                "[4] Run speed test (may take 30-60s)",
                "[0] Back to main menu",
                "",
            ],
            footer_hint="[0] Back   [q] Quit"
        )
        
        try:
            choice = get_user_input("Select option: ").strip()
        except (EOFError, KeyboardInterrupt):
            break
        
        if choice == "0" or choice.lower() == "q":
            break
        elif choice == "1":
            # Run full status check
            clear_screen()
            render_screen(
                title="Server Status",
                breadcrumb="OM-Ops › Server Status › Running Probe",
                body_lines=["", "Running comprehensive status check...", "", "This may take up to 15 seconds.", ""],
                footer_hint="Please wait..."
            )
            
            probe = run_status_probe()
            
            # Display results
            clear_screen()
            dashboard_lines = render_status_dashboard(probe, ui_screen)
            render_screen(
                title="Server Status",
                breadcrumb="OM-Ops › Server Status › Results",
                body_lines=dashboard_lines,
                footer_hint="[Enter] Back   [0] Main Menu   [q] Quit"
            )
            wait_for_enter()
        elif choice == "2":
            # Save snapshot
            clear_screen()
            render_screen(
                title="Server Status",
                breadcrumb="OM-Ops › Server Status › Saving Snapshot",
                body_lines=["", "Running probe and saving snapshot...", ""],
                footer_hint="Please wait..."
            )
            
            probe = run_status_probe()
            success, snapshot_path = save_snapshot(probe)
            
            clear_screen()
            if success:
                render_screen(
                    title="Server Status",
                    breadcrumb="OM-Ops › Server Status › Snapshot Saved",
                    body_lines=[
                        "",
                        "✓ Snapshot saved successfully!",
                        "",
                        f"Path: {snapshot_path}",
                        "",
                    ],
                    footer_hint="[Enter] Back   [0] Main Menu   [q] Quit"
                )
            else:
                render_screen(
                    title="Server Status",
                    breadcrumb="OM-Ops › Server Status › Error",
                    body_lines=[
                        "",
                        "✗ Failed to save snapshot",
                        "",
                        f"Error: {snapshot_path}",
                        "",
                    ],
                    footer_hint="[Enter] Back   [0] Main Menu   [q] Quit"
                )
            wait_for_enter()
        elif choice == "3":
            # View history
            clear_screen()
            render_screen(
                title="Server Status",
                breadcrumb="OM-Ops › Server Status › History",
                body_lines=[
                    "",
                    "Select time window:",
                    "",
                    "[1] 1 hour",
                    "[2] 3 hours",
                    "[3] 6 hours",
                    "[4] 12 hours",
                    "[5] 24 hours",
                    "[6] 7 days",
                    "[7] 30 days",
                    "[0] Back",
                    "",
                ],
                footer_hint="[0] Back   [q] Quit"
            )
            
            try:
                window_choice = get_user_input("Select window: ").strip()
            except (EOFError, KeyboardInterrupt):
                continue
            
            window_map = {
                "1": ("1h", 1),
                "2": ("3h", 3),
                "3": ("6h", 6),
                "4": ("12h", 12),
                "5": ("24h", 24),
                "6": ("7d", 24 * 7),
                "7": ("30d", 24 * 30),
            }
            
            if window_choice in window_map:
                window_name, window_hours = window_map[window_choice]
                
                clear_screen()
                render_screen(
                    title="Server Status",
                    breadcrumb=f"OM-Ops › Server Status › History ({window_name})",
                    body_lines=["", "Loading snapshots...", ""],
                    footer_hint="Please wait..."
                )
                
                snapshots = load_snapshots(window_hours)
                agg = aggregate_snapshots(snapshots, window_name)
                
                # Display aggregates
                clear_screen()
                agg_lines = []
                agg_lines.append("=" * 80)
                agg_lines.append(f"HISTORY: {window_name.upper()}")
                agg_lines.append("=" * 80)
                agg_lines.append("")
                
                if agg.get("status") == "insufficient_data":
                    agg_lines.append("⚠ Insufficient data for this time window")
                    agg_lines.append("")
                    agg_lines.append("Run status checks to collect snapshots.")
                else:
                    agg_lines.append(f"Samples: {agg.get('samples', 0)}")
                    agg_lines.append(f"First: {agg.get('first_sample', '?')}")
                    agg_lines.append(f"Last: {agg.get('last_sample', '?')}")
                    agg_lines.append("")
                    
                    if "cpu_load" in agg:
                        cl = agg["cpu_load"]
                        agg_lines.append(f"CPU Load: avg={cl['avg']}, max={cl['max']}")
                    
                    if "memory_used" in agg:
                        mu = agg["memory_used"]
                        agg_lines.append(f"Memory Used: avg={mu['avg']}, max={mu['max']}")
                    
                    if "disk_used_percent" in agg:
                        du = agg["disk_used_percent"]
                        agg_lines.append(f"Disk Used %: avg={du['avg']}, max={du['max']}")
                    
                    if "backend_restarts" in agg:
                        br = agg["backend_restarts"]
                        agg_lines.append(f"Backend Restarts: delta={br['total']}, current={br['current']}")
                    
                    if "external_response_time_ms" in agg:
                        ert = agg["external_response_time_ms"]
                        agg_lines.append(f"External Response Time: avg={ert['avg']}ms, p95={ert['p95']}ms, max={ert['max']}ms")
                
                agg_lines.append("")
                agg_lines.append("=" * 80)
                
                render_screen(
                    title="Server Status",
                    breadcrumb=f"OM-Ops › Server Status › History ({window_name})",
                    body_lines=agg_lines,
                    footer_hint="[Enter] Back   [0] Main Menu   [q] Quit"
                )
                wait_for_enter()
        elif choice == "4":
            # Speed test
            clear_screen()
            render_screen(
                title="Server Status",
                breadcrumb="OM-Ops › Server Status › Speed Test",
                body_lines=["", "Running speed test...", "", "This may take 30-60 seconds.", ""],
                footer_hint="Please wait..."
            )
            
            # Try speedtest-cli first
            success, output = run_cmd_safe(["speedtest-cli", "--simple"], timeout=60)
            if success:
                lines = output.split("\n")
                speed_lines = ["", "Speed Test Results:", ""]
                for line in lines:
                    if line.strip():
                        speed_lines.append(line.strip())
            else:
                # Try fast-cli
                success, output = run_cmd_safe(["fast", "--upload"], timeout=60)
                if success:
                    speed_lines = ["", "Speed Test Results:", "", output]
                else:
                    speed_lines = [
                        "",
                        "⚠ Speed test tools not available",
                        "",
                        "To install:",
                        "  pip install speedtest-cli",
                        "  or",
                        "  npm install -g fast-cli",
                        "",
                    ]
            
            speed_lines.append("")
            speed_lines.append("=" * 80)
            
            clear_screen()
            render_screen(
                title="Server Status",
                breadcrumb="OM-Ops › Server Status › Speed Test",
                body_lines=speed_lines,
                footer_hint="[Enter] Back   [0] Main Menu   [q] Quit"
            )
            wait_for_enter()
        else:
            clear_screen()
            render_screen(
                title="Server Status",
                breadcrumb="OM-Ops › Server Status",
                body_lines=["", "Invalid option.", ""],
                footer_hint="[Enter] Back   [0] Main Menu   [q] Quit"
            )
            wait_for_enter()


if __name__ == "__main__":
    # CLI test mode
    probe = run_status_probe()
    print(json.dumps(probe, indent=2))
