#!/usr/bin/env python3
"""
OM-Recovery Suite - Development Changelog Module
Tracks daily work sessions and bundles related prompts/follow-ups.
"""

import os
import sys
import json
import time
import datetime
import random
import string
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from collections import defaultdict

# Changelog configuration
CHANGELOG_ROOT = Path("/var/backups/OM/changelog")
SESSIONS_DIR = CHANGELOG_ROOT / "sessions"
INDEX_FILE = CHANGELOG_ROOT / "index.json"
REPORT_FILE = CHANGELOG_ROOT / "report.html"
ACTIVE_SESSION_FILE = CHANGELOG_ROOT / "active_session.json"

# Entry types
ENTRY_TYPES = ["prompt", "followup", "result", "decision", "command", "note"]
ACTORS = ["user", "cursor", "assistant", "system"]
SESSION_STATUSES = ["ACTIVE", "CLOSED"]
SCOPES = ["prod", "server", "front-end", "mixed"]


def ensure_changelog_dirs():
    """Ensure changelog directories exist."""
    CHANGELOG_ROOT.mkdir(parents=True, exist_ok=True)
    SESSIONS_DIR.mkdir(parents=True, exist_ok=True)


def generate_session_id() -> str:
    """Generate a short unique session ID (8 characters)."""
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))


def slugify(text: str) -> str:
    """Convert text to URL-friendly slug."""
    # Simple slugification
    slug = text.lower()
    slug = ''.join(c if c.isalnum() or c in '-_' else '-' for c in slug)
    slug = '-'.join(s for s in slug.split('-') if s)
    return slug[:50]  # Limit length


def get_session_dir(session_id: str, started_at: datetime.datetime, title: str) -> Path:
    """Get the directory path for a session."""
    date_str = started_at.strftime("%Y-%m-%d")
    time_str = started_at.strftime("%H%M%S")
    slug = slugify(title)
    dir_name = f"{session_id}__{time_str}__{slug}"
    return SESSIONS_DIR / date_str / dir_name


def get_active_session() -> Optional[Dict]:
    """Get the currently active session."""
    if not ACTIVE_SESSION_FILE.exists():
        return None
    
    try:
        with open(ACTIVE_SESSION_FILE, "r") as f:
            active_info = json.load(f)
        
        # Load the actual session
        session_dir = Path(active_info["session_dir"])
        session_file = session_dir / "session.json"
        
        if session_file.exists():
            with open(session_file, "r") as f:
                return json.load(f)
    except Exception:
        pass
    
    return None


def set_active_session(session_dir: Path, session_id: str):
    """Set the active session pointer."""
    ensure_changelog_dirs()
    with open(ACTIVE_SESSION_FILE, "w") as f:
        json.dump({
            "session_id": session_id,
            "session_dir": str(session_dir),
            "set_at": datetime.datetime.now().isoformat(),
        }, f, indent=2)


def clear_active_session():
    """Clear the active session pointer."""
    if ACTIVE_SESSION_FILE.exists():
        ACTIVE_SESSION_FILE.unlink()


def load_entries(session_dir: Path) -> List[Dict]:
    """Load entries from entries.jsonl (stream-read, ignore malformed lines)."""
    entries_file = session_dir / "entries.jsonl"
    entries = []
    
    if entries_file.exists():
        with open(entries_file, "r") as f:
            for line_num, line in enumerate(f, 1):
                line = line.strip()
                if line:
                    try:
                        entries.append(json.loads(line))
                    except json.JSONDecodeError:
                        # Ignore malformed trailing lines safely
                        continue
    
    return entries


def load_session(session_dir: Path) -> Dict:
    """Load a session from its directory."""
    session_file = session_dir / "session.json"
    
    with open(session_file, "r") as f:
        session = json.load(f)
    
    # Load entries from entries.jsonl (not from session.json)
    entries = load_entries(session_dir)
    
    # Migration: If old session.json has entries array, don't re-append them
    # Just use the count from entries.jsonl
    if "entries" in session:
        # Old format - remove entries array, use count from jsonl
        session.pop("entries", None)
    
    # Set entry_count based on actual entries.jsonl count
    session["entry_count"] = len(entries)
    
    # For display purposes, attach entries (but don't save them back)
    session["entries"] = entries
    
    return session


