#!/usr/bin/env python3
"""
FreeScout API Client for OM-Ops
Provides connectivity checks and ticket validation for work-order gating.
"""

import os
import sys
import json
import urllib.request
import urllib.error
import urllib.parse
from typing import Dict, Optional, Tuple
from pathlib import Path

# Configuration
FREESCOUT_BASE_URL = os.getenv("FREESCOUT_BASE_URL", "https://orthodoxmetrics.com/helpdesk")
FREESCOUT_API_KEY = os.getenv("FREESCOUT_API_KEY", "")
FREESCOUT_CONFIG_FILE = Path("/opt/freescout/.freescout_api_key")  # Alternative config location
REQUIRE_TICKET = os.getenv("REQUIRE_TICKET", "false").lower() == "true"


def get_api_key() -> Optional[str]:
    """Get FreeScout API key from environment or config file."""
    # Try environment variable first
    if FREESCOUT_API_KEY:
        return FREESCOUT_API_KEY
    
    # Try config file
    if FREESCOUT_CONFIG_FILE.exists():
        try:
            with open(FREESCOUT_CONFIG_FILE, "r") as f:
                api_key = f.read().strip()
                if api_key:
                    return api_key
        except Exception as e:
            print(f"Warning: Could not read API key from {FREESCOUT_CONFIG_FILE}: {e}", file=sys.stderr)
    
    return None


def make_api_request(endpoint: str, method: str = "GET", data: Optional[Dict] = None) -> Tuple[bool, Optional[Dict], Optional[str]]:
    """
    Make a FreeScout API request.
    
    Args:
        endpoint: API endpoint (e.g., "/api/conversations/123")
        method: HTTP method (GET, POST, etc.)
        data: Optional JSON data for POST requests
    
    Returns:
        Tuple of (success, response_data, error_message)
    """
    api_key = get_api_key()
    if not api_key:
        return False, None, "FreeScout API key not configured. Set FREESCOUT_API_KEY environment variable or create /opt/freescout/.freescout_api_key"
    
    # Ensure endpoint starts with /
    if not endpoint.startswith("/"):
        endpoint = "/" + endpoint
    
    # Ensure endpoint starts with /api
    if not endpoint.startswith("/api"):
        endpoint = "/api" + endpoint
    
    url = f"{FREESCOUT_BASE_URL.rstrip('/')}{endpoint}"
    
    # Add API key as query parameter (FreeScout supports this method)
    parsed_url = urllib.parse.urlparse(url)
    query_params = urllib.parse.parse_qs(parsed_url.query)
    query_params["api_key"] = [api_key]
    new_query = urllib.parse.urlencode(query_params, doseq=True)
    url = urllib.parse.urlunparse(parsed_url._replace(query=new_query))
    
    try:
        req = urllib.request.Request(url, method=method)
        
        # Also set header (FreeScout supports both)
        req.add_header("X-FreeScout-API-Key", api_key)
        req.add_header("Content-Type", "application/json")
        req.add_header("Accept", "application/json")
        
        if data:
            req.data = json.dumps(data).encode("utf-8")
        
        with urllib.request.urlopen(req, timeout=10) as response:
            response_data = json.loads(response.read().decode("utf-8"))
            return True, response_data, None
    
    except urllib.error.HTTPError as e:
        error_body = ""
        try:
            error_body = e.read().decode("utf-8")
        except:
            pass
        return False, None, f"HTTP {e.code}: {error_body or str(e)}"
    
    except urllib.error.URLError as e:
        return False, None, f"Connection error: {str(e)}"
    
    except json.JSONDecodeError as e:
        return False, None, f"Invalid JSON response: {str(e)}"
    
    except Exception as e:
        return False, None, f"Unexpected error: {str(e)}"


def check_connectivity() -> Tuple[bool, Dict]:
    """
    Check FreeScout API connectivity.
    
    Returns:
        Tuple of (success, details_dict)
    """
    api_key = get_api_key()
    if not api_key:
        return False, {
            "reachable": False,
            "error": "API key not configured",
            "config_hint": "Set FREESCOUT_API_KEY environment variable or create /opt/freescout/.freescout_api_key"
        }
    
    # Try a simple API endpoint (e.g., list conversations with limit=1)
    success, data, error = make_api_request("/conversations?per_page=1")
    
    if success:
        return True, {
            "reachable": True,
            "api_key_configured": True,
            "base_url": FREESCOUT_BASE_URL,
            "test_response": "OK"
        }
    else:
        return False, {
            "reachable": False,
            "api_key_configured": True,
            "base_url": FREESCOUT_BASE_URL,
            "error": error
        }


