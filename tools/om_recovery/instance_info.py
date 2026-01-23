#!/usr/bin/env python3
"""
OM-Ops - Instance Information Module
Comprehensive system/config/health inventory for OM instance.
"""

import os
import sys
import json
import subprocess
import datetime
import socket
import platform
from pathlib import Path
from typing import Dict, List, Optional, Tuple

# Configuration
REPO_ROOT = Path("/var/www/orthodoxmetrics/prod")
BACKEND_DIR = REPO_ROOT / "server"
FRONTEND_DIR = REPO_ROOT / "front-end"
OPS_HUB_DIR = REPO_ROOT / "ops-hub"
BACKUP_ROOT = Path("/var/backups/OM")
INSTANCE_INFO_ROOT = BACKUP_ROOT / "instance_info"
INSTANCE_INFO_RUNS = INSTANCE_INFO_ROOT / "runs"
BACKEND_PORT = 3001
OPS_HUB_PORT = 3010
PM2_APP_NAME = "orthodox-backend"
PM2_OPS_HUB_NAME = "om-ops-hub"


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


def get_identity_and_paths() -> Dict:
    """Collect identity and path information."""
    info = {
        "hostname": socket.gethostname(),
        "timestamp": datetime.datetime.now().isoformat(),
        "timezone": datetime.datetime.now().astimezone().tzname(),
        "uname": platform.uname()._asdict(),
        "paths": {},
        "config_files": []
    }
    
    # Key directories
    key_dirs = {
        "repo_root": REPO_ROOT,
        "backend": BACKEND_DIR,
        "frontend": FRONTEND_DIR,
        "ops_hub": OPS_HUB_DIR,
        "nginx_config": Path("/etc/nginx"),
        "nginx_sites": Path("/etc/nginx/sites-enabled"),
        "nginx_logs": Path("/var/log/nginx"),
        "backups": BACKUP_ROOT,
    }
    
    for name, path in key_dirs.items():
        exists = path.exists()
        info["paths"][name] = {
            "path": str(path),
            "exists": exists,
            "is_dir": path.is_dir() if exists else False,
        }
        if exists and path.is_dir():
            try:
                info["paths"][name]["items_count"] = len(list(path.iterdir()))
            except:
                pass
    
    # Config file locations
    config_files = [
        BACKEND_DIR / ".env",
        BACKEND_DIR / ".env.local",
        BACKEND_DIR / ".env.production",
        Path("/etc/nginx/nginx.conf"),
        Path("/etc/nginx/sites-enabled/orthodoxmetrics.com"),
        Path("/opt/freescout/.env"),
        Path("/opt/zammad/.secrets.env"),
        BACKEND_DIR / "ecosystem.config.js",
        Path.home() / ".pm2" / "ecosystem.config.js",
    ]
    
    for config_file in config_files:
        if config_file.exists():
            info["config_files"].append({
                "path": str(config_file),
                "exists": True,
                "size": config_file.stat().st_size if config_file.is_file() else 0,
            })
    
    # Check for nginx snippets
    nginx_snippets_dir = Path("/etc/nginx/snippets")
    if nginx_snippets_dir.exists():
        snippets = list(nginx_snippets_dir.glob("*.conf"))
        info["config_files"].append({
            "path": str(nginx_snippets_dir),
            "exists": True,
            "snippets": [str(s) for s in snippets],
        })
    
    return info


