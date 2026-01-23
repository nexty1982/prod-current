#!/usr/bin/env python3
"""
OM-Ops - Motivation Summary Module
Generates daily accomplishments summary.
"""

import os
import sys
import json
import datetime
from pathlib import Path
from typing import Dict, List, Optional
from collections import defaultdict

# Configuration
MOTIVATION_ROOT = Path("/var/backups/OM/motivation")
RUNS_DIR = MOTIVATION_ROOT / "runs"
REPORT_FILE = MOTIVATION_ROOT / "report.html"
CHANGELOG_INDEX = Path("/var/backups/OM/changelog/index.json")
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


def ensure_motivation_dirs():
    """Ensure motivation directories exist."""
    MOTIVATION_ROOT.mkdir(parents=True, exist_ok=True)
    RUNS_DIR.mkdir(parents=True, exist_ok=True)


def load_changelog_sessions() -> Dict:
    """Load changelog sessions grouped by date."""
    if not CHANGELOG_INDEX.exists():
        return {}
    
    try:
        with open(CHANGELOG_INDEX, "r") as f:
            changelog = json.load(f)
        
        sessions_by_date = defaultdict(list)
        for session in changelog.get("sessions", []):
            started_at = session.get("started_at", "")
            if started_at:
                date = started_at[:10]  # YYYY-MM-DD
                sessions_by_date[date].append(session)
        
        return dict(sessions_by_date)
    except Exception:
        return {}


def generate_motivation() -> Dict:
    """Generate motivation summary."""
    ensure_motivation_dirs()
    
    timestamp = datetime.datetime.now()
    timestamp_str = timestamp.strftime("%Y-%m-%d_%H%M%S")
    today = timestamp.strftime("%Y-%m-%d")
    
    # Load changelog data
    sessions_by_date = load_changelog_sessions()
    
    # Get today's sessions
    today_sessions = sessions_by_date.get(today, [])
    
    # Calculate stats
    total_sessions = len(today_sessions)
    successful_sessions = len([s for s in today_sessions if s.get("outcome") == "success"])
    total_entries = sum(s.get("entry_count", 0) for s in today_sessions)
    
    # Get top accomplishments (sessions with most entries or success outcomes)
    accomplishments = sorted(
        today_sessions,
        key=lambda s: (s.get("outcome") == "success", s.get("entry_count", 0)),
        reverse=True
    )[:5]
    
    motivation = {
        "timestamp": timestamp.isoformat(),
        "date": today,
        "today_sessions": total_sessions,
        "successful_sessions": successful_sessions,
        "total_entries": total_entries,
        "accomplishments": [
            {
                "title": s.get("title", "Untitled"),
                "outcome": s.get("outcome"),
                "entry_count": s.get("entry_count", 0),
            }
            for s in accomplishments
        ],
        "sessions_by_date": {k: len(v) for k, v in sessions_by_date.items()},
    }
    
    # Save motivation JSON
    run_dir = RUNS_DIR / timestamp_str
    run_dir.mkdir(parents=True, exist_ok=True)
    
    motivation_file = run_dir / "motivation.json"
    with open(motivation_file, "w") as f:
        json.dump(motivation, f, indent=2)
    
    # Generate HTML report
    generate_html_report(motivation, sessions_by_date)
    
    log_ops(f"Generated motivation summary: {run_dir}")
    
    return motivation


def generate_html_report(motivation: Dict, sessions_by_date: Dict):
    """Generate HTML report."""
    today = motivation.get("date", "")
    total_sessions = motivation.get("today_sessions", 0)
    successful = motivation.get("successful_sessions", 0)
    total_entries = motivation.get("total_entries", 0)
    accomplishments = motivation.get("accomplishments", [])
    
    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OM-Ops Motivation Summary</title>
    <style>
        * {{ box-sizing: border-box; }}
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background: #f5f5f5;
        }}
        .container {{
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }}
        h1 {{
            margin-top: 0;
            color: #2c3e50;
            border-bottom: 3px solid #27ae60;
            padding-bottom: 10px;
        }}
        .summary-cards {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin: 20px 0;
        }}
        .card {{
            background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%);
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
        .accomplishment {{
            padding: 15px;
            margin: 10px 0;
            background: #f8f9fa;
            border-left: 4px solid #27ae60;
            border-radius: 4px;
        }}
        .accomplishment h3 {{
            margin: 0 0 5px 0;
            color: #2c3e50;
        }}
        .next-steps {{
            margin-top: 30px;
            padding: 20px;
            background: #e8f5e9;
            border-radius: 8px;
        }}
    </style>
</head>
<body>
    <div class="container">
        <h1>Today's Accomplishments - {today}</h1>
        
        <div class="summary-cards">
            <div class="card">
                <h3>Sessions Completed</h3>
                <div class="value">{total_sessions}</div>
            </div>
            <div class="card">
                <h3>Successful Outcomes</h3>
                <div class="value">{successful}</div>
            </div>
            <div class="card">
                <h3>Total Entries</h3>
                <div class="value">{total_entries}</div>
            </div>
        </div>
        
        <h2>Top Accomplishments</h2>
        {''.join(f'''
        <div class="accomplishment">
            <h3>{acc["title"]}</h3>
            <p>Entries: {acc["entry_count"]} | Outcome: {acc.get("outcome", "in progress")}</p>
        </div>
        ''' for acc in accomplishments) if accomplishments else '<p>No sessions completed today.</p>'}
        
        <div class="next-steps">
            <h2>Next Steps</h2>
            <p>Continue building on today's progress. Focus on stability and incremental improvements.</p>
            <p><strong>Remember:</strong> Every session contributes to the overall system health and development velocity.</p>
        </div>
    </div>
</body>
</html>"""
    
    with open(REPORT_FILE, "w") as f:
        f.write(html)
    
    log_ops(f"Generated motivation HTML: {REPORT_FILE}")