def append_entry(session_dir: Path, entry: Dict) -> None:
    """
    Append a single entry to entries.jsonl (truly append-only).
    
    STABLE: This function ensures JSONL append-only behavior.
    Never rewrites or re-appends prior entries.
    """
    entries_file = session_dir / "entries.jsonl"
    entries_file.parent.mkdir(parents=True, exist_ok=True)
    
    with open(entries_file, "a") as f:
        f.write(json.dumps(entry) + "\n")


def save_session(session: Dict, session_dir: Path):
    """Save session metadata to session.json (entries are stored separately in entries.jsonl)."""
    session_dir.mkdir(parents=True, exist_ok=True)
    
    # Save session.json (metadata only, no entries array)
    session_copy = {k: v for k, v in session.items() if k != "entries"}
    
    # Ensure entry_count is set correctly
    if "entry_count" not in session_copy:
        entries = load_entries(session_dir)
        session_copy["entry_count"] = len(entries)
    
    # Add last_updated_at timestamp
    session_copy["last_updated_at"] = datetime.datetime.now().isoformat()
    
    session_file = session_dir / "session.json"
    with open(session_file, "w") as f:
        json.dump(session_copy, f, indent=2)
    
    # Save meta.json (for quick reference)
    meta = {
        "session_id": session["session_id"],
        "title": session["title"],
        "status": session["status"],
        "started_at": session["started_at"],
        "ended_at": session.get("ended_at"),
        "entry_count": session_copy["entry_count"],
        "scope": session.get("scope", "mixed"),
        "tags": session.get("tags", []),
    }
    meta_file = session_dir / "meta.json"
    with open(meta_file, "w") as f:
        json.dump(meta, f, indent=2)


def start_session(title: str, tags: List[str] = None, scope: str = "mixed",
                 related_paths: List[str] = None) -> Dict:
    """Start a new work session."""
    ensure_changelog_dirs()
    
    # Check for existing active session
    active = get_active_session()
    if active:
        print(f"Warning: Closing previous active session: {active['title']}")
        close_session(active, summary="Auto-closed: new session started")
    
    # Generate session ID and directory
    session_id = generate_session_id()
    started_at = datetime.datetime.now()
    session_dir = get_session_dir(session_id, started_at, title)
    
    # Create session (no entries array - entries go in entries.jsonl)
    session = {
        "session_id": session_id,
        "title": title,
        "status": "ACTIVE",
        "tags": tags or [],
        "scope": scope,
        "related_paths": related_paths or [],
        "started_at": started_at.isoformat(),
        "ended_at": None,
        "outcome": None,
        "entry_count": 0,  # Will be updated as entries are added
    }
    
    # Save session metadata
    save_session(session, session_dir)
    
    # Set as active
    set_active_session(session_dir, session_id)
    
    # Update index
    update_index(session, session_dir)
    
    print(f"Started session: {title}")
    print(f"  Session ID: {session_id}")
    print(f"  Directory: {session_dir}")
    
    return session


def add_entry(entry_type: str, actor: str, content: str,
              attachments: List[str] = None, outcome: str = None) -> bool:
    """Add an entry to the active session (append-only to entries.jsonl)."""
    active = get_active_session()
    if not active:
        print("Error: No active session. Start a session first.")
        return False
    
    if entry_type not in ENTRY_TYPES:
        print(f"Error: Invalid entry type. Must be one of: {', '.join(ENTRY_TYPES)}")
        return False
    
    if actor not in ACTORS:
        print(f"Error: Invalid actor. Must be one of: {', '.join(ACTORS)}")
        return False
    
    # Load session directory from active session file
    with open(ACTIVE_SESSION_FILE, "r") as f:
        active_info = json.load(f)
    session_dir = Path(active_info["session_dir"])
    
    # Load current session metadata
    session_file = session_dir / "session.json"
    with open(session_file, "r") as f:
        session = json.load(f)
    
    # Create entry
    entry = {
        "timestamp": datetime.datetime.now().isoformat(),
        "actor": actor,
        "type": entry_type,
        "content": content,
        "attachments": attachments or [],
        "outcome": outcome,
    }
    
    # Append ONLY this new entry to entries.jsonl (truly append-only)
    append_entry(session_dir, entry)
    
    # Update session metadata (entry_count, last_updated_at)
    session["entry_count"] = session.get("entry_count", 0) + 1
    session["last_updated_at"] = datetime.datetime.now().isoformat()
    
    # Save updated session metadata
    save_session(session, session_dir)
    
    # Update index with new entry_count
    update_index(session, session_dir)
    
    print(f"Added {entry_type} entry to session: {session['title']}")
    return True