def get_service_health() -> Dict:
    """Collect service health information."""
    health = {
        "pm2": {},
        "backend": {},
        "nginx": {},
        "ports": {},
    }
    
    # PM2 Status
    success, output = run_cmd_safe(["pm2", "status"], timeout=5)
    if success:
        health["pm2"]["pm2_available"] = True
        # Get specific process info
        for proc_name in [PM2_APP_NAME, PM2_OPS_HUB_NAME]:
            success_proc, proc_output = run_cmd_safe(["pm2", "info", proc_name], timeout=5)
            if success_proc:
                # Parse key info (avoiding full dump)
                lines = proc_output.split("\n")
                proc_info = {"name": proc_name, "found": True}
                for line in lines[:30]:  # Limit parsing
                    if "status" in line.lower() and "online" in line.lower():
                        proc_info["status"] = "online"
                    elif "restart time" in line.lower():
                        proc_info["restarts"] = line.split()[-1] if line.split() else "unknown"
                    elif "uptime" in line.lower():
                        proc_info["uptime"] = line.split(":")[-1].strip() if ":" in line else "unknown"
                health["pm2"][proc_name] = proc_info
            else:
                health["pm2"][proc_name] = {"name": proc_name, "found": False}
    else:
        health["pm2"]["pm2_available"] = False
        health["pm2"]["error"] = output[:200]
    
    # Backend Health
    import urllib.request
    import urllib.error
    health_endpoints = [
        f"http://127.0.0.1:{BACKEND_PORT}/api/system/health",
        f"http://127.0.0.1:{BACKEND_PORT}/health",
        f"http://127.0.0.1:{BACKEND_PORT}/",
    ]
    
    for endpoint in health_endpoints:
        try:
            with urllib.request.urlopen(endpoint, timeout=5) as response:
                status_code = response.getcode()
                health["backend"]["reachable"] = True
                health["backend"]["endpoint"] = endpoint
                health["backend"]["status_code"] = status_code
                break
        except urllib.error.URLError:
            continue
        except Exception:
            continue
    
    if "reachable" not in health["backend"]:
        health["backend"]["reachable"] = False
        health["backend"]["note"] = "No health endpoint configured or backend not running"
    
    # Nginx Health
    success, output = run_cmd_safe(["nginx", "-t"], timeout=5)
    health["nginx"]["config_valid"] = success
    if not success:
        health["nginx"]["error"] = output[:500]
    
    # Check for orthodoxmetrics.com site
    site_config = Path("/etc/nginx/sites-enabled/orthodoxmetrics.com")
    if site_config.exists():
        health["nginx"]["site_config_exists"] = True
        try:
            content = site_config.read_text()
            if "/helpdesk/" in content:
                health["nginx"]["helpdesk_route"] = "configured"
                # Try to extract proxy target
                for line in content.split("\n"):
                    if "proxy_pass" in line and "helpdesk" in line.lower():
                        health["nginx"]["helpdesk_proxy"] = line.strip()[:100]
        except:
            pass
    else:
        health["nginx"]["site_config_exists"] = False
    
    # Port Listeners
    success, output = run_cmd_safe(["ss", "-lntp"], timeout=5, max_output=2000)
    if success:
        lines = output.split("\n")
        for port in [3001, 3010, 80, 443, 3080]:
            port_str = f":{port}"
            for line in lines:
                if port_str in line and "LISTEN" in line:
                    health["ports"][port] = {
                        "listening": True,
                        "info": line.strip()[:100]
                    }
                    break
            if port not in health["ports"]:
                health["ports"][port] = {"listening": False}
    
    return health


def get_database_info() -> Dict:
    """Collect database information (no secrets)."""
    db_info = {
        "databases": [],
        "connection_checks": {}
    }
    
    # Check backend config for DB info (without reading secrets)
    db_config_paths = [
        BACKEND_DIR / "config" / "db.js",
        BACKEND_DIR / "config" / "database.js",
        BACKEND_DIR / ".env",
    ]
    
    for config_path in db_config_paths:
        if config_path.exists() and config_path.is_file():
            try:
                content = config_path.read_text()
                # Look for DB host/name patterns (not passwords)
                db_config = {"config_file": str(config_path)}
                
                # Try to extract host/name (avoid passwords)
                lines = content.split("\n")
                for line in lines[:50]:  # Limit scanning
                    line_lower = line.lower()
                    if "host" in line_lower and "password" not in line_lower:
                        db_config["host_hint"] = "configured"
                    if "database" in line_lower or "db_name" in line_lower:
                        db_config["name_hint"] = "configured"
                    if "mysql" in line_lower or "postgres" in line_lower:
                        db_config["type_hint"] = "mysql" if "mysql" in line_lower else "postgresql"
                
                if db_config.get("host_hint") or db_config.get("name_hint"):
                    db_info["databases"].append(db_config)
            except:
                pass
    
    # Check FreeScout DB (from docker-compose or .env, but don't print secrets)
    freescout_env = Path("/opt/freescout/.env")
    if freescout_env.exists():
        try:
            content = freescout_env.read_text()
            db_info["freescout"] = {
                "configured": True,
                "type": "mysql",
                "note": "MySQL via Docker (freescout-mysql container)"
            }
        except:
            pass
    
    # Minimal connection check (if we can determine DB type)
    # This is optional and should be fast
    # We'll just note that connection checks would go here
    
    return db_info


