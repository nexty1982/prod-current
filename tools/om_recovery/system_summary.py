#!/usr/bin/env python3
"""
OM-Ops - System Summary Module
Generates operational health dashboard.
"""

import os
import sys
import json
import subprocess
import datetime
import urllib.request
import urllib.error
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Tuple

# Configuration
SUMMARY_ROOT = Path("/var/backups/OM/summary")
RUNS_DIR = SUMMARY_ROOT / "runs"
REPORT_FILE = SUMMARY_ROOT / "report.html"
PM2_APP_NAME = "orthodox-backend"
BACKEND_PORT = 3001
OPS_LOG = Path("/var/backups/OM/om-ops.log")


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


def ensure_summary_dirs():
    """Ensure summary directories exist."""
    SUMMARY_ROOT.mkdir(parents=True, exist_ok=True)
    RUNS_DIR.mkdir(parents=True, exist_ok=True)


def run_command(cmd: List[str]) -> Tuple[bool, str]:
    """Run a shell command."""
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
        return result.returncode == 0, result.stdout
    except Exception as e:
        return False, str(e)


def get_pm2_status() -> Dict:
    """Get PM2 status."""
    try:
        result = subprocess.run(
            ["pm2", "status", PM2_APP_NAME],
            capture_output=True,
            text=True,
            timeout=5,
        )
        
        if result.returncode != 0:
            return {"online": False, "error": "PM2 app not found"}
        
        # Parse output
        lines = result.stdout.split("\n")
        status = {"online": True, "restarts": 0, "uptime": "unknown", "memory": "unknown", "cpu": "unknown"}
        
        for line in lines:
            if PM2_APP_NAME in line:
                parts = line.split()
                if len(parts) >= 8:
                    status["status"] = parts[3]
                    status["restarts"] = int(parts[4]) if parts[4].isdigit() else 0
                    status["uptime"] = parts[5]
                    status["memory"] = parts[6]
                    status["cpu"] = parts[7]
        
        return status
    except Exception as e:
        return {"online": False, "error": str(e)}


def get_backend_health() -> Dict:
    """Check backend health endpoint."""
    try:
        url = f"http://127.0.0.1:{BACKEND_PORT}/api/system/health"
        with urllib.request.urlopen(url, timeout=5) as response:
            data = json.loads(response.read().decode())
            return {"online": True, "status": data.get("status", "unknown"), "data": data}
    except urllib.error.URLError:
        # Try alternative endpoints
        for alt_path in ["/health", "/api/health", "/"]:
            try:
                url = f"http://127.0.0.1:{BACKEND_PORT}{alt_path}"
                with urllib.request.urlopen(url, timeout=5) as response:
                    return {"online": True, "status": "ok", "endpoint": alt_path}
            except:
                continue
        return {"online": False, "error": "Health endpoint not reachable"}
    except Exception as e:
        return {"online": False, "error": str(e)}


def get_nginx_status() -> Dict:
    """Get nginx status."""
    status = {}
    
    # Test nginx config
    success, output = run_command(["nginx", "-t"])
    status["config_valid"] = success
    status["config_output"] = output[:500] if output else ""
    
    # List enabled sites
    sites_enabled = Path("/etc/nginx/sites-enabled")
    if sites_enabled.exists():
        status["enabled_sites"] = [f.name for f in sites_enabled.iterdir() if f.is_file()]
    else:
        status["enabled_sites"] = []
    
    return status


def get_disk_usage() -> List[Dict]:
    """Get disk usage."""
    success, output = run_command(["df", "-h"])
    if not success:
        return []
    
    disks = []
    lines = output.strip().split("\n")[1:]  # Skip header
    
    for line in lines:
        parts = line.split()
        if len(parts) >= 6:
            disks.append({
                "filesystem": parts[0],
                "size": parts[1],
                "used": parts[2],
                "available": parts[3],
                "use_percent": parts[4],
                "mount": parts[5],
            })
    
    return disks


def get_recent_errors(lines: int = 200) -> List[str]:
    """Get recent errors from PM2 logs."""
    try:
        result = subprocess.run(
            ["pm2", "logs", PM2_APP_NAME, "--lines", str(lines), "--nostream"],
            capture_output=True,
            text=True,
            timeout=10,
        )
        
        if result.returncode != 0:
            return []
        
        error_keywords = ["ERROR", "500", "Exception", "Error:", "FATAL", "stack trace"]
        error_lines = []
        
        for line in result.stdout.split("\n"):
            if any(keyword in line.upper() for keyword in error_keywords):
                error_lines.append(line.strip())
                if len(error_lines) >= 20:
                    break
        
        return error_lines
    except Exception:
        return []


