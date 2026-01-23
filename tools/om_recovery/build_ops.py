#!/usr/bin/env python3
"""
OM-Ops - Build / Dist Integrity Module
Validates build artifacts and manages rebuilds.
"""

import os
import sys
import subprocess
import datetime
import json
from pathlib import Path
from typing import Dict, List, Optional, Tuple

# Configuration
REPO_ROOT = Path("/var/www/orthodoxmetrics/prod")
BACKEND_DIR = REPO_ROOT / "server"
FRONTEND_DIR = REPO_ROOT / "front-end"
OPS_HUB_DIR = REPO_ROOT / "ops-hub"
BACKEND_DIST = BACKEND_DIR / "dist"
FRONTEND_DIST = FRONTEND_DIR / "dist"
BACKEND_PORT = 3001
OPS_HUB_PORT = 3010
BUILD_OPS_ROOT = Path("/var/backups/OM/build_ops")
BUILD_RUNS_DIR = BUILD_OPS_ROOT / "runs"

# Backend dist requirements manifest
BACKEND_DIST_REQUIREMENTS = [
    "index.js",
    "config/db.js",
    "routes",
]

# Import shared utilities
try:
    script_dir = Path(__file__).parent
    if str(script_dir) not in sys.path:
        sys.path.insert(0, str(script_dir))
    from utils import log_ops, run_cmd, require_confirmation, redact_secrets
except ImportError:
    def log_ops(msg, level="INFO"):
        print(f"[{level}] {msg}")
    def run_cmd(cmd, timeout=30, redact=True, cwd=None):
        import subprocess
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout, cwd=str(cwd) if cwd else None)
        return result.returncode, result.stdout, result.stderr
    def require_confirmation(prompt, phrase=None):
        print(f"\n{prompt}")
        if phrase:
            print(f"Type '{phrase}' to confirm:")
            return input().strip() == phrase
        else:
            print("Type 'y' or 'yes' to confirm:")
            user_input = input().strip()
            return user_input.lower() in ["y", "yes"]
    def redact_secrets(text):
        return text

# Import PM2 ops if available
try:
    script_dir = Path(__file__).parent
    if str(script_dir) not in sys.path:
        sys.path.insert(0, str(script_dir))
    from pm2_ops import pm2_restart, pm2_logs, pm2_start
except ImportError:
    def pm2_restart():
        return False, "PM2 module not available"
    def pm2_start():
        return False, "PM2 module not available"
    def pm2_logs(lines=200, follow=False):
        return False, "PM2 module not available"

# Import Git ops for safety checks
try:
    script_dir = Path(__file__).parent
    if str(script_dir) not in sys.path:
        sys.path.insert(0, str(script_dir))
    from git_ops import git_status, run_git_command
    GIT_OPS_AVAILABLE = True
except ImportError:
    def git_status():
        return False, {"error": "Git module not available"}
    def run_git_command(cmd, check=False):
        return False, "", "Git module not available"
    GIT_OPS_AVAILABLE = False

# Import FreeScout operations for ticket enforcement
try:
    script_dir = Path(__file__).parent
    om_ops_dir = script_dir.parent / "om_ops"
    if str(om_ops_dir) not in sys.path:
        sys.path.insert(0, str(om_ops_dir))
    from freescout_client import (
        validate_ticket as freescout_validate_ticket,
        get_ticket_url as freescout_get_ticket_url,
        post_ticket_note as freescout_post_note,
        REQUIRE_TICKET as FREESCOUT_REQUIRE_TICKET
    )
    FREESCOUT_OPS_AVAILABLE = True
except ImportError:
    FREESCOUT_OPS_AVAILABLE = False
    freescout_validate_ticket = None
    freescout_get_ticket_url = None
    freescout_post_note = None
    FREESCOUT_REQUIRE_TICKET = False


def get_build_state() -> Dict:
    """Show current build state summary."""
    log_ops("Checking build state")
    
    state = {
        "backend": {},
        "frontend": {},
    }
    
    # Backend dist
    if BACKEND_DIST.exists():
        dist_files = list(BACKEND_DIST.rglob("*"))
        files_only = [f for f in dist_files if f.is_file()]
        
        latest_mtime = 0
        for f in files_only:
            try:
                mtime = f.stat().st_mtime
                if mtime > latest_mtime:
                    latest_mtime = mtime
            except Exception:
                pass
        
        state["backend"] = {
            "dist_exists": True,
            "file_count": len(files_only),
            "latest_modified": datetime.datetime.fromtimestamp(latest_mtime).isoformat() if latest_mtime > 0 else None,
        }
    else:
        state["backend"] = {"dist_exists": False}
    
    # Frontend dist
    if FRONTEND_DIST.exists():
        dist_files = list(FRONTEND_DIST.rglob("*"))
        files_only = [f for f in dist_files if f.is_file()]
        
        latest_mtime = 0
        for f in files_only:
            try:
                mtime = f.stat().st_mtime
                if mtime > latest_mtime:
                    latest_mtime = mtime
            except Exception:
                pass
        
        state["frontend"] = {
            "dist_exists": True,
            "file_count": len(files_only),
            "latest_modified": datetime.datetime.fromtimestamp(latest_mtime).isoformat() if latest_mtime > 0 else None,
        }
    else:
        state["frontend"] = {"dist_exists": False}
    
    return state


def get_build_script(package_json_path: Path, preferred_order: List[str]) -> Optional[str]:
    """
    Get build script from package.json, preferring scripts in preferred_order.
    
    STABLE: Script selection order: build:all → build:deploy → build
    This logic is correct and should not be changed unless fixing a bug.
    """
    if not package_json_path.exists():
        return None
    
    try:
        with open(package_json_path, "r") as f:
            package_data = json.load(f)
        
        scripts = package_data.get("scripts", {})
        
        # Try preferred order
        for script_name in preferred_order:
            if script_name in scripts:
                return script_name
        
        # Fallback: return first build-related script
        for script_name in scripts:
            if "build" in script_name.lower():
                return script_name
        
        return None
    except Exception as e:
        log_ops(f"Error reading package.json: {e}", "ERROR")
        return None


def verify_backend_dist_integrity() -> Tuple[bool, Dict]:
    """Verify backend dist integrity against requirements manifest."""
    log_ops("Verifying backend dist integrity")
    
    if not BACKEND_DIST.exists():
        return False, {"error": "Backend dist directory does not exist"}
    
    results = {
        "key_files": {},
        "syntax_checks": {},
        "missing_requirements": [],
    }
    
    # Check required files/dirs from manifest
    for req_path_str in BACKEND_DIST_REQUIREMENTS:
        req_path = BACKEND_DIST / req_path_str
        exists = req_path.exists()
        results["key_files"][req_path_str] = exists
        
        if not exists:
            results["missing_requirements"].append(req_path_str)
        
        # If it's a JS file, check syntax
        if exists and req_path.is_file() and req_path.suffix == ".js":
            exit_code, stdout, stderr = run_cmd(["node", "-c", str(req_path)], timeout=10, redact=False, cwd=BACKEND_DIR)
            results["syntax_checks"][req_path_str] = {
                "valid": exit_code == 0,
                "error": stderr[:200] if exit_code != 0 else None,
            }
    
    # Check routes directory (if it's a directory, check files inside)
    routes_dir = BACKEND_DIST / "routes"
    if routes_dir.exists() and routes_dir.is_dir():
        route_files = list(routes_dir.glob("*.js"))
        # Check first 10 route files
        for route_file in route_files[:10]:
            exit_code, stdout, stderr = run_cmd(["node", "-c", str(route_file)], timeout=10, redact=False, cwd=BACKEND_DIR)
            results["syntax_checks"][str(route_file.relative_to(BACKEND_DIST))] = {
                "valid": exit_code == 0,
                "error": stderr[:200] if exit_code != 0 else None,
            }
    
    # Overall status
    all_key_files_exist = all(results["key_files"].values())
    all_syntax_valid = all(check.get("valid", False) for check in results["syntax_checks"].values())
    
    return all_key_files_exist and all_syntax_valid, results