def get_system_resources() -> Dict:
    """Collect system resource information."""
    resources = {}
    
    # Disk Usage
    success, output = run_cmd_safe(["df", "-h"], timeout=5)
    if success:
        resources["disk"] = {
            "df_output": output[:1000],  # Limit size
        }
        # Parse key mounts
        lines = output.split("\n")
        key_mounts = ["/", "/var/www", "/var/backups", "/var/log"]
        resources["disk"]["mounts"] = {}
        for line in lines:
            for mount in key_mounts:
                if mount in line:
                    parts = line.split()
                    if len(parts) >= 5:
                        resources["disk"]["mounts"][mount] = {
                            "size": parts[1],
                            "used": parts[2],
                            "avail": parts[3],
                            "use_percent": parts[4],
                        }
    
    # Memory
    success, output = run_cmd_safe(["free", "-h"], timeout=5)
    if success:
        resources["memory"] = {"free_output": output[:500]}
    
    # Load Average
    success, output = run_cmd_safe(["uptime"], timeout=5)
    if success:
        resources["load"] = {"uptime_output": output[:200]}
    
    # Network Stats
    try:
        with open("/proc/net/dev", "r") as f:
            net_content = f.read()
            resources["network"] = {
                "interfaces": net_content[:1000]  # Limit size
            }
    except:
        pass
    
    # Recent dmesg errors (last 20 lines, safe)
    success, output = run_cmd_safe(["dmesg", "-T"], timeout=5, max_output=2000)
    if success:
        lines = output.split("\n")
        error_lines = [line for line in lines if "error" in line.lower() or "fail" in line.lower()]
        resources["dmesg_errors"] = error_lines[-20:] if len(error_lines) > 20 else error_lines
    
    return resources


def get_log_locations() -> Dict:
    """Collect log location information."""
    logs = {
        "pm2": {},
        "backend": {},
        "nginx": {},
        "om_ops": {},
        "docker": {},
    }
    
    # PM2 Logs
    success, output = run_cmd_safe(["pm2", "info", PM2_APP_NAME], timeout=5)
    if success:
        lines = output.split("\n")
        for line in lines:
            if "log path" in line.lower() or "pm_out_log_path" in line.lower():
                logs["pm2"]["backend_log_path"] = line.split(":")[-1].strip() if ":" in line else "unknown"
            if "error log" in line.lower() or "pm_err_log_path" in line.lower():
                logs["pm2"]["backend_error_log"] = line.split(":")[-1].strip() if ":" in line else "unknown"
    
    logs["pm2"]["view_command"] = f"pm2 logs {PM2_APP_NAME}"
    logs["pm2"]["view_all_command"] = "pm2 logs"
    
    # Backend Logs
    backend_log_dirs = [
        BACKEND_DIR / "logs",
        BACKEND_DIR / "dist" / "logs",
        Path("/var/log/orthodoxmetrics"),
    ]
    
    for log_dir in backend_log_dirs:
        if log_dir.exists():
            logs["backend"][str(log_dir)] = {
                "exists": True,
                "view_command": f"tail -f {log_dir}/*.log"
            }
    
    # Nginx Logs
    nginx_logs = {
        "access": Path("/var/log/nginx/access.log"),
        "error": Path("/var/log/nginx/error.log"),
    }
    
    for name, log_path in nginx_logs.items():
        if log_path.exists():
            logs["nginx"][name] = {
                "path": str(log_path),
                "exists": True,
                "view_command": f"tail -f {log_path}",
                "size": log_path.stat().st_size,
            }
    
    # OM-Ops Logs
    om_ops_logs = {
        "main": BACKUP_ROOT / "om-ops.log",
        "build_ops": BACKUP_ROOT / "build_ops" / "runs",
        "analysis": BACKUP_ROOT / "analysis" / "runs",
        "changelog": BACKUP_ROOT / "changelog",
    }
    
    for name, log_path in om_ops_logs.items():
        if log_path.exists():
            logs["om_ops"][name] = {
                "path": str(log_path),
                "exists": True,
            }
            if log_path.is_file():
                logs["om_ops"][name]["view_command"] = f"tail -f {log_path}"
                logs["om_ops"][name]["size"] = log_path.stat().st_size
    
    # Docker Logs
    docker_services = {
        "freescout": ("freescout-app", "/opt/freescout"),
        "zammad": ("zammad-app", "/opt/zammad"),
    }
    
    for service_name, (container_name, compose_dir) in docker_services.items():
        compose_path = Path(compose_dir) / "docker-compose.yml"
        if compose_path.exists():
            logs["docker"][service_name] = {
                "container": container_name,
                "compose_dir": compose_dir,
                "view_command": f"cd {compose_dir} && docker logs {container_name}",
                "follow_command": f"cd {compose_dir} && docker logs -f {container_name}",
            }
    
    return logs


