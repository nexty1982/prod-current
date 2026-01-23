#!/usr/bin/env python3
"""
OM-Ops - OMAI Discovery Module (READ-ONLY)

This module performs read-only discovery of OMAI components in the codebase.
It does NOT enable, refactor, or delete OMAI code.

Purpose:
- Identify OMAI-related files, classes, functions
- Determine runtime status (ACTIVE/DORMANT/DEAD)
- Discover database tables and config
- Classify components for future integration
- Generate discovery report

DO NOT enable OMAI execution yet.
"""

import os
import sys
import re
import json
import datetime
import time
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from collections import defaultdict

# Configuration
REPO_ROOT = Path("/var/www/orthodoxmetrics/prod")
BACKEND_DIR = REPO_ROOT / "server"
FRONTEND_DIR = REPO_ROOT / "front-end"
DISCOVERY_REPORT = Path(__file__).parent / "OMAI_DISCOVERY_REPORT.md"

# Performance configuration - Quick mode (default)
MAX_RUNTIME_SECONDS_QUICK = 20
MAX_FILES_SCANNED_QUICK = 5000
MAX_BYTES_PER_FILE_QUICK = 256 * 1024  # 256KB
MAX_TOTAL_BYTES_QUICK = 50 * 1024 * 1024  # 50MB total

# Performance configuration - Deep mode
MAX_RUNTIME_SECONDS_DEEP = 120
MAX_FILES_SCANNED_DEEP = 20000
MAX_BYTES_PER_FILE_DEEP = 512 * 1024  # 512KB
MAX_TOTAL_BYTES_DEEP = 200 * 1024 * 1024  # 200MB total

# Quick mode: likely directories to scan (if they exist)
QUICK_SCAN_DIRS = [
    "server/src",
    "server/routes",
    "server/api",
    "server/scripts",
    "server/dist",
]

# Exclusion patterns (same as analysis.py)
EXCLUDE_PATTERNS = [
    "**/node_modules/**",
    "**/dist/**",
    "**/build/**",
    "**/.git/**",
    "**/.cache/**",
    "**/.vite/**",
    "**/_cursor_session_backup/**",
    "**/.venv*/**",
    "**/.venv_image/**",
    "**/coverage/**",
]

# Import shared utilities
try:
    script_dir = Path(__file__).parent
    if str(script_dir) not in sys.path:
        sys.path.insert(0, str(script_dir))
    from utils import log_ops
except ImportError:
    # Fallback if utils not available
    def log_ops(msg, level="INFO"):
        print(f"[{level}] {msg}")

# Import hard exclusions
try:
    script_dir = Path(__file__).parent
    if str(script_dir) not in sys.path:
        sys.path.insert(0, str(script_dir))
    from exclusions import is_excluded as is_hard_excluded
    HARD_EXCLUSIONS_AVAILABLE = True
except ImportError:
    def is_hard_excluded(path: str, scanner_name: str = "discovery") -> bool:
        return False
    HARD_EXCLUSIONS_AVAILABLE = False

# OMAI-related search patterns
OMAI_PATTERNS = [
    r"omai",
    r"OMAI",
    r"intelligence.*pipeline",
    r"memory.*core",
    r"command.*router",
    r"ai.*assistant",
]


def normalize_path_to_posix(path_str: str) -> str:
    """Normalize a path to POSIX style (forward slashes) regardless of OS."""
    return path_str.replace(os.sep, "/").replace("\\", "/")


def should_exclude(rel_posix_path: str) -> bool:
    """Check if a path should be excluded (fast-path for common junk dirs + hard exclusions)."""
    # Check hard exclusions first (mandatory)
    if HARD_EXCLUSIONS_AVAILABLE:
        try:
            # Convert relative path to absolute for hard exclusion check
            abs_path = str(REPO_ROOT / rel_posix_path)
            if is_hard_excluded(abs_path, "discovery"):
                return True
        except Exception:
            # If conversion fails, try direct check
            if is_hard_excluded(rel_posix_path, "discovery"):
                return True
    
    rel_posix_path = rel_posix_path.lstrip("./")
    rel_posix_path = normalize_path_to_posix(rel_posix_path)
    path_parts = rel_posix_path.split("/")
    
    # Fast path: check for common junk directory names
    junk_dirs = {"node_modules", "dist", "build", ".git", ".cache", ".vite", 
                 "_cursor_session_backup", "coverage"}
    for part in path_parts:
        if part in junk_dirs:
            return True
        # Check for .venv* patterns
        if part.startswith(".venv"):
            return True
    
    return False