def build_server_and_frontend(dry_run: bool = False) -> Tuple[bool, str]:
    """Build Server and Front-end using npm run build:deploy (includes PM2 restart)."""
    package_json = BACKEND_DIR / "package.json"
    has_lockfile = (BACKEND_DIR / "package-lock.json").exists()
    
    # Use build:deploy script which builds both backend and front-end
    build_script = "build:deploy"
    
    # Verify script exists
    try:
        with open(package_json, "r") as f:
            package_data = json.load(f)
        scripts = package_data.get("scripts", {})
        if build_script not in scripts:
            return False, (
                f"ERROR: Build script '{build_script}' not found in {package_json}. "
                f"Cannot proceed with build."
            )
    except Exception as e:
        return False, f"ERROR: Could not read package.json: {e}"
    
    # Preview commands
    install_cmd = "npm ci" if has_lockfile else "npm install"
    build_cmd = f"npm run {build_script}"
    preview = f"""
Preview of commands to run:
  1. cd {BACKEND_DIR}
  2. {install_cmd}
  3. {build_cmd} (builds server and front-end, restarts PM2 automatically)
  4. Health check: http://127.0.0.1:{BACKEND_PORT}/api/system/health (fallback: /health)
"""
    
    if dry_run:
        log_ops("[DRY RUN] Would build server and front-end")
        return True, f"[DRY RUN]{preview}"
    
    print(preview)
    if not require_confirmation("Build server and front-end?"):
        return False, "Cancelled by user"
    
    log_ops("Starting server and front-end build")
    start_time = datetime.datetime.now()
    
    # npm ci or npm install
    if has_lockfile:
        exit_code, stdout, stderr = run_cmd(["npm", "ci"], timeout=300, redact=True, cwd=BACKEND_DIR)
        if exit_code != 0:
            log_ops(f"npm ci failed: {stderr[:200]}", "ERROR")
            return False, f"npm ci failed: {stderr[:200]}"
    else:
        exit_code, stdout, stderr = run_cmd(["npm", "install"], timeout=300, redact=True, cwd=BACKEND_DIR)
        if exit_code != 0:
            log_ops(f"npm install failed: {stderr[:200]}", "ERROR")
            return False, f"npm install failed: {stderr[:200]}"
    
    # npm run build:deploy (builds both and restarts PM2)
    exit_code, stdout, stderr = run_cmd(["npm", "run", build_script], timeout=600, redact=True, cwd=BACKEND_DIR)
    if exit_code != 0:
        log_ops(f"npm run {build_script} failed: {stderr[:200]}", "ERROR")
        return False, f"Build failed: {stderr[:200]}"
    
    # Wait a moment for PM2 restart (build:deploy handles restart)
    import time
    time.sleep(2)
    
    # Check health endpoint
    try:
        import urllib.request
        url = f"http://127.0.0.1:{BACKEND_PORT}/api/system/health"
        try:
            with urllib.request.urlopen(url, timeout=5) as response:
                status_code = response.getcode()
                response_data = response.read()[:200].decode("utf-8", errors="ignore")
                duration = (datetime.datetime.now() - start_time).total_seconds()
                log_ops(f"Server and front-end build complete (duration: {duration:.2f}s, health: {status_code})")
                return True, f"Build complete. Health check: {status_code}\n{redact_secrets(response_data)}"
        except urllib.error.URLError:
            # Try fallback endpoint
            url = f"http://127.0.0.1:{BACKEND_PORT}/health"
            try:
                with urllib.request.urlopen(url, timeout=5) as response:
                    status_code = response.getcode()
                    duration = (datetime.datetime.now() - start_time).total_seconds()
                    log_ops(f"Server and front-end build complete (duration: {duration:.2f}s, health: {status_code})")
                    return True, f"Build complete. Health check: {status_code}"
            except Exception as e:
                duration = (datetime.datetime.now() - start_time).total_seconds()
                log_ops(f"Build complete but health check failed (duration: {duration:.2f}s)", "WARNING")
                return True, f"Build complete but health endpoint not reachable: {e}"
    except Exception as e:
        duration = (datetime.datetime.now() - start_time).total_seconds()
        log_ops(f"Build complete but health check error (duration: {duration:.2f}s): {e}", "WARNING")
        return True, f"Build complete but health check failed: {e}"


def backend_rebuild(dry_run: bool = False) -> Tuple[bool, str]:
    """Backend rebuild (deprecated - use build_server_and_frontend)."""
    # Alias for backward compatibility - calls build_server_and_frontend
    return build_server_and_frontend(dry_run=dry_run)


def frontend_rebuild(dry_run: bool = False) -> Tuple[bool, str]:
    """Frontend rebuild (safe, requires confirmation)."""
    package_json = FRONTEND_DIR / "package.json"
    has_lockfile = (FRONTEND_DIR / "package-lock.json").exists()
    
    # Get build script
    build_script = get_build_script(package_json, ["build"])
    if not build_script:
        return False, (
            f"ERROR: No build script found in {package_json}. "
            f"Expected: build. Cannot proceed with rebuild."
        )
    
    # Preview commands
    install_cmd = "npm ci" if has_lockfile else "npm install"
    build_cmd = f"npm run {build_script}"
    preview = f"""
Preview of commands to run:
  1. cd {FRONTEND_DIR}
  2. {install_cmd}
  3. {build_cmd}
"""
    
    if dry_run:
        log_ops("[DRY RUN] Would rebuild frontend")
        return True, f"[DRY RUN]{preview}"
    
    print(preview)
    if not require_confirmation("Rebuild frontend?"):
        return False, "Cancelled by user"
    
    log_ops("Starting frontend rebuild")
    start_time = datetime.datetime.now()
    
    # npm ci or npm install
    if has_lockfile:
        exit_code, stdout, stderr = run_cmd(["npm", "ci"], timeout=300, redact=True, cwd=FRONTEND_DIR)
        if exit_code != 0:
            log_ops(f"npm ci failed: {stderr[:200]}", "ERROR")
            return False, f"npm ci failed: {stderr[:200]}"
    else:
        exit_code, stdout, stderr = run_cmd(["npm", "install"], timeout=300, redact=True, cwd=FRONTEND_DIR)
        if exit_code != 0:
            log_ops(f"npm install failed: {stderr[:200]}", "ERROR")
            return False, f"npm install failed: {stderr[:200]}"
    
    # npm run <build_script>
    exit_code, stdout, stderr = run_cmd(["npm", "run", build_script], timeout=600, redact=True, cwd=FRONTEND_DIR)
    if exit_code != 0:
        log_ops(f"npm run {build_script} failed: {stderr[:200]}", "ERROR")
        return False, f"Build failed: {stderr[:200]}"
    
    # Check dist output
    if FRONTEND_DIST.exists():
        dist_files = list(FRONTEND_DIST.rglob("*"))
        files_only = [f for f in dist_files if f.is_file()]
        latest_mtime = max((f.stat().st_mtime for f in files_only), default=0)
        
        duration = (datetime.datetime.now() - start_time).total_seconds()
        log_ops(f"Frontend rebuild complete (duration: {duration:.2f}s, {len(files_only)} files)")
        return True, f"Rebuild complete. Dist: {FRONTEND_DIST} ({len(files_only)} files, modified: {datetime.datetime.fromtimestamp(latest_mtime).isoformat()})"
    else:
        duration = (datetime.datetime.now() - start_time).total_seconds()
        log_ops(f"Frontend rebuild complete but dist not found (duration: {duration:.2f}s)", "WARNING")
        return True, "Rebuild complete but dist directory not found"