def get_refactor_risk_checklist() -> Dict:
    """Generate refactor risk checklist."""
    checklist = {
        "path_dependencies": [],
        "update_order": [],
    }
    
    # Path dependencies
    dependencies = [
        {
            "module": "Backend Config Loader",
            "depends_on": [str(REPO_ROOT), str(BACKEND_DIR)],
            "files": ["server/config/*.js", "server/.env*"],
        },
        {
            "module": "Nginx Includes",
            "depends_on": ["/etc/nginx/sites-enabled/orthodoxmetrics.com"],
            "files": ["/etc/nginx/snippets/*.conf"],
        },
        {
            "module": "OM-Ops Environment Roots",
            "depends_on": [str(REPO_ROOT)],
            "files": ["tools/om_recovery/om_recovery.py", "tools/om_recovery/build_ops.py"],
        },
        {
            "module": "Build Ops",
            "depends_on": [str(BACKEND_DIR), str(FRONTEND_DIR), f"port {BACKEND_PORT}"],
            "files": ["tools/om_recovery/build_ops.py"],
        },
        {
            "module": "Backup Operations",
            "depends_on": [str(BACKUP_ROOT)],
            "files": ["tools/om_recovery/om_recovery.py"],
        },
        {
            "module": "PM2 Process Management",
            "depends_on": [PM2_APP_NAME, PM2_OPS_HUB_NAME],
            "files": ["tools/om_recovery/pm2_ops.py"],
        },
        {
            "module": "Log Paths",
            "depends_on": ["/var/log/nginx", str(BACKUP_ROOT)],
            "files": ["logrotate configs", "PM2 log config"],
        },
    ]
    
    checklist["path_dependencies"] = dependencies
    
    # Update order
    checklist["update_order"] = [
        "1. Update constants in om_recovery.py and build_ops.py",
        "2. Update backend config loader",
        "3. Update Nginx configs",
        "4. Update PM2 ecosystem (if used)",
        "5. Update backup/artifact paths",
        "6. Update log rotation configs",
        "7. Test all operations",
    ]
    
    return checklist


