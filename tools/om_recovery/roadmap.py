#!/usr/bin/env python3
"""
OM-Ops - Roadmap & Milestones Module
Tracks project milestones and progress.
"""

import os
import sys
import json
import datetime
from pathlib import Path
from typing import Dict, List, Optional

# Configuration
ROADMAP_ROOT = Path("/var/backups/OM/roadmap")
ROADMAP_FILE = ROADMAP_ROOT / "roadmap.json"
REPORT_FILE = ROADMAP_ROOT / "report.html"
OPS_LOG = Path("/var/backups/OM/om-ops.log")

MILESTONE_STATUSES = ["planned", "in_progress", "complete", "blocked"]


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


def ensure_roadmap_dirs():
    """Ensure roadmap directories exist."""
    ROADMAP_ROOT.mkdir(parents=True, exist_ok=True)


def load_roadmap() -> Dict:
    """Load roadmap data."""
    ensure_roadmap_dirs()
    
    if ROADMAP_FILE.exists():
        with open(ROADMAP_FILE, "r") as f:
            return json.load(f)
    
    return {"milestones": []}


def save_roadmap(roadmap: Dict):
    """Save roadmap data."""
    ensure_roadmap_dirs()
    with open(ROADMAP_FILE, "w") as f:
        json.dump(roadmap, f, indent=2)
    log_ops(f"Saved roadmap: {len(roadmap.get('milestones', []))} milestones")


def add_milestone(title: str, owner: str = "Both", notes: str = "") -> str:
    """Add a new milestone."""
    roadmap = load_roadmap()
    
    # Generate ID from title
    milestone_id = "".join(c.lower() if c.isalnum() else "-" for c in title[:50])
    milestone_id = "-".join(m for m in milestone_id.split("-") if m)
    
    milestone = {
        "id": milestone_id,
        "title": title,
        "status": "planned",
        "percent": 0,
        "owner": owner,
        "created_at": datetime.datetime.now().isoformat(),
        "updated_at": datetime.datetime.now().isoformat(),
        "notes": notes,
        "tasks": [],
    }
    
    roadmap["milestones"].append(milestone)
    save_roadmap(roadmap)
    
    log_ops(f"Added milestone: {title}")
    return milestone_id


def update_milestone(milestone_id: str, status: str = None, percent: int = None, notes: str = None):
    """Update milestone."""
    roadmap = load_roadmap()
    
    for milestone in roadmap["milestones"]:
        if milestone["id"] == milestone_id:
            if status:
                milestone["status"] = status
            if percent is not None:
                milestone["percent"] = max(0, min(100, percent))
            if notes is not None:
                milestone["notes"] = notes
            milestone["updated_at"] = datetime.datetime.now().isoformat()
            break
    
    save_roadmap(roadmap)
    log_ops(f"Updated milestone: {milestone_id}")


def mark_milestone_complete(milestone_id: str):
    """Mark milestone as complete."""
    update_milestone(milestone_id, status="complete", percent=100)
    log_ops(f"Marked milestone complete: {milestone_id}")


def generate_roadmap_html():
    """Generate roadmap HTML report."""
    roadmap = load_roadmap()
    milestones = roadmap.get("milestones", [])
    
    # Group by status
    by_status = {status: [] for status in MILESTONE_STATUSES}
    for m in milestones:
        status = m.get("status", "planned")
        if status in by_status:
            by_status[status].append(m)
    
    # Generate milestone HTML for each status
    def render_milestone_html(m):
        notes_html = f"<p>{m.get('notes', '')}</p>" if m.get('notes') else ""
        updated = m.get('updated_at', '')[:10] if m.get('updated_at') else 'unknown'
        return f"""
            <div class="milestone status-{m.get('status', 'planned')}">
                <h3>{m.get('title', 'Untitled')}</h3>
                <p><strong>Owner:</strong> {m.get('owner', 'Unknown')}</p>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: {m.get('percent', 0)}%"></div>
                </div>
                <p><small>{m.get('percent', 0)}% complete</small></p>
                {notes_html}
                <p><small>Updated: {updated}</small></p>
            </div>
        """
    
    planned_html = "".join(render_milestone_html(m) for m in by_status['planned'])
    in_progress_html = "".join(render_milestone_html(m) for m in by_status['in_progress'])
    complete_html = "".join(render_milestone_html(m) for m in by_status['complete'])
    blocked_html = "".join(render_milestone_html(m) for m in by_status['blocked'])
    
    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OM-Ops Roadmap</title>
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
        .board {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin: 20px 0;
        }}
        .column {{
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
        }}
        .column h2 {{
            margin-top: 0;
            font-size: 18px;
        }}
        .milestone {{
            background: white;
            padding: 15px;
            margin: 10px 0;
            border-radius: 4px;
            border-left: 4px solid #3498db;
        }}
        .milestone h3 {{
            margin: 0 0 10px 0;
            font-size: 16px;
        }}
        .progress-bar {{
            width: 100%;
            height: 20px;
            background: #ecf0f1;
            border-radius: 10px;
            overflow: hidden;
            margin: 10px 0;
        }}
        .progress-fill {{
            height: 100%;
            background: linear-gradient(90deg, #3498db, #2980b9);
            transition: width 0.3s;
        }}
        .status-planned {{ border-left-color: #95a5a6; }}
        .status-in_progress {{ border-left-color: #3498db; }}
        .status-complete {{ border-left-color: #27ae60; }}
        .status-blocked {{ border-left-color: #e74c3c; }}
    </style>
</head>
<body>
    <div class="container">
        <h1>OM-Ops Roadmap & Milestones</h1>
        
        <div class="board">
            <div class="column">
                <h2>Planned ({len(by_status['planned'])})</h2>
                {planned_html if planned_html else '<p>No planned milestones.</p>'}
            </div>
            <div class="column">
                <h2>In Progress ({len(by_status['in_progress'])})</h2>
                {in_progress_html if in_progress_html else '<p>No milestones in progress.</p>'}
            </div>
            <div class="column">
                <h2>Complete ({len(by_status['complete'])})</h2>
                {complete_html if complete_html else '<p>No completed milestones.</p>'}
            </div>
            <div class="column">
                <h2>Blocked ({len(by_status['blocked'])})</h2>
                {blocked_html if blocked_html else '<p>No blocked milestones.</p>'}
            </div>
        </div>
    </div>
</body>
</html>"""
    
    with open(REPORT_FILE, "w") as f:
        f.write(html)
    
    log_ops(f"Generated roadmap HTML: {REPORT_FILE}")