def ops_hub_rebuild(dry_run: bool = False) -> Tuple[bool, str]:
    """Ops Hub rebuild/verify + PM2 restart (safe, requires confirmation)."""
    package_json = OPS_HUB_DIR / "package.json"
    
    if not OPS_HUB_DIR.exists():
        return False, f"ERROR: Ops Hub directory not found: {OPS_HUB_DIR}"
    
    if not package_json.exists():
        return False, f"ERROR: package.json not found in {OPS_HUB_DIR}"
    
    # Check if build script exists (may not be needed for pure Node service)
    build_script = get_build_script(package_json, ["build"])
    has_lockfile = (OPS_HUB_DIR / "package-lock.json").exists()
    
    # Preview commands
    install_cmd = "npm ci" if has_lockfile else "npm install"
    preview_commands = [f"cd {OPS_HUB_DIR}"]
    if has_lockfile or not (OPS_HUB_DIR / "node_modules").exists():
        preview_commands.append(install_cmd)
    if build_script:
        preview_commands.append(f"npm run {build_script}")
    preview_commands.append("pm2 restart om-ops-hub")
    
    preview = "\n".join([f"  {i+1}. {cmd}" for i, cmd in enumerate(preview_commands)])
    preview = f"\nPreview of commands to run:\n{preview}\n"
    
    if dry_run:
        log_ops("[DRY RUN] Would rebuild ops hub")
        return True, f"[DRY RUN]{preview}"
    
    print(preview)
    if not require_confirmation("Rebuild ops hub and restart PM2?"):
        return False, "Cancelled by user"
    
    log_ops("Starting ops hub rebuild")
    start_time = datetime.datetime.now()
    
    # npm ci or npm install (only if needed)
    if has_lockfile or not (OPS_HUB_DIR / "node_modules").exists():
        install_cmd_list = ["npm", "ci"] if has_lockfile else ["npm", "install"]
        exit_code, stdout, stderr = run_cmd(install_cmd_list, timeout=300, redact=True, cwd=OPS_HUB_DIR)
        if exit_code != 0:
            log_ops(f"npm install failed: {stderr[:200]}", "ERROR")
            return False, f"npm install failed: {stderr[:200]}"
    
    # Build script (if exists)
    if build_script:
        exit_code, stdout, stderr = run_cmd(["npm", "run", build_script], timeout=300, redact=True, cwd=OPS_HUB_DIR)
        if exit_code != 0:
            log_ops(f"npm run {build_script} failed: {stderr[:200]}", "ERROR")
            return False, f"Build failed: {stderr[:200]}"
    
    # PM2 restart
    success, restart_msg = pm2_restart_ops_hub()
    if not success:
        duration = (datetime.datetime.now() - start_time).total_seconds()
        log_ops(f"Ops hub rebuild complete but PM2 restart failed (duration: {duration:.2f}s)", "WARNING")
        return False, f"Build complete but PM2 restart failed: {restart_msg}"
    
    duration = (datetime.datetime.now() - start_time).total_seconds()
    log_ops(f"Ops hub rebuild complete (duration: {duration:.2f}s)")
    return True, f"Rebuild complete. PM2 restarted om-ops-hub"


def pm2_restart_ops_hub() -> Tuple[bool, str]:
    """Restart om-ops-hub PM2 process."""
    try:
        result = subprocess.run(
            ["pm2", "restart", "om-ops-hub"],
            capture_output=True,
            text=True,
            timeout=30,
        )
        if result.returncode == 0:
            log_ops("PM2 restart om-ops-hub successful")
            return True, result.stdout
        else:
            log_ops(f"PM2 restart om-ops-hub failed: {result.stderr[:200]}", "ERROR")
            return False, result.stderr
    except Exception as e:
        log_ops(f"PM2 restart om-ops-hub exception: {e}", "ERROR")
        return False, str(e)


def check_git_safety() -> Tuple[bool, Dict]:
    """Check git repo state for safety before builds."""
    success, status_info = git_status()
    if not success:
        return False, {"error": "Failed to check git status"}
    
    # Get current branch and HEAD SHA
    branch_success, branch_out, _ = run_git_command(["branch", "--show-current"])
    current_branch = branch_out.strip() if branch_success else "unknown"
    
    sha_success, sha_out, _ = run_git_command(["rev-parse", "HEAD"])
    head_sha = sha_out.strip()[:8] if sha_success else "unknown"
    
    is_dirty = status_info.get("is_dirty", False)
    status_lines = status_info.get("status_lines", [])
    
    # Count modified files
    modified_count = len(status_lines)
    
    return True, {
        "is_dirty": is_dirty,
        "current_branch": current_branch,
        "head_sha": head_sha,
        "status_lines": status_lines,
        "modified_count": modified_count,
    }


def create_build_run_dir() -> Path:
    """Create timestamped build run directory."""
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d_%H%M%S")
    run_dir = BUILD_RUNS_DIR / timestamp
    run_dir.mkdir(parents=True, exist_ok=True)
    return run_dir


def log_build_output(run_dir: Path, stage: str, stdout: str, stderr: str):
    """Log build output to stage-specific files."""
    stage_file = run_dir / f"{stage}.log"
    with open(stage_file, "w", encoding="utf-8") as f:
        f.write(f"=== {stage.upper()} STDOUT ===\n")
        f.write(stdout)
        f.write(f"\n=== {stage.upper()} STDERR ===\n")
        f.write(stderr)