def search_codebase_for_omai(mode: str, max_runtime: float, max_files: int, max_bytes_per_file: int, max_total_bytes: int, start_time: float) -> Dict:
    """
    Search repo for OMAI-related code with strict runtime and file caps.
    
    Args:
        mode: "quick" or "deep"
        max_runtime: Maximum runtime in seconds
        max_files: Maximum files to scan
        max_bytes_per_file: Maximum bytes per file
        max_total_bytes: Maximum total bytes scanned
        start_time: Start time for runtime tracking
    """
    findings = {
        "files": [],
        "classes": [],
        "functions": [],
        "imports": [],
        "files_scanned": 0,
        "files_skipped": 0,
        "bytes_scanned": 0,
        "scan_capped": False,
        "timed_out": False,
        "bytes_capped": False,
        "mode": mode,
        "stop_reason": "completed",
    }
    
    if not BACKEND_DIR.exists():
        return findings
    
    files_scanned = 0
    files_skipped = 0
    
    # Quick mode: scan only likely directories
    if mode == "quick":
        scan_paths = []
        for rel_dir in QUICK_SCAN_DIRS:
            full_path = REPO_ROOT / rel_dir
            if full_path.exists() and full_path.is_dir():
                scan_paths.append(full_path)
        
        if not scan_paths:
            # Fallback: scan backend root but with strict caps
            scan_paths = [BACKEND_DIR]
    else:
        # Deep mode: scan entire backend
        scan_paths = [BACKEND_DIR]
    
    print(f"  Scanning {len(scan_paths)} directory(ies) in {mode} mode...")
    
    for root_path in scan_paths:
        if time.time() - start_time > max_runtime:
            findings["timed_out"] = True
            findings["files_scanned"] = files_scanned
            findings["files_skipped"] = files_skipped
            print(f"  TIMEOUT: Exceeded {max_runtime}s runtime limit")
            return findings
        
        try:
            for current_path, dirs, files in os.walk(root_path):
                # Check hard exclusions for current directory (mandatory)
                current_path_obj = Path(current_path)
                if HARD_EXCLUSIONS_AVAILABLE and is_hard_excluded(str(current_path_obj.resolve()), "discovery"):
                    # Skip entire directory tree
                    dirs[:] = []
                    files = []
                    continue
                
                # Check runtime every directory
                if time.time() - start_time > max_runtime:
                    findings["timed_out"] = True
                    findings["files_scanned"] = files_scanned
                    findings["files_skipped"] = files_skipped
                    print(f"  TIMEOUT: Exceeded {max_runtime}s runtime limit")
                    return findings
                
                # Filter excluded directories (modify dirs in-place to skip them)
                dirs[:] = [d for d in dirs if not should_exclude(
                    normalize_path_to_posix(os.path.relpath(
                        Path(current_path) / d, root_path
                    ))
                )]
                
                # Process files
                for file_name in files:
                    files_scanned += 1
                    
                    # Progress output every 250 files with elapsed time
                    if files_scanned % 250 == 0:
                        elapsed = time.time() - start_time
                        print(f"  Progress: {files_scanned} scanned, {files_skipped} skipped, {elapsed:.1f}s elapsed", flush=True)
                    
                    # File count cap
                    if files_scanned > max_files:
                        findings["scan_capped"] = True
                        findings["files_scanned"] = files_scanned
                        findings["files_skipped"] = files_skipped
                        print(f"  WARNING: Scan capped at {max_files} files")
                        return findings
                    
                    # Runtime cap check
                    if time.time() - start_time > max_runtime:
                        findings["timed_out"] = True
                        findings["files_scanned"] = files_scanned
                        findings["files_skipped"] = files_skipped
                        print(f"  TIMEOUT: Exceeded {max_runtime}s runtime limit")
                        return findings
                    
                    file_path = Path(current_path) / file_name
                    
                    # Check hard exclusions for file (mandatory)
                    if HARD_EXCLUSIONS_AVAILABLE and is_hard_excluded(str(file_path.resolve()), "discovery"):
                        files_skipped += 1
                        continue
                    
                    # Check file extension
                    if file_path.suffix not in [".js", ".ts", ".jsx", ".tsx"]:
                        files_skipped += 1
                        continue
                    
                    # Check exclusion (pattern-based)
                    try:
                        rel_path = file_path.relative_to(REPO_ROOT)
                        rel_posix = normalize_path_to_posix(str(rel_path))
                        if should_exclude(rel_posix):
                            files_skipped += 1
                            continue
                    except Exception:
                        files_skipped += 1
                        continue
                    
                    # Check file size before reading
                    try:
                        file_size = file_path.stat().st_size
                        if file_size > max_bytes_per_file:
                            files_skipped += 1
                            continue
                    except Exception:
                        files_skipped += 1
                        continue
                    
                    try:
                        # Read file with size limit
                        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                            # For quick mode, do substring search first
                            if mode == "quick":
                                # Read first chunk for quick substring check
                                chunk = f.read(max_bytes_per_file)
                                if "omai" not in chunk.lower():
                                    files_skipped += 1
                                    continue
                                # If substring found, read full file (within limit) for pattern matching
                                content = chunk
                            else:
                                # Deep mode: read full file (within limit)
                                content = f.read(max_bytes_per_file)
                            
                            rel_path = file_path.relative_to(REPO_ROOT)
                            
                            # Check for OMAI patterns (only if substring matched in quick mode)
                            matches = []
                            for pattern in OMAI_PATTERNS:
                                if re.search(pattern, content, re.IGNORECASE):
                                    matches.append(pattern)
                            
                            if matches:
                                # Extract classes and functions
                                classes = re.findall(r"class\s+(\w+).*omai", content, re.IGNORECASE)
                                functions = re.findall(r"(?:function|const|let|var)\s+(\w+).*omai", content, re.IGNORECASE)
                                
                                findings["files"].append({
                                    "path": str(rel_path),
                                    "purpose": "unknown",
                                    "matches": matches,
                                    "classes": classes,
                                    "functions": functions,
                                })
                    except Exception:
                        files_skipped += 1
                        pass
        except Exception as e:
            log_ops(f"Error scanning {root_path}: {e}", "ERROR")
            continue
    
    findings["files_scanned"] = files_scanned
    findings["files_skipped"] = files_skipped
    
    elapsed = time.time() - start_time
    print(f"  Scan complete: {files_scanned} scanned, {files_skipped} skipped, {elapsed:.1f}s elapsed")
    
    return findings


