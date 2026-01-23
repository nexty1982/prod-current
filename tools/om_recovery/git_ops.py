#!/usr/bin/env python3
"""
OM-Ops - Git Operations Module
Manages Git workflows for the repository.
"""

import os
import sys
import subprocess
import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple

# Configuration
REPO_ROOT = Path("/var/www/orthodoxmetrics/prod")
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


def run_git_command(cmd: List[str], check: bool = False) -> Tuple[bool, str, str]:
    """Run a git command and return success, stdout, stderr."""
    full_cmd = ["git"] + cmd
    log_ops(f"Executing: {' '.join(full_cmd)}")
    
    try:
        result = subprocess.run(
            full_cmd,
            capture_output=True,
            text=True,
            check=check,
            cwd=REPO_ROOT,
        )
        
        stdout = result.stdout
        stderr = result.stderr
        
        if result.returncode == 0:
            log_ops(f"Success: {stdout[:200]}")
        else:
            log_ops(f"Failed (code {result.returncode}): {stderr[:200]}", "ERROR")
        
        return result.returncode == 0, stdout, stderr
    except Exception as e:
        log_ops(f"Exception running git command: {e}", "ERROR")
        return False, "", str(e)


def git_status() -> Tuple[bool, Dict]:
    """Get git status."""
    success, stdout, stderr = run_git_command(["status", "--short"])
    if not success:
        return False, {"error": stderr}
    
    # Get current branch
    branch_success, branch_out, _ = run_git_command(["branch", "--show-current"])
    current_branch = branch_out.strip() if branch_success else "unknown"
    
    # Parse status lines
    status_lines = [line for line in stdout.strip().split("\n") if line.strip()]
    
    return True, {
        "current_branch": current_branch,
        "status_lines": status_lines,
        "is_dirty": len(status_lines) > 0,
    }


def git_create_checkpoint_branch() -> Tuple[bool, str]:
    """Create a timestamped checkpoint branch."""
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d_%H%M%S")
    branch_name = f"checkpoint-{timestamp}"
    
    log_ops(f"Creating checkpoint branch: {branch_name}")
    success, stdout, stderr = run_git_command(["checkout", "-b", branch_name])
    
    if success:
        return True, f"Created branch: {branch_name}\n{stdout}"
    else:
        return False, f"Failed to create branch: {stderr}"


def git_commit_all(message: str = None) -> Tuple[bool, str]:
    """Commit all changes with guardrails."""
    # Check status first
    success, status_info = git_status()
    if not success:
        return False, "Failed to get git status"
    
    if not status_info.get("is_dirty"):
        return False, "No changes to commit"
    
    # Show summary
    status_lines = status_info["status_lines"]
    print(f"\nFiles to commit: {len(status_lines)}")
    
    # Check for large files
    large_files = []
    staged_files = []
    
    for line in status_lines:
        if line.startswith(("A ", "M ", "??")):
            file_path = line.split()[-1]
            full_path = REPO_ROOT / file_path
            if full_path.exists() and full_path.is_file():
                size = full_path.stat().st_size
                if size > 50 * 1024 * 1024:  # > 50MB
                    large_files.append((file_path, size))
                staged_files.append(file_path)
    
    # Scan for problematic files (pre-commit guardrails)
    problematic_patterns = ["node_modules", "dist", "build", ".venv", ".venv_image", ".so", ".tar.gz", ".zip"]
    problematic_files = []
    
    for f in staged_files:
        # Check patterns
        if any(p in f for p in problematic_patterns):
            problematic_files.append(f)
        # Check file extension
        if Path(f).suffix in [".so", ".tar.gz", ".zip"]:
            if f not in problematic_files:
                problematic_files.append(f)
    
    # Block commit if problematic files found (require explicit confirmation)
    if large_files or problematic_files:
        print("\n⚠ WARNING: Pre-commit scan detected issues:")
        
        if large_files:
            print("\n  Large files (>50MB):")
            for file_path, size in large_files:
                print(f"    {file_path}: {size / (1024*1024):.2f} MB")
        
        if problematic_files:
            print("\n  Problematic files (node_modules/dist/build/.venv*/*.so):")
            for f in problematic_files[:20]:
                print(f"    {f}")
            if len(problematic_files) > 20:
                print(f"    ... and {len(problematic_files) - 20} more")
        
        print("\n⚠ Commit blocked. Type 'YES APPLY' to proceed anyway:")
        confirm = input().strip()
        if confirm != "YES APPLY":
            return False, "Commit cancelled - problematic files detected"
    
    # Stage all changes
    run_git_command(["add", "-A"])
    
    # Create commit message
    if not message:
        date_str = datetime.datetime.now().strftime("%Y-%m-%d")
        message = f"WIP: OM-Ops checkpoint {date_str}"
    
    log_ops(f"Committing with message: {message}")
    success, stdout, stderr = run_git_command(["commit", "-m", message])
    
    if success:
        return True, f"Committed: {stdout}"
    else:
        return False, f"Failed to commit: {stderr}"


def git_push_branch(branch_name: str = None, set_upstream: bool = True) -> Tuple[bool, str]:
    """Push branch to origin."""
    if not branch_name:
        success, status_info = git_status()
        if not success:
            return False, "Failed to get git status"
        branch_name = status_info["current_branch"]
    
    # Check if repo is dirty
    success, status_info = git_status()
    if success and status_info.get("is_dirty"):
        print("Repository has uncommitted changes.")
        create_commit = input("Create commit first? (yes/no): ").strip().lower()
        if create_commit == "yes":
            commit_success, commit_msg = git_commit_all()
            if not commit_success:
                return False, f"Cannot push: {commit_msg}"
    
    cmd = ["push"]
    if set_upstream:
        cmd.extend(["-u", "origin", branch_name])
    else:
        cmd.extend(["origin", branch_name])
    
    log_ops(f"Pushing branch: {branch_name}")
    success, stdout, stderr = run_git_command(cmd)
    
    if success:
        return True, f"Pushed: {stdout}"
    else:
        return False, f"Failed to push: {stderr}"


def git_push_daily_summary(artifacts_dir: str = "daily-summary") -> Tuple[bool, str]:
    """Push daily summary artifacts to repo."""
    artifacts_path = REPO_ROOT / artifacts_dir
    if not artifacts_path.exists():
        return False, f"Artifacts directory does not exist: {artifacts_path}"
    
    # Add artifacts
    run_git_command(["add", str(artifacts_path)])
    
    # Commit
    date_str = datetime.datetime.now().strftime("%Y-%m-%d")
    message = f"Daily summary artifacts {date_str}"
    success, stdout, stderr = run_git_command(["commit", "-m", message])
    
    if not success:
        return False, f"Failed to commit artifacts: {stderr}"
    
    # Push
    return git_push_branch(set_upstream=False)


def git_last_commits(count: int = 10) -> Tuple[bool, List[Dict]]:
    """Get last N commits."""
    success, stdout, stderr = run_git_command(
        ["log", f"-{count}", "--pretty=format:%H|%an|%ae|%ad|%s", "--date=iso"]
    )
    
    if not success:
        return False, []
    
    commits = []
    for line in stdout.strip().split("\n"):
        if "|" in line:
            parts = line.split("|", 4)
            if len(parts) >= 5:
                commits.append({
                    "hash": parts[0],
                    "author": parts[1],
                    "email": parts[2],
                    "date": parts[3],
                    "message": parts[4],
                })
    
    return True, commits