def build_server_and_frontend_with_logging(run_dir: Path, dry_run: bool = False) -> Dict:
    """Build server and front-end with full logging using npm run build:deploy."""
    stage = "server_and_frontend"
    start_time = datetime.datetime.now()
    
    if dry_run:
        success, message = build_server_and_frontend(dry_run=True)
        return {
            "stage": stage,
            "status": "DRY_RUN",
            "duration": 0,
            "exit_code": 0,
            "message": message,
        }
    
    package_json = BACKEND_DIR / "package.json"
    has_lockfile = (BACKEND_DIR / "package-lock.json").exists()
    build_script = "build:deploy"  # This builds both server and front-end
    
    # Verify script exists
    try:
        with open(package_json, "r") as f:
            package_data = json.load(f)
        scripts = package_data.get("scripts", {})
        if build_script not in scripts:
            return {
                "stage": stage,
                "status": "FAILED",
                "duration": 0,
                "exit_code": 1,
                "message": f"Build script '{build_script}' not found",
            }
    except Exception as e:
        return {
            "stage": stage,
            "status": "FAILED",
            "duration": 0,
            "exit_code": 1,
            "message": f"Could not read package.json: {e}",
        }
    
    results = {"stage": stage, "commands": []}
    
    # npm ci/install
    install_cmd = ["npm", "ci"] if has_lockfile else ["npm", "install"]
    exit_code, stdout, stderr = run_cmd(install_cmd, timeout=300, redact=True, cwd=BACKEND_DIR)
    log_build_output(run_dir, f"{stage}_install", stdout, stderr)
    results["commands"].append({
        "cmd": " ".join(install_cmd),
        "exit_code": exit_code,
        "duration": 0,
    })
    
    if exit_code != 0:
        duration = (datetime.datetime.now() - start_time).total_seconds()
        return {
            "stage": stage,
            "status": "FAILED",
            "duration": duration,
            "exit_code": exit_code,
            "message": f"npm install failed: {stderr[:200]}",
        }
    
    # Build (build:deploy handles both server and front-end, and PM2 restart)
    build_cmd = ["npm", "run", build_script]
    build_start = datetime.datetime.now()
    exit_code, stdout, stderr = run_cmd(build_cmd, timeout=600, redact=True, cwd=BACKEND_DIR)
    build_duration = (datetime.datetime.now() - build_start).total_seconds()
    log_build_output(run_dir, f"{stage}_build", stdout, stderr)
    results["commands"].append({
        "cmd": " ".join(build_cmd),
        "exit_code": exit_code,
        "duration": build_duration,
    })
    
    if exit_code != 0:
        duration = (datetime.datetime.now() - start_time).total_seconds()
        return {
            "stage": stage,
            "status": "FAILED",
            "duration": duration,
            "exit_code": exit_code,
            "message": f"Build failed: {stderr[:200]}",
        }
    
    # Wait for PM2 restart (build:deploy handles restart automatically)
    import time
    time.sleep(2)
    
    duration = (datetime.datetime.now() - start_time).total_seconds()
    return {
        "stage": stage,
        "status": "SUCCESS",
        "duration": duration,
        "exit_code": 0,
        "message": "Server and front-end built and restarted",
        "commands": results["commands"],
    }


def build_frontend_with_logging(run_dir: Path, dry_run: bool = False) -> Dict:
    """Build frontend with full logging."""
    stage = "frontend"
    start_time = datetime.datetime.now()
    
    if dry_run:
        success, message = frontend_rebuild(dry_run=True)
        return {
            "stage": stage,
            "status": "DRY_RUN",
            "duration": 0,
            "exit_code": 0,
            "message": message,
        }
    
    package_json = FRONTEND_DIR / "package.json"
    has_lockfile = (FRONTEND_DIR / "package-lock.json").exists()
    build_script = get_build_script(package_json, ["build"])
    
    if not build_script:
        return {
            "stage": stage,
            "status": "FAILED",
            "duration": 0,
            "exit_code": 1,
            "message": "No build script found",
        }
    
    results = {"stage": stage, "commands": []}
    
    # npm ci/install
    install_cmd = ["npm", "ci"] if has_lockfile else ["npm", "install"]
    exit_code, stdout, stderr = run_cmd(install_cmd, timeout=300, redact=True, cwd=FRONTEND_DIR)
    log_build_output(run_dir, f"{stage}_install", stdout, stderr)
    results["commands"].append({
        "cmd": " ".join(install_cmd),
        "exit_code": exit_code,
        "duration": 0,
    })
    
    if exit_code != 0:
        duration = (datetime.datetime.now() - start_time).total_seconds()
        return {
            "stage": stage,
            "status": "FAILED",
            "duration": duration,
            "exit_code": exit_code,
            "message": f"npm install failed: {stderr[:200]}",
        }
    
    # Build
    build_cmd = ["npm", "run", build_script]
    build_start = datetime.datetime.now()
    exit_code, stdout, stderr = run_cmd(build_cmd, timeout=600, redact=True, cwd=FRONTEND_DIR)
    build_duration = (datetime.datetime.now() - build_start).total_seconds()
    log_build_output(run_dir, f"{stage}_build", stdout, stderr)
    results["commands"].append({
        "cmd": " ".join(build_cmd),
        "exit_code": exit_code,
        "duration": build_duration,
    })
    
    if exit_code != 0:
        duration = (datetime.datetime.now() - start_time).total_seconds()
        return {
            "stage": stage,
            "status": "FAILED",
            "duration": duration,
            "exit_code": exit_code,
            "message": f"Build failed: {stderr[:200]}",
        }
    
    duration = (datetime.datetime.now() - start_time).total_seconds()
    return {
        "stage": stage,
        "status": "SUCCESS",
        "duration": duration,
        "exit_code": 0,
        "message": "Frontend built successfully",
        "commands": results["commands"],
    }


def build_ops_hub_with_logging(run_dir: Path, dry_run: bool = False) -> Dict:
    """Build ops hub with full logging."""
    stage = "ops_hub"
    start_time = datetime.datetime.now()
    
    if dry_run:
        success, message = ops_hub_rebuild(dry_run=True)
        return {
            "stage": stage,
            "status": "DRY_RUN",
            "duration": 0,
            "exit_code": 0,
            "message": message,
        }
    
    package_json = OPS_HUB_DIR / "package.json"
    has_lockfile = (OPS_HUB_DIR / "package-lock.json").exists()
    build_script = get_build_script(package_json, ["build"])
    
    results = {"stage": stage, "commands": []}
    
    # npm ci/install (only if needed)
    if has_lockfile or not (OPS_HUB_DIR / "node_modules").exists():
        install_cmd = ["npm", "ci"] if has_lockfile else ["npm", "install"]
        exit_code, stdout, stderr = run_cmd(install_cmd, timeout=300, redact=True, cwd=OPS_HUB_DIR)
        log_build_output(run_dir, f"{stage}_install", stdout, stderr)
        results["commands"].append({
            "cmd": " ".join(install_cmd),
            "exit_code": exit_code,
            "duration": 0,
        })
        
        if exit_code != 0:
            duration = (datetime.datetime.now() - start_time).total_seconds()
            return {
                "stage": stage,
                "status": "FAILED",
                "duration": duration,
                "exit_code": exit_code,
                "message": f"npm install failed: {stderr[:200]}",
            }
    
    # Build script (if exists)
    if build_script:
        build_cmd = ["npm", "run", build_script]
        build_start = datetime.datetime.now()
        exit_code, stdout, stderr = run_cmd(build_cmd, timeout=300, redact=True, cwd=OPS_HUB_DIR)
        build_duration = (datetime.datetime.now() - build_start).total_seconds()
        log_build_output(run_dir, f"{stage}_build", stdout, stderr)
        results["commands"].append({
            "cmd": " ".join(build_cmd),
            "exit_code": exit_code,
            "duration": build_duration,
        })
        
        if exit_code != 0:
            duration = (datetime.datetime.now() - start_time).total_seconds()
            return {
                "stage": stage,
                "status": "FAILED",
                "duration": duration,
                "exit_code": exit_code,
                "message": f"Build failed: {stderr[:200]}",
            }
    
    # PM2 restart
    pm2_start_time = datetime.datetime.now()
    success, restart_msg = pm2_restart_ops_hub()
    pm2_duration = (datetime.datetime.now() - pm2_start_time).total_seconds()
    
    if not success:
        duration = (datetime.datetime.now() - start_time).total_seconds()
        return {
            "stage": stage,
            "status": "FAILED",
            "duration": duration,
            "exit_code": 1,
            "message": f"PM2 restart failed: {restart_msg}",
        }
    
    duration = (datetime.datetime.now() - start_time).total_seconds()
    return {
        "stage": stage,
        "status": "SUCCESS",
        "duration": duration,
        "exit_code": 0,
        "message": "Ops hub built and restarted",
        "commands": results["commands"],
    }