def check_imports(codebase_findings: Dict, mode: str, max_runtime: float, max_files: int, max_bytes_per_file: int, max_total_bytes: int, start_time: float) -> Dict:
    """
    Check if OMAI files are imported anywhere (optimized with runtime caps).
    
    Precomputes search tokens from OMAI files and scans each source file only once.
    
    Args:
        codebase_findings: Results from search_codebase_for_omai
        mode: "quick" or "deep"
        max_runtime: Maximum runtime in seconds
        max_files: Maximum files to scan
        max_bytes_per_file: Maximum bytes per file
        max_total_bytes: Maximum total bytes scanned
        start_time: Start time for runtime tracking
    """
    import_map = defaultdict(list)
    
    # Precompute search tokens from OMAI files (once)
    omai_tokens = {}
    for omai_file in codebase_findings["files"]:
        omai_path = omai_file["path"]
        # Generate multiple search tokens for flexible matching
        tokens = [
            omai_path.replace("/", ".").replace(".js", "").replace(".ts", ""),
            omai_path.replace("/", "/").replace(".js", "").replace(".ts", ""),
            Path(omai_path).stem,  # filename without extension
        ]
        omai_tokens[omai_path] = tokens
    
    if not omai_tokens or not BACKEND_DIR.exists():
        return import_map
    
    files_scanned = 0
    bytes_scanned = 0
    
    # Quick mode: scan only likely directories
    if mode == "quick":
        scan_paths = []
        for rel_dir in QUICK_SCAN_DIRS:
            full_path = REPO_ROOT / rel_dir
            if full_path.exists() and full_path.is_dir():
                scan_paths.append(full_path)
        if not scan_paths:
            scan_paths = [BACKEND_DIR]
    else:
        scan_paths = [BACKEND_DIR]
    
    # Scan each file only once
    try:
        for root_path in scan_paths:
            elapsed = time.time() - start_time
            if elapsed > max_runtime:
                return import_map
            
            try:
                for current_path, dirs, files in os.walk(root_path):
                    # Check hard exclusions for current directory (mandatory)
                    current_path_obj = Path(current_path)
                    if HARD_EXCLUSIONS_AVAILABLE and is_hard_excluded(str(current_path_obj.resolve()), "discovery"):
                        dirs[:] = []
                        files = []
                        continue
                    
                    # Runtime check
                    elapsed = time.time() - start_time
                    if elapsed > max_runtime:
                        return import_map
                    
                    # Filter excluded directories
                    dirs[:] = [d for d in dirs if not should_exclude(
                        normalize_path_to_posix(os.path.relpath(
                            Path(current_path) / d, root_path
                        ))
                    )]
                    
                    for file_name in files:
                        files_scanned += 1
                        
                        # Progress output every 250 files
                        if files_scanned % 250 == 0:
                            elapsed = time.time() - start_time
                            print(f"  Checking imports: {files_scanned} files, {bytes_scanned // 1024}KB read, {elapsed:.1f}s elapsed", flush=True)
                        
                        # File count cap
                        if files_scanned > max_files:
                            return import_map
                        
                        # Runtime cap
                        elapsed = time.time() - start_time
                        if elapsed > max_runtime:
                            return import_map
                        
                        # Total bytes cap
                        if bytes_scanned >= max_total_bytes:
                            return import_map
                        
                        file_path = Path(current_path) / file_name
                        
                        # Check file extension
                        if file_path.suffix not in [".js", ".ts", ".jsx", ".tsx"]:
                            continue
                        
                        # Check exclusion
                        try:
                            rel_path = file_path.relative_to(REPO_ROOT)
                            rel_posix = normalize_path_to_posix(str(rel_path))
                            if should_exclude(rel_posix):
                                continue
                        except Exception:
                            continue
                        
                        # Check file size
                        try:
                            file_size = file_path.stat().st_size
                            if file_size > max_bytes_per_file:
                                continue
                            if bytes_scanned + file_size > max_total_bytes:
                                continue
                        except Exception:
                            continue
                        
                        try:
                            read_size = min(max_bytes_per_file, 64 * 1024)  # Read up to 64KB for import check
                            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                                chunk = f.read(read_size)
                                bytes_scanned += len(chunk.encode('utf-8'))
                                rel_path_str = str(file_path.relative_to(REPO_ROOT))
                                
                                # Check each OMAI file's tokens against this file's content (single pass)
                                for omai_path, tokens in omai_tokens.items():
                                    for token in tokens:
                                        if token and token in chunk:
                                            import_map[omai_path].append(rel_path_str)
                                            break  # Found this OMAI file, move to next
                        except Exception:
                            pass
            except Exception as e:
                log_ops(f"Error checking imports in {root_path}: {e}", "ERROR")
                continue
    except KeyboardInterrupt:
        return import_map
    
    return import_map