def generate_report_markdown(data: Dict) -> str:
    """Generate markdown report from data."""
    md = []
    md.append("# OM Instance Information Report")
    md.append(f"\n**Generated:** {data['identity']['timestamp']}")
    md.append(f"**Hostname:** {data['identity']['hostname']}")
    md.append(f"**Timezone:** {data['identity']['timezone']}")
    md.append("\n---\n")
    
    # Identity & Paths
    md.append("## A) Identity & Paths\n")
    md.append(f"**Repo Root:** {data['identity']['paths']['repo_root']['path']}")
    md.append(f"**Backend:** {data['identity']['paths']['backend']['path']} ({'✓' if data['identity']['paths']['backend']['exists'] else '✗'})")
    md.append(f"**Front-end:** {data['identity']['paths']['frontend']['path']} ({'✓' if data['identity']['paths']['frontend']['exists'] else '✗'})")
    md.append(f"\n**Config Files Found:** {len(data['identity']['config_files'])}")
    for cfg in data['identity']['config_files'][:10]:  # Limit display
        md.append(f"- {cfg['path']}")
    
    # Service Health
    md.append("\n## B) Service Health\n")
    md.append("### PM2")
    if data['services']['pm2'].get('pm2_available'):
        for proc_name, proc_info in data['services']['pm2'].items():
            if proc_name != 'pm2_available' and proc_name != 'error':
                status = "✓" if proc_info.get('found') else "✗"
                md.append(f"- {proc_name}: {status} {proc_info.get('status', 'unknown')}")
    else:
        md.append("- PM2 not available")
    
    md.append("\n### Backend")
    if data['services']['backend'].get('reachable'):
        md.append(f"- ✓ Reachable at {data['services']['backend'].get('endpoint')}")
        md.append(f"- Status Code: {data['services']['backend'].get('status_code')}")
    else:
        md.append("- ✗ Not reachable")
    
    md.append("\n### Nginx")
    md.append(f"- Config Valid: {'✓' if data['services']['nginx'].get('config_valid') else '✗'}")
    md.append(f"- Site Config: {'✓' if data['services']['nginx'].get('site_config_exists') else '✗'}")
    if data['services']['nginx'].get('helpdesk_route'):
        md.append(f"- Helpdesk Route: {data['services']['nginx'].get('helpdesk_route')}")
    
    md.append("\n### Ports")
    for port, info in data['services']['ports'].items():
        status = "✓" if info.get('listening') else "✗"
        md.append(f"- Port {port}: {status}")
    
    # Database Info
    md.append("\n## C) Database Information\n")
    md.append(f"**Databases Configured:** {len(data['database']['databases'])}")
    for db in data['database']['databases']:
        md.append(f"- Config: {db.get('config_file', 'unknown')}")
        if db.get('type_hint'):
            md.append(f"  Type: {db.get('type_hint')}")
    
    # System Resources
    md.append("\n## D) System Resources\n")
    if 'disk' in data['resources'] and 'mounts' in data['resources']['disk']:
        md.append("### Disk Usage")
        for mount, info in data['resources']['disk']['mounts'].items():
            md.append(f"- {mount}: {info.get('used')}/{info.get('size')} ({info.get('use_percent')})")
    
    if 'memory' in data['resources']:
        md.append("\n### Memory")
        md.append("```")
        md.append(data['resources']['memory'].get('free_output', 'N/A')[:300])
        md.append("```")
    
    if 'load' in data['resources']:
        md.append("\n### Load Average")
        md.append(data['resources']['load'].get('uptime_output', 'N/A'))
    
    # Log Locations
    md.append("\n## E) Log Locations\n")
    md.append("### PM2 Logs")
    if data['logs']['pm2'].get('backend_log_path'):
        md.append(f"- Backend Log: {data['logs']['pm2'].get('backend_log_path')}")
    md.append(f"- View: `{data['logs']['pm2'].get('view_command', 'pm2 logs')}`")
    
    md.append("\n### Nginx Logs")
    for name, info in data['logs']['nginx'].items():
        md.append(f"- {name}: {info.get('path')} ({info.get('size', 0)} bytes)")
        md.append(f"  View: `{info.get('view_command')}`")
    
    md.append("\n### OM-Ops Logs")
    for name, info in data['logs']['om_ops'].items():
        md.append(f"- {name}: {info.get('path')}")
        if info.get('view_command'):
            md.append(f"  View: `{info.get('view_command')}`")
    
    md.append("\n### Docker Logs")
    for service, info in data['logs']['docker'].items():
        md.append(f"- {service}: `{info.get('view_command')}`")
    
    # Refactor Risk Checklist
    md.append("\n## F) Tomorrow's Refactor Risk Checklist\n")
    md.append("### Path Dependencies")
    for dep in data['refactor_checklist']['path_dependencies']:
        md.append(f"\n**{dep['module']}**")
        md.append(f"- Depends on: {', '.join(dep['depends_on'])}")
        md.append(f"- Files: {', '.join(dep['files'])}")
    
    md.append("\n### Update Order")
    for step in data['refactor_checklist']['update_order']:
        md.append(f"{step}")
    
    return "\n".join(md)


def run_instance_info(ui_screen=None) -> Tuple[bool, Dict]:
    """
    Run instance information collection and display.
    
    Args:
        ui_screen: Optional UI screen module (for rendering)
    
    Returns:
        Tuple of (success, data_dict)
    """
    data = {
        "identity": get_identity_and_paths(),
        "services": get_service_health(),
        "database": get_database_info(),
        "resources": get_system_resources(),
        "logs": get_log_locations(),
        "refactor_checklist": get_refactor_risk_checklist(),
    }
    
    return True, data


def save_report(data: Dict) -> Tuple[bool, Path]:
    """Save report to backups directory."""
    INSTANCE_INFO_RUNS.mkdir(parents=True, exist_ok=True)
    
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d_%H%M%S")
    run_dir = INSTANCE_INFO_RUNS / timestamp
    run_dir.mkdir(parents=True, exist_ok=True)
    
    # Save JSON
    json_path = run_dir / "instance_info.json"
    with open(json_path, "w") as f:
        json.dump(data, f, indent=2)
    
    # Save Markdown
    md_path = run_dir / "instance_info.md"
    md_content = generate_report_markdown(data)
    with open(md_path, "w") as f:
        f.write(md_content)
    
    return True, run_dir