def build_all_safe_order(dry_run: bool = False) -> Dict:
    """Build all components in safe order: backend, frontend, ops_hub."""
    run_dir = create_build_run_dir()
    overall_start = datetime.datetime.now()
    
    # Check git safety first
    git_safe, git_info = check_git_safety()
    if not git_safe:
        return {
            "success": False,
            "error": "Git safety check failed",
            "run_dir": str(run_dir),
        }
    
    git_info_str = f"Branch: {git_info.get('current_branch', 'unknown')}, HEAD: {git_info.get('head_sha', 'unknown')}"
    
    if git_info.get("is_dirty") and not dry_run:
        modified_count = git_info.get("modified_count", 0)
        print(f"\n⚠️  WARNING: Repository is dirty (uncommitted changes)")
        print(f"   {git_info_str}")
        print(f"   Modified files: {modified_count}")
        print("\n   Building with uncommitted changes is risky.")
        if not require_confirmation("Continue with build despite dirty repo?"):
            return {
                "success": False,
                "error": "Build cancelled due to dirty repository",
                "run_dir": str(run_dir),
            }
    
    results = {
        "run_id": run_dir.name,
        "run_dir": str(run_dir),
        "started_at": overall_start.isoformat(),
        "git_info": git_info_str,
        "stages": [],
    }
    
    # Build server and front-end (single command)
    server_frontend_result = build_server_and_frontend_with_logging(run_dir, dry_run=dry_run)
    results["stages"].append(server_frontend_result)
    
    # Build ops hub (even if others failed, for visibility)
    ops_hub_result = build_ops_hub_with_logging(run_dir, dry_run=dry_run)
    results["stages"].append(ops_hub_result)
    
    overall_duration = (datetime.datetime.now() - overall_start).total_seconds()
    results["completed_at"] = datetime.datetime.now().isoformat()
    results["total_duration"] = overall_duration
    results["success"] = all(stage.get("status") == "SUCCESS" or stage.get("status") == "DRY_RUN" for stage in results["stages"])
    
    # Save run.json
    run_json_path = run_dir / "run.json"
    with open(run_json_path, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)
    
    return results


def build_summary_to_lines(results: Dict) -> List[str]:
    """Convert build summary to list of lines for screen rendering."""
    lines = []
    lines.append("")
    lines.append("=" * 60)
    lines.append("BUILD SUMMARY")
    lines.append("=" * 60)
    lines.append("")
    
    if "git_info" in results:
        lines.append(f"Git: {results['git_info']}")
    
    if "freescout_ticket_id" in results:
        lines.append(f"FreeScout Ticket: {results['freescout_ticket_id']}")
        if results.get("freescout_ticket_url"):
            lines.append(f"  URL: {results['freescout_ticket_url']}")
    
    lines.append("")
    lines.append(f"{'Stage':<20} {'Status':<15} {'Duration':<15} {'Message':<30}")
    lines.append("-" * 60)
    
    for stage in results.get("stages", []):
        stage_name = stage.get("stage", "unknown")
        status = stage.get("status", "UNKNOWN")
        duration = f"{stage.get('duration', 0):.2f}s"
        message = (stage.get("message", "")[:28] + "..") if len(stage.get("message", "")) > 30 else stage.get("message", "")
        
        status_display = status
        if status == "SUCCESS":
            status_display = "✓ SUCCESS"
        elif status == "FAILED":
            status_display = "✗ FAILED"
        elif status == "DRY_RUN":
            status_display = "DRY RUN"
        
        lines.append(f"{stage_name:<20} {status_display:<15} {duration:<15} {message:<30}")
    
    lines.append("-" * 60)
    lines.append(f"Total Duration: {results.get('total_duration', 0):.2f}s")
    lines.append(f"Overall Status: {'SUCCESS' if results.get('success') else 'FAILED'}")
    lines.append(f"\nLogs written to: {results.get('run_dir')}")
    
    # Post note to FreeScout ticket if available
    ticket_id = results.get("freescout_ticket_id")
    if ticket_id and FREESCOUT_OPS_AVAILABLE and freescout_post_note:
        note_text = f"Build & Deploy completed at {datetime.datetime.now().isoformat()}\n\n"
        note_text += f"Overall Status: {'SUCCESS' if results.get('success') else 'FAILED'}\n"
        note_text += f"Total Duration: {results.get('total_duration', 0):.2f}s\n\n"
        note_text += "Stages:\n"
        for stage in results.get("stages", []):
            status = stage.get("status", "UNKNOWN")
            stage_name = stage.get("stage", "unknown")
            duration = stage.get("duration", 0)
            note_text += f"  {status}: {stage_name} ({duration:.2f}s)\n"
        note_text += f"\nLogs: {results.get('run_dir')}"
        
        success, error = freescout_post_note(ticket_id, note_text)
        if success:
            lines.append(f"\n✓ Note posted to FreeScout ticket {ticket_id}")
        else:
            lines.append(f"\n⚠ Could not post note to ticket: {error}")
    
    lines.append("=" * 60)
    return lines


def print_build_summary(results: Dict):
    """Print professional build summary table (legacy function for compatibility)."""
    lines = build_summary_to_lines(results)
    print("\n" + "\n".join(lines) + "\n")


def show_build_deploy_menu(ui_screen=None):
    """Display Build & Deploy submenu."""
    # Try to use UI screen if available
    try:
        script_dir = Path(__file__).parent
        if str(script_dir) not in sys.path:
            sys.path.insert(0, str(script_dir))
        from ui_screen import render_screen, clear_screen
        UI_SCREEN_AVAILABLE = True
    except ImportError:
        UI_SCREEN_AVAILABLE = False
        def render_screen(*args, **kwargs):
            pass
        def clear_screen():
            os.system("clear" if os.name != "nt" else "cls")
    
    menu_items = [
        ("1", "Build Server and Front-end (restart orthodox-backend)", "build_server_frontend"),
        ("2", "Build Server and Front-end (if 5+ files changed)", "build_if_changed"),
        ("3", "Build Ops Hub (restart om-ops-hub)", "build_ops_hub"),
        ("4", "Build ALL (safe order)", "build_all"),
        ("5", "Dry Run (show commands only)", "dry_run"),
        ("0", "Back to main menu", "back"),
    ]
    
    if UI_SCREEN_AVAILABLE:
        body_lines = []
        for num, desc, _ in menu_items:
            body_lines.append(f"  ({num}) {desc}")
        
        render_screen(
            title="Build & Deploy",
            breadcrumb="OM-Ops › Build & Deploy",
            body_lines=body_lines,
            footer_hint="[0] Back to Main Menu   [q] Quit"
        )
    else:
        clear_screen()
        print("\n=== Build & Deploy (Server/Front-end/Ops) ===\n")
        for num, desc, _ in menu_items:
            print(f"  ({num}) {desc}")
        print()