def discover_runtime_status() -> Dict:
    """Discover OMAI runtime status from PM2 and logs."""
    status = {
        "pm2_processes": [],
        "log_mentions": [],
        "classification": "UNKNOWN",
    }
    
    # Check PM2 processes
    try:
        import subprocess
        result = subprocess.run(
            ["pm2", "list"],
            capture_output=True,
            text=True,
            timeout=5
        )
        if result.returncode == 0:
            pm2_output = result.stdout
            if "omai" in pm2_output.lower():
                status["pm2_processes"].append("OMAI process found in PM2")
                status["classification"] = "ACTIVE"
            else:
                status["classification"] = "DORMANT"
    except Exception:
        pass
    
    # Check PM2 logs for OMAI mentions
    try:
        result = subprocess.run(
            ["pm2", "logs", "orthodox-backend", "--lines", "100", "--nostream"],
            capture_output=True,
            text=True,
            timeout=5
        )
        if result.returncode == 0:
            log_lines = result.stdout.split("\n")
            omai_logs = [line for line in log_lines if "[OMAI]" in line or "omai" in line.lower()]
            if omai_logs:
                status["log_mentions"] = omai_logs[:20]  # Sample
                if status["classification"] == "UNKNOWN":
                    status["classification"] = "DORMANT"
    except Exception:
        pass
    
    return status


