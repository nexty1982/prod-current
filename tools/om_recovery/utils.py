#!/usr/bin/env python3
"""
OM-Ops - Shared Utilities
Common functions for command execution, redaction, and logging.
"""

import os
import sys
import subprocess
import datetime
import re
from pathlib import Path
from typing import Tuple, Optional

# Configuration
OPS_LOG = Path("/var/backups/OM/om-ops.log")

# Patterns to redact (secrets, credentials)
REDACT_PATTERNS = [
    (r'DB_PASSWORD=["\']([^"\']+)["\']', r'DB_PASSWORD="<REDACTED>"'),
    (r'MYSQL_PASSWORD=["\']([^"\']+)["\']', r'MYSQL_PASSWORD="<REDACTED>"'),
    (r'SESSION_SECRET=["\']([^"\']+)["\']', r'SESSION_SECRET="<REDACTED>"'),
    (r'password["\s:=]+([^\s"\']+)', r'password="<REDACTED>"'),
    (r'secret["\s:=]+([^\s"\']+)', r'secret="<REDACTED>"'),
    (r'api[_-]?key["\s:=]+([^\s"\']+)', r'api_key="<REDACTED>"', re.IGNORECASE),
    (r'token["\s:=]+([^\s"\']+)', r'token="<REDACTED>"', re.IGNORECASE),
]


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


def redact_secrets(text: str) -> str:
    """Redact secrets from text output."""
    if not text:
        return text
    
    redacted = text
    for pattern in REDACT_PATTERNS:
        if isinstance(pattern, tuple) and len(pattern) == 3:
            regex, replacement, flags = pattern
            redacted = re.sub(regex, replacement, redacted, flags=flags)
        elif isinstance(pattern, tuple) and len(pattern) == 2:
            regex, replacement = pattern
            redacted = re.sub(regex, replacement, redacted)
    
    return redacted


def run_cmd(cmd: list, timeout: int = 30, redact: bool = True, cwd: Optional[Path] = None) -> Tuple[int, str, str]:
    """
    Run a command and return exit_code, stdout, stderr.
    
    Args:
        cmd: Command as list of strings
        timeout: Command timeout in seconds
        redact: Whether to redact secrets from output
        cwd: Working directory (optional)
    
    Returns:
        Tuple of (exit_code, stdout, stderr)
    """
    cmd_str = " ".join(cmd)
    log_ops(f"Executing: {cmd_str}")
    start_time = datetime.datetime.now()
    
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=timeout,
            cwd=str(cwd) if cwd else None,
        )
        
        duration = (datetime.datetime.now() - start_time).total_seconds()
        stdout = result.stdout
        stderr = result.stderr
        
        if redact:
            stdout = redact_secrets(stdout)
            stderr = redact_secrets(stderr)
        
        if result.returncode == 0:
            log_ops(f"Success (duration: {duration:.2f}s): {cmd_str}")
        else:
            log_ops(f"Failed (code {result.returncode}, duration: {duration:.2f}s): {cmd_str}", "ERROR")
        
        return result.returncode, stdout, stderr
    
    except subprocess.TimeoutExpired:
        duration = (datetime.datetime.now() - start_time).total_seconds()
        log_ops(f"Timeout after {duration:.2f}s: {cmd_str}", "ERROR")
        return -1, "", f"Command timed out after {timeout}s"
    
    except Exception as e:
        log_ops(f"Exception running command: {e}", "ERROR")
        return -1, "", str(e)


def require_confirmation(prompt: str, confirmation_phrase: str = None) -> bool:
    """Require user to type confirmation phrase."""
    print(f"\n{prompt}")
    if confirmation_phrase:
        print(f"Type '{confirmation_phrase}' to confirm:")
        try:
            user_input = input().strip()
            return user_input == confirmation_phrase
        except (EOFError, KeyboardInterrupt):
            return False
    else:
        print("Type 'y' or 'yes' to confirm:")
        try:
            user_input = input().strip()
            return user_input.lower() in ["y", "yes"]
        except (EOFError, KeyboardInterrupt):
            return False