def prompt_for_ticket_build(action_name: str, ui_screen=None) -> Tuple[Optional[str], bool]:
    """
    Prompt user for FreeScout ticket ID with enforcement logic (for build_ops context).
    
    Returns:
        Tuple of (ticket_id or None, should_proceed)
    """
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
    
    if not FREESCOUT_OPS_AVAILABLE or freescout_validate_ticket is None:
        return None, True
    
    if UI_SCREEN_AVAILABLE:
        body_lines = [
            "",
            f"Enter FreeScout Ticket ID for {action_name}",
            "",
            "Leave blank to continue with warning (soft enforcement)",
            "",
        ]
        render_screen(
            title="Build & Deploy",
            breadcrumb="OM-Ops › Build & Deploy › Ticket Entry",
            body_lines=body_lines,
            footer_hint="[Enter] Continue   [0] Cancel   [q] Quit"
        )
        prompt = "FreeScout Ticket ID (or blank): "
    else:
        prompt = f"\nEnter FreeScout Ticket ID for {action_name} (or leave blank to continue with warning): "
    
    ticket_input = get_user_input(prompt).strip()
    
    if not ticket_input:
        if FREESCOUT_REQUIRE_TICKET:
            clear_screen()
            body_lines = [
                "",
                "✗ BLOCKED: Ticket required for this action.",
                "",
                "Create or approve a FreeScout ticket before proceeding.",
                "",
                "FreeScout: https://orthodoxmetrics.com/helpdesk/",
                "",
            ]
            if UI_SCREEN_AVAILABLE:
                render_screen(
                    title="Build & Deploy",
                    breadcrumb="OM-Ops › Build & Deploy › Blocked",
                    body_lines=body_lines,
                    footer_hint="[Enter] Back   [0] Main Menu   [q] Quit"
                )
            else:
                print("\n".join(body_lines))
            return None, False
        else:
            if UI_SCREEN_AVAILABLE:
                clear_screen()
                body_lines = [
                    "",
                    "⚠ WARNING: No ticket provided. Proceeding without ticket.",
                    "",
                    "This action will be logged as 'NO TICKET PROVIDED'.",
                    "",
                ]
                render_screen(
                    title="Build & Deploy",
                    breadcrumb="OM-Ops › Build & Deploy › Warning",
                    body_lines=body_lines,
                    footer_hint="[Enter] Continue   [0] Cancel   [q] Quit"
                )
                wait_for_enter()
            else:
                print(f"\n⚠ WARNING: No ticket provided. Proceeding without ticket.")
                print(f"  This action will be logged as 'NO TICKET PROVIDED'.")
            return None, True
    
    # Validate ticket
    if UI_SCREEN_AVAILABLE:
        clear_screen()
        render_screen(
            title="Build & Deploy",
            breadcrumb="OM-Ops › Build & Deploy › Validating Ticket",
            body_lines=["", "Validating ticket...", ""],
            footer_hint="Please wait..."
        )
    
    is_valid, ticket_data, error = freescout_validate_ticket(ticket_input)
    
    if is_valid:
        ticket_url = freescout_get_ticket_url(ticket_input) if freescout_get_ticket_url else None
        if UI_SCREEN_AVAILABLE:
            clear_screen()
            body_lines = [
                "",
                f"✓ Ticket {ticket_input} validated",
                "",
            ]
            if ticket_url:
                body_lines.append(f"URL: {ticket_url}")
            if ticket_data and ticket_data.get("subject"):
                body_lines.append(f"Subject: {ticket_data.get('subject', '')[:60]}")
            body_lines.append("")
            render_screen(
                title="Build & Deploy",
                breadcrumb="OM-Ops › Build & Deploy › Ticket Validated",
                body_lines=body_lines,
                footer_hint="[Enter] Continue   [0] Cancel   [q] Quit"
            )
            wait_for_enter()
        else:
            print(f"\n✓ Ticket {ticket_input} validated")
            if ticket_url:
                print(f"  URL: {ticket_url}")
            if ticket_data and ticket_data.get("subject"):
                print(f"  Subject: {ticket_data.get('subject', '')[:60]}")
        return ticket_input, True
    else:
        if UI_SCREEN_AVAILABLE:
            clear_screen()
            body_lines = [
                "",
                f"✗ Invalid ticket: {error}",
                "",
            ]
            if FREESCOUT_REQUIRE_TICKET:
                body_lines.append("Ticket validation required. Please provide a valid ticket ID.")
            else:
                body_lines.append("⚠ WARNING: Proceeding with invalid ticket (soft enforcement)")
            body_lines.append("")
            render_screen(
                title="Build & Deploy",
                breadcrumb="OM-Ops › Build & Deploy › Invalid Ticket",
                body_lines=body_lines,
                footer_hint="[Enter] Continue   [0] Cancel   [q] Quit"
            )
            if not FREESCOUT_REQUIRE_TICKET:
                wait_for_enter()
        else:
            print(f"\n✗ Invalid ticket: {error}")
            if FREESCOUT_REQUIRE_TICKET:
                print(f"  Ticket validation required. Please provide a valid ticket ID.")
            else:
                print(f"  ⚠ WARNING: Proceeding with invalid ticket (soft enforcement)")
        
        if FREESCOUT_REQUIRE_TICKET:
            return None, False
        else:
            return ticket_input, True