def check_session_integrity(session_dir: Path) -> Dict:
    """Check session integrity: verify entry_count matches JSONL line count."""
    session_file = session_dir / "session.json"
    entries_file = session_dir / "entries.jsonl"
    
    if not session_file.exists():
        return {"valid": False, "error": "session.json not found"}
    
    try:
        with open(session_file, "r") as f:
            session = json.load(f)
        
        # Count entries from JSONL
        jsonl_count = 0
        if entries_file.exists():
            with open(entries_file, "r") as f:
                for line in f:
                    line = line.strip()
                    if line:
                        try:
                            json.loads(line)
                            jsonl_count += 1
                        except json.JSONDecodeError:
                            pass  # Skip malformed lines
        
        # Get entry_count from session.json
        session_count = session.get("entry_count", 0)
        
        # Check match
        if jsonl_count != session_count:
            return {
                "valid": False,
                "mismatch": True,
                "session_count": session_count,
                "jsonl_count": jsonl_count,
                "difference": abs(jsonl_count - session_count)
            }
        
        return {
            "valid": True,
            "entry_count": jsonl_count
        }
    except Exception as e:
        return {"valid": False, "error": str(e)}


def close_session(session: Optional[Dict] = None, summary: str = None,
                 outcome: str = None) -> bool:
    """Close a session."""
    if session is None:
        session = get_active_session()
        if not session:
            print("Error: No active session to close.")
            return False
    
    # Load session directory
    with open(ACTIVE_SESSION_FILE, "r") as f:
        active_info = json.load(f)
    session_dir = Path(active_info["session_dir"])
    
    # Load session metadata (don't reload entries, they're in jsonl)
    session_file = session_dir / "session.json"
    with open(session_file, "r") as f:
        session = json.load(f)
    
    # Update session
    session["status"] = "CLOSED"
    session["ended_at"] = datetime.datetime.now().isoformat()
    if summary:
        session["summary"] = summary
    if outcome:
        session["outcome"] = outcome
    
    # Save session
    save_session(session, session_dir)
    
    # Clear active session
    clear_active_session()
    
    # Update index
    update_index(session, session_dir)
    
    print(f"Closed session: {session['title']}")
    return True


def update_index(session: Dict, session_dir: Path):
    """Update the changelog index with session information."""
    ensure_changelog_dirs()
    
    # Load or create index
    if INDEX_FILE.exists():
        with open(INDEX_FILE, "r") as f:
            index = json.load(f)
    else:
        index = {"sessions": []}
    
    # Find existing entry or create new
    session_id = session["session_id"]
    existing_idx = None
    for i, s in enumerate(index["sessions"]):
        if s.get("session_id") == session_id:
            existing_idx = i
            break
    
    # Get entry_count from session metadata or count from entries.jsonl
    entry_count = session.get("entry_count", 0)
    if entry_count == 0:
        # Fallback: count entries.jsonl if entry_count not set
        entries = load_entries(session_dir)
        entry_count = len(entries)
    
    # Create/update session summary
    session_summary = {
        "session_id": session_id,
        "title": session["title"],
        "started_at": session["started_at"],
        "ended_at": session.get("ended_at"),
        "status": session["status"],
        "tags": session.get("tags", []),
        "entry_count": entry_count,
        "scope": session.get("scope", "mixed"),
        "scope_paths": session.get("related_paths", []),
        "outcome": session.get("outcome"),
        "session_dir": str(session_dir),
    }
    
    if existing_idx is not None:
        index["sessions"][existing_idx] = session_summary
    else:
        index["sessions"].append(session_summary)
    
    # Sort by started_at (most recent first)
    index["sessions"].sort(key=lambda x: x.get("started_at", ""), reverse=True)
    
    # Update summary stats
    index["summary"] = {
        "total_sessions": len(index["sessions"]),
        "active_sessions": len([s for s in index["sessions"] if s.get("status") == "ACTIVE"]),
        "closed_sessions": len([s for s in index["sessions"] if s.get("status") == "CLOSED"]),
        "latest_session": index["sessions"][0] if index["sessions"] else None,
    }
    
    with open(INDEX_FILE, "w") as f:
        json.dump(index, f, indent=2)