def get_ticket(ticket_id: str) -> Tuple[bool, Optional[Dict], Optional[str]]:
    """
    Fetch a ticket (conversation) by ID.
    
    Args:
        ticket_id: Numeric ticket/conversation ID
    
    Returns:
        Tuple of (success, ticket_data, error_message)
    """
    if not ticket_id or not ticket_id.strip().isdigit():
        return False, None, "Invalid ticket ID: must be numeric"
    
    success, data, error = make_api_request(f"/conversations/{ticket_id.strip()}")
    
    if success:
        return True, data, None
    else:
        return False, None, error or "Failed to fetch ticket"


def validate_ticket(ticket_id: str) -> Tuple[bool, Optional[Dict], Optional[str]]:
    """
    Validate that a ticket exists and is not closed/invalid.
    
    Args:
        ticket_id: Numeric ticket/conversation ID
    
    Returns:
        Tuple of (is_valid, ticket_data, error_message)
    """
    success, ticket_data, error = get_ticket(ticket_id)
    
    if not success:
        return False, None, error
    
    # Check if ticket is closed
    # FreeScout API structure may vary, but typically has a "state" or "status" field
    state = ticket_data.get("state") or ticket_data.get("status") or ticket_data.get("state_name", "").lower()
    
    if state in ["closed", "resolved", "spam"]:
        return False, ticket_data, f"Ticket {ticket_id} is {state} (closed/invalid)"
    
    # Ticket exists and is not closed
    return True, ticket_data, None


def get_ticket_url(ticket_id: str) -> str:
    """Get the web URL for a ticket."""
    return f"{FREESCOUT_BASE_URL.rstrip('/')}/tickets/{ticket_id}"


def post_ticket_note(ticket_id: str, note: str) -> Tuple[bool, Optional[str]]:
    """
    Post a note to a FreeScout ticket.
    
    Args:
        ticket_id: Numeric ticket/conversation ID
        note: Note text to post
    
    Returns:
        Tuple of (success, error_message)
    """
    if not ticket_id or not ticket_id.strip().isdigit():
        return False, "Invalid ticket ID"
    
    # FreeScout API endpoint for adding notes/threads
    # This may need adjustment based on actual API structure
    data = {
        "body": note,
        "type": "note"  # or "thread" depending on API
    }
    
    success, response_data, error = make_api_request(
        f"/conversations/{ticket_id.strip()}/threads",
        method="POST",
        data=data
    )
    
    if success:
        return True, None
    else:
        return False, error or "Failed to post note"


if __name__ == "__main__":
    # CLI test mode
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: freescout_client.py <command> [args]")
        print("Commands: check, ticket <id>, validate <id>")
        sys.exit(1)
    
    command = sys.argv[1]
    
    if command == "check":
        success, details = check_connectivity()
        print(json.dumps(details, indent=2))
        sys.exit(0 if success else 1)
    
    elif command == "ticket" and len(sys.argv) >= 3:
        ticket_id = sys.argv[2]
        success, data, error = get_ticket(ticket_id)
        if success:
            print(json.dumps(data, indent=2))
        else:
            print(f"Error: {error}", file=sys.stderr)
            sys.exit(1)
    
    elif command == "validate" and len(sys.argv) >= 3:
        ticket_id = sys.argv[2]
        is_valid, data, error = validate_ticket(ticket_id)
        if is_valid:
            print(f"✓ Ticket {ticket_id} is valid")
            print(f"  URL: {get_ticket_url(ticket_id)}")
            if data:
                print(f"  Subject: {data.get('subject', 'N/A')}")
        else:
            print(f"✗ Ticket {ticket_id} validation failed: {error}", file=sys.stderr)
            sys.exit(1)
    
    else:
        print(f"Unknown command: {command}", file=sys.stderr)
        sys.exit(1)