def handle_build_deploy_submenu():
    """Handle Build & Deploy submenu."""
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
        show_build_deploy_menu()
        try:
            choice = get_user_input("Select option: ").strip()
        except (EOFError, KeyboardInterrupt):
            break
        
        if choice == "0" or choice.lower() == "q":
            break
        elif choice == "1":
            # Build Server and Front-end
            clear_screen()
            ticket_id, should_proceed = prompt_for_ticket_build("Build Server and Front-end", ui_screen=True if UI_SCREEN_AVAILABLE else None)
            if not should_proceed:
                clear_screen()
                render_screen(
                    title="Build & Deploy",
                    breadcrumb="OM-Ops › Build & Deploy › Cancelled",
                    body_lines=["", "Build cancelled.", ""],
                    footer_hint="[Enter] Back   [0] Main Menu   [q] Quit"
                )
                wait_for_enter()
                continue
            
            run_dir = create_build_run_dir()
            git_safe, git_info = check_git_safety()
            if git_safe and git_info.get("is_dirty"):
                modified_count = git_info.get("modified_count", 0)
                clear_screen()
                body_lines = [
                    "",
                    "⚠️  WARNING: Repository is dirty",
                    "",
                    f"Branch: {git_info.get('current_branch')}",
                    f"HEAD: {git_info.get('head_sha')}",
                    f"Modified files: {modified_count}",
                    "",
                    "Building with uncommitted changes is risky.",
                ]
                render_screen(
                    title="Build & Deploy",
                    breadcrumb="OM-Ops › Build & Deploy › Dirty Repo Warning",
                    body_lines=body_lines,
                    footer_hint="[Enter] Continue   [0] Cancel   [q] Quit"
                )
                if not require_confirmation("Continue with build despite dirty repo?"):
                    clear_screen()
                    render_screen(
                        title="Build & Deploy",
                        breadcrumb="OM-Ops › Build & Deploy › Cancelled",
                        body_lines=["", "Build cancelled.", ""],
                        footer_hint="[Enter] Back   [0] Main Menu   [q] Quit"
                    )
                    wait_for_enter()
                    continue
            
            # Show build progress
            clear_screen()
            render_screen(
                title="Build & Deploy",
                breadcrumb="OM-Ops › Build & Deploy › Building",
                body_lines=["", "Building server and front-end...", "", "This may take several minutes.", ""],
                footer_hint="Please wait..."
            )
            
            result = build_server_and_frontend_with_logging(run_dir, dry_run=False)
            
            # Log ticket to run.json
            run_json_path = run_dir / "run.json"
            if run_json_path.exists():
                try:
                    with open(run_json_path, "r") as f:
                        run_data = json.load(f)
                except:
                    run_data = {}
                run_data["freescout_ticket"] = {
                    "ticket_id": ticket_id,
                    "action": "Build Server and Front-end",
                    "timestamp": datetime.datetime.now().isoformat(),
                    "ticket_url": freescout_get_ticket_url(ticket_id) if ticket_id and freescout_get_ticket_url else None
                }
                if not ticket_id:
                    run_data["freescout_ticket"]["warning"] = "NO TICKET PROVIDED"
                with open(run_json_path, "w") as f:
                    json.dump(run_data, f, indent=2)
            
            summary_data = {
                "stages": [result],
                "run_dir": str(run_dir),
                "git_info": f"Branch: {git_info.get('current_branch', 'unknown')}, HEAD: {git_info.get('head_sha', 'unknown')}" if git_safe else "Git check failed",
                "total_duration": result.get("duration", 0),
                "success": result.get("status") == "SUCCESS",
            }
            if ticket_id:
                summary_data["freescout_ticket_id"] = ticket_id
                summary_data["freescout_ticket_url"] = freescout_get_ticket_url(ticket_id) if freescout_get_ticket_url else None
            
            # Display results
            clear_screen()
            result_lines = build_summary_to_lines(summary_data)
            render_screen(
                title="Build & Deploy",
                breadcrumb="OM-Ops › Build & Deploy › Results",
                body_lines=result_lines,
                footer_hint="[Enter] Back   [0] Main Menu   [q] Quit"
            )
            
            if CHANGELOG_AVAILABLE and result.get("status") == "SUCCESS":
                auto_append_backup_entry("build_deploy_server_frontend", "server_frontend", [])
            
            wait_for_enter()
        elif choice == "2":
            # Build Server and Front-end (if 5+ files changed)
            clear_screen()
            ticket_id, should_proceed = prompt_for_ticket_build("Build Server and Front-end (if 5+ files changed)", ui_screen=True if UI_SCREEN_AVAILABLE else None)
            if not should_proceed:
                clear_screen()
                render_screen(
                    title="Build & Deploy",
                    breadcrumb="OM-Ops › Build & Deploy › Cancelled",
                    body_lines=["", "Build cancelled.", ""],
                    footer_hint="[Enter] Back   [0] Main Menu   [q] Quit"
                )
                wait_for_enter()
                continue
            
            git_safe, git_info = check_git_safety()
            if not git_safe:
                clear_screen()
                render_screen(
                    title="Build & Deploy",
                    breadcrumb="OM-Ops › Build & Deploy › Error",
                    body_lines=["", "Could not check git status.", "Build cancelled.", ""],
                    footer_hint="[Enter] Back   [0] Main Menu   [q] Quit"
                )
                wait_for_enter()
                continue
            
            modified_count = git_info.get("modified_count", 0)
            
            if modified_count < 5:
                clear_screen()
                render_screen(
                    title="Build & Deploy",
                    breadcrumb="OM-Ops › Build & Deploy › Skipped",
                    body_lines=[
                        "",
                        f"✓ Skipping build: Only {modified_count} file(s) changed",
                        "",
                        "Need 5+ files changed to auto-build.",
                        "Use option 1 to build anyway.",
                        "",
                    ],
                    footer_hint="[Enter] Back   [0] Main Menu   [q] Quit"
                )
                wait_for_enter()
                continue
            
            clear_screen()
            render_screen(
                title="Build & Deploy",
                breadcrumb="OM-Ops › Build & Deploy › Auto-Build",
                body_lines=[
                    "",
                    f"✓ {modified_count} file(s) changed - proceeding with build",
                    "",
                ],
                footer_hint="Please wait..."
            )
            
            run_dir = create_build_run_dir()
            if git_info.get("is_dirty"):
                clear_screen()
                body_lines = [
                    "",
                    "⚠️  WARNING: Repository is dirty",
                    "",
                    f"Branch: {git_info.get('current_branch')}",
                    f"HEAD: {git_info.get('head_sha')}",
                    f"Modified files: {modified_count}",
                    "",
                    "Building with uncommitted changes is risky.",
                ]
                render_screen(
                    title="Build & Deploy",
                    breadcrumb="OM-Ops › Build & Deploy › Dirty Repo Warning",
                    body_lines=body_lines,
                    footer_hint="[Enter] Continue   [0] Cancel   [q] Quit"
                )
                if not require_confirmation("Continue with build despite dirty repo?"):
                    clear_screen()
                    render_screen(
                        title="Build & Deploy",
                        breadcrumb="OM-Ops › Build & Deploy › Cancelled",
                        body_lines=["", "Build cancelled.", ""],
                        footer_hint="[Enter] Back   [0] Main Menu   [q] Quit"
                    )
                    wait_for_enter()
                    continue
            
            # Show build progress
            clear_screen()
            render_screen(
                title="Build & Deploy",
                breadcrumb="OM-Ops › Build & Deploy › Building",
                body_lines=["", "Building server and front-end...", "", "This may take several minutes.", ""],
                footer_hint="Please wait..."
            )
            
            result = build_server_and_frontend_with_logging(run_dir, dry_run=False)
            
            # Log ticket to run.json
            run_json_path = run_dir / "run.json"
            if run_json_path.exists():
                try:
                    with open(run_json_path, "r") as f:
                        run_data = json.load(f)
                except:
                    run_data = {}
                run_data["freescout_ticket"] = {
                    "ticket_id": ticket_id,
                    "action": "Build Server and Front-end (auto: 5+ files)",
                    "timestamp": datetime.datetime.now().isoformat(),
                    "ticket_url": freescout_get_ticket_url(ticket_id) if ticket_id and freescout_get_ticket_url else None,
                    "trigger": f"{modified_count} files changed"
                }
                if not ticket_id:
                    run_data["freescout_ticket"]["warning"] = "NO TICKET PROVIDED"
                with open(run_json_path, "w") as f:
                    json.dump(run_data, f, indent=2)
            
            summary_data = {
                "stages": [result],
                "run_dir": str(run_dir),
                "git_info": f"Branch: {git_info.get('current_branch', 'unknown')}, HEAD: {git_info.get('head_sha', 'unknown')}" if git_safe else "Git check failed",
                "total_duration": result.get("duration", 0),
                "success": result.get("status") == "SUCCESS",
            }
            if ticket_id:
                summary_data["freescout_ticket_id"] = ticket_id
                summary_data["freescout_ticket_url"] = freescout_get_ticket_url(ticket_id) if freescout_get_ticket_url else None
            
            # Display results
            clear_screen()
            result_lines = build_summary_to_lines(summary_data)
            render_screen(
                title="Build & Deploy",
                breadcrumb="OM-Ops › Build & Deploy › Results",
                body_lines=result_lines,
                footer_hint="[Enter] Back   [0] Main Menu   [q] Quit"
            )
            
            if CHANGELOG_AVAILABLE and result.get("status") == "SUCCESS":
                auto_append_backup_entry("build_deploy_server_frontend_auto", "server_frontend", [])
            
            wait_for_enter()
        elif choice == "3":
            # Build Ops Hub
            clear_screen()
            run_dir = create_build_run_dir()
            git_safe, git_info = check_git_safety()
            if git_safe and git_info.get("is_dirty"):
                modified_count = git_info.get("modified_count", 0)
                body_lines = [
                    "",
                    "⚠️  WARNING: Repository is dirty",
                    "",
                    f"Branch: {git_info.get('current_branch')}",
                    f"HEAD: {git_info.get('head_sha')}",
                    f"Modified files: {modified_count}",
                    "",
                    "Building with uncommitted changes is risky.",
                ]
                render_screen(
                    title="Build & Deploy",
                    breadcrumb="OM-Ops › Build & Deploy › Dirty Repo Warning",
                    body_lines=body_lines,
                    footer_hint="[Enter] Continue   [0] Cancel   [q] Quit"
                )
                if not require_confirmation("Continue with build despite dirty repo?"):
                    clear_screen()
                    render_screen(
                        title="Build & Deploy",
                        breadcrumb="OM-Ops › Build & Deploy › Cancelled",
                        body_lines=["", "Build cancelled.", ""],
                        footer_hint="[Enter] Back   [0] Main Menu   [q] Quit"
                    )
                    wait_for_enter()
                    continue
            
            # Show build progress
            clear_screen()
            render_screen(
                title="Build & Deploy",
                breadcrumb="OM-Ops › Build & Deploy › Building Ops Hub",
                body_lines=["", "Building ops hub...", "", "This may take a few minutes.", ""],
                footer_hint="Please wait..."
            )
            
            result = build_ops_hub_with_logging(run_dir, dry_run=False)
            
            summary_data = {
                "stages": [result],
                "run_dir": str(run_dir),
                "git_info": f"Branch: {git_info.get('current_branch', 'unknown')}, HEAD: {git_info.get('head_sha', 'unknown')}" if git_safe else "Git check failed",
                "total_duration": result.get("duration", 0),
                "success": result.get("status") == "SUCCESS",
            }
            
            # Display results
            clear_screen()
            result_lines = build_summary_to_lines(summary_data)
            render_screen(
                title="Build & Deploy",
                breadcrumb="OM-Ops › Build & Deploy › Results",
                body_lines=result_lines,
                footer_hint="[Enter] Back   [0] Main Menu   [q] Quit"
            )
            
            if CHANGELOG_AVAILABLE and result.get("status") == "SUCCESS":
                auto_append_backup_entry("build_deploy_ops_hub", "ops_hub", [])
            
            wait_for_enter()
        elif choice == "4":
            # Build ALL
            clear_screen()
            ticket_id, should_proceed = prompt_for_ticket_build("Build ALL", ui_screen=True if UI_SCREEN_AVAILABLE else None)
            if not should_proceed:
                clear_screen()
                render_screen(
                    title="Build & Deploy",
                    breadcrumb="OM-Ops › Build & Deploy › Cancelled",
                    body_lines=["", "Build cancelled.", ""],
                    footer_hint="[Enter] Back   [0] Main Menu   [q] Quit"
                )
                wait_for_enter()
                continue
            
            # Show build progress
            clear_screen()
            render_screen(
                title="Build & Deploy",
                breadcrumb="OM-Ops › Build & Deploy › Building ALL",
                body_lines=["", "Building all components...", "", "This may take several minutes.", ""],
                footer_hint="Please wait..."
            )
            
            results = build_all_safe_order(dry_run=False)
            if "error" in results:
                clear_screen()
                render_screen(
                    title="Build & Deploy",
                    breadcrumb="OM-Ops › Build & Deploy › Error",
                    body_lines=["", f"❌ Error: {results['error']}", ""],
                    footer_hint="[Enter] Back   [0] Main Menu   [q] Quit"
                )
                wait_for_enter()
            else:
                # Add ticket info to results
                if ticket_id:
                    results["freescout_ticket_id"] = ticket_id
                    results["freescout_ticket_url"] = freescout_get_ticket_url(ticket_id) if freescout_get_ticket_url else None
                    # Also update run.json if it exists
                    run_dir = Path(results.get("run_dir", ""))
                    if run_dir.exists():
                        run_json_path = run_dir / "run.json"
                        if run_json_path.exists():
                            try:
                                with open(run_json_path, "r") as f:
                                    run_data = json.load(f)
                                run_data["freescout_ticket"] = {
                                    "ticket_id": ticket_id,
                                    "action": "Build ALL",
                                    "timestamp": datetime.datetime.now().isoformat(),
                                    "ticket_url": freescout_get_ticket_url(ticket_id) if freescout_get_ticket_url else None
                                }
                                with open(run_json_path, "w") as f:
                                    json.dump(run_data, f, indent=2)
                            except:
                                pass
                
                # Display results
                clear_screen()
                result_lines = build_summary_to_lines(results)
                render_screen(
                    title="Build & Deploy",
                    breadcrumb="OM-Ops › Build & Deploy › Results",
                    body_lines=result_lines,
                    footer_hint="[Enter] Back   [0] Main Menu   [q] Quit"
                )
                
                if CHANGELOG_AVAILABLE and results.get("success"):
                    auto_append_backup_entry("build_deploy_all", "all", [])
                
                wait_for_enter()
        elif choice == "5":
            # Dry Run
            clear_screen()
            render_screen(
                title="Build & Deploy",
                breadcrumb="OM-Ops › Build & Deploy › Dry Run",
                body_lines=["", "=== DRY RUN MODE ===", "", "Showing commands that would be executed...", ""],
                footer_hint="Please wait..."
            )
            
            results = build_all_safe_order(dry_run=True)
            
            clear_screen()
            result_lines = build_summary_to_lines(results)
            render_screen(
                title="Build & Deploy",
                breadcrumb="OM-Ops › Build & Deploy › Dry Run Results",
                body_lines=result_lines,
                footer_hint="[Enter] Back   [0] Main Menu   [q] Quit"
            )
            wait_for_enter()
        else:
            clear_screen()
            render_screen(
                title="Build & Deploy",
                breadcrumb="OM-Ops › Build & Deploy",
                body_lines=["", "Invalid option.", ""],
                footer_hint="[Enter] Back   [0] Main Menu   [q] Quit"
            )
            wait_for_enter()


