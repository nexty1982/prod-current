#!/usr/bin/env python3
"""
OM-Ops - Operations Suite for OrthodoxMetrics
Comprehensive operations management: PM2, Git, Backups, Analysis, Changelog, System Summary, Motivation, Roadmap.
Provides safe, repeatable, idempotent operations workflows.
"""

import os
import sys
import json
import subprocess
import shutil
import tarfile
import gzip
import hashlib
import time
import datetime
import argparse
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from collections import defaultdict

# Import analysis module
try:
    # Add current directory to path for imports
    script_dir = Path(__file__).parent
    if str(script_dir) not in sys.path:
        sys.path.insert(0, str(script_dir))
    
    from analysis import (
        run_analysis, prune_old_runs, REPORT_FILE, ANALYSIS_ROOT,
        ensure_analysis_dirs
    )
    ANALYSIS_AVAILABLE = True
except ImportError as e:
    ANALYSIS_AVAILABLE = False
    # Don't print warning in non-interactive mode or if it's expected
    if "--analyze" not in sys.argv:
        pass  # Silent fail - analysis just won't be available

# Import changelog module
try:
    from changelog import (
        start_session, add_entry, close_session, list_sessions,
        generate_html_report as generate_changelog_report,
        REPORT_FILE as CHANGELOG_REPORT_FILE,
        auto_append_backup_entry, get_active_session,
        prune_sessions as prune_changelog_sessions
    )
    CHANGELOG_AVAILABLE = True
except ImportError:
    CHANGELOG_AVAILABLE = False

# Import new OM-Ops modules
try:
    from pm2_ops import (
        pm2_setup, pm2_status, pm2_restart, pm2_start, pm2_stop,
        pm2_logs, pm2_reset_restarts, pm2_show_env
    )
    PM2_OPS_AVAILABLE = True
except ImportError:
    PM2_OPS_AVAILABLE = False

try:
    from git_ops import (
        git_status, git_create_checkpoint_branch, git_commit_all,
        git_push_branch, git_push_daily_summary, git_last_commits
    )
    GIT_OPS_AVAILABLE = True
except ImportError:
    GIT_OPS_AVAILABLE = False

try:
    from system_summary import generate_summary as generate_system_summary, REPORT_FILE as SYSTEM_SUMMARY_REPORT
    SYSTEM_SUMMARY_AVAILABLE = True
except ImportError:
    SYSTEM_SUMMARY_AVAILABLE = False

try:
    from motivation import generate_motivation, REPORT_FILE as MOTIVATION_REPORT
    MOTIVATION_AVAILABLE = True
except ImportError:
    MOTIVATION_AVAILABLE = False

try:
    from roadmap import (
        load_roadmap, add_milestone, update_milestone, mark_milestone_complete,
        generate_roadmap_html, REPORT_FILE as ROADMAP_REPORT
    )
    ROADMAP_AVAILABLE = True
except ImportError:
    ROADMAP_AVAILABLE = False

# Import new OM-Ops modules
try:
    from nginx_ops import (
        nginx_status, nginx_validate_config, find_orthodoxmetrics_site_config,
        parse_proxy_settings, generate_safe_proxy_baseline, apply_proxy_baseline,
        nginx_tail_logs, NGINX_ERROR_LOG
    )
    NGINX_OPS_AVAILABLE = True
except ImportError:
    NGINX_OPS_AVAILABLE = False

try:
    from uploads_ops import (
        check_upload_dirs, fix_missing_dirs, upload_endpoint_smoke_test,
        get_configured_paths
    )
    UPLOADS_OPS_AVAILABLE = True
except ImportError:
    UPLOADS_OPS_AVAILABLE = False

try:
    from build_ops import (
        get_build_state, verify_backend_dist_integrity,
        backend_rebuild, build_server_and_frontend, frontend_rebuild,
        get_recent_backend_errors,
        show_build_deploy_menu, handle_build_deploy_submenu
    )
    BUILD_OPS_AVAILABLE = True
except ImportError as e:
    BUILD_OPS_AVAILABLE = False
    show_build_deploy_menu = None
    handle_build_deploy_submenu = None
    # Log import error for debugging
    import sys
    print(f"Warning: Build ops module import failed: {e}", file=sys.stderr)

# Import exclusions module
try:
    from exclusions import (
        handle_exclusions_submenu, EXCLUSIONS_FILE, bootstrap_exclusions, load_exclusions,
        view_exclusions, apply_preset, auto_detect_candidates, apply_auto_detected_recommended,
        add_exclusion, remove_exclusion, reset_exclusions, format_size
    )
    EXCLUSIONS_AVAILABLE = True
except ImportError:
    EXCLUSIONS_AVAILABLE = False
    handle_exclusions_submenu = None
    EXCLUSIONS_FILE = None
    bootstrap_exclusions = None
    load_exclusions = None
    view_exclusions = None
    apply_preset = None
    auto_detect_candidates = None
    apply_auto_detected_recommended = None
    add_exclusion = None
    remove_exclusion = None
    reset_exclusions = None
    format_size = None

# Import UI screen renderer
try:
    from ui_screen import render_screen, get_user_input, wait_for_enter, clear_screen
    UI_SCREEN_AVAILABLE = True
except ImportError:
    UI_SCREEN_AVAILABLE = False
    def render_screen(*args, **kwargs):
        pass
    def get_user_input(prompt="Select option: "):
        return input(prompt).strip()
    def wait_for_enter(message="Press Enter to continue..."):
        input(message)
    def clear_screen():
        os.system("clear" if os.name != "nt" else "cls")

# Import OMAI discovery (read-only)
try:
    from omai_discovery import run_discovery, DISCOVERY_REPORT
    OMAI_DISCOVERY_AVAILABLE = True
except ImportError:
    OMAI_DISCOVERY_AVAILABLE = False
    DISCOVERY_REPORT = None

# Import Zammad operations
try:
    # Add parent directory to path for om_ops import
    script_dir = Path(__file__).parent
    om_ops_dir = script_dir.parent / "om_ops"
    if str(om_ops_dir) not in sys.path:
        sys.path.insert(0, str(om_ops_dir))
    from zammad_ops import zammad_connectivity_check, zammad_status, zammad_health_check, check_zammad_config
    ZAMMAD_OPS_AVAILABLE = True
except ImportError as e:
    ZAMMAD_OPS_AVAILABLE = False
    zammad_connectivity_check = None
    zammad_status = None
    zammad_health_check = None
    check_zammad_config = None

# Import FreeScout operations
try:
    # Add parent directory to path for om_ops import
    script_dir = Path(__file__).parent
    om_ops_dir = script_dir.parent / "om_ops"
    if str(om_ops_dir) not in sys.path:
        sys.path.insert(0, str(om_ops_dir))
    from freescout_client import (
        check_connectivity as freescout_check_connectivity,
        validate_ticket as freescout_validate_ticket,
        get_ticket_url as freescout_get_ticket_url,
        post_ticket_note as freescout_post_note,
        get_api_key as freescout_get_api_key,
        REQUIRE_TICKET as FREESCOUT_REQUIRE_TICKET
    )
    FREESCOUT_OPS_AVAILABLE = True
except ImportError as e:
    FREESCOUT_OPS_AVAILABLE = False
    freescout_check_connectivity = None
    freescout_validate_ticket = None
    freescout_get_ticket_url = None
    freescout_post_note = None
    freescout_get_api_key = None
    FREESCOUT_REQUIRE_TICKET = False

# Import server status
try:
    script_dir = Path(__file__).parent
    if str(script_dir) not in sys.path:
        sys.path.insert(0, str(script_dir))
    from server_status import run_server_status_menu
    SERVER_STATUS_AVAILABLE = True
except ImportError as e:
    SERVER_STATUS_AVAILABLE = False
    run_server_status_menu = None

# Configuration
REPO_ROOT = Path("/var/www/orthodoxmetrics/prod")
BACKUP_ROOT = Path("/var/backups/OM")
LOG_FILE = BACKUP_ROOT / "om-recovery.log"
OPS_LOG = BACKUP_ROOT / "om-ops.log"
DRY_RUN = False

# Backup categories configuration
BACKUP_CONFIG = {
    "prod": {
        "source": REPO_ROOT,
        "exclude_patterns": [
            "node_modules/",
            "dist/",
            "build/",
            ".vite/",
            ".cache/",
            ".tmp/",
            "logs/",
            "*.log",
            ".git/",
            "_cursor_session_backup/",
            ".venv*",
            ".venv_image",
            ".env*",  # Exclude all .env files from prod backup
        ],
        "description": "Full filesystem (prod) [sanitized]"
    },
    "server": {
        "source": REPO_ROOT / "server",
        "exclude_patterns": [
            "node_modules/",
            "dist/",
            "build/",
            ".vite/",
            ".cache/",
            ".tmp/",
            "logs/",
            "*.log",
            ".git/",
            "_cursor_session_backup/",
            ".venv*",
            ".venv_image",
            ".env*",
        ],
        "description": "Server-only code"
    },
    "front-end": {
        "source": REPO_ROOT / "front-end",
        "exclude_patterns": [
            "node_modules/",
            "dist/",
            "build/",
            ".vite/",
            ".cache/",
            ".tmp/",
            "logs/",
            "*.log",
            ".git/",
            "_cursor_session_backup/",
            ".venv*",
            ".venv_image",
        ],
        "description": "Front-end-only code"
    },
    "images": {
        "source": REPO_ROOT / "front-end" / "public" / "images",
        "exclude_patterns": [],
        "description": "Images (curated images folder)"
    },
    "nginx": {
        "source": Path("/etc/nginx"),
        "exclude_patterns": [],
        "include_patterns": ["nginx.conf", "sites-available/", "sites-enabled/"],
        "description": "Nginx config"
    },
    "config": {
        "source": None,  # Special handling
        "description": "Config files (.env mappings, non-secret config, service configs)"
    },
    "database": {
        "source": None,  # Special handling
        "description": "Database (MySQL dumps)"
    }
}

# ANSI color codes for terminal output
class Colors:
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKCYAN = '\033[96m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'


def log(message: str, level: str = "INFO"):
    """Write to log file with timestamp."""
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    log_entry = f"[{timestamp}] [{level}] {message}\n"
    try:
        # Ensure log directory exists
        LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.write(log_entry)
    except Exception as e:
        print(f"{Colors.FAIL}Failed to write to log: {e}{Colors.ENDC}", file=sys.stderr)


def log_ops(message: str, level: str = "INFO"):
    """Write to om-ops.log with timestamp."""
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    log_entry = f"[{timestamp}] [{level}] {message}\n"
    try:
        OPS_LOG.parent.mkdir(parents=True, exist_ok=True)
        with open(OPS_LOG, "a", encoding="utf-8") as f:
            f.write(log_entry)
    except Exception as e:
        print(f"{Colors.FAIL}Failed to write to ops log: {e}{Colors.ENDC}", file=sys.stderr)


def print_colored(message: str, color: str = Colors.ENDC):
    """Print colored message and log it."""
    print(f"{color}{message}{Colors.ENDC}")
    log(message)


def check_root(required: bool = True):
    """Verify script is running as root (if required)."""
    if required and os.geteuid() != 0:
        print_colored("ERROR: This operation requires root privileges. Run with sudo.", Colors.FAIL)
        return False
    return True


def check_capabilities() -> Dict:
    """Check availability of required tools."""
    try:
        from utils import run_cmd
    except ImportError:
        # Fallback if utils not available
        def run_cmd(cmd, timeout=5, redact=False):
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
            return result.returncode, result.stdout, result.stderr
    
    capabilities = {
        "pm2": False,
        "nginx": False,
        "systemctl": False,
        "mysql": False,
        "mysqldump": False,
        "node": False,
        "npm": False,
    }
    
    # Check each tool
    tools_to_check = {
        "pm2": ["pm2", "--version"],
        "nginx": ["nginx", "-v"],
        "systemctl": ["systemctl", "--version"],
        "mysql": ["mysql", "--version"],
        "mysqldump": ["mysqldump", "--version"],
        "node": ["node", "--version"],
        "npm": ["npm", "--version"],
    }
    
    for tool, cmd in tools_to_check.items():
        try:
            exit_code, _, _ = run_cmd(cmd, timeout=5, redact=False)
            capabilities[tool] = exit_code == 0
        except Exception:
            capabilities[tool] = False
    
    return capabilities


def ensure_directories():
    """Ensure all backup directories exist."""
    for category in BACKUP_CONFIG.keys():
        backup_dir = BACKUP_ROOT / category
        if not DRY_RUN:
            backup_dir.mkdir(parents=True, exist_ok=True)
        log(f"Ensured directory exists: {backup_dir}")


def get_timestamp() -> str:
    """Generate timestamp string for backup filenames."""
    return datetime.datetime.now().strftime("%Y-%m-%d_%H%M")


def should_exclude(path: Path, exclude_patterns: List[str]) -> bool:
    """Check if a path should be excluded based on patterns."""
    path_str = str(path)
    for pattern in exclude_patterns:
        # Handle directory patterns ending with /
        if pattern.endswith("/"):
            if pattern.rstrip("/") in path_str.split(os.sep):
                return True
        # Handle file patterns
        elif pattern.startswith("*"):
            if path.name.endswith(pattern[1:]):
                return True
        # Exact match
        elif pattern in path_str:
            return True
    return False


def create_tarball(source: Path, output_path: Path, exclude_patterns: List[str],
                   include_patterns: Optional[List[str]] = None) -> Tuple[bool, str, int]:
    """Create a compressed tarball with exclusions."""
    if not source.exists():
        return False, f"Source path does not exist: {source}", 0
    
    if DRY_RUN:
        print_colored(f"[DRY RUN] Would create: {output_path}", Colors.WARNING)
        # Count files that would be included
        count = 0
        if include_patterns:
            # For nginx, count files in included patterns
            for pattern in include_patterns:
                pattern_path = source / pattern.rstrip("/")
                if pattern_path.exists():
                    if pattern_path.is_file():
                        count += 1
                    else:
                        for root, dirs, files in os.walk(pattern_path):
                            count += len(files)
        else:
            for root, dirs, files in os.walk(source):
                root_path = Path(root)
                # Filter dirs to exclude
                dirs[:] = [d for d in dirs if not should_exclude(root_path / d, exclude_patterns)]
                for file in files:
                    file_path = root_path / file
                    if not should_exclude(file_path, exclude_patterns):
                        count += 1
        return True, f"[DRY RUN] Would include {count} files", 0
    
    try:
        with tarfile.open(output_path, "w:gz") as tar:
            if include_patterns:
                # For nginx, only include specific paths, preserve structure
                for pattern in include_patterns:
                    pattern_path = source / pattern.rstrip("/")
                    if pattern_path.exists():
                        # Preserve the relative path structure
                        arcname = pattern_path.relative_to(source.parent if source.is_file() else source)
                        tar.add(pattern_path, arcname=str(arcname), recursive=True)
            else:
                # Standard recursive add with exclusions
                for root, dirs, files in os.walk(source):
                    root_path = Path(root)
                    # Filter dirs to exclude (modify in-place)
                    dirs[:] = [d for d in dirs if not should_exclude(root_path / d, exclude_patterns)]
                    
                    for file in files:
                        file_path = root_path / file
                        if not should_exclude(file_path, exclude_patterns):
                            arcname = file_path.relative_to(source.parent if source.is_file() else source)
                            tar.add(file_path, arcname=str(arcname))
        
        size = output_path.stat().st_size
        return True, f"Created tarball: {output_path}", size
    except Exception as e:
        return False, f"Failed to create tarball: {e}", 0