def list_sessions(days: int = 7) -> List[Dict]:
    """List sessions from the last N days."""
    if not INDEX_FILE.exists():
        return []
    
    with open(INDEX_FILE, "r") as f:
        index = json.load(f)
    
    sessions = index.get("sessions", [])
    cutoff = datetime.datetime.now() - datetime.timedelta(days=days)
    
    filtered = []
    for session in sessions:
        started_str = session.get("started_at", "")
        if started_str:
            try:
                started = datetime.datetime.fromisoformat(started_str.replace("Z", "+00:00"))
                if started.replace(tzinfo=None) >= cutoff:
                    filtered.append(session)
            except Exception:
                # Include if we can't parse
                filtered.append(session)
    
    return filtered


def generate_html_report():
    """Generate interactive HTML report for changelog."""
    ensure_changelog_dirs()
    
    # Load index
    if not INDEX_FILE.exists():
        html_content = generate_empty_html()
        with open(REPORT_FILE, "w") as f:
            f.write(html_content)
        return
    
    with open(INDEX_FILE, "r") as f:
        index = json.load(f)
    
    sessions = index.get("sessions", [])
    if not sessions:
        html_content = generate_empty_html()
        with open(REPORT_FILE, "w") as f:
            f.write(html_content)
        return
    
    # Load all session data
    sessions_data = []
    for session_info in sessions:
        session_dir = Path(session_info["session_dir"])
        if session_dir.exists():
            try:
                session = load_session(session_dir)
                sessions_data.append(session)
            except Exception:
                continue
    
    # Generate HTML
    html_content = generate_html_content(sessions_data, index)
    
    with open(REPORT_FILE, "w") as f:
        f.write(html_content)


def generate_empty_html() -> str:
    """Generate empty HTML report."""
    return """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OM-Recovery Development Changelog</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1400px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        h1 { color: #333; }
        .empty { text-align: center; padding: 40px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <h1>OM-Recovery Development Changelog</h1>
        <div class="empty">No sessions found. Start a work session first.</div>
    </div>
</body>
</html>"""