def generate_summary() -> Dict:
    """Generate system summary."""
    ensure_summary_dirs()
    
    timestamp = datetime.datetime.now()
    timestamp_str = timestamp.strftime("%Y-%m-%d_%H%M%S")
    
    summary = {
        "timestamp": timestamp.isoformat(),
        "pm2": get_pm2_status(),
        "backend_health": get_backend_health(),
        "nginx": get_nginx_status(),
        "disk_usage": get_disk_usage(),
        "recent_errors": get_recent_errors(),
    }
    
    # Save summary JSON
    run_dir = RUNS_DIR / timestamp_str
    run_dir.mkdir(parents=True, exist_ok=True)
    
    summary_file = run_dir / "summary.json"
    with open(summary_file, "w") as f:
        json.dump(summary, f, indent=2)
    
    # Generate HTML report
    generate_html_report(summary)
    
    log_ops(f"Generated system summary: {run_dir}")
    
    return summary


def generate_html_report(summary: Dict):
    """Generate HTML report."""
    pm2 = summary.get("pm2", {})
    backend = summary.get("backend_health", {})
    nginx = summary.get("nginx", {})
    disks = summary.get("disk_usage", [])
    errors = summary.get("recent_errors", [])
    
    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OM-Ops System Summary</title>
    <style>
        * {{ box-sizing: border-box; }}
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background: #f5f5f5;
        }}
        .container {{
            max-width: 1400px;
            margin: 0 auto;
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }}
        h1 {{
            margin-top: 0;
            color: #2c3e50;
            border-bottom: 3px solid #3498db;
            padding-bottom: 10px;
        }}
        .summary-cards {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin: 20px 0;
        }}
        .card {{
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 8px;
        }}
        .card h3 {{
            margin: 0 0 10px 0;
            font-size: 14px;
            opacity: 0.9;
        }}
        .card .value {{
            font-size: 24px;
            font-weight: bold;
        }}
        .status-online {{ color: #27ae60; }}
        .status-offline {{ color: #e74c3c; }}
        table {{
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
        }}
        th, td {{
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ecf0f1;
        }}
        th {{
            background: #f8f9fa;
            font-weight: 600;
        }}
        .error-line {{
            font-family: monospace;
            font-size: 12px;
            padding: 5px;
            background: #fee;
            border-left: 3px solid #e74c3c;
            margin: 5px 0;
        }}
    </style>
</head>
<body>
    <div class="container">
        <h1>OM-Ops System Summary</h1>
        <p><strong>Generated:</strong> {summary.get('timestamp', 'unknown')}</p>
        
        <div class="summary-cards">
            <div class="card">
                <h3>Backend Status</h3>
                <div class="value {'status-online' if backend.get('online') else 'status-offline'}">
                    {'ONLINE' if backend.get('online') else 'OFFLINE'}
                </div>
            </div>
            <div class="card">
                <h3>PM2 Status</h3>
                <div class="value {'status-online' if pm2.get('online') else 'status-offline'}">
                    {pm2.get('status', 'unknown').upper()}
                </div>
            </div>
            <div class="card">
                <h3>Restarts</h3>
                <div class="value">{pm2.get('restarts', 0)}</div>
            </div>
            <div class="card">
                <h3>Uptime</h3>
                <div class="value">{pm2.get('uptime', 'unknown')}</div>
            </div>
        </div>
        
        <h2>PM2 Details</h2>
        <table>
            <tr><th>Property</th><th>Value</th></tr>
            <tr><td>Status</td><td>{pm2.get('status', 'unknown')}</td></tr>
            <tr><td>Restarts</td><td>{pm2.get('restarts', 0)}</td></tr>
            <tr><td>Uptime</td><td>{pm2.get('uptime', 'unknown')}</td></tr>
            <tr><td>Memory</td><td>{pm2.get('memory', 'unknown')}</td></tr>
            <tr><td>CPU</td><td>{pm2.get('cpu', 'unknown')}</td></tr>
        </table>
        
        <h2>Backend Health</h2>
        <p>Status: <span class="{'status-online' if backend.get('online') else 'status-offline'}">
            {'ONLINE' if backend.get('online') else 'OFFLINE'}
        </span></p>
        {f'<pre>{json.dumps(backend.get("data", {}), indent=2)}</pre>' if backend.get('data') else ''}
        
        <h2>Nginx Status</h2>
        <p>Config Valid: {'✓' if nginx.get('config_valid') else '✗'}</p>
        <p>Enabled Sites: {', '.join(nginx.get('enabled_sites', []))}</p>
        
        <h2>Disk Usage</h2>
        <table>
            <thead>
                <tr><th>Filesystem</th><th>Size</th><th>Used</th><th>Available</th><th>Use%</th><th>Mount</th></tr>
            </thead>
            <tbody>
                {''.join(f'<tr><td>{d["filesystem"]}</td><td>{d["size"]}</td><td>{d["used"]}</td><td>{d["available"]}</td><td>{d["use_percent"]}</td><td>{d["mount"]}</td></tr>' for d in disks)}
            </tbody>
        </table>
        
        <h2>Recent Errors</h2>
        {''.join(f'<div class="error-line">{error}</div>' for error in errors) if errors else '<p>No recent errors detected.</p>'}
    </div>
</body>
</html>"""
    
    with open(REPORT_FILE, "w") as f:
        f.write(html)
    
    log_ops(f"Generated system summary HTML: {REPORT_FILE}")