def discover_database_tables() -> Dict:
    """Discover OMAI-related database tables (if accessible)."""
    tables = {
        "found": [],
        "accessible": False,
    }
    
    # Try to connect and discover tables
    # This is read-only discovery
    try:
        # Check env for DB credentials (redacted)
        env_files = [
            BACKEND_DIR / ".env.production",
            BACKEND_DIR / ".env",
        ]
        
        db_name = None
        for env_file in env_files:
            if env_file.exists():
                try:
                    with open(env_file, "r") as f:
                        for line in f:
                            if "DB_NAME" in line or "MYSQL_DATABASE" in line:
                                db_name = line.split("=")[-1].strip().strip('"').strip("'")
                                break
                except Exception:
                    pass
        
        if db_name:
            # Try to list tables (read-only)
            import subprocess
            # This would require DB credentials - skip for now in discovery
            tables["accessible"] = False
            tables["note"] = "Database discovery requires DB credentials (not attempted in read-only mode)"
    except Exception:
        pass
    
    return tables


def discover_config_and_env(mode: str, max_runtime: float, max_files: int, start_time: float) -> Dict:
    """
    Discover OMAI-related config and env vars (with runtime caps).
    
    Args:
        mode: "quick" or "deep"
        max_runtime: Maximum runtime in seconds
        max_files: Maximum files to scan
        start_time: Start time for runtime tracking
    """
    config = {
        "env_vars": [],
        "flags": [],
        "comments": [],
        "default_state": "unknown",
    }
    
    # Search env files (always quick, no caps needed)
    env_files = [
        BACKEND_DIR / ".env.production",
        BACKEND_DIR / ".env",
        REPO_ROOT / ".env.production",
    ]
    
    for env_file in env_files:
        if env_file.exists():
            try:
                with open(env_file, "r") as f:
                    for line_num, line in enumerate(f, 1):
                        if "omai" in line.lower():
                            # Redact values
                            redacted = re.sub(r"=.*", "=<REDACTED>", line.strip())
                            config["env_vars"].append({
                                "file": str(env_file.relative_to(REPO_ROOT)),
                                "line": line_num,
                                "content": redacted,
                            })
            except Exception:
                pass
    
    # Search code for OMAI flags/comments (optimized with exclusions and caps)
    if BACKEND_DIR.exists():
        elapsed = time.time() - start_time
        if elapsed < max_runtime:
            files_scanned = 0
            
            # Quick mode: scan only likely directories
            if mode == "quick":
                scan_paths = []
                for rel_dir in QUICK_SCAN_DIRS:
                    full_path = REPO_ROOT / rel_dir
                    if full_path.exists() and full_path.is_dir():
                        scan_paths.append(full_path)
                if not scan_paths:
                    scan_paths = [BACKEND_DIR]
            else:
                scan_paths = [BACKEND_DIR]
            
            try:
                for root_path in scan_paths:
                    elapsed = time.time() - start_time
                    if elapsed > max_runtime:
                        break
                    
                    try:
                        for current_path, dirs, files in os.walk(root_path):
                            # Check hard exclusions for current directory (mandatory)
                            current_path_obj = Path(current_path)
                            if HARD_EXCLUSIONS_AVAILABLE and is_hard_excluded(str(current_path_obj.resolve()), "discovery"):
                                dirs[:] = []
                                files = []
                                continue
                            
                            elapsed = time.time() - start_time
                            if elapsed > max_runtime:
                                break
                            
                            # Filter excluded directories
                            dirs[:] = [d for d in dirs if not should_exclude(
                                normalize_path_to_posix(os.path.relpath(
                                    Path(current_path) / d, root_path
                                ))
                            )]
                            
                            for file_name in files:
                                files_scanned += 1
                                
                                elapsed = time.time() - start_time
                                if files_scanned > max_files or elapsed > max_runtime:
                                    break
                                
                                file_path = Path(current_path) / file_name
                                
                                # Check file extension
                                if file_path.suffix not in [".js", ".ts", ".jsx", ".tsx"]:
                                    continue
                                
                                # Check exclusion
                                try:
                                    rel_path = file_path.relative_to(REPO_ROOT)
                                    rel_posix = normalize_path_to_posix(str(rel_path))
                                    if should_exclude(rel_posix):
                                        continue
                                except Exception:
                                    continue
                                
                                try:
                                    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                                        for line_num, line in enumerate(f, 1):
                                            if "omai" in line.lower():
                                                if line.strip().startswith("//") or line.strip().startswith("*"):
                                                    config["comments"].append({
                                                        "file": str(file_path.relative_to(REPO_ROOT)),
                                                        "line": line_num,
                                                        "content": line.strip()[:100],
                                                    })
                                except Exception:
                                    pass
                    except Exception:
                        pass
            except KeyboardInterrupt:
                pass
    
    return config


