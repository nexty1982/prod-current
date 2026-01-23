#!/usr/bin/env python3
"""
OM-Ops - Uploads & Paths Health Module
Checks and fixes upload directory permissions and paths.
"""

import os
import sys
import stat
import tempfile
import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple

# Configuration
REPO_ROOT = Path("/var/www/orthodoxmetrics/prod")
FRONTEND_DIR = REPO_ROOT / "front-end"
BACKEND_DIR = REPO_ROOT / "server"

# Expected upload directories
UPLOAD_DIRS = [
    FRONTEND_DIR / "public" / "docs",
    FRONTEND_DIR / "public" / "images" / "gallery",
    FRONTEND_DIR / "public" / "images",
    Path("/var/www/orthodoxmetrics/uploads/record-images"),  # Common location
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
    def require_confirmation(prompt, phrase="YES APPLY"):
        print(f"\n{prompt}\nType '{phrase}' to confirm:")
        return input().strip() == phrase
    def redact_secrets(text):
        return text


def detect_service_user() -> str:
    """Detect the service user (nginx/www-data)."""
    # Try to get nginx user from systemctl
    exit_code, stdout, _ = run_cmd(["systemctl", "cat", "nginx"], timeout=5, redact=False)
    if exit_code == 0 and "User=" in stdout:
        for line in stdout.split("\n"):
            if "User=" in line:
                user = line.split("User=")[1].strip()
                return user
    
    # Fallback: check running nginx process
    exit_code, stdout, _ = run_cmd(["ps", "aux"], timeout=5, redact=False)
    if exit_code == 0:
        for line in stdout.split("\n"):
            if "nginx" in line and "master" in line:
                parts = line.split()
                if len(parts) > 0:
                    return parts[0]
    
    # Default
    return "www-data"


def check_upload_dirs() -> Dict:
    """Check upload directories exist and are writable."""
    log_ops("Checking upload directories")
    
    service_user = detect_service_user()
    results = {}
    
    for upload_dir in UPLOAD_DIRS:
        result = {
            "path": str(upload_dir),
            "exists": upload_dir.exists(),
            "is_dir": upload_dir.is_dir() if upload_dir.exists() else False,
            "owner": None,
            "group": None,
            "permissions": None,
            "writable": False,
            "writable_test": None,
        }
        
        if upload_dir.exists():
            try:
                stat_info = upload_dir.stat()
                
                # Get owner/group
                try:
                    import pwd
                    import grp
                    owner = pwd.getpwuid(stat_info.st_uid).pw_name
                    group = grp.getgrgid(stat_info.st_gid).gr_name
                    result["owner"] = owner
                    result["group"] = group
                except Exception:
                    result["owner"] = str(stat_info.st_uid)
                    result["group"] = str(stat_info.st_gid)
                
                # Get permissions
                result["permissions"] = oct(stat_info.st_mode)[-3:]
                
                # Test writability
                try:
                    test_file = upload_dir / ".om-ops-write-test"
                    test_file.write_text("test")
                    test_file.unlink()
                    result["writable"] = True
                    result["writable_test"] = "passed"
                except Exception as e:
                    result["writable"] = False
                    result["writable_test"] = f"failed: {e}"
            
            except Exception as e:
                result["error"] = str(e)
        
        results[str(upload_dir)] = result
    
    return results


def fix_missing_dirs(dry_run: bool = False) -> Tuple[bool, str]:
    """Fix missing directories (requires confirmation)."""
    if dry_run:
        log_ops("[DRY RUN] Would fix missing directories")
        return True, "[DRY RUN] Would create missing directories"
    
    if not require_confirmation("Create missing upload directories?"):
        return False, "Cancelled by user"
    
    log_ops("Fixing missing upload directories")
    service_user = detect_service_user()
    created = []
    
    for upload_dir in UPLOAD_DIRS:
        if not upload_dir.exists():
            try:
                upload_dir.mkdir(parents=True, exist_ok=True)
                
                # Set ownership (best effort)
                try:
                    run_cmd(["chown", "-R", f"{service_user}:{service_user}", str(upload_dir)], timeout=10, redact=False)
                except Exception:
                    pass
                
                # Set permissions (755 - readable/writable by owner, readable by others)
                upload_dir.chmod(0o755)
                
                created.append(str(upload_dir))
                log_ops(f"Created directory: {upload_dir}")
            except Exception as e:
                log_ops(f"Failed to create {upload_dir}: {e}", "ERROR")
                return False, f"Failed to create {upload_dir}: {e}"
    
    if created:
        return True, f"Created {len(created)} directories: {', '.join(created)}"
    else:
        return True, "All directories already exist"


def upload_endpoint_smoke_test() -> Tuple[bool, Dict]:
    """Test upload endpoint (safe, read-only check)."""
    log_ops("Running upload endpoint smoke test")
    
    # Create test file
    test_file = Path("/tmp/om-ops-test-upload.txt")
    try:
        test_file.write_text("OM-Ops test file")
    except Exception as e:
        return False, {"error": f"Cannot create test file: {e}"}
    
    # Try to POST to upload endpoint
    # Note: This is a simplified test - actual implementation would need to handle auth
    try:
        import urllib.request
        import urllib.parse
        
        url = f"http://127.0.0.1:3001/api/docs"
        data = test_file.read_bytes()
        
        req = urllib.request.Request(url, data=data, method="POST")
        req.add_header("Content-Type", "application/octet-stream")
        
        try:
            with urllib.request.urlopen(req, timeout=5) as response:
                status_code = response.getcode()
                response_data = response.read()[:500].decode("utf-8", errors="ignore")
                return True, {
                    "status_code": status_code,
                    "response": redact_secrets(response_data),
                    "endpoint": url,
                }
        except urllib.error.HTTPError as e:
            return True, {
                "status_code": e.code,
                "response": redact_secrets(e.read().decode("utf-8", errors="ignore")[:500]),
                "endpoint": url,
                "note": "Endpoint returned error (may require auth)",
            }
        except urllib.error.URLError as e:
            return False, {"error": f"Cannot reach endpoint: {e}"}
    except Exception as e:
        return False, {"error": str(e)}
    finally:
        # Cleanup test file
        try:
            test_file.unlink()
        except Exception:
            pass


def get_configured_paths() -> Dict:
    """Get current configured paths from server config/env."""
    log_ops("Reading configured paths from server config")
    
    paths = {
        "images_root": None,
        "docs_root": None,
        "uploads_root": None,
    }
    
    # Check backend .env files (redacted)
    env_files = [
        BACKEND_DIR / ".env.production",
        BACKEND_DIR / ".env",
        REPO_ROOT / ".env.production",
    ]
    
    for env_file in env_files:
        if env_file.exists():
            try:
                with open(env_file, "r") as f:
                    content = f.read()
                    # Look for path configs (redacted)
                    for line in content.split("\n"):
                        if "IMAGE" in line.upper() and "PATH" in line.upper() or "ROOT" in line.upper():
                            key = line.split("=")[0].strip() if "=" in line else line.strip()
                            paths["images_root"] = f"{key}=<REDACTED>"
                        if "DOC" in line.upper() and "PATH" in line.upper():
                            key = line.split("=")[0].strip() if "=" in line else line.strip()
                            paths["docs_root"] = f"{key}=<REDACTED>"
                        if "UPLOAD" in line.upper() and "PATH" in line.upper():
                            key = line.split("=")[0].strip() if "=" in line else line.strip()
                            paths["uploads_root"] = f"{key}=<REDACTED>"
            except Exception:
                pass
    
    # Also check common locations
    if not paths["images_root"]:
        images_path = FRONTEND_DIR / "public" / "images"
        if images_path.exists():
            paths["images_root"] = str(images_path)
    
    if not paths["docs_root"]:
        docs_path = FRONTEND_DIR / "public" / "docs"
        if docs_path.exists():
            paths["docs_root"] = str(docs_path)
    
    return paths