def generate_html_content(sessions_data: List[Dict], index: Dict) -> str:
    """Generate full HTML report content."""
    html_parts = []
    
    # HTML head and styles
    html_parts.append("""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OM-Recovery Development Changelog</title>
    <style>
        * { box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background: #f5f5f5;
            color: #333;
        }
        .container {
            max-width: 1400px;
            margin: 0 auto;
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        h1 {
            margin-top: 0;
            color: #2c3e50;
            border-bottom: 3px solid #3498db;
            padding-bottom: 10px;
        }
        .controls {
            margin: 20px 0;
            padding: 15px;
            background: #ecf0f1;
            border-radius: 5px;
        }
        .controls label {
            font-weight: bold;
            margin-right: 10px;
        }
        .controls select, .controls input {
            padding: 8px 12px;
            font-size: 14px;
            border: 1px solid #bdc3c7;
            border-radius: 4px;
            background: white;
            margin-right: 10px;
        }
        .summary-cards {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin: 20px 0;
        }
        .card {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .card h3 {
            margin: 0 0 10px 0;
            font-size: 14px;
            opacity: 0.9;
        }
        .card .value {
            font-size: 24px;
            font-weight: bold;
        }
        .session-card {
            border: 1px solid #ddd;
            border-radius: 8px;
            margin: 15px 0;
            padding: 20px;
            background: #f8f9fa;
        }
        .session-header {
            display: flex;
            justify-content: space-between;
            align-items: start;
            margin-bottom: 15px;
        }
        .session-title {
            font-size: 20px;
            font-weight: bold;
            color: #2c3e50;
            margin: 0;
        }
        .session-meta {
            color: #7f8c8d;
            font-size: 14px;
            margin: 5px 0;
        }
        .badge {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 600;
            margin-right: 5px;
        }
        .badge-active {
            background: #27ae60;
            color: white;
        }
        .badge-closed {
            background: #95a5a6;
            color: white;
        }
        .badge-tag {
            background: #3498db;
            color: white;
        }
        .timeline {
            margin: 20px 0;
            border-left: 3px solid #3498db;
            padding-left: 20px;
        }
        .timeline-entry {
            margin: 15px 0;
            padding: 10px;
            background: white;
            border-radius: 4px;
            border: 1px solid #ecf0f1;
        }
        .entry-header {
            display: flex;
            justify-content: space-between;
            font-size: 12px;
            color: #7f8c8d;
            margin-bottom: 5px;
        }
        .entry-content {
            margin: 10px 0;
            padding: 10px;
            background: #f8f9fa;
            border-radius: 4px;
            font-family: 'Courier New', monospace;
            font-size: 13px;
            white-space: pre-wrap;
            word-wrap: break-word;
        }
        .entry-type-prompt { border-left: 4px solid #3498db; }
        .entry-type-followup { border-left: 4px solid #9b59b6; }
        .entry-type-result { border-left: 4px solid #27ae60; }
        .entry-type-decision { border-left: 4px solid #e67e22; }
        .entry-type-command { border-left: 4px solid #e74c3c; }
        .entry-type-note { border-left: 4px solid #95a5a6; }
        .copy-btn {
            background: #3498db;
            color: white;
            border: none;
            padding: 5px 10px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            margin-left: 10px;
        }
        .copy-btn:hover {
            background: #2980b9;
        }
        .collapsible {
            cursor: pointer;
            user-select: none;
        }
        .collapsible::before {
            content: '▶ ';
            display: inline-block;
            transition: transform 0.3s;
        }
        .collapsible.expanded::before {
            transform: rotate(90deg);
        }
        .collapsible-content {
            display: none;
            margin-left: 20px;
        }
        .collapsible-content.expanded {
            display: block;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>OM-Recovery Development Changelog</h1>
        <div class="controls">
            <label for="sessionSelector">Session:</label>
            <select id="sessionSelector">
""")
    
    # Add session options
    for i, session in enumerate(sessions_data):
        started = session.get("started_at", "")[:19].replace("T", " ")
        title = session.get("title", "Untitled")
        status = session.get("status", "CLOSED")
        option_text = f"{started} - {title} [{status}]"
        html_parts.append(f'                <option value="{i}">{option_text}</option>\n')
    
    html_parts.append("""            </select>
        </div>
        <div id="reportContent"></div>
    </div>
    <script>
        const sessionsData = """)
    
    # Embed sessions data as JSON (escaped)
    html_parts.append(json.dumps(sessions_data).replace("<", "\\u003c"))
    
    html_parts.append(""";
        
        function formatDate(isoString) {
            return new Date(isoString).toLocaleString();
        }
        
        function formatDuration(started, ended) {
            if (!ended) return 'Ongoing';
            const start = new Date(started);
            const end = new Date(ended);
            const diff = end - start;
            const hours = Math.floor(diff / 3600000);
            const minutes = Math.floor((diff % 3600000) / 60000);
            return `${hours}h ${minutes}m`;
        }
        
        function copyToClipboard(text) {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            alert('Copied to clipboard!');
        }
        
        function renderSession(sessionIndex) {
            const session = sessionsData[sessionIndex];
            if (!session) return;
            
            const entries = session.entries || [];
            const status = session.status || 'CLOSED';
            const tags = session.tags || [];
            const scope = session.scope || 'mixed';
            
            // Group entries by type
            const entriesByType = {};
            entries.forEach(entry => {
                const type = entry.type || 'note';
                if (!entriesByType[type]) entriesByType[type] = [];
                entriesByType[type].push(entry);
            });
            
            let html = `
                <div class="summary-cards">
                    <div class="card">
                        <h3>Status</h3>
                        <div class="value">${status}</div>
                    </div>
                    <div class="card">
                        <h3>Entries</h3>
                        <div class="value">${entries.length}</div>
                    </div>
                    <div class="card">
                        <h3>Duration</h3>
                        <div class="value">${formatDuration(session.started_at, session.ended_at)}</div>
                    </div>
                    <div class="card">
                        <h3>Scope</h3>
                        <div class="value">${scope}</div>
                    </div>
                </div>
                
                <div class="session-card">
                    <div class="session-header">
                        <div>
                            <h2 class="session-title">${session.title || 'Untitled Session'}</h2>
                            <div class="session-meta">
                                <span class="badge badge-${status.toLowerCase()}">${status}</span>
                                ${tags.map(tag => `<span class="badge badge-tag">${tag}</span>`).join('')}
                                <span style="margin-left: 10px;">Started: ${formatDate(session.started_at)}</span>
                                ${session.ended_at ? `<span>Ended: ${formatDate(session.ended_at)}</span>` : ''}
                            </div>
                            ${session.outcome ? `<div style="margin-top: 10px;"><strong>Outcome:</strong> ${session.outcome}</div>` : ''}
                            ${session.summary ? `<div style="margin-top: 10px;"><strong>Summary:</strong> ${session.summary}</div>` : ''}
                        </div>
                    </div>
                    
                    <div class="timeline">
                        ${entries.map((entry, idx) => {
                            const actor = entry.actor || 'system';
                            const type = entry.type || 'note';
                            const content = entry.content || '';
                            const timestamp = entry.timestamp || '';
                            const outcome = entry.outcome || '';
                            
                            return `
                                <div class="timeline-entry entry-type-${type}">
                                    <div class="entry-header">
                                        <span><strong>${actor}</strong> - ${type}</span>
                                        <span>${formatDate(timestamp)}</span>
                                    </div>
                                    <div class="entry-content">
                                        ${content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}
                                        <button class="copy-btn" onclick="copyToClipboard(\`${content.replace(/`/g, '\\`').replace(/\\/g, '\\\\')}\`)">Copy</button>
                                    </div>
                                    ${entry.attachments && entry.attachments.length > 0 ? `
                                        <div style="margin-top: 5px; font-size: 12px; color: #7f8c8d;">
                                            <strong>Attachments:</strong> ${entry.attachments.join(', ')}
                                        </div>
                                    ` : ''}
                                    ${outcome ? `
                                        <div style="margin-top: 5px; font-size: 12px; color: ${outcome === 'success' ? '#27ae60' : '#e74c3c'};">
                                            <strong>Outcome:</strong> ${outcome}
                                        </div>
                                    ` : ''}
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
            
            document.getElementById('reportContent').innerHTML = html;
        }
        
        document.getElementById('sessionSelector').addEventListener('change', function() {
            renderSession(parseInt(this.value));
        });
        
        // Render first session by default
        if (sessionsData.length > 0) {
            renderSession(0);
        }
    </script>
</body>
</html>""")
    
    return "".join(html_parts)