# Import changelog auto-append if available
try:
    script_dir = Path(__file__).parent
    if str(script_dir) not in sys.path:
        sys.path.insert(0, str(script_dir))
    from changelog import auto_append_backup_entry
    CHANGELOG_AVAILABLE = True
except ImportError:
    def auto_append_backup_entry(action, scope, paths):
        pass
    CHANGELOG_AVAILABLE = False


def get_recent_backend_errors(lines: int = 200) -> Dict:
    """Show top recent backend errors from PM2 logs."""
    log_ops(f"Extracting recent backend errors (last {lines} lines)")
    
    success, log_output = pm2_logs(lines, follow=False)
    if not success:
        return {"error": "Failed to get PM2 logs"}
    
    error_signatures = {
        "MODULE_NOT_FOUND": [],
        "SyntaxError": [],
        "ER_BAD_FIELD_ERROR": [],
        "500": [],
        "Error:": [],
    }
    
    log_lines = log_output.split("\n")
    
    for line in log_lines:
        line_upper = line.upper()
        if "MODULE_NOT_FOUND" in line_upper:
            error_signatures["MODULE_NOT_FOUND"].append(line[:200])
        if "SYNTAXERROR" in line_upper:
            error_signatures["SyntaxError"].append(line[:200])
        if "ER_BAD_FIELD_ERROR" in line_upper or "BAD_FIELD" in line_upper:
            error_signatures["ER_BAD_FIELD_ERROR"].append(line[:200])
        if " 500 " in line or "HTTP/1.1 500" in line:
            error_signatures["500"].append(line[:200])
        if "Error:" in line and len(error_signatures["Error:"]) < 20:
            error_signatures["Error:"].append(line[:200])
    
    # Count totals
    counts = {key: len(values) for key, values in error_signatures.items()}
    
    return {
        "counts": counts,
        "samples": {key: values[:5] for key, values in error_signatures.items() if values},
    }