def classify_component(file_info: Dict, runtime_status: Dict, imports: Dict) -> str:
    """Classify a component as ACTIVE/DORMANT/STALE/DANGEROUS."""
    path = file_info["path"]
    
    # Check if imported
    is_imported = path in imports and len(imports[path]) > 0
    
    # Check runtime status
    if runtime_status["classification"] == "ACTIVE":
        if is_imported:
            return "ACTIVE"
        else:
            return "DORMANT"
    elif runtime_status["classification"] == "DORMANT":
        if is_imported:
            return "DORMANT"
        else:
            return "STALE"
    else:
        return "STALE"


def generate_discovery_report(mode: str) -> str:
    """
    Generate OMAI discovery report with strict caps and graceful interruption handling.
    
    Args:
        mode: "quick" or "deep"
    """
    start_time = time.time()
    
    # Set caps based on mode
    if mode == "quick":
        max_runtime = MAX_RUNTIME_SECONDS_QUICK
        max_files = MAX_FILES_SCANNED_QUICK
        max_bytes_per_file = MAX_BYTES_PER_FILE_QUICK
        max_total_bytes = MAX_TOTAL_BYTES_QUICK
    else:
        max_runtime = MAX_RUNTIME_SECONDS_DEEP
        max_files = MAX_FILES_SCANNED_DEEP
        max_bytes_per_file = MAX_BYTES_PER_FILE_DEEP
        max_total_bytes = MAX_TOTAL_BYTES_DEEP
    
    print(f"Discovering OMAI components ({mode} mode)...")
    print(f"  Caps: {max_runtime}s runtime, {max_files} files, {max_total_bytes // (1024*1024)}MB total")
    
    stop_reason = "completed"
    codebase_findings = {}
    import_map = {}
    runtime_status = {}
    db_tables = {}
    config = {"env_vars": [], "flags": [], "comments": [], "default_state": "unknown"}
    
    try:
        # Code discovery
        codebase_findings = search_codebase_for_omai(
            mode=mode,
            max_runtime=max_runtime,
            max_files=max_files,
            max_bytes_per_file=max_bytes_per_file,
            max_total_bytes=max_total_bytes,
            start_time=start_time
        )
        stop_reason = codebase_findings.get("stop_reason", "completed")
        files_scanned = codebase_findings.get("files_scanned", 0)
        files_skipped = codebase_findings.get("files_skipped", 0)
        bytes_scanned = codebase_findings.get("bytes_scanned", 0)
        scan_capped = codebase_findings.get("scan_capped", False)
        timed_out = codebase_findings.get("timed_out", False)
        bytes_capped = codebase_findings.get("bytes_capped", False)
        
        print(f"Code scan complete: {files_scanned} scanned, {files_skipped} skipped, {bytes_scanned // 1024}KB read")
        if scan_capped:
            print(f"WARNING: Scan was capped at {max_files} files")
        if timed_out:
            print(f"WARNING: Scan timed out after {max_runtime}s")
        if bytes_capped:
            print(f"WARNING: Scan capped at {max_total_bytes // (1024*1024)}MB total bytes")
        
        # Check imports (only if we have time and findings)
        if stop_reason == "completed" and codebase_findings.get("files"):
            elapsed = time.time() - start_time
            if elapsed < max_runtime:
                print("Checking imports...")
                import_map = check_imports(
                    codebase_findings,
                    mode=mode,
                    max_runtime=max_runtime,
                    max_files=max_files,
                    max_bytes_per_file=max_bytes_per_file,
                    max_total_bytes=max_total_bytes,
                    start_time=start_time
                )
        
        # Runtime discovery (quick, no caps needed)
        runtime_status = discover_runtime_status()
        
        # Database discovery (quick, no caps needed)
        db_tables = discover_database_tables()
        
        # Config discovery (with caps)
        elapsed = time.time() - start_time
        if elapsed < max_runtime:
            config = discover_config_and_env(
                mode=mode,
                max_runtime=max_runtime,
                max_files=max_files,
                start_time=start_time
            )
    except KeyboardInterrupt:
        stop_reason = "interrupted"
        print("\n  INTERRUPTED: Discovery stopped by user")
        # Use partial findings if available
        if not codebase_findings:
            codebase_findings = {
                "files": [],
                "files_scanned": 0,
                "files_skipped": 0,
                "bytes_scanned": 0,
                "stop_reason": "interrupted",
            }
        if not import_map:
            import_map = {}
        if not runtime_status:
            runtime_status = {"pm2_processes": [], "log_mentions": [], "classification": "UNKNOWN"}
        if not db_tables:
            db_tables = {"found": [], "accessible": False}
    
    # Classify components
    classified = []
    for file_info in codebase_findings.get("files", []):
        classification = classify_component(file_info, runtime_status, import_map)
        classified.append({
            **file_info,
            "classification": classification,
            "imported_by": import_map.get(file_info["path"], []),
        })
    
    # Generate markdown report
    elapsed = time.time() - start_time
    scan_stats = {
        "files_scanned": codebase_findings.get("files_scanned", 0),
        "files_skipped": codebase_findings.get("files_skipped", 0),
        "bytes_scanned": codebase_findings.get("bytes_scanned", 0),
        "scan_capped": codebase_findings.get("scan_capped", False),
        "timed_out": codebase_findings.get("timed_out", False),
        "bytes_capped": codebase_findings.get("bytes_capped", False),
        "mode": mode,
        "elapsed_seconds": elapsed,
        "stop_reason": stop_reason,
        "caps": {
            "max_runtime_seconds": max_runtime,
            "max_files": max_files,
            "max_bytes_per_file": max_bytes_per_file,
            "max_total_bytes": max_total_bytes,
        },
    }
    
    report_lines = [
        "# OMAI Discovery Report",
        f"Generated: {datetime.datetime.now().isoformat()}",
        "",
        "## Summary",
        "",
        f"- **Mode**: {mode.upper()}",
        f"- **Stop Reason**: {stop_reason}",
        f"- **Files Found**: {len(codebase_findings.get('files', []))}",
        f"- **Files Scanned**: {scan_stats['files_scanned']}",
        f"- **Files Skipped**: {scan_stats['files_skipped']}",
        f"- **Bytes Scanned**: {scan_stats['bytes_scanned'] // 1024}KB",
        f"- **Elapsed Time**: {scan_stats['elapsed_seconds']:.1f}s",
        "",
        "### Caps Applied",
        "",
        f"- **Max Runtime**: {scan_stats['caps']['max_runtime_seconds']}s",
        f"- **Max Files**: {scan_stats['caps']['max_files']}",
        f"- **Max Bytes Per File**: {scan_stats['caps']['max_bytes_per_file'] // 1024}KB",
        f"- **Max Total Bytes**: {scan_stats['caps']['max_total_bytes'] // (1024*1024)}MB",
        "",
        "### Status",
        "",
        f"- **Scan Capped**: {'Yes' if scan_stats['scan_capped'] else 'No'}",
        f"- **Timed Out**: {'Yes' if scan_stats['timed_out'] else 'No'}",
        f"- **Bytes Capped**: {'Yes' if scan_stats['bytes_capped'] else 'No'}",
        f"- **Runtime Status**: {runtime_status.get('classification', 'UNKNOWN')}",
        f"- **PM2 Processes**: {len(runtime_status.get('pm2_processes', []))}",
        f"- **Config Variables**: {len(config.get('env_vars', []))}",
        "",
        "## Code Discovery",
        "",
        "### Files",
        "",
    ]
    
    for item in classified:
        report_lines.extend([
            f"#### {item['path']}",
            f"- **Classification**: {item['classification']}",
            f"- **Matches**: {', '.join(item['matches'])}",
            f"- **Classes**: {', '.join(item['classes']) if item['classes'] else 'None'}",
            f"- **Functions**: {', '.join(item['functions']) if item['functions'] else 'None'}",
            f"- **Imported By**: {len(item['imported_by'])} file(s)",
            "",
        ])
    
    report_lines.extend([
        "## Runtime Status",
        "",
        f"**Classification**: {runtime_status['classification']}",
        "",
        "### PM2 Processes",
        "",
    ])
    
    if runtime_status["pm2_processes"]:
        for proc in runtime_status["pm2_processes"]:
            report_lines.append(f"- {proc}")
    else:
        report_lines.append("- No OMAI processes found in PM2")
    
    report_lines.extend([
        "",
        "### Log Mentions",
        "",
    ])
    
    if runtime_status["log_mentions"]:
        for log_line in runtime_status["log_mentions"][:10]:
            report_lines.append(f"- `{log_line[:100]}`")
    else:
        report_lines.append("- No OMAI mentions in recent logs")
    
    report_lines.extend([
        "",
        "## Configuration",
        "",
        "### Environment Variables",
        "",
    ])
    
    if config["env_vars"]:
        for env_var in config["env_vars"]:
            report_lines.append(f"- `{env_var['file']}:{env_var['line']}` - {env_var['content']}")
    else:
        report_lines.append("- No OMAI-related env vars found")
    
    report_lines.extend([
        "",
        "## Recommendations",
        "",
        "### Classification Summary",
        "",
    ])
    
    classifications = defaultdict(int)
    for item in classified:
        classifications[item["classification"]] += 1
    
    for cls, count in classifications.items():
        report_lines.append(f"- **{cls}**: {count} file(s)")
    
    report_lines.extend([
        "",
        "### Next Steps",
        "",
        "1. **ACTIVE** components: Review for integration into OM-Ops",
        "2. **DORMANT** components: Consider enabling via OM-Ops guardrails",
        "3. **STALE** components: Archive or remove if unused",
        "4. **DANGEROUS** components: Review carefully before any action",
        "",
        "---",
        "",
        "*This is a read-only discovery report. No OMAI code was modified.*",
    ])
    
    return "\n".join(report_lines)