def redact_env_file(env_path: Path) -> str:
    """Read .env file and return redacted version (keys only, no values)."""
    if not env_path.exists():
        return ""
    
    redacted_lines = []
    redacted_lines.append(f"# Redacted template from {env_path.name}\n")
    redacted_lines.append(f"# Generated: {datetime.datetime.now().isoformat()}\n")
    redacted_lines.append("# Original values are NOT included for security.\n\n")
    
    try:
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#"):
                    redacted_lines.append(line + "\n")
                elif "=" in line:
                    key = line.split("=", 1)[0].strip()
                    redacted_lines.append(f"{key}=<REDACTED>\n")
                else:
                    redacted_lines.append(line + "\n")
    except Exception as e:
        log(f"Error reading env file {env_path}: {e}", "ERROR")
        return f"# Error reading file: {e}\n"
    
    return "".join(redacted_lines)


def backup_config() -> Tuple[bool, str, Path, int]:
    """Backup configuration files (redacted)."""
    timestamp = get_timestamp()
    output_dir = BACKUP_ROOT / "config"
    output_path = output_dir / f"config-{timestamp}.tar.gz"
    
    if DRY_RUN:
        print_colored(f"[DRY RUN] Would create config backup: {output_path}", Colors.WARNING)
        return True, "[DRY RUN] Config backup", output_path, 0
    
    try:
        # Create temporary directory for config files
        import tempfile
        with tempfile.TemporaryDirectory() as tmpdir:
            tmp_path = Path(tmpdir)
            
            # Backup nginx configs
            nginx_conf = Path("/etc/nginx/nginx.conf")
            if nginx_conf.exists():
                shutil.copy2(nginx_conf, tmp_path / "nginx.conf")
            
            nginx_sites_avail = Path("/etc/nginx/sites-available")
            if nginx_sites_avail.exists():
                shutil.copytree(nginx_sites_avail, tmp_path / "sites-available", dirs_exist_ok=True)
            
            nginx_sites_enabled = Path("/etc/nginx/sites-enabled")
            if nginx_sites_enabled.exists():
                shutil.copytree(nginx_sites_enabled, tmp_path / "sites-enabled", dirs_exist_ok=True)
            
            # Backup systemd/pm2 configs
            pm2_service = Path("/etc/systemd/system/pm2-root.service")
            if pm2_service.exists():
                shutil.copy2(pm2_service, tmp_path / "pm2-root.service")
            
            # Look for pm2 ecosystem file
            ecosystem_files = [
                REPO_ROOT / "ecosystem.config.js",
                REPO_ROOT / "ecosystem.config.cjs",
                REPO_ROOT / "pm2.config.js",
            ]
            for eco_file in ecosystem_files:
                if eco_file.exists():
                    shutil.copy2(eco_file, tmp_path / eco_file.name)
            
            # Redacted .env files
            env_files = [
                REPO_ROOT / "server" / ".env.production",
                REPO_ROOT / ".env.production",
            ]
            for env_file in env_files:
                if env_file.exists():
                    redacted = redact_env_file(env_file)
                    redacted_path = tmp_path / f"{env_file.name}.redacted"
                    with open(redacted_path, "w", encoding="utf-8") as f:
                        f.write(redacted)
            
            # Create tarball
            with tarfile.open(output_path, "w:gz") as tar:
                tar.add(tmp_path, arcname=".", recursive=True)
        
        size = output_path.stat().st_size
        return True, f"Created config backup: {output_path}", output_path, size
    except Exception as e:
        return False, f"Failed to backup config: {e}", output_path, 0