def prune_sessions(keep_days: int = 30):
    """Prune sessions older than N days."""
    if not INDEX_FILE.exists():
        return
    
    with open(INDEX_FILE, "r") as f:
        index = json.load(f)
    
    sessions = index.get("sessions", [])
    cutoff = datetime.datetime.now() - datetime.timedelta(days=keep_days)
    
    to_keep = []
    to_remove = []
    
    for session in sessions:
        started_str = session.get("started_at", "")
        if started_str:
            try:
                started = datetime.datetime.fromisoformat(started_str.replace("Z", "+00:00"))
                if started.replace(tzinfo=None) >= cutoff:
                    to_keep.append(session)
                else:
                    to_remove.append(session)
            except Exception:
                # Keep if we can't parse
                to_keep.append(session)
        else:
            to_keep.append(session)
    
    # Delete old session directories
    for session in to_remove:
        session_dir = Path(session.get("session_dir", ""))
        if session_dir.exists():
            import shutil
            shutil.rmtree(session_dir)
    
    # Update index
    index["sessions"] = to_keep
    with open(INDEX_FILE, "w") as f:
        json.dump(index, f, indent=2)
    
    print(f"Pruned {len(to_remove)} old sessions, kept {len(to_keep)} sessions from last {keep_days} days.")


def auto_append_backup_entry(operation_type: str, scope: str, output_paths: List[str]):
    """Auto-append an entry when backup/analysis runs during active session."""
    try:
        active = get_active_session()
        if not active:
            return  # No active session, skip silently
        
        # Load session directory from active session file
        with open(ACTIVE_SESSION_FILE, "r") as f:
            active_info = json.load(f)
        session_dir = Path(active_info["session_dir"])
        
        # Load session metadata
        session_file = session_dir / "session.json"
        with open(session_file, "r") as f:
            session = json.load(f)
        
        # Create entry
        content = f"Executed {operation_type} operation"
        if scope:
            content += f" (scope: {scope})"
        if output_paths:
            content += f"\nOutput paths:\n" + "\n".join(f"  - {p}" for p in output_paths)
        
        entry = {
            "timestamp": datetime.datetime.now().isoformat(),
            "actor": "system",
            "type": "result",
            "content": content,
            "attachments": output_paths or [],
            "outcome": "success",
        }
        
        # Append ONLY this new entry to entries.jsonl (truly append-only)
        append_entry(session_dir, entry)
        
        # Update session metadata
        session["entry_count"] = session.get("entry_count", 0) + 1
        session["last_updated_at"] = datetime.datetime.now().isoformat()
        save_session(session, session_dir)
        
        # Update index
        update_index(session, session_dir)
    except Exception:
        # Fail silently for auto-append
        pass