def run_discovery(mode: str = "quick") -> Tuple[bool, str]:
    """
    Run OMAI discovery and generate report.
    
    Args:
        mode: "quick" (default, 20s cap) or "deep" (120s cap)
    
    Returns:
        Tuple of (success: bool, report_path: str)
    """
    try:
        log_ops(f"Starting OMAI discovery ({mode} mode, read-only)")
        
        report_content = generate_discovery_report(mode=mode)
        
        # Write report (always, even if interrupted)
        DISCOVERY_REPORT.parent.mkdir(parents=True, exist_ok=True)
        with open(DISCOVERY_REPORT, "w", encoding="utf-8") as f:
            f.write(report_content)
        
        log_ops(f"OMAI discovery complete ({mode}): {DISCOVERY_REPORT}")
        return True, str(DISCOVERY_REPORT)
    except KeyboardInterrupt:
        # Write partial report on interrupt
        try:
            partial_report = f"""# OMAI Discovery Report (Interrupted)

Generated: {datetime.datetime.now().isoformat()}

## Summary

**Status**: Discovery was interrupted by user (Ctrl+C)

**Mode**: {mode.upper()}

**Stop Reason**: interrupted

This is a partial report. Re-run discovery to get complete results.

---
*This is a read-only discovery report. No OMAI code was modified.*
"""
            DISCOVERY_REPORT.parent.mkdir(parents=True, exist_ok=True)
            with open(DISCOVERY_REPORT, "w", encoding="utf-8") as f:
                f.write(partial_report)
            log_ops(f"OMAI discovery interrupted: Partial report written to {DISCOVERY_REPORT}")
            return True, str(DISCOVERY_REPORT)
        except Exception as e:
            log_ops(f"OMAI discovery interrupted: Failed to write partial report: {e}", "ERROR")
            return False, f"Discovery interrupted and failed to write report: {e}"
    except Exception as e:
        log_ops(f"OMAI discovery failed: {e}", "ERROR")
        return False, f"Discovery failed: {e}"