def get_db_credentials() -> Dict[str, str]:
    """Extract database credentials from env files (not stored in output)."""
    credentials = {}
    env_files = [
        REPO_ROOT / "server" / ".env.production",
        REPO_ROOT / ".env.production",
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
            except Exception as e:
                log(f"Error reading {env_file}: {e}", "WARNING")
    
    # Set defaults
    credentials.setdefault("host", "localhost")
    credentials.setdefault("port", "3306")
    credentials.setdefault("user", "root")
    credentials.setdefault("database", "orthodoxmetrics_db")
    credentials.setdefault("auth_database", "orthodoxmetrics_auth_db")
    
    return credentials


def backup_database() -> Tuple[bool, str, Path, int]:
    """Backup MySQL databases."""
    timestamp = get_timestamp()
    output_dir = BACKUP_ROOT / "database"
    output_path = output_dir / f"db-{timestamp}.tar.gz"
    
    credentials = get_db_credentials()
    
    if DRY_RUN:
        print_colored(f"[DRY RUN] Would create database backup: {output_path}", Colors.WARNING)
        print_colored(f"[DRY RUN] Would backup databases: {credentials.get('database')}, {credentials.get('auth_database')}", Colors.WARNING)
        return True, "[DRY RUN] Database backup", output_path, 0
    
    try:
        import tempfile
        with tempfile.TemporaryDirectory() as tmpdir:
            tmp_path = Path(tmpdir)
            
            databases = [credentials["database"]]
            if credentials.get("auth_database"):
                databases.append(credentials["auth_database"])
            
            dump_files = []
            
            for db_name in databases:
                dump_file = tmp_path / f"{db_name}.sql"
                dump_file_gz = tmp_path / f"{db_name}.sql.gz"
                
                # Build mysqldump command
                cmd = [
                    "mysqldump",
                    "--single-transaction",
                    "--routines",
                    "--events",
                    "--host", credentials["host"],
                    "--port", credentials["port"],
                    "--user", credentials["user"],
                    db_name
                ]
                
                # Set password via environment (not command line)
                env = os.environ.copy()
                if credentials.get("password"):
                    env["MYSQL_PWD"] = credentials["password"]
                
                log(f"Running mysqldump for {db_name} (host: {credentials['host']})")
                
                # Run mysqldump and compress
                with open(dump_file, "wb") as f:
                    result = subprocess.run(
                        cmd,
                        stdout=f,
                        stderr=subprocess.PIPE,
                        env=env,
                        check=False
                    )
                    
                    if result.returncode != 0:
                        error_msg = result.stderr.decode("utf-8", errors="ignore")
                        log(f"mysqldump failed for {db_name}: {error_msg}", "ERROR")
                        # Continue with other databases
                        continue
                
                # Compress SQL file
                with open(dump_file, "rb") as f_in:
                    with gzip.open(dump_file_gz, "wb") as f_out:
                        shutil.copyfileobj(f_in, f_out)
                
                dump_files.append(dump_file_gz)
                dump_file.unlink()  # Remove uncompressed file
            
            # Create metadata
            meta = {
                "category": "database",
                "created_at": datetime.datetime.now().isoformat(),
                "hostname": os.uname().nodename,
                "databases": databases,
                "dump_command": "mysqldump --single-transaction --routines --events",
                "host": credentials["host"],
                "port": credentials["port"],
                "user": "<REDACTED>",
            }
            
            meta_file = tmp_path / "meta.json"
            with open(meta_file, "w", encoding="utf-8") as f:
                json.dump(meta, f, indent=2)
            
            # Create tarball
            with tarfile.open(output_path, "w:gz") as tar:
                for dump_file in dump_files:
                    if dump_file.exists():
                        tar.add(dump_file, arcname=dump_file.name)
                tar.add(meta_file, arcname="meta.json")
            
            size = output_path.stat().st_size
            return True, f"Created database backup: {output_path}", output_path, size
    except Exception as e:
        return False, f"Failed to backup database: {e}", output_path, 0


def calculate_sha256(file_path: Path) -> str:
    """Calculate SHA256 hash of a file."""
    sha256_hash = hashlib.sha256()
    try:
        with open(file_path, "rb") as f:
            for byte_block in iter(lambda: f.read(4096), b""):
                sha256_hash.update(byte_block)
        return sha256_hash.hexdigest()
    except Exception as e:
        log(f"Error calculating SHA256 for {file_path}: {e}", "ERROR")
        return ""


def create_metadata(category: str, output_path: Path, source_paths: List[Path],
                   exclude_patterns: List[str], size_bytes: int) -> Path:
    """Create metadata JSON file for a backup."""
    metadata = {
        "category": category,
        "created_at": datetime.datetime.now().isoformat(),
        "hostname": os.uname().nodename,
        "paths_included": [str(p) for p in source_paths],
        "paths_excluded": exclude_patterns,
        "size_bytes": size_bytes,
        "sha256": calculate_sha256(output_path) if output_path.exists() else ""
    }
    
    meta_path = output_path.with_suffix(".json")
    if not DRY_RUN:
        with open(meta_path, "w", encoding="utf-8") as f:
            json.dump(metadata, f, indent=2)
    
    return meta_path


def backup_category(category: str) -> Tuple[bool, str, Path, int]:
    """Backup a specific category."""
    config = BACKUP_CONFIG[category]
    
    if category == "config":
        return backup_config()
    elif category == "database":
        return backup_database()
    
    source = config["source"]
    exclude_patterns = config.get("exclude_patterns", [])
    include_patterns = config.get("include_patterns")
    
    timestamp = get_timestamp()
    output_dir = BACKUP_ROOT / category
    output_path = output_dir / f"{category}-{timestamp}.tar.gz"
    
    success, message, size = create_tarball(source, output_path, exclude_patterns, include_patterns)
    
    if success and not DRY_RUN:
        create_metadata(category, output_path, [source], exclude_patterns, size)
    
    return success, message, output_path, size


def format_size(size_bytes: int) -> str:
    """Format bytes to human-readable size."""
    for unit in ["B", "KB", "MB", "GB"]:
        if size_bytes < 1024.0:
            return f"{size_bytes:.2f} {unit}"
        size_bytes /= 1024.0
    return f"{size_bytes:.2f} TB"


def verify_backups():
    """Verify the latest backups in each category."""
    print_colored("\n=== Verifying Latest Backups ===\n", Colors.HEADER)
    
    results = []
    
    for category in BACKUP_CONFIG.keys():
        backup_dir = BACKUP_ROOT / category
        if not backup_dir.exists():
            results.append((category, None, "NO BACKUPS FOUND", False))
            continue
        
        # Find most recent backup file
        backup_files = list(backup_dir.glob(f"{category}-*.tar.gz"))
        if not backup_files:
            backup_files = list(backup_dir.glob("db-*.tar.gz"))  # For database
        
        if not backup_files:
            results.append((category, None, "NO BACKUPS FOUND", False))
            continue
        
        latest = max(backup_files, key=lambda p: p.stat().st_mtime)
        size = latest.stat().st_size
        mtime = datetime.datetime.fromtimestamp(latest.stat().st_mtime)
        
        # Verify tarball integrity
        try:
            with tarfile.open(latest, "r:gz") as tar:
                tar.getmembers()  # This will raise if corrupted
            integrity = "PASS"
            success = True
        except Exception as e:
            integrity = f"FAIL: {e}"
            success = False
        
        results.append((category, latest, integrity, success, size, mtime))
    
    # Print results table
    print_colored(f"{'Category':<15} {'File':<50} {'Size':<12} {'Created':<20} {'Integrity':<15}", Colors.BOLD)
    print_colored("-" * 120, Colors.ENDC)
    
    for result in results:
        if len(result) == 4:  # No backup found
            category, _, status, success = result
            color = Colors.FAIL if not success else Colors.WARNING
            print_colored(f"{category:<15} {'N/A':<50} {'N/A':<12} {'N/A':<20} {status:<15}", color)
        else:
            category, file_path, integrity, success, size, mtime = result
            color = Colors.OKGREEN if success else Colors.FAIL
            file_name = file_path.name if len(file_path.name) <= 47 else "..." + file_path.name[-44:]
            print_colored(
                f"{category:<15} {file_name:<50} {format_size(size):<12} {mtime.strftime('%Y-%m-%d %H:%M'):<20} {integrity:<15}",
                color
            )
    
    print()


def show_main_menu():
    """
    Display the top-level OM-Ops menu.
    
    STABLE: Menu structure and CLI handling are correct.
    Do not rework unless fixing a correctness bug.
    """
    menu_items = [
        ("1", "PM2 Operations", "pm2", False),  # TODO: Not implemented (just reloads menu)
        ("2", "Git Operations", "git", False),  # TODO: Not implemented (just reloads menu)
        ("3", "Backups", "backups", False),  # TODO: Not implemented (just reloads menu)
        ("4", "Analysis", "analysis", False),  # TODO: Not implemented (just reloads menu)
        ("5", "Changelog", "changelog", False),  # TODO: Not implemented (just reloads menu)
        ("6", "System Summary", "system_summary", SYSTEM_SUMMARY_AVAILABLE),  # ✓ Works
        ("7", "Motivation Summary", "motivation", MOTIVATION_AVAILABLE),  # ✓ Works
        ("8", "Roadmap & Milestones", "roadmap", False),  # TODO: Not implemented (just reloads menu)
        ("9", "Nginx Operations", "nginx", False),  # TODO: Not implemented (just reloads menu)
        ("10", "Uploads & Paths Health", "uploads", False),  # TODO: Not implemented (just reloads menu)
        ("11", "Build / Dist Integrity", "build", False),  # TODO: Not implemented (just reloads menu)
        ("12", "Check Capabilities", "capabilities", True),  # ✓ Works
        ("13", "OMAI Discovery (Quick)", "omai_quick", OMAI_DISCOVERY_AVAILABLE),  # ✓ Works if available
        ("14", "OMAI Discovery (Deep)", "omai_deep", OMAI_DISCOVERY_AVAILABLE),  # ✓ Works if available
        ("15", "Build & Deploy (Backend/Frontend/Ops)", "build_deploy", BUILD_OPS_AVAILABLE),  # ✓ Works if available
        ("16", "Hard Exclusions (OM-Ops Ignore Rules)", "exclusions", EXCLUSIONS_AVAILABLE),  # ✓ Works if available
        ("17", "Preflight Discovery", "preflight", True),  # ✓ Works
        ("18", "Zammad Health & Connectivity", "zammad", ZAMMAD_OPS_AVAILABLE),  # ✓ Works if available
        ("19", "FreeScout Connectivity Check", "freescout", FREESCOUT_OPS_AVAILABLE),  # ✓ Works if available
        ("20", "OM Instance Information", "instance_info", True),  # ✓ Works
        ("21", "Server Status", "server_status", SERVER_STATUS_AVAILABLE),  # ✓ Works if available
        ("0", "Exit", "exit", True),
    ]
    
    body_lines = []
    for num, desc, _, available in menu_items:
        ready_symbol = " ✓" if available else ""
        body_lines.append(f"  ({num}) {desc}{ready_symbol}")
    
    render_screen(
        title="OM-Ops - Operations Suite",
        breadcrumb="OM-Ops",
        body_lines=body_lines,
        footer_hint="[0] Exit   [q] Quit"
    )


def main_menu() -> str:
    """
    Main menu handler with return-based navigation.
    
    Returns:
        Navigation action: "exit", "pm2", "git", "backups", etc.
    """
    while True:
        show_main_menu()
        choice = get_user_input("Select option: ")
        
        if choice is None:  # EOF/KeyboardInterrupt
            return "exit"
        
        if choice == "0" or choice.lower() == "q":
            return "exit"
        elif choice == "1":
            return "pm2"
        elif choice == "2":
            return "git"
        elif choice == "3":
            return "backups"
        elif choice == "4":
            return "analysis"
        elif choice == "5":
            return "changelog"
        elif choice == "6":
            return "system_summary"
        elif choice == "7":
            return "motivation"
        elif choice == "8":
            return "roadmap"
        elif choice == "9":
            return "nginx"
        elif choice == "10":
            return "uploads"
        elif choice == "11":
            return "build"
        elif choice == "12":
            return "capabilities"
        elif choice == "13":
            return "omai_quick"
        elif choice == "14":
            return "omai_deep"
        elif choice == "15":
            return "build_deploy"
        elif choice == "16":
            return "exclusions"
        elif choice == "17":
            return "preflight"
        elif choice == "18":
            return "zammad"
        elif choice == "19":
            return "freescout"
        else:
            # Invalid choice - show error and redraw
            clear_screen()
            print("Invalid option. Please try again.")
            wait_for_enter()
            # Continue loop to redraw menu
            continue


def show_pm2_menu():
    """Display PM2 operations submenu."""
    print_colored("\n=== PM2 Operations ===\n", Colors.HEADER)
    
    menu_items = [
        ("1", "Setup / Re-setup PM2 for orthodox-backend", "pm2_setup", PM2_OPS_AVAILABLE),
        ("2", "PM2 Status", "pm2_status", PM2_OPS_AVAILABLE),
        ("3", "Restart orthodox-backend", "pm2_restart", PM2_OPS_AVAILABLE),
        ("4", "Start orthodox-backend", "pm2_start", PM2_OPS_AVAILABLE),
        ("5", "Stop orthodox-backend", "pm2_stop", PM2_OPS_AVAILABLE),
        ("6", "Tail logs (last N lines) + follow", "pm2_logs", PM2_OPS_AVAILABLE),
        ("7", "Reset restart count", "pm2_reset", PM2_OPS_AVAILABLE),
        ("8", "Show PM2 env (redacted)", "pm2_env", PM2_OPS_AVAILABLE),
        ("0", "Back to main menu", "back", True),
    ]
    
    for num, desc, _, available in menu_items:
        ready_symbol = " ✓" if available else ""
        print_colored(f"  ({num}) {desc}{ready_symbol}", Colors.OKCYAN)
    print()


def show_git_menu():
    """Display Git operations submenu."""
    print_colored("\n=== Git Operations ===\n", Colors.HEADER)
    
    menu_items = [
        ("1", "Show repo status", "git_status", GIT_OPS_AVAILABLE),
        ("2", "Create checkpoint branch", "git_checkpoint", GIT_OPS_AVAILABLE),
        ("3", "Commit all changes", "git_commit", GIT_OPS_AVAILABLE),
        ("4", "Push branch to origin", "git_push", GIT_OPS_AVAILABLE),
        ("5", "Push daily summary artifacts", "git_push_summary", GIT_OPS_AVAILABLE),
        ("6", "Show last 10 commits", "git_commits", GIT_OPS_AVAILABLE),
        ("0", "Back to main menu", "back", True),
    ]
    
    for num, desc, _, available in menu_items:
        ready_symbol = " ✓" if available else ""
        print_colored(f"  ({num}) {desc}{ready_symbol}", Colors.OKCYAN)
    print()


def show_backups_menu():
    """Display Backups submenu."""
    print_colored("\n=== Backups ===\n", Colors.HEADER)
    
    menu_items = [
        ("1", "Backup FULL filesystem (prod) [sanitized]", "backup_prod", True),
        ("2", "Backup server-only code", "backup_server", True),
        ("3", "Backup front-end-only code", "backup_frontend", True),
        ("4", "Backup images", "backup_images", True),
        ("5", "Backup nginx config", "backup_nginx", True),
        ("6", "Backup config files", "backup_config", True),
        ("7", "Backup database (MySQL)", "backup_database", True),
        ("8", "Run ALL backups", "backup_all", True),
        ("9", "Verify latest backups", "backup_verify", True),
        ("0", "Back to main menu", "back", True),
    ]
    
    for num, desc, _, available in menu_items:
        ready_symbol = " ✓" if available else ""
        print_colored(f"  ({num}) {desc}{ready_symbol}", Colors.OKCYAN)
    print()


def show_analysis_menu():
    """Display Analysis submenu."""
    if not ANALYSIS_AVAILABLE:
        print_colored("Analysis module not available.", Colors.FAIL)
        return
    
    print_colored("\n=== Analysis ===\n", Colors.HEADER)
    
    menu_items = [
        ("1", "Analyze PROD directory", "analyze_prod", ANALYSIS_AVAILABLE),
        ("2", "Analyze SERVER directory", "analyze_server", ANALYSIS_AVAILABLE),
        ("3", "Analyze FRONT-END directory", "analyze_frontend", ANALYSIS_AVAILABLE),
        ("4", "Analyze ENTIRE SITE", "analyze_entire", ANALYSIS_AVAILABLE),
        ("5", "Open latest HTML report", "analyze_report", ANALYSIS_AVAILABLE),
        ("6", "Prune old analysis runs", "analyze_prune", ANALYSIS_AVAILABLE),
        ("0", "Back to main menu", "back", True),
    ]
    
    for num, desc, _, available in menu_items:
        ready_symbol = " ✓" if available else ""
        print_colored(f"  ({num}) {desc}{ready_symbol}", Colors.OKCYAN)
    print()


def show_changelog_menu():
    """Display Changelog submenu."""
    if not CHANGELOG_AVAILABLE:
        print_colored("Changelog module not available.", Colors.FAIL)
        return
    
    print_colored("\n=== Changelog ===\n", Colors.HEADER)
    
    menu_items = [
        ("1", "Start new work session", "changelog_start", CHANGELOG_AVAILABLE),
        ("2", "Append entry to active session", "changelog_add", CHANGELOG_AVAILABLE),
        ("3", "Close active session", "changelog_close", CHANGELOG_AVAILABLE),
        ("4", "List sessions", "changelog_list", CHANGELOG_AVAILABLE),
        ("5", "Generate / refresh HTML report", "changelog_report", CHANGELOG_AVAILABLE),
        ("6", "Open latest report path", "changelog_show_report", CHANGELOG_AVAILABLE),
        ("7", "Prune old sessions", "changelog_prune", CHANGELOG_AVAILABLE),
        ("0", "Back to main menu", "back", True),
    ]
    
    for num, desc, _, available in menu_items:
        ready_symbol = " ✓" if available else ""
        print_colored(f"  ({num}) {desc}{ready_symbol}", Colors.OKCYAN)
    print()


def show_roadmap_menu():
    """Display Roadmap submenu."""
    if not ROADMAP_AVAILABLE:
        print_colored("Roadmap module not available.", Colors.FAIL)
        return
    
    print_colored("\n=== Roadmap & Milestones ===\n", Colors.HEADER)
    
    menu_items = [
        ("1", "View roadmap (print path + summary)", "roadmap_view", ROADMAP_AVAILABLE),
        ("2", "Add milestone", "roadmap_add", ROADMAP_AVAILABLE),
        ("3", "Update milestone", "roadmap_update", ROADMAP_AVAILABLE),
        ("4", "Mark milestone complete", "roadmap_complete", ROADMAP_AVAILABLE),
        ("5", "Generate roadmap HTML", "roadmap_html", ROADMAP_AVAILABLE),
        ("0", "Back to main menu", "back", True),
    ]
    
    for num, desc, _, available in menu_items:
        ready_symbol = " ✓" if available else ""
        print_colored(f"  ({num}) {desc}{ready_symbol}", Colors.OKCYAN)
    print()


def run_all_backups():
    """Run backups for all categories."""
    print_colored("\n=== Running ALL Backups ===\n", Colors.HEADER)
    
    categories = ["prod", "server", "front-end", "images", "nginx", "config", "database"]
    results = []
    
    for category in categories:
        print_colored(f"Backing up {category}...", Colors.OKBLUE)
        start_time = time.time()
        success, message, output_path, size = backup_category(category)
        duration = time.time() - start_time
        
        status = "SUCCESS" if success else "FAILED"
        color = Colors.OKGREEN if success else Colors.FAIL
        print_colored(f"  {status}: {message}", color)
        
        # Auto-append to changelog if active session exists
        if CHANGELOG_AVAILABLE and success and output_path:
            auto_append_backup_entry(
                operation_type="backup",
                scope=category,
                output_paths=[str(output_path)]
            )
        
        results.append({
            "category": category,
            "success": success,
            "file": str(output_path) if output_path else "N/A",
            "size": size,
            "duration": duration
        })
    
    # Print summary table
    print_colored("\n=== Backup Summary ===\n", Colors.HEADER)
    print_colored(f"{'Category':<15} {'Status':<10} {'Size':<12} {'Duration':<10} {'File':<40}", Colors.BOLD)
    print_colored("-" * 100, Colors.ENDC)
    
    for result in results:
        status_color = Colors.OKGREEN if result["success"] else Colors.FAIL
        status_text = "SUCCESS" if result["success"] else "FAILED"
        file_name = Path(result["file"]).name if result["file"] != "N/A" else "N/A"
        if len(file_name) > 37:
            file_name = "..." + file_name[-34:]
        
        print_colored(
            f"{result['category']:<15} {status_text:<10} {format_size(result['size']):<12} {result['duration']:.2f}s{'':<6} {file_name:<40}",
            status_color
        )
    
    print()


def run_analysis_menu(scope: str):
    """Run analysis for a specific scope."""
    if not ANALYSIS_AVAILABLE:
        print_colored("Analysis module not available.", Colors.FAIL)
        return
    
    # Map scope to paths and exclude patterns
    scope_configs = {
        "prod": {
            "root_paths": [REPO_ROOT],
            "exclude_patterns": BACKUP_CONFIG["prod"]["exclude_patterns"],
        },
        "server": {
            "root_paths": [REPO_ROOT / "server"],
            "exclude_patterns": BACKUP_CONFIG["server"]["exclude_patterns"],
        },
        "front-end": {
            "root_paths": [REPO_ROOT / "front-end"],
            "exclude_patterns": BACKUP_CONFIG["front-end"]["exclude_patterns"],
        },
        "entire": {
            "root_paths": [
                REPO_ROOT,
                Path("/etc/nginx"),
                Path("/etc/systemd/system"),  # Systemd service configs
            ],
            "exclude_patterns": BACKUP_CONFIG["prod"]["exclude_patterns"],
        },
    }
    
    config = scope_configs.get(scope)
    if not config:
        print_colored(f"Unknown scope: {scope}", Colors.FAIL)
        return
    
    ensure_analysis_dirs()
    
    try:
        result = run_analysis(
            scope_name=scope,
            root_paths=config["root_paths"],
            exclude_patterns=config["exclude_patterns"],
            dedupe_mode="quick",  # Default to quick
            max_hash_mb=20,
            stale_days=180,
            dry_run=DRY_RUN,
        )
        
        # Log to recovery log
        log(f"category=analysis scope={scope} duration={result['results']['duration_seconds']:.2f}s "
            f"total_files={result['results']['inventory']['total_files']} "
            f"total_bytes={result['results']['inventory']['total_bytes']}", "INFO")
        
        print_colored(f"\n✓ Analysis saved to: {result['run_dir']}", Colors.OKGREEN)
        print_colored(f"✓ HTML report: {result['report_file']}", Colors.OKGREEN)
        
        # Auto-append to changelog if active session exists
        if CHANGELOG_AVAILABLE and result.get('run_dir'):
            auto_append_backup_entry(
                operation_type="analysis",
                scope=scope,
                output_paths=[result['run_dir'], result['report_file']]
            )
        
    except Exception as e:
        print_colored(f"Analysis failed: {e}", Colors.FAIL)
        log(f"Analysis failed for scope {scope}: {e}", "ERROR")


def show_report_path():
    """Show the path to the latest HTML report."""
    if not ANALYSIS_AVAILABLE:
        print_colored("Analysis module not available.", Colors.FAIL)
        return
    
    report_path = REPORT_FILE
    if report_path.exists():
        print_colored(f"\nHTML Report Location:", Colors.HEADER)
        print_colored(f"  {report_path}", Colors.OKCYAN)
        print_colored(f"\nTo view:", Colors.HEADER)
        print_colored(f"  # On the server:", Colors.OKCYAN)
        print_colored(f"  cat {report_path}", Colors.ENDC)
        print_colored(f"\n  # Or copy to local machine and open in browser", Colors.ENDC)
        print_colored(f"  scp user@server:{report_path} ./report.html", Colors.ENDC)
        print_colored(f"  # Then open report.html in your browser", Colors.ENDC)
    else:
        print_colored("No HTML report found. Run an analysis first.", Colors.WARNING)


def prune_runs_interactive():
    """Interactive pruning of old analysis runs."""
    if not ANALYSIS_AVAILABLE:
        print_colored("Analysis module not available.", Colors.FAIL)
        return
    
    try:
        keep_n = input(f"{Colors.OKCYAN}Keep last N runs (default 10): {Colors.ENDC}").strip()
        keep_n = int(keep_n) if keep_n.isdigit() else 10
        prune_old_runs(keep_n)
        print_colored(f"Pruning complete. Kept last {keep_n} runs.", Colors.OKGREEN)
    except ValueError:
        print_colored("Invalid number.", Colors.FAIL)
    except Exception as e:
        print_colored(f"Pruning failed: {e}", Colors.FAIL)


def handle_changelog_start():
    """Handle starting a new changelog session."""
    if not CHANGELOG_AVAILABLE:
        print_colored("Changelog module not available.", Colors.FAIL)
        return
    
    try:
        title = input(f"{Colors.OKCYAN}Session title: {Colors.ENDC}").strip()
        if not title:
            print_colored("Title is required.", Colors.FAIL)
            return
        
        tags_input = input(f"{Colors.OKCYAN}Tags (comma-separated, optional): {Colors.ENDC}").strip()
        tags = [t.strip() for t in tags_input.split(",")] if tags_input else []
        
        scope_input = input(f"{Colors.OKCYAN}Scope (prod|server|front-end|mixed, default: mixed): {Colors.ENDC}").strip()
        scope = scope_input if scope_input in ["prod", "server", "front-end", "mixed"] else "mixed"
        
        start_session(title, tags, scope)
    except Exception as e:
        print_colored(f"Failed to start session: {e}", Colors.FAIL)


def handle_changelog_add():
    """Handle adding an entry to active session."""
    if not CHANGELOG_AVAILABLE:
        print_colored("Changelog module not available.", Colors.FAIL)
        return
    
    active = get_active_session()
    if not active:
        print_colored("No active session. Start a session first (option 20).", Colors.FAIL)
        return
    
    try:
        print_colored(f"\nActive session: {active['title']}", Colors.OKBLUE)
        entry_type = input(f"{Colors.OKCYAN}Entry type (prompt|followup|result|decision|command|note): {Colors.ENDC}").strip()
        if entry_type not in ["prompt", "followup", "result", "decision", "command", "note"]:
            entry_type = "note"
        
        actor = input(f"{Colors.OKCYAN}Actor (user|cursor|assistant|system, default: user): {Colors.ENDC}").strip()
        if actor not in ["user", "cursor", "assistant", "system"]:
            actor = "user"
        
        print_colored(f"{Colors.OKCYAN}Entry content (end with empty line or Ctrl+D):{Colors.ENDC}", Colors.OKCYAN)
        content_lines = []
        try:
            while True:
                line = input()
                if not line:
                    break
                content_lines.append(line)
        except EOFError:
            pass
        
        content = "\n".join(content_lines)
        if not content:
            print_colored("Content is required.", Colors.FAIL)
            return
        
        add_entry(entry_type, actor, content)
    except Exception as e:
        print_colored(f"Failed to add entry: {e}", Colors.FAIL)


def handle_changelog_close():
    """Handle closing active session."""
    if not CHANGELOG_AVAILABLE:
        print_colored("Changelog module not available.", Colors.FAIL)
        return
    
    active = get_active_session()
    if not active:
        print_colored("No active session to close.", Colors.FAIL)
        return
    
    try:
        print_colored(f"\nClosing session: {active['title']}", Colors.OKBLUE)
        summary = input(f"{Colors.OKCYAN}Summary (optional): {Colors.ENDC}").strip()
        outcome_input = input(f"{Colors.OKCYAN}Outcome (success|fail, optional): {Colors.ENDC}").strip()
        outcome = outcome_input if outcome_input in ["success", "fail"] else None
        
        close_session(summary=summary if summary else None, outcome=outcome)
    except Exception as e:
        print_colored(f"Failed to close session: {e}", Colors.FAIL)


def handle_changelog_list():
    """Handle listing sessions."""
    if not CHANGELOG_AVAILABLE:
        print_colored("Changelog module not available.", Colors.FAIL)
        return
    
    try:
        days_input = input(f"{Colors.OKCYAN}Days to show (default 7): {Colors.ENDC}").strip()
        days = int(days_input) if days_input.isdigit() else 7
        
        sessions = list_sessions(days)
        if not sessions:
            print_colored(f"No sessions found in the last {days} days.", Colors.WARNING)
            return
        
        print_colored(f"\n=== Sessions (last {days} days) ===\n", Colors.HEADER)
        print_colored(f"{'Started':<20} {'Title':<40} {'Status':<10} {'Entries':<10} {'Scope':<15}", Colors.BOLD)
        print_colored("-" * 100, Colors.ENDC)
        
        for session in sessions:
            started = session.get("started_at", "")[:19].replace("T", " ")
            title = session.get("title", "Untitled")[:38]
            status = session.get("status", "CLOSED")
            entry_count = session.get("entry_count", 0)
            scope = session.get("scope", "mixed")
            
            status_color = Colors.OKGREEN if status == "ACTIVE" else Colors.ENDC
            print_colored(
                f"{started:<20} {title:<40} {status:<10} {entry_count:<10} {scope:<15}",
                status_color
            )
        
        print()
    except Exception as e:
        print_colored(f"Failed to list sessions: {e}", Colors.FAIL)


def handle_changelog_report():
    """Handle generating changelog HTML report."""
    if not CHANGELOG_AVAILABLE:
        print_colored("Changelog module not available.", Colors.FAIL)
        return
    
    try:
        generate_changelog_report()
        print_colored(f"\n✓ Changelog report generated: {CHANGELOG_REPORT_FILE}", Colors.OKGREEN)
    except Exception as e:
        print_colored(f"Failed to generate report: {e}", Colors.FAIL)


def handle_changelog_show_report():
    """Show path to changelog HTML report."""
    if not CHANGELOG_AVAILABLE:
        print_colored("Changelog module not available.", Colors.FAIL)
        return
    
    report_path = CHANGELOG_REPORT_FILE
    if report_path.exists():
        print_colored(f"\nChangelog Report Location:", Colors.HEADER)
        print_colored(f"  {report_path}", Colors.OKCYAN)
        print_colored(f"\nTo view:", Colors.HEADER)
        print_colored(f"  # On the server:", Colors.OKCYAN)
        print_colored(f"  cat {report_path}", Colors.ENDC)
        print_colored(f"\n  # Or copy to local machine and open in browser", Colors.ENDC)
        print_colored(f"  scp user@server:{report_path} ./changelog-report.html", Colors.ENDC)
        print_colored(f"  # Then open changelog-report.html in your browser", Colors.ENDC)
    else:
        print_colored("No changelog report found. Generate one first (option 24).", Colors.WARNING)


def handle_changelog_prune():
    """Handle pruning old changelog sessions."""
    if not CHANGELOG_AVAILABLE:
        print_colored("Changelog module not available.", Colors.FAIL)
        return
    
    try:
        days_input = input(f"{Colors.OKCYAN}Keep sessions from last N days (default 30): {Colors.ENDC}").strip()
        days = int(days_input) if days_input.isdigit() else 30
        prune_changelog_sessions(days)
        print_colored(f"Pruning complete. Kept sessions from last {days} days.", Colors.OKGREEN)
    except ValueError:
        print_colored("Invalid number.", Colors.FAIL)
    except Exception as e:
        print_colored(f"Pruning failed: {e}", Colors.FAIL)


def handle_pm2_submenu():
    """Handle PM2 operations submenu."""
    if not PM2_OPS_AVAILABLE:
        print_colored("PM2 operations module not available.", Colors.FAIL)
        return
    
    while True:
        show_pm2_menu()
        try:
            choice = input(f"{Colors.OKCYAN}Select option: {Colors.ENDC}").strip()
        except (EOFError, KeyboardInterrupt):
            break
        
        if choice == "0":
            break
        elif choice == "1":
            success, msg = pm2_setup()
            print_colored(msg, Colors.OKGREEN if success else Colors.FAIL)
            if CHANGELOG_AVAILABLE:
                auto_append_backup_entry("pm2_setup", "orthodox-backend", [])
        elif choice == "2":
            status = pm2_status()
            print_colored(f"\nPM2 Status:", Colors.HEADER)
            print(json.dumps(status, indent=2))
        elif choice == "3":
            success, msg = pm2_restart()
            print_colored(msg, Colors.OKGREEN if success else Colors.FAIL)
            if CHANGELOG_AVAILABLE:
                auto_append_backup_entry("pm2_restart", "orthodox-backend", [])
        elif choice == "4":
            success, msg = pm2_start()
            print_colored(msg, Colors.OKGREEN if success else Colors.FAIL)
            if CHANGELOG_AVAILABLE:
                auto_append_backup_entry("pm2_start", "orthodox-backend", [])
        elif choice == "5":
            success, msg = pm2_stop()
            print_colored(msg, Colors.OKGREEN if success else Colors.FAIL)
            if CHANGELOG_AVAILABLE:
                auto_append_backup_entry("pm2_stop", "orthodox-backend", [])
        elif choice == "6":
            lines_input = input(f"{Colors.OKCYAN}Number of lines (default 200): {Colors.ENDC}").strip()
            lines = int(lines_input) if lines_input.isdigit() else 200
            follow_input = input(f"{Colors.OKCYAN}Follow mode? (yes/no, default no): {Colors.ENDC}").strip().lower()
            follow = follow_input == "yes"
            success, msg = pm2_logs(lines, follow)
            if not follow:
                print(msg)
        elif choice == "7":
            success, msg = pm2_reset_restarts()
            print_colored(msg, Colors.OKGREEN if success else Colors.FAIL)
        elif choice == "8":
            success, msg = pm2_show_env()
            print(msg)
        else:
            print_colored("Invalid option.", Colors.FAIL)
        
        if choice != "0":
            input(f"\n{Colors.OKCYAN}Press Enter to continue...{Colors.ENDC}")


def handle_git_submenu():
    """Handle Git operations submenu."""
    if not GIT_OPS_AVAILABLE:
        print_colored("Git operations module not available.", Colors.FAIL)
        return
    
    while True:
        show_git_menu()
        try:
            choice = input(f"{Colors.OKCYAN}Select option: {Colors.ENDC}").strip()
        except (EOFError, KeyboardInterrupt):
            break
        
        if choice == "0":
            break
        elif choice == "1":
            success, status_info = git_status()
            if success:
                print_colored(f"\nCurrent branch: {status_info['current_branch']}", Colors.HEADER)
                print_colored(f"Status:", Colors.HEADER)
                for line in status_info.get("status_lines", []):
                    print(line)
            else:
                print_colored(f"Error: {status_info.get('error', 'Unknown error')}", Colors.FAIL)
        elif choice == "2":
            success, msg = git_create_checkpoint_branch()
            print_colored(msg, Colors.OKGREEN if success else Colors.FAIL)
            if CHANGELOG_AVAILABLE and success:
                auto_append_backup_entry("git_checkpoint", "repo", [])
        elif choice == "3":
            msg_input = input(f"{Colors.OKCYAN}Commit message (optional): {Colors.ENDC}").strip()
            success, msg = git_commit_all(msg_input if msg_input else None)
            print_colored(msg, Colors.OKGREEN if success else Colors.FAIL)
            if CHANGELOG_AVAILABLE and success:
                auto_append_backup_entry("git_commit", "repo", [])
        elif choice == "4":
            branch_input = input(f"{Colors.OKCYAN}Branch name (optional, uses current): {Colors.ENDC}").strip()
            branch = branch_input if branch_input else None
            success, msg = git_push_branch(branch)
            print_colored(msg, Colors.OKGREEN if success else Colors.FAIL)
            if CHANGELOG_AVAILABLE and success:
                auto_append_backup_entry("git_push", branch or "current", [])
        elif choice == "5":
            dir_input = input(f"{Colors.OKCYAN}Artifacts directory (default: daily-summary): {Colors.ENDC}").strip()
            artifacts_dir = dir_input if dir_input else "daily-summary"
            success, msg = git_push_daily_summary(artifacts_dir)
            print_colored(msg, Colors.OKGREEN if success else Colors.FAIL)
        elif choice == "6":
            success, commits = git_last_commits(10)
            if success:
                print_colored("\nLast 10 commits:", Colors.HEADER)
                for commit in commits:
                    print(f"\n{commit['hash'][:8]} - {commit['message']}")
                    print(f"  {commit['author']} - {commit['date'][:19]}")
            else:
                print_colored("Failed to get commits.", Colors.FAIL)
        else:
            print_colored("Invalid option.", Colors.FAIL)
        
        if choice != "0":
            input(f"\n{Colors.OKCYAN}Press Enter to continue...{Colors.ENDC}")


def handle_backups_submenu():
    """Handle Backups submenu."""
    while True:
        show_backups_menu()
        try:
            choice = input(f"{Colors.OKCYAN}Select option: {Colors.ENDC}").strip()
        except (EOFError, KeyboardInterrupt):
            break
        
        if choice == "0":
            break
        elif choice == "1":
            print_colored("\nBacking up FULL filesystem (prod)...", Colors.OKBLUE)
            success, message, _, size = backup_category("prod")
            print_colored(f"Result: {message} ({format_size(size)})", Colors.OKGREEN if success else Colors.FAIL)
        elif choice == "2":
            print_colored("\nBacking up server-only code...", Colors.OKBLUE)
            success, message, _, size = backup_category("server")
            print_colored(f"Result: {message} ({format_size(size)})", Colors.OKGREEN if success else Colors.FAIL)
        elif choice == "3":
            print_colored("\nBacking up front-end-only code...", Colors.OKBLUE)
            success, message, _, size = backup_category("front-end")
            print_colored(f"Result: {message} ({format_size(size)})", Colors.OKGREEN if success else Colors.FAIL)
        elif choice == "4":
            print_colored("\nBacking up images...", Colors.OKBLUE)
            success, message, _, size = backup_category("images")
            print_colored(f"Result: {message} ({format_size(size)})", Colors.OKGREEN if success else Colors.FAIL)
        elif choice == "5":
            print_colored("\nBacking up nginx config...", Colors.OKBLUE)
            success, message, _, size = backup_category("nginx")
            print_colored(f"Result: {message} ({format_size(size)})", Colors.OKGREEN if success else Colors.FAIL)
        elif choice == "6":
            print_colored("\nBacking up config files...", Colors.OKBLUE)
            success, message, _, size = backup_category("config")
            print_colored(f"Result: {message} ({format_size(size)})", Colors.OKGREEN if success else Colors.FAIL)
        elif choice == "7":
            print_colored("\nBacking up database...", Colors.OKBLUE)
            success, message, _, size = backup_category("database")
            print_colored(f"Result: {message} ({format_size(size)})", Colors.OKGREEN if success else Colors.FAIL)
        elif choice == "8":
            run_all_backups()
        elif choice == "9":
            verify_backups()
        else:
            print_colored("Invalid option.", Colors.FAIL)
        
        if choice != "0":
            input(f"\n{Colors.OKCYAN}Press Enter to continue...{Colors.ENDC}")


def handle_analysis_submenu():
    """Handle Analysis submenu."""
    if not ANALYSIS_AVAILABLE:
        print_colored("Analysis module not available.", Colors.FAIL)
        return
    
    while True:
        show_analysis_menu()
        try:
            choice = input(f"{Colors.OKCYAN}Select option: {Colors.ENDC}").strip()
        except (EOFError, KeyboardInterrupt):
            break
        
        if choice == "0":
            break
        elif choice == "1":
            run_analysis_menu("prod")
        elif choice == "2":
            run_analysis_menu("server")
        elif choice == "3":
            run_analysis_menu("front-end")
        elif choice == "4":
            run_analysis_menu("entire")
        elif choice == "5":
            show_report_path()
        elif choice == "6":
            prune_runs_interactive()
        else:
            print_colored("Invalid option.", Colors.FAIL)
        
        if choice != "0":
            input(f"\n{Colors.OKCYAN}Press Enter to continue...{Colors.ENDC}")


def handle_changelog_submenu():
    """Handle Changelog submenu."""
    if not CHANGELOG_AVAILABLE:
        print_colored("Changelog module not available.", Colors.FAIL)
        return
    
    while True:
        show_changelog_menu()
        try:
            choice = input(f"{Colors.OKCYAN}Select option: {Colors.ENDC}").strip()
        except (EOFError, KeyboardInterrupt):
            break
        
        if choice == "0":
            break
        elif choice == "1":
            handle_changelog_start()
        elif choice == "2":
            handle_changelog_add()
        elif choice == "3":
            handle_changelog_close()
        elif choice == "4":
            handle_changelog_list()
        elif choice == "5":
            handle_changelog_report()
        elif choice == "6":
            handle_changelog_show_report()
        elif choice == "7":
            handle_changelog_prune()
        else:
            print_colored("Invalid option.", Colors.FAIL)
        
        if choice != "0":
            input(f"\n{Colors.OKCYAN}Press Enter to continue...{Colors.ENDC}")


def handle_system_summary():
    """Handle system summary generation."""
    if not SYSTEM_SUMMARY_AVAILABLE:
        clear_screen()
        render_screen(
            title="System Summary",
            breadcrumb="OM-Ops › System Summary",
            body_lines=["System summary module not available."],
            footer_hint="[Enter] Back   [0] Main Menu   [q] Quit"
        )
        wait_for_enter()
        return
    
    try:
        clear_screen()
        render_screen(
            title="System Summary",
            breadcrumb="OM-Ops › System Summary",
            body_lines=["Generating system summary...", ""],
            footer_hint="Please wait..."
        )
        
        summary = generate_system_summary()
        
        clear_screen()
        render_screen(
            title="System Summary",
            breadcrumb="OM-Ops › System Summary",
            body_lines=[
                "",
                "✓ System summary generated successfully!",
                "",
                f"HTML report: {SYSTEM_SUMMARY_REPORT}",
                "",
            ],
            footer_hint="[Enter] Back   [0] Main Menu   [q] Quit"
        )
        
        if CHANGELOG_AVAILABLE:
            try:
                auto_append_backup_entry("system_summary", "all", [str(SYSTEM_SUMMARY_REPORT)])
            except Exception:
                pass  # Non-critical
        
        wait_for_enter()
    except Exception as e:
        clear_screen()
        render_screen(
            title="System Summary",
            breadcrumb="OM-Ops › System Summary › Error",
            body_lines=[
                "",
                "✗ Error generating system summary:",
                "",
                str(e)[:200],
                "",
            ],
            footer_hint="[Enter] Back   [0] Main Menu   [q] Quit"
        )
        wait_for_enter()


def handle_motivation():
    """Handle motivation summary generation."""
    if not MOTIVATION_AVAILABLE:
        clear_screen()
        render_screen(
            title="Motivation Summary",
            breadcrumb="OM-Ops › Motivation Summary",
            body_lines=["Motivation module not available."],
            footer_hint="[Enter] Back   [0] Main Menu   [q] Quit"
        )
        wait_for_enter()
        return
    
    try:
        clear_screen()
        render_screen(
            title="Motivation Summary",
            breadcrumb="OM-Ops › Motivation Summary",
            body_lines=["Generating motivation summary...", ""],
            footer_hint="Please wait..."
        )
        
        motivation = generate_motivation()
        
        clear_screen()
        render_screen(
            title="Motivation Summary",
            breadcrumb="OM-Ops › Motivation Summary",
            body_lines=[
                "",
                "✓ Motivation summary generated successfully!",
                "",
                f"HTML report: {MOTIVATION_REPORT}",
                "",
            ],
            footer_hint="[Enter] Back   [0] Main Menu   [q] Quit"
        )
        
        if CHANGELOG_AVAILABLE:
            try:
                auto_append_backup_entry("motivation_summary", "all", [str(MOTIVATION_REPORT)])
            except Exception:
                pass  # Non-critical
        
        wait_for_enter()
    except Exception as e:
        clear_screen()
        render_screen(
            title="Motivation Summary",
            breadcrumb="OM-Ops › Motivation Summary › Error",
            body_lines=[
                "",
                "✗ Error generating motivation summary:",
                "",
                str(e)[:200],
                "",
            ],
            footer_hint="[Enter] Back   [0] Main Menu   [q] Quit"
        )
        wait_for_enter()


def handle_zammad_check():
    """Handle Zammad health and connectivity check."""
    if not ZAMMAD_OPS_AVAILABLE or zammad_connectivity_check is None:
        clear_screen()
        render_screen(
            title="Zammad Health & Connectivity",
            breadcrumb="OM-Ops › Zammad Health & Connectivity",
            body_lines=["Zammad operations module not available."],
            footer_hint="[Enter] Back   [0] Main Menu   [q] Quit"
        )
        wait_for_enter()
        return
    
    clear_screen()
    render_screen(
        title="Zammad Health & Connectivity",
        breadcrumb="OM-Ops › Zammad Health & Connectivity",
        body_lines=["Running connectivity check..."],
        footer_hint="[Enter] Back   [0] Main Menu   [q] Quit"
    )
    
    # Run connectivity check
    try:
        success, results = zammad_connectivity_check()
    except Exception as e:
        clear_screen()
        render_screen(
            title="Zammad Health & Connectivity",
            breadcrumb="OM-Ops › Zammad Health & Connectivity › Error",
            body_lines=[
                "",
                "✗ Error running connectivity check:",
                "",
                str(e)[:200],
                "",
            ],
            footer_hint="[Enter] Back   [0] Main Menu   [q] Quit"
        )
        wait_for_enter()
        return
    
    # Build result lines
    body_lines = []
    body_lines.append("")
    body_lines.append("CONTAINER STATUS")
    body_lines.append("-" * 60)
    
    containers_info = results.get("containers", {})
    if "error" in containers_info:
        body_lines.append(f"✗ FAILED: {containers_info.get('error', 'Unknown error')}")
        if "permission denied" in str(containers_info.get("error", "")).lower():
            body_lines.append("  Note: Docker permission denied. Run with sudo or add user to docker group.")
    elif containers_info.get("all_up", False):
        body_lines.append("✓ PASS: All containers running")
        services = containers_info.get("services", {})
        for service, status in services.items():
            status_icon = "✓" if status == "running" else "✗"
            body_lines.append(f"  {status_icon} {service}: {status}")
    else:
        body_lines.append("✗ FAILED: Not all containers running")
        services = containers_info.get("services", {})
        for service, status in services.items():
            status_icon = "✓" if status == "running" else "✗"
            body_lines.append(f"  {status_icon} {service}: {status}")
    
    body_lines.append("")
    body_lines.append("HEALTH CHECK")
    body_lines.append("-" * 60)
    
    health_info = results.get("health", {})
    local_status = health_info.get("local_http_status")
    api_healthy = health_info.get("api_health_check", False)
    
    if local_status in ["200", "302"]:
        body_lines.append(f"✓ PASS: Local HTTP ({local_status})")
    elif local_status:
        body_lines.append(f"✗ FAILED: Local HTTP ({local_status})")
    else:
        body_lines.append("✗ FAILED: Local HTTP (no response)")
    
    if api_healthy:
        body_lines.append("✓ PASS: API health check")
    else:
        body_lines.append("✗ FAILED: API health check")
    
    body_lines.append("")
    body_lines.append("OVERALL STATUS")
    body_lines.append("-" * 60)
    
    if success:
        body_lines.append("✓ PASS: Zammad is reachable and healthy")
    else:
        body_lines.append("✗ FAILED: Zammad connectivity check failed")
        body_lines.append("")
        body_lines.append("Troubleshooting:")
        body_lines.append("  1. Check if containers are running: sudo docker compose -f /opt/zammad/docker-compose.yml ps")
        body_lines.append("  2. Check logs: sudo docker compose -f /opt/zammad/docker-compose.yml logs")
        body_lines.append("  3. Verify port 3030: curl http://127.0.0.1:3030/")
    
    render_screen(
        title="Zammad Health & Connectivity",
        breadcrumb="OM-Ops › Zammad Health & Connectivity",
        body_lines=body_lines,
        footer_hint="[Enter] Back   [0] Main Menu   [q] Quit"
    )
    wait_for_enter()


def handle_freescout_check():
    """Handle FreeScout connectivity check."""
    if not FREESCOUT_OPS_AVAILABLE or freescout_check_connectivity is None:
        clear_screen()
        render_screen(
            title="FreeScout Connectivity Check",
            breadcrumb="OM-Ops › FreeScout Connectivity Check",
            body_lines=["FreeScout operations module not available."],
            footer_hint="[Enter] Back   [0] Main Menu   [q] Quit"
        )
        wait_for_enter()
        return
    
    clear_screen()
    render_screen(
        title="FreeScout Connectivity Check",
        breadcrumb="OM-Ops › FreeScout Connectivity Check",
        body_lines=["Running connectivity check..."],
        footer_hint="[Enter] Back   [0] Main Menu   [q] Quit"
    )
    
    # Run connectivity check
    try:
        success, details = freescout_check_connectivity()
    except Exception as e:
        clear_screen()
        render_screen(
            title="FreeScout Connectivity Check",
            breadcrumb="OM-Ops › FreeScout Connectivity Check › Error",
            body_lines=[
                "",
                "✗ Error running connectivity check:",
                "",
                str(e)[:200],
                "",
            ],
            footer_hint="[Enter] Back   [0] Main Menu   [q] Quit"
        )
        wait_for_enter()
        return
    
    # Build result lines
    body_lines = []
    body_lines.append("")
    body_lines.append("FREESCOUT API CONNECTIVITY")
    body_lines.append("-" * 60)
    
    if success:
        body_lines.append("✓ PASS: FreeScout API is reachable")
        body_lines.append(f"  Base URL: {details.get('base_url', 'N/A')}")
        body_lines.append(f"  API Key: {'Configured' if details.get('api_key_configured') else 'Not configured'}")
    else:
        body_lines.append("✗ FAILED: FreeScout API is not reachable")
        body_lines.append(f"  Base URL: {details.get('base_url', 'N/A')}")
        if details.get("api_key_configured"):
            body_lines.append(f"  Error: {details.get('error', 'Unknown error')}")
        else:
            body_lines.append("  Error: API key not configured")
            body_lines.append(f"  Hint: {details.get('config_hint', 'Set FREESCOUT_API_KEY environment variable')}")
    
    body_lines.append("")
    body_lines.append("CONFIGURATION")
    body_lines.append("-" * 60)
    api_key = freescout_get_api_key() if freescout_get_api_key else None
    if api_key:
        body_lines.append(f"  API Key: {'*' * (len(api_key) - 4)}{api_key[-4:] if len(api_key) > 4 else api_key}")
    else:
        body_lines.append("  API Key: Not configured")
    
    body_lines.append(f"  Require Ticket: {'Yes' if FREESCOUT_REQUIRE_TICKET else 'No (soft enforcement)'}")
    
    body_lines.append("")
    body_lines.append("OVERALL STATUS")
    body_lines.append("-" * 60)
    
    if success:
        body_lines.append("✓ PASS: FreeScout is reachable and configured")
    else:
        body_lines.append("✗ FAILED: FreeScout connectivity check failed")
        body_lines.append("")
        body_lines.append("To configure:")
        body_lines.append("  1. Enable API & Webhooks module in FreeScout admin")
        body_lines.append("  2. Retrieve API key from Manage » API & Webhooks")
        body_lines.append("  3. Set FREESCOUT_API_KEY environment variable")
        body_lines.append("     OR create /opt/freescout/.freescout_api_key file")
    
    render_screen(
        title="FreeScout Connectivity Check",
        breadcrumb="OM-Ops › FreeScout Connectivity Check",
        body_lines=body_lines,
        footer_hint="[Enter] Back   [0] Main Menu   [q] Quit"
    )
    wait_for_enter()


def handle_instance_info():
    """Handle OM Instance Information display."""
    try:
        script_dir = Path(__file__).parent
        if str(script_dir) not in sys.path:
            sys.path.insert(0, str(script_dir))
        from instance_info import run_instance_info, save_report, generate_report_markdown
    except ImportError as e:
        clear_screen()
        render_screen(
            title="OM Instance Information",
            breadcrumb="OM-Ops › OM Instance Information",
            body_lines=["Instance information module not available.", f"Error: {e}"],
            footer_hint="[Enter] Back   [0] Main Menu   [q] Quit"
        )
        wait_for_enter()
        return
    
    clear_screen()
    render_screen(
        title="OM Instance Information",
        breadcrumb="OM-Ops › OM Instance Information",
        body_lines=["Collecting instance information..."],
        footer_hint="[Enter] Back   [0] Main Menu   [q] Quit"
    )
    
    # Collect data
    success, data = run_instance_info()
    
    if not success:
        clear_screen()
        render_screen(
            title="OM Instance Information",
            breadcrumb="OM-Ops › OM Instance Information",
            body_lines=["Failed to collect instance information."],
            footer_hint="[Enter] Back   [0] Main Menu   [q] Quit"
        )
        wait_for_enter()
        return
    
    # Build display lines
    body_lines = []
    body_lines.append("")
    body_lines.append("=" * 60)
    body_lines.append("OM INSTANCE INFORMATION")
    body_lines.append("=" * 60)
    body_lines.append("")
    
    # A) Identity & Paths
    body_lines.append("A) IDENTITY & PATHS")
    body_lines.append("-" * 60)
    identity = data.get("identity", {})
    body_lines.append(f"Hostname: {identity.get('hostname', 'unknown')}")
    body_lines.append(f"Timestamp: {identity.get('timestamp', 'unknown')}")
    body_lines.append(f"Timezone: {identity.get('timezone', 'unknown')}")
    body_lines.append("")
    
    paths = identity.get("paths", {})
    body_lines.append("Key Directories:")
    for name, path_info in paths.items():
        status = "✓" if path_info.get("exists") else "✗"
        body_lines.append(f"  {status} {name}: {path_info.get('path', 'N/A')}")
    
    body_lines.append("")
    config_files = identity.get("config_files", [])
    body_lines.append(f"Config Files Found: {len(config_files)}")
    for cfg in config_files[:8]:  # Limit display
        body_lines.append(f"  - {cfg.get('path', 'N/A')}")
    if len(config_files) > 8:
        body_lines.append(f"  ... and {len(config_files) - 8} more")
    
    body_lines.append("")
    
    # B) Service Health
    body_lines.append("B) SERVICE HEALTH")
    body_lines.append("-" * 60)
    services = data.get("services", {})
    
    # PM2
    pm2_info = services.get("pm2", {})
    if pm2_info.get("pm2_available"):
        body_lines.append("PM2:")
        for proc_name, proc_info in pm2_info.items():
            if proc_name != "pm2_available" and proc_name != "error":
                status = "✓" if proc_info.get("found") else "✗"
                body_lines.append(f"  {status} {proc_name}: {proc_info.get('status', 'unknown')}")
    else:
        body_lines.append("PM2: ✗ Not available")
    
    body_lines.append("")
    
    # Backend
    backend_info = services.get("backend", {})
    if backend_info.get("reachable"):
        body_lines.append(f"Backend: ✓ Reachable")
        body_lines.append(f"  Endpoint: {backend_info.get('endpoint', 'N/A')}")
        body_lines.append(f"  Status: {backend_info.get('status_code', 'N/A')}")
    else:
        body_lines.append("Backend: ✗ Not reachable")
    
    body_lines.append("")
    
    # Nginx
    nginx_info = services.get("nginx", {})
    config_valid = "✓" if nginx_info.get("config_valid") else "✗"
    site_exists = "✓" if nginx_info.get("site_config_exists") else "✗"
    body_lines.append(f"Nginx Config: {config_valid} Valid")
    body_lines.append(f"Nginx Site: {site_exists} orthodoxmetrics.com")
    if nginx_info.get("helpdesk_route"):
        body_lines.append(f"Helpdesk Route: {nginx_info.get('helpdesk_route')}")
    
    body_lines.append("")
    
    # Ports
    ports_info = services.get("ports", {})
    body_lines.append("Port Listeners:")
    for port, port_info in sorted(ports_info.items()):
        status = "✓" if port_info.get("listening") else "✗"
        body_lines.append(f"  {status} Port {port}")
    
    body_lines.append("")
    
    # C) Database Info
    body_lines.append("C) DATABASE INFORMATION")
    body_lines.append("-" * 60)
    db_info = data.get("database", {})
    db_count = len(db_info.get("databases", []))
    body_lines.append(f"Databases Configured: {db_count}")
    for db in db_info.get("databases", [])[:3]:
        body_lines.append(f"  - {db.get('config_file', 'N/A')}")
        if db.get("type_hint"):
            body_lines.append(f"    Type: {db.get('type_hint')}")
    
    body_lines.append("")
    
    # D) System Resources
    body_lines.append("D) SYSTEM RESOURCES")
    body_lines.append("-" * 60)
    resources = data.get("resources", {})
    
    if "disk" in resources and "mounts" in resources["disk"]:
        body_lines.append("Disk Usage:")
        for mount, mount_info in resources["disk"]["mounts"].items():
            body_lines.append(f"  {mount}: {mount_info.get('used')}/{mount_info.get('size')} ({mount_info.get('use_percent')})")
    
    if "load" in resources:
        body_lines.append("")
        body_lines.append(f"Load: {resources['load'].get('uptime_output', 'N/A')[:100]}")
    
    body_lines.append("")
    
    # E) Log Locations
    body_lines.append("E) LOG LOCATIONS")
    body_lines.append("-" * 60)
    logs = data.get("logs", {})
    
    if logs.get("pm2"):
        body_lines.append("PM2 Logs:")
        if logs["pm2"].get("backend_log_path"):
            body_lines.append(f"  Backend: {logs['pm2'].get('backend_log_path')}")
        body_lines.append(f"  View: {logs['pm2'].get('view_command', 'pm2 logs')}")
    
    body_lines.append("")
    body_lines.append("Nginx Logs:")
    for name, info in logs.get("nginx", {}).items():
        body_lines.append(f"  {name}: {info.get('path')}")
    
    body_lines.append("")
    body_lines.append("OM-Ops Logs:")
    for name, info in logs.get("om_ops", {}).items():
        body_lines.append(f"  {name}: {info.get('path')}")
    
    body_lines.append("")
    body_lines.append("Docker Logs:")
    for service, info in logs.get("docker", {}).items():
        body_lines.append(f"  {service}: {info.get('view_command', 'N/A')}")
    
    body_lines.append("")
    
    # F) Refactor Risk Checklist
    body_lines.append("F) REFACTOR RISK CHECKLIST")
    body_lines.append("-" * 60)
    checklist = data.get("refactor_checklist", {})
    body_lines.append("Path Dependencies:")
    for dep in checklist.get("path_dependencies", [])[:5]:  # Limit display
        body_lines.append(f"  - {dep.get('module')}")
        body_lines.append(f"    Depends on: {', '.join(dep.get('depends_on', [])[:2])}")
    
    body_lines.append("")
    body_lines.append("Update Order:")
    for step in checklist.get("update_order", [])[:4]:  # Limit display
        body_lines.append(f"  {step}")
    
    body_lines.append("")
    body_lines.append("=" * 60)
    body_lines.append("")
    body_lines.append("[1] Save report to backups")
    body_lines.append("[Enter] Back")
    
    # Display
    render_screen(
        title="OM Instance Information",
        breadcrumb="OM-Ops › OM Instance Information",
        body_lines=body_lines,
        footer_hint="[1] Save Report   [Enter] Back   [0] Main Menu   [q] Quit"
    )
    
    # Handle input
    while True:
        try:
            choice = get_user_input("Select option: ").strip()
        except (EOFError, KeyboardInterrupt):
            break
        
        if choice == "" or choice == "0" or choice.lower() == "q":
            break
        elif choice == "1":
            # Save report
            try:
                success_save, save_path = save_report(data)
            except Exception as e:
                clear_screen()
                render_screen(
                    title="OM Instance Information",
                    breadcrumb="OM-Ops › OM Instance Information › Error",
                    body_lines=[
                        "",
                        "✗ Error saving report:",
                        "",
                        str(e)[:200],
                        "",
                    ],
                    footer_hint="[Enter] Back   [0] Main Menu   [q] Quit"
                )
                wait_for_enter()
                break
            
            if success_save:
                clear_screen()
                render_screen(
                    title="OM Instance Information",
                    breadcrumb="OM-Ops › OM Instance Information › Saved",
                    body_lines=[
                        "",
                        "✓ Report saved successfully!",
                        "",
                        f"Location: {save_path}",
                        "",
                        "Files created:",
                        f"  - {save_path / 'instance_info.md'}",
                        f"  - {save_path / 'instance_info.json'}",
                        "",
                    ],
                    footer_hint="[Enter] Back   [0] Main Menu   [q] Quit"
                )
                wait_for_enter()
            break
        else:
            print("Invalid option. Press Enter to continue...")
            wait_for_enter()
            break


def prompt_for_ticket(action_name: str) -> Tuple[Optional[str], bool]:
    """
    Prompt user for FreeScout ticket ID with enforcement logic.
    
    Args:
        action_name: Name of the action requiring a ticket (e.g., "Build & Deploy")
    
    Returns:
        Tuple of (ticket_id or None, should_proceed)
        - If ticket provided and valid: (ticket_id, True)
        - If no ticket and soft enforcement: (None, True) with warning
        - If no ticket and hard enforcement: (None, False)
        - If ticket invalid: (None, False)
    """
    if not FREESCOUT_OPS_AVAILABLE or freescout_validate_ticket is None:
        # FreeScout not available, allow proceeding
        return None, True
    
    prompt = f"\nEnter FreeScout Ticket ID for {action_name} (or leave blank to continue with warning): "
    ticket_input = get_user_input(prompt).strip()
    
    if not ticket_input:
        # No ticket provided
        if FREESCOUT_REQUIRE_TICKET:
            # Hard enforcement - block
            print_colored("\n✗ BLOCKED: Ticket required for this action.", Colors.FAIL)
            print_colored("  Create or approve a FreeScout ticket before proceeding.", Colors.FAIL)
            print_colored(f"  FreeScout: https://orthodoxmetrics.com/helpdesk/", Colors.OKCYAN)
            return None, False
        else:
            # Soft enforcement - warn but allow
            print_colored("\n⚠ WARNING: No ticket provided. Proceeding without ticket.", Colors.WARNING)
            print_colored("  This action will be logged as 'NO TICKET PROVIDED'.", Colors.WARNING)
            return None, True
    
    # Validate ticket
    is_valid, ticket_data, error = freescout_validate_ticket(ticket_input)
    
    if is_valid:
        ticket_url = freescout_get_ticket_url(ticket_input) if freescout_get_ticket_url else None
        print_colored(f"\n✓ Ticket {ticket_input} validated", Colors.OKGREEN)
        if ticket_url:
            print_colored(f"  URL: {ticket_url}", Colors.OKCYAN)
        if ticket_data and ticket_data.get("subject"):
            print_colored(f"  Subject: {ticket_data.get('subject', '')[:60]}", Colors.OKCYAN)
        return ticket_input, True
    else:
        print_colored(f"\n✗ Invalid ticket: {error}", Colors.FAIL)
        if FREESCOUT_REQUIRE_TICKET:
            print_colored("  Ticket validation required. Please provide a valid ticket ID.", Colors.FAIL)
            return None, False
        else:
            # Soft enforcement - warn but allow
            print_colored("  ⚠ WARNING: Proceeding with invalid ticket (soft enforcement)", Colors.WARNING)
            return ticket_input, True


def log_ticket_to_artifact(artifact_path: Path, ticket_id: Optional[str], action_name: str):
    """
    Log ticket ID to artifact file (run.json or similar).
    
    Args:
        artifact_path: Path to artifact JSON file
        ticket_id: Ticket ID (or None)
        action_name: Name of the action
    """
    if not artifact_path.exists():
        return
    
    try:
        with open(artifact_path, "r") as f:
            artifact_data = json.load(f)
    except:
        artifact_data = {}
    
    artifact_data["freescout_ticket"] = {
        "ticket_id": ticket_id,
        "action": action_name,
        "timestamp": datetime.datetime.now().isoformat(),
        "ticket_url": freescout_get_ticket_url(ticket_id) if ticket_id and freescout_get_ticket_url else None
    }
    
    if not ticket_id:
        artifact_data["freescout_ticket"]["warning"] = "NO TICKET PROVIDED"
    
    try:
        with open(artifact_path, "w") as f:
            json.dump(artifact_data, f, indent=2)
    except Exception as e:
        print_colored(f"Warning: Could not write ticket to artifact: {e}", Colors.WARNING)


def handle_preflight_discovery():
    """Handle preflight discovery checks."""
    # Ticket enforcement for Preflight Discovery
    ticket_id, should_proceed = prompt_for_ticket("Preflight Discovery")
    if not should_proceed:
        clear_screen()
        render_screen(
            title="Preflight Discovery",
            breadcrumb="OM-Ops › Preflight Discovery",
            body_lines=["Action blocked: Ticket required."],
            footer_hint="[Enter] Back   [0] Main Menu   [q] Quit"
        )
        wait_for_enter()
        return
    
    clear_screen()
    render_screen(
        title="Preflight Discovery",
        breadcrumb="OM-Ops › Preflight Discovery",
        body_lines=["Running preflight checks..."],
        footer_hint="[Enter] Back   [0] Main Menu   [q] Quit"
    )
    
    preflight_results = {
        "timestamp": datetime.datetime.now().isoformat(),
        "freescout_ticket_id": ticket_id,
        "checks": {}
    }
    
    body_lines = []
    body_lines.append("")
    body_lines.append("PREFLIGHT CHECKS")
    body_lines.append("-" * 60)
    body_lines.append("")
    
    # Show ticket info if provided
    if ticket_id:
        ticket_url = freescout_get_ticket_url(ticket_id) if freescout_get_ticket_url else None
        body_lines.append(f"FreeScout Ticket: {ticket_id}")
        if ticket_url:
            body_lines.append(f"  URL: {ticket_url}")
        body_lines.append("")
    elif not FREESCOUT_REQUIRE_TICKET:
        body_lines.append("⚠ WARNING: No FreeScout ticket provided")
        body_lines.append("")
    
    # Check Zammad connectivity (non-blocking)
    if ZAMMAD_OPS_AVAILABLE and zammad_connectivity_check is not None:
        try:
            body_lines.append("Checking Zammad connectivity...")
            zammad_success, zammad_results = zammad_connectivity_check()
            preflight_results["checks"]["zammad"] = {
                "reachable": zammad_success,
                "timestamp": datetime.datetime.now().isoformat(),
                "details": zammad_results
            }
            
            if zammad_success:
                body_lines.append("✓ PASS: Zammad is reachable")
            else:
                body_lines.append("⚠ WARN: Zammad is unreachable (non-blocking)")
                body_lines.append("  Note: This will not block operations")
        except Exception as e:
            body_lines.append(f"⚠ ERROR: Zammad check failed: {str(e)[:100]}")
            preflight_results["checks"]["zammad"] = {
                "reachable": None,
                "timestamp": datetime.datetime.now().isoformat(),
                "error": str(e)[:200]
            }
    else:
        body_lines.append("⚠ SKIP: Zammad operations module not available")
        preflight_results["checks"]["zammad"] = {
            "reachable": None,
            "timestamp": datetime.datetime.now().isoformat(),
            "note": "Module not available"
        }
    
    body_lines.append("")
    body_lines.append("PREFLIGHT SUMMARY")
    body_lines.append("-" * 60)
    body_lines.append(f"Timestamp: {preflight_results['timestamp']}")
    if ticket_id:
        ticket_url = freescout_get_ticket_url(ticket_id) if freescout_get_ticket_url else None
        body_lines.append(f"FreeScout Ticket: {ticket_id}")
        if ticket_url:
            body_lines.append(f"  URL: {ticket_url}")
    body_lines.append("")
    
    zammad_status = preflight_results["checks"].get("zammad", {})
    if zammad_status.get("reachable") is True:
        body_lines.append("✓ Zammad: Reachable")
    elif zammad_status.get("reachable") is False:
        body_lines.append("⚠ Zammad: Unreachable (warning only)")
    else:
        body_lines.append("? Zammad: Check skipped")
    
    body_lines.append("")
    body_lines.append("Note: Preflight checks are informational only.")
    body_lines.append("Warnings do not block operations.")
    
    render_screen(
        title="Preflight Discovery",
        breadcrumb="OM-Ops › Preflight Discovery",
        body_lines=body_lines,
        footer_hint="[Enter] Back   [0] Main Menu   [q] Quit"
    )
    
    # Optional: Post note to FreeScout ticket
    if ticket_id and FREESCOUT_OPS_AVAILABLE and freescout_post_note:
        note_text = f"Preflight Discovery completed at {preflight_results['timestamp']}\n\n"
        note_text += "Checks performed:\n"
        for check_name, check_data in preflight_results["checks"].items():
            status = "✓" if check_data.get("reachable") is True else "⚠" if check_data.get("reachable") is False else "?"
            note_text += f"  {status} {check_name}\n"
        
        success, error = freescout_post_note(ticket_id, note_text)
        if success:
            body_lines.append("")
            body_lines.append(f"✓ Note posted to FreeScout ticket {ticket_id}")
        else:
            body_lines.append("")
            body_lines.append(f"⚠ Could not post note to ticket: {error}")
    
    wait_for_enter()


def handle_roadmap_submenu():
    """Handle Roadmap submenu."""
    if not ROADMAP_AVAILABLE:
        print_colored("Roadmap module not available.", Colors.FAIL)
        return
    
    while True:
        show_roadmap_menu()
        try:
            choice = input(f"{Colors.OKCYAN}Select option: {Colors.ENDC}").strip()
        except (EOFError, KeyboardInterrupt):
            break
        
        if choice == "0":
            break
        elif choice == "1":
            roadmap = load_roadmap()
            milestones = roadmap.get("milestones", [])
            print_colored(f"\nRoadmap Summary:", Colors.HEADER)
            print_colored(f"  Total milestones: {len(milestones)}", Colors.OKCYAN)
            print_colored(f"  HTML report: {ROADMAP_REPORT}", Colors.OKCYAN)
            print_colored(f"\nMilestones:", Colors.HEADER)
            for m in milestones[:10]:
                print(f"  - {m['title']} [{m['status']}] ({m.get('percent', 0)}%)")
        elif choice == "2":
            title = input(f"{Colors.OKCYAN}Milestone title: {Colors.ENDC}").strip()
            if title:
                owner = input(f"{Colors.OKCYAN}Owner (Nick/Cursor/Both, default Both): {Colors.ENDC}").strip() or "Both"
                notes = input(f"{Colors.OKCYAN}Notes (optional): {Colors.ENDC}").strip()
                milestone_id = add_milestone(title, owner, notes)
                print_colored(f"Added milestone: {milestone_id}", Colors.OKGREEN)
                if CHANGELOG_AVAILABLE:
                    auto_append_backup_entry("roadmap_add", "milestone", [title])
        elif choice == "3":
            roadmap = load_roadmap()
            milestones = roadmap.get("milestones", [])
            if not milestones:
                print_colored("No milestones found.", Colors.WARNING)
            else:
                print_colored("\nMilestones:", Colors.HEADER)
                for i, m in enumerate(milestones, 1):
                    print(f"  {i}. {m['title']} [{m['status']}]")
                idx_input = input(f"{Colors.OKCYAN}Select milestone number: {Colors.ENDC}").strip()
                try:
                    idx = int(idx_input) - 1
                    if 0 <= idx < len(milestones):
                        milestone_id = milestones[idx]["id"]
                        status_input = input(f"{Colors.OKCYAN}Status (planned/in_progress/complete/blocked): {Colors.ENDC}").strip()
                        percent_input = input(f"{Colors.OKCYAN}Percent (0-100): {Colors.ENDC}").strip()
                        notes_input = input(f"{Colors.OKCYAN}Notes (optional): {Colors.ENDC}").strip()
                        update_milestone(
                            milestone_id,
                            status=status_input if status_input in ["planned", "in_progress", "complete", "blocked"] else None,
                            percent=int(percent_input) if percent_input.isdigit() else None,
                            notes=notes_input if notes_input else None
                        )
                        print_colored("Milestone updated.", Colors.OKGREEN)
                        if CHANGELOG_AVAILABLE:
                            auto_append_backup_entry("roadmap_update", milestone_id, [])
                except ValueError:
                    print_colored("Invalid number.", Colors.FAIL)
        elif choice == "4":
            roadmap = load_roadmap()
            milestones = roadmap.get("milestones", [])
            if not milestones:
                print_colored("No milestones found.", Colors.WARNING)
            else:
                print_colored("\nMilestones:", Colors.HEADER)
                for i, m in enumerate(milestones, 1):
                    print(f"  {i}. {m['title']} [{m['status']}]")
                idx_input = input(f"{Colors.OKCYAN}Select milestone number: {Colors.ENDC}").strip()
                try:
                    idx = int(idx_input) - 1
                    if 0 <= idx < len(milestones):
                        milestone_id = milestones[idx]["id"]
                        mark_milestone_complete(milestone_id)
                        print_colored("Milestone marked complete.", Colors.OKGREEN)
                        if CHANGELOG_AVAILABLE:
                            auto_append_backup_entry("roadmap_complete", milestone_id, [])
                except ValueError:
                    print_colored("Invalid number.", Colors.FAIL)
        elif choice == "5":
            generate_roadmap_html()
            print_colored(f"\n✓ Roadmap HTML generated: {ROADMAP_REPORT}", Colors.OKGREEN)
        else:
            print_colored("Invalid option.", Colors.FAIL)
        
        if choice != "0":
            input(f"\n{Colors.OKCYAN}Press Enter to continue...{Colors.ENDC}")


def show_nginx_menu():
    """Display Nginx operations submenu."""
    if not NGINX_OPS_AVAILABLE:
        print_colored("Nginx operations module not available.", Colors.FAIL)
        return
    
    print_colored("\n=== Nginx Operations ===\n", Colors.HEADER)
    
    menu_items = [
        ("1", "Show Nginx status + version", "nginx_status", NGINX_OPS_AVAILABLE),
        ("2", "Validate Nginx config (nginx -t)", "nginx_validate", NGINX_OPS_AVAILABLE),
        ("3", "Show current API proxy settings", "nginx_proxy", NGINX_OPS_AVAILABLE),
        ("4", "Generate Safe API Proxy Baseline (dry-run)", "nginx_baseline", NGINX_OPS_AVAILABLE),
        ("5", "Apply Safe API Proxy Baseline", "nginx_apply", NGINX_OPS_AVAILABLE),
        ("6", "Tail nginx error log", "nginx_logs", NGINX_OPS_AVAILABLE),
        ("0", "Back to main menu", "back", True),
    ]
    
    for num, desc, _, available in menu_items:
        ready_symbol = " ✓" if available else ""
        print_colored(f"  ({num}) {desc}{ready_symbol}", Colors.OKCYAN)
    print()


def show_uploads_menu():
    """Display Uploads & Paths Health submenu."""
    if not UPLOADS_OPS_AVAILABLE:
        print_colored("Uploads operations module not available.", Colors.FAIL)
        return
    
    print_colored("\n=== Uploads & Paths Health ===\n", Colors.HEADER)
    
    menu_items = [
        ("1", "Check upload directories exist + writable", "uploads_check", UPLOADS_OPS_AVAILABLE),
        ("2", "Fix missing dirs (requires confirmation)", "uploads_fix", UPLOADS_OPS_AVAILABLE),
        ("3", "Upload endpoint smoke test", "uploads_test", UPLOADS_OPS_AVAILABLE),
        ("4", "Print current configured paths", "uploads_paths", UPLOADS_OPS_AVAILABLE),
        ("0", "Back to main menu", "back", True),
    ]
    
    for num, desc, _, available in menu_items:
        ready_symbol = " ✓" if available else ""
        print_colored(f"  ({num}) {desc}{ready_symbol}", Colors.OKCYAN)
    print()


def show_build_menu():
    """Display Build / Dist Integrity submenu."""
    if not BUILD_OPS_AVAILABLE:
        print_colored("Build operations module not available.", Colors.FAIL)
        return
    
    print_colored("\n=== Build / Dist Integrity ===\n", Colors.HEADER)
    
    menu_items = [
        ("1", "Show current build state summary", "build_state", BUILD_OPS_AVAILABLE),
        ("2", "Verify backend dist integrity", "build_verify", BUILD_OPS_AVAILABLE),
        ("3", "Backend rebuild + PM2 restart", "build_backend", BUILD_OPS_AVAILABLE),
        ("4", "Frontend rebuild", "build_frontend", BUILD_OPS_AVAILABLE),
        ("5", "Show top recent backend errors", "build_errors", BUILD_OPS_AVAILABLE),
        ("0", "Back to main menu", "back", True),
    ]
    
    for num, desc, _, available in menu_items:
        ready_symbol = " ✓" if available else ""
        print_colored(f"  ({num}) {desc}{ready_symbol}", Colors.OKCYAN)
    print()


def handle_nginx_submenu():
    """Handle Nginx operations submenu."""
    if not NGINX_OPS_AVAILABLE:
        print_colored("Nginx operations module not available.", Colors.FAIL)
        return
    
    while True:
        show_nginx_menu()
        try:
            choice = input(f"{Colors.OKCYAN}Select option: {Colors.ENDC}").strip()
        except (EOFError, KeyboardInterrupt):
            break
        
        if choice == "0":
            break
        elif choice == "1":
            success, status_info = nginx_status()
            if success:
                print_colored(f"\nNginx Version:", Colors.HEADER)
                print(status_info.get("version", "unknown"))
                print_colored(f"\nStatus:", Colors.HEADER)
                print(status_info.get("status", "")[:500])
                print_colored(f"\nActive Config Files:", Colors.HEADER)
                for cfg in status_info.get("config_files", []):
                    print(f"  {cfg}")
            if CHANGELOG_AVAILABLE:
                auto_append_backup_entry("nginx_status", "nginx", [])
        elif choice == "2":
            success, output = nginx_validate_config()
            print_colored(f"\nNginx Config Validation:", Colors.HEADER)
            if success:
                print_colored("PASS", Colors.OKGREEN)
                print(output)
            else:
                print_colored("FAIL", Colors.FAIL)
                print(output)
            if CHANGELOG_AVAILABLE:
                auto_append_backup_entry("nginx_validate", "nginx", [])
        elif choice == "3":
            config_file = find_orthodoxmetrics_site_config()
            if config_file:
                settings = parse_proxy_settings(config_file)
                print_colored(f"\nAPI Proxy Settings ({config_file}):", Colors.HEADER)
                print(f"Proxy Pass: {settings.get('proxy_pass', 'not found')}")
                print(f"Target: {settings.get('proxy_pass_target', 'unknown')}")
                print(f"Max Body Size: {settings.get('client_max_body_size', 'not set')}")
                print(f"Read Timeout: {settings.get('proxy_read_timeout', 'not set')}")
                if settings.get("location_api"):
                    print(f"\nLocation Block:\n{settings['location_api']}")
            else:
                print_colored("Could not find orthodoxmetrics site config.", Colors.WARNING)
        elif choice == "4":
            config_file = find_orthodoxmetrics_site_config()
            if config_file:
                baseline, unified_diff = generate_safe_proxy_baseline(config_file)
                print_colored(f"\nSafe API Proxy Baseline (DRY RUN):", Colors.HEADER)
                print(baseline)
                if unified_diff:
                    print_colored(f"\n=== Unified Diff Preview ===", Colors.HEADER)
                    print(unified_diff)
                print_colored(f"\nThis would be applied to: {config_file}", Colors.WARNING)
            else:
                print_colored("Could not find orthodoxmetrics site config.", Colors.WARNING)
        elif choice == "5":
            config_file = find_orthodoxmetrics_site_config()
            if config_file:
                baseline, unified_diff = generate_safe_proxy_baseline(config_file)
                success, msg = apply_proxy_baseline(config_file, baseline, unified_diff=unified_diff, dry_run=False)
                print_colored(msg, Colors.OKGREEN if success else Colors.FAIL)
                if CHANGELOG_AVAILABLE and success:
                    auto_append_backup_entry("nginx_apply_baseline", "nginx", [str(config_file)])
            else:
                print_colored("Could not find orthodoxmetrics site config.", Colors.WARNING)
        elif choice == "6":
            log_input = input(f"{Colors.OKCYAN}Log file path (default: /var/log/nginx/error.log): {Colors.ENDC}").strip()
            log_file = Path(log_input) if log_input else NGINX_ERROR_LOG
            lines_input = input(f"{Colors.OKCYAN}Number of lines (default 200): {Colors.ENDC}").strip()
            lines = int(lines_input) if lines_input.isdigit() else 200
            follow_input = input(f"{Colors.OKCYAN}Follow mode? (yes/no, default no): {Colors.ENDC}").strip().lower()
            follow = follow_input == "yes"
            success, output = nginx_tail_logs(log_file, lines, follow)
            if success and not follow:
                print(output)
        else:
            print_colored("Invalid option.", Colors.FAIL)
        
        if choice != "0":
            input(f"\n{Colors.OKCYAN}Press Enter to continue...{Colors.ENDC}")


def handle_uploads_submenu():
    """Handle Uploads & Paths Health submenu."""
    if not UPLOADS_OPS_AVAILABLE:
        print_colored("Uploads operations module not available.", Colors.FAIL)
        return
    
    while True:
        show_uploads_menu()
        try:
            choice = input(f"{Colors.OKCYAN}Select option: {Colors.ENDC}").strip()
        except (EOFError, KeyboardInterrupt):
            break
        
        if choice == "0":
            break
        elif choice == "1":
            results = check_upload_dirs()
            print_colored(f"\nUpload Directories Check:", Colors.HEADER)
            for path, result in results.items():
                print(f"\n{path}:")
                print(f"  Exists: {result.get('exists', False)}")
                if result.get('exists'):
                    print(f"  Owner/Group: {result.get('owner', 'unknown')}/{result.get('group', 'unknown')}")
                    print(f"  Permissions: {result.get('permissions', 'unknown')}")
                    print(f"  Writable: {result.get('writable', False)}")
                    if result.get('writable_test'):
                        print(f"  Test: {result['writable_test']}")
            if CHANGELOG_AVAILABLE:
                auto_append_backup_entry("uploads_check", "paths", list(results.keys()))
        elif choice == "2":
            success, msg = fix_missing_dirs(dry_run=False)
            print_colored(msg, Colors.OKGREEN if success else Colors.FAIL)
            if CHANGELOG_AVAILABLE and success:
                auto_append_backup_entry("uploads_fix", "paths", [])
        elif choice == "3":
            success, result = upload_endpoint_smoke_test()
            if success:
                print_colored(f"\nUpload Endpoint Test:", Colors.HEADER)
                print(f"Status Code: {result.get('status_code', 'unknown')}")
                print(f"Response: {result.get('response', 'none')[:200]}")
            else:
                print_colored(f"Test failed: {result.get('error', 'unknown')}", Colors.FAIL)
        elif choice == "4":
            paths = get_configured_paths()
            print_colored(f"\nConfigured Paths:", Colors.HEADER)
            print(f"Images Root: {paths.get('images_root', 'not configured')}")
            print(f"Docs Root: {paths.get('docs_root', 'not configured')}")
            print(f"Uploads Root: {paths.get('uploads_root', 'not configured')}")
        else:
            print_colored("Invalid option.", Colors.FAIL)
        
        if choice != "0":
            input(f"\n{Colors.OKCYAN}Press Enter to continue...{Colors.ENDC}")


def handle_build_submenu():
    """Handle Build / Dist Integrity submenu."""
    if not BUILD_OPS_AVAILABLE:
        print_colored("Build operations module not available.", Colors.FAIL)
        return
    
    while True:
        show_build_menu()
        try:
            choice = input(f"{Colors.OKCYAN}Select option: {Colors.ENDC}").strip()
        except (EOFError, KeyboardInterrupt):
            break
        
        if choice == "0":
            break
        elif choice == "1":
            state = get_build_state()
            print_colored(f"\nBuild State Summary:", Colors.HEADER)
            print(f"\nBackend:")
            print(f"  Dist exists: {state['backend'].get('dist_exists', False)}")
            if state['backend'].get('dist_exists'):
                print(f"  File count: {state['backend'].get('file_count', 0)}")
                print(f"  Latest modified: {state['backend'].get('latest_modified', 'unknown')}")
            print(f"\nFrontend:")
            print(f"  Dist exists: {state['frontend'].get('dist_exists', False)}")
            if state['frontend'].get('dist_exists'):
                print(f"  File count: {state['frontend'].get('file_count', 0)}")
                print(f"  Latest modified: {state['frontend'].get('latest_modified', 'unknown')}")
        elif choice == "2":
            success, results = verify_backend_dist_integrity()
            print_colored(f"\nBackend Dist Integrity:", Colors.HEADER)
            if success:
                print_colored("PASS", Colors.OKGREEN)
            else:
                print_colored("FAIL", Colors.FAIL)
            print(f"\nKey Files:")
            for path, exists in results.get("key_files", {}).items():
                status = "✓" if exists else "✗"
                print(f"  {status} {path}")
            print(f"\nSyntax Checks:")
            for path, check in results.get("syntax_checks", {}).items():
                status = "✓" if check.get("valid") else "✗"
                print(f"  {status} {path}")
                if check.get("error"):
                    print(f"    Error: {check['error']}")
            if CHANGELOG_AVAILABLE:
                auto_append_backup_entry("build_verify", "backend", [])
        elif choice == "3":
            dry_run_input = input(f"{Colors.OKCYAN}Dry run? (yes/no, default no): {Colors.ENDC}").strip().lower()
            dry_run = dry_run_input == "yes"
            success, msg = build_server_and_frontend(dry_run=dry_run)
            print_colored(msg, Colors.OKGREEN if success else Colors.FAIL)
            if CHANGELOG_AVAILABLE and success and not dry_run:
                auto_append_backup_entry("build_backend_rebuild", "backend", [])
        elif choice == "4":
            dry_run_input = input(f"{Colors.OKCYAN}Dry run? (yes/no, default no): {Colors.ENDC}").strip().lower()
            dry_run = dry_run_input == "yes"
            success, msg = frontend_rebuild(dry_run=dry_run)
            print_colored(msg, Colors.OKGREEN if success else Colors.FAIL)
            if CHANGELOG_AVAILABLE and success and not dry_run:
                auto_append_backup_entry("build_frontend_rebuild", "frontend", [])
        elif choice == "5":
            errors = get_recent_backend_errors(200)
            print_colored(f"\nRecent Backend Errors:", Colors.HEADER)
            print(f"\nCounts:")
            for error_type, count in errors.get("counts", {}).items():
                print(f"  {error_type}: {count}")
            print(f"\nSamples:")
            for error_type, samples in errors.get("samples", {}).items():
                if samples:
                    print(f"\n  {error_type}:")
                    for sample in samples[:3]:
                        print(f"    {sample[:150]}")
        else:
            print_colored("Invalid option.", Colors.FAIL)
        
        if choice != "0":
            input(f"\n{Colors.OKCYAN}Press Enter to continue...{Colors.ENDC}")


def main():
    """Main entry point."""
    global DRY_RUN
    
    # Bootstrap exclusions on first run (before any operations)
    try:
        if EXCLUSIONS_AVAILABLE and EXCLUSIONS_FILE:
            # Ensure exclusions config exists (auto-creates with Recommended preset if missing)
            if not EXCLUSIONS_FILE.exists():
                bootstrap_exclusions()
                print_colored("Initialized OM-Ops Hard Exclusions using Recommended preset", Colors.OKGREEN)
                print_colored(f"  Config: {EXCLUSIONS_FILE}", Colors.OKCYAN)
            else:
                # Load to cache (silent)
                load_exclusions()
    except Exception as e:
        # Non-fatal: continue without exclusions if bootstrap fails
        print_colored(f"Warning: Could not bootstrap exclusions: {e}", Colors.WARNING)
    
    # Parse command line arguments
    parser = argparse.ArgumentParser(description="OM-Ops - Operations Suite (formerly OM-Recovery)")
    parser.add_argument("--dry-run", action="store_true", help="Dry run mode (no files created)")
    parser.add_argument("--analyze", choices=["prod", "server", "front-end", "entire"],
                       help="Run analysis for specified scope (non-interactive)")
    parser.add_argument("--dedupe-mode", choices=["quick", "full"], default="quick",
                       help="Duplicate detection mode (default: quick)")
    parser.add_argument("--max-hash-mb", type=int, default=20,
                       help="Maximum file size to hash in MB (default: 20)")
    parser.add_argument("--stale-days", type=int, default=180,
                       help="Days threshold for stale files (default: 180)")
    
    # Changelog arguments
    changelog_group = parser.add_argument_group("changelog", "Development changelog options")
    changelog_group.add_argument("--changelog", choices=["start", "add", "close", "report", "list"],
                                help="Changelog operation")
    changelog_group.add_argument("--title", help="Session title (for start)")
    changelog_group.add_argument("--tags", help="Comma-separated tags (for start)")
    changelog_group.add_argument("--scope", choices=["prod", "server", "front-end", "mixed"],
                                default="mixed", help="Session scope (for start)")
    changelog_group.add_argument("--type", choices=["prompt", "followup", "result", "decision", "command", "note"],
                                help="Entry type (for add)")
    changelog_group.add_argument("--actor", choices=["user", "cursor", "assistant", "system"],
                                default="user", help="Entry actor (for add)")
    changelog_group.add_argument("--text", help="Entry content (for add)")
    changelog_group.add_argument("--summary", help="Session summary (for close)")
    changelog_group.add_argument("--outcome", choices=["success", "fail"], help="Session outcome (for close)")
    changelog_group.add_argument("--days", type=int, default=7, help="Days to list (for list)")
    
    args = parser.parse_args()
    
    if args.dry_run:
        DRY_RUN = True
        print_colored("*** DRY RUN MODE - No files will be created ***\n", Colors.WARNING)
    
    # Check root only for operations that require it
    # Read-only operations (analysis, reports, changelog list) don't need root
    needs_root = args.analyze is None and args.changelog not in ["list", "report"]
    if needs_root:
        if not check_root(required=True):
            sys.exit(1)
    
    # Ensure directories exist
    ensure_directories()
    
    # Handle non-interactive analysis
    if args.analyze:
        if not ANALYSIS_AVAILABLE:
            print_colored("Analysis module not available.", Colors.FAIL)
            sys.exit(1)
        
        ensure_analysis_dirs()
        
        scope_configs = {
            "prod": {
                "root_paths": [REPO_ROOT],
                "exclude_patterns": BACKUP_CONFIG["prod"]["exclude_patterns"],
            },
            "server": {
                "root_paths": [REPO_ROOT / "server"],
                "exclude_patterns": BACKUP_CONFIG["server"]["exclude_patterns"],
            },
            "front-end": {
                "root_paths": [REPO_ROOT / "front-end"],
                "exclude_patterns": BACKUP_CONFIG["front-end"]["exclude_patterns"],
            },
            "entire": {
                "root_paths": [REPO_ROOT, Path("/etc/nginx")],
                "exclude_patterns": BACKUP_CONFIG["prod"]["exclude_patterns"],
            },
        }
        
        config = scope_configs[args.analyze]
        result = run_analysis(
            scope_name=args.analyze,
            root_paths=config["root_paths"],
            exclude_patterns=config["exclude_patterns"],
            dedupe_mode=args.dedupe_mode,
            max_hash_mb=args.max_hash_mb,
            stale_days=args.stale_days,
            dry_run=args.dry_run,
        )
        
        log(f"category=analysis scope={args.analyze} duration={result['results']['duration_seconds']:.2f}s "
            f"total_files={result['results']['inventory']['total_files']} "
            f"total_bytes={result['results']['inventory']['total_bytes']}", "INFO")
        
        print(f"\nAnalysis complete!")
        print(f"  Run directory: {result['run_dir']}")
        print(f"  HTML report: {result['report_file']}")
        
        # Auto-append to changelog if active session exists
        if CHANGELOG_AVAILABLE:
            auto_append_backup_entry(
                operation_type="analysis",
                scope=args.analyze,
                output_paths=[result['run_dir'], result['report_file']]
            )
        
        sys.exit(0)
    
    # Handle non-interactive changelog operations
    if args.changelog:
        if not CHANGELOG_AVAILABLE:
            print_colored("Changelog module not available.", Colors.FAIL)
            sys.exit(1)
        
        if args.changelog == "start":
            if not args.title:
                print_colored("Error: --title is required for --changelog start", Colors.FAIL)
                sys.exit(1)
            tags = [t.strip() for t in args.tags.split(",")] if args.tags else []
            session = start_session(args.title, tags, args.scope)
            print(f"Started session: {session['session_id']}")
            sys.exit(0)
        
        elif args.changelog == "add":
            if not args.text:
                print_colored("Error: --text is required for --changelog add", Colors.FAIL)
                sys.exit(1)
            if not args.type:
                print_colored("Error: --type is required for --changelog add", Colors.FAIL)
                sys.exit(1)
            success = add_entry(args.type, args.actor, args.text)
            sys.exit(0 if success else 1)
        
        elif args.changelog == "close":
            success = close_session(summary=args.summary, outcome=args.outcome)
            sys.exit(0 if success else 1)
        
        elif args.changelog == "report":
            generate_changelog_report()
            print(f"Changelog report generated: {CHANGELOG_REPORT_FILE}")
            sys.exit(0)
        
        elif args.changelog == "list":
            sessions = list_sessions(args.days)
            print(f"\n=== Sessions (last {args.days} days) ===\n")
            print(f"{'Started':<20} {'Title':<40} {'Status':<10} {'Entries':<10} {'Scope':<15}")
            print("-" * 100)
            for session in sessions:
                started = session.get("started_at", "")[:19].replace("T", " ")
                title = session.get("title", "Untitled")[:38]
                status = session.get("status", "CLOSED")
                entry_count = session.get("entry_count", 0)
                scope = session.get("scope", "mixed")
                print(f"{started:<20} {title:<40} {status:<10} {entry_count:<10} {scope:<15}")
            sys.exit(0)
    
    # Main menu loop with return-based navigation
    while True:
        action = main_menu()
        
        if action == "exit":
            print_colored("Exiting...", Colors.OKGREEN)
            break
        elif action == "pm2":
            # TODO: Refactor PM2 menu similarly
            current_menu = "pm2"
            # ... existing PM2 handling ...
            continue
        elif action == "git":
            # TODO: Refactor Git menu similarly
            current_menu = "git"
            # ... existing Git handling ...
            continue
        elif action == "backups":
            # TODO: Refactor Backups menu similarly
            current_menu = "backups"
            # ... existing Backups handling ...
            continue
        elif action == "analysis":
            # TODO: Refactor Analysis menu similarly
            current_menu = "analysis"
            # ... existing Analysis handling ...
            continue
        elif action == "changelog":
            # TODO: Refactor Changelog menu similarly
            current_menu = "changelog"
            # ... existing Changelog handling ...
            continue
        elif action == "system_summary":
            handle_system_summary()
        elif action == "motivation":
            handle_motivation()
        elif action == "roadmap":
            # TODO: Refactor Roadmap menu similarly
            current_menu = "roadmap"
            # ... existing Roadmap handling ...
            continue
        elif action == "nginx":
            # TODO: Refactor Nginx menu similarly
            current_menu = "nginx"
            # ... existing Nginx handling ...
            continue
        elif action == "uploads":
            # TODO: Refactor Uploads menu similarly
            current_menu = "uploads"
            # ... existing Uploads handling ...
            continue
        elif action == "build":
            # TODO: Refactor Build menu similarly
            current_menu = "build"
            # ... existing Build handling ...
            continue
        elif action == "capabilities":
            try:
                clear_screen()
                caps = check_capabilities()
                body_lines = []
                body_lines.append("")
                body_lines.append("SYSTEM CAPABILITIES")
                body_lines.append("-" * 60)
                body_lines.append("")
                for tool, available in caps.items():
                    status = "✓ Available" if available else "✗ Not available"
                    body_lines.append(f"  {tool:20} {status}")
                body_lines.append("")
                
                render_screen(
                    title="System Capabilities",
                    breadcrumb="OM-Ops › Capabilities",
                    body_lines=body_lines,
                    footer_hint="[Enter] Back   [0] Main Menu   [q] Quit"
                )
                wait_for_enter()
            except Exception as e:
                clear_screen()
                render_screen(
                    title="System Capabilities",
                    breadcrumb="OM-Ops › Capabilities › Error",
                    body_lines=[
                        "",
                        "✗ Error checking capabilities:",
                        "",
                        str(e)[:200],
                        "",
                    ],
                    footer_hint="[Enter] Back   [0] Main Menu   [q] Quit"
                )
                wait_for_enter()
        elif action == "omai_quick":
            if not OMAI_DISCOVERY_AVAILABLE:
                clear_screen()
                render_screen(
                    title="OMAI Discovery",
                    breadcrumb="OM-Ops › OMAI Discovery (Quick)",
                    body_lines=["OMAI discovery module not available."],
                    footer_hint="[Enter] Back   [0] Main Menu   [q] Quit"
                )
                wait_for_enter()
            else:
                try:
                    clear_screen()
                    render_screen(
                        title="OMAI Discovery",
                        breadcrumb="OM-Ops › OMAI Discovery (Quick)",
                        body_lines=["Running OMAI discovery (Quick mode, ~20s max)...", ""],
                        footer_hint="Please wait..."
                    )
                    
                    success, report_path = run_discovery(mode="quick")
                    
                    clear_screen()
                    if success:
                        render_screen(
                            title="OMAI Discovery",
                            breadcrumb="OM-Ops › OMAI Discovery (Quick) › Complete",
                            body_lines=[
                                "",
                                "✓ OMAI discovery complete!",
                                "",
                                f"Report: {report_path}",
                                "",
                            ],
                            footer_hint="[Enter] Back   [0] Main Menu   [q] Quit"
                        )
                    else:
                        render_screen(
                            title="OMAI Discovery",
                            breadcrumb="OM-Ops › OMAI Discovery (Quick) › Failed",
                            body_lines=[
                                "",
                                "✗ Discovery failed:",
                                "",
                                str(report_path)[:200],
                                "",
                            ],
                            footer_hint="[Enter] Back   [0] Main Menu   [q] Quit"
                        )
                    wait_for_enter()
                except Exception as e:
                    clear_screen()
                    render_screen(
                        title="OMAI Discovery",
                        breadcrumb="OM-Ops › OMAI Discovery (Quick) › Error",
                        body_lines=[
                            "",
                            "✗ Error running discovery:",
                            "",
                            str(e)[:200],
                            "",
                        ],
                        footer_hint="[Enter] Back   [0] Main Menu   [q] Quit"
                    )
                    wait_for_enter()
        elif action == "omai_deep":
            if not OMAI_DISCOVERY_AVAILABLE:
                clear_screen()
                render_screen(
                    title="OMAI Discovery",
                    breadcrumb="OM-Ops › OMAI Discovery (Deep)",
                    body_lines=["OMAI discovery module not available."],
                    footer_hint="[Enter] Back   [0] Main Menu   [q] Quit"
                )
                wait_for_enter()
            else:
                try:
                    clear_screen()
                    render_screen(
                        title="OMAI Discovery",
                        breadcrumb="OM-Ops › OMAI Discovery (Deep)",
                        body_lines=["Running OMAI discovery (Deep mode, ~2min max)...", ""],
                        footer_hint="Please wait..."
                    )
                    
                    success, report_path = run_discovery(mode="deep")
                    
                    clear_screen()
                    if success:
                        render_screen(
                            title="OMAI Discovery",
                            breadcrumb="OM-Ops › OMAI Discovery (Deep) › Complete",
                            body_lines=[
                                "",
                                "✓ OMAI discovery complete!",
                                "",
                                f"Report: {report_path}",
                                "",
                            ],
                            footer_hint="[Enter] Back   [0] Main Menu   [q] Quit"
                        )
                    else:
                        render_screen(
                            title="OMAI Discovery",
                            breadcrumb="OM-Ops › OMAI Discovery (Deep) › Failed",
                            body_lines=[
                                "",
                                "✗ Discovery failed:",
                                "",
                                str(report_path)[:200],
                                "",
                            ],
                            footer_hint="[Enter] Back   [0] Main Menu   [q] Quit"
                        )
                    wait_for_enter()
                except Exception as e:
                    clear_screen()
                    render_screen(
                        title="OMAI Discovery",
                        breadcrumb="OM-Ops › OMAI Discovery (Deep) › Error",
                        body_lines=[
                            "",
                            "✗ Error running discovery:",
                            "",
                            str(e)[:200],
                            "",
                        ],
                        footer_hint="[Enter] Back   [0] Main Menu   [q] Quit"
                    )
                    wait_for_enter()
        elif action == "build_deploy":
            if not BUILD_OPS_AVAILABLE or handle_build_deploy_submenu is None:
                clear_screen()
                render_screen(
                    title="Build & Deploy",
                    breadcrumb="OM-Ops › Build & Deploy",
                    body_lines=["Build & Deploy module not available."],
                    footer_hint="[Enter] Back   [0] Main Menu   [q] Quit"
                )
                wait_for_enter()
            else:
                try:
                    handle_build_deploy_submenu()
                except Exception as e:
                    clear_screen()
                    render_screen(
                        title="Build & Deploy",
                        breadcrumb="OM-Ops › Build & Deploy › Error",
                        body_lines=[
                            "",
                            "✗ Error in build & deploy menu:",
                            "",
                            str(e)[:200],
                            "",
                        ],
                        footer_hint="[Enter] Back   [0] Main Menu   [q] Quit"
                    )
                    wait_for_enter()
        elif action == "exclusions":
            if not EXCLUSIONS_AVAILABLE or handle_exclusions_submenu is None:
                clear_screen()
                render_screen(
                    title="Hard Exclusions",
                    breadcrumb="OM-Ops › Hard Exclusions",
                    body_lines=["Hard Exclusions module not available."],
                    footer_hint="[Enter] Back   [0] Main Menu   [q] Quit"
                )
                wait_for_enter()
            else:
                try:
                    result = handle_exclusions_submenu()
                except Exception as e:
                    clear_screen()
                    render_screen(
                        title="Hard Exclusions",
                        breadcrumb="OM-Ops › Hard Exclusions › Error",
                        body_lines=[
                            "",
                            "✗ Error in exclusions menu:",
                            "",
                            str(e)[:200],
                            "",
                        ],
                        footer_hint="[Enter] Back   [0] Main Menu   [q] Quit"
                    )
                    wait_for_enter()
        elif action == "preflight":
            handle_preflight_discovery()
        elif action == "zammad":
            handle_zammad_check()
        elif action == "freescout":
            handle_freescout_check()
        elif action == "instance_info":
            handle_instance_info()
        elif action == "server_status":
            if SERVER_STATUS_AVAILABLE and run_server_status_menu:
                try:
                    run_server_status_menu()
                except Exception as e:
                    clear_screen()
                    render_screen(
                        title="Server Status",
                        breadcrumb="OM-Ops › Server Status › Error",
                        body_lines=[
                            "",
                            "✗ Error in server status menu:",
                            "",
                            str(e)[:200],
                            "",
                        ],
                        footer_hint="[Enter] Back   [0] Main Menu   [q] Quit"
                    )
                    wait_for_enter()
            else:
                clear_screen()
                render_screen(
                    title="Server Status",
                    breadcrumb="OM-Ops › Server Status",
                    body_lines=["Server Status module not available."],
                    footer_hint="[Enter] Back   [0] Main Menu   [q] Quit"
                )
                wait_for_enter()


if __name__ == "__main__":
    main()
