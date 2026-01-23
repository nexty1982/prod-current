#!/usr/bin/env python3
"""
OM-Ops - Screen-Based UI Renderer
Provides centralized screen rendering and navigation for interactive menus.
"""

import os
import sys
from typing import List, Optional


def clear_screen():
    """Clear the terminal screen."""
    os.system("clear" if os.name != "nt" else "cls")


def render_screen(
    title: str,
    breadcrumb: str,
    context_lines: List[str] = None,
    body_lines: List[str] = None,
    footer_hint: str = "[Enter] Back   [0] Main Menu   [q] Quit"
) -> None:
    """
    Render a full screen with consistent layout.
    
    Args:
        title: Screen title (shown in header)
        breadcrumb: Breadcrumb path (e.g., "OM-Ops › Hard Exclusions › View")
        context_lines: Optional context information (shown before separator)
        body_lines: Main content lines (shown after separator)
        footer_hint: Footer hint text
    """
    clear_screen()
    
    # Header
    print("=" * 80)
    print(f"  {breadcrumb}")
    print("=" * 80)
    print()
    
    # Context (if provided)
    if context_lines:
        for line in context_lines:
            print(line)
        print()
    
    # Separator
    print("-" * 80)
    
    # Body (if provided)
    if body_lines:
        print()
        for line in body_lines:
            print(line)
        print()
    
    # Separator
    print("-" * 80)
    
    # Footer
    print()
    print(footer_hint)
    print()


def get_user_input(prompt: str = "Select option: ") -> Optional[str]:
    """
    Get user input with consistent handling.
    
    Returns:
        User input string, or None on EOF/KeyboardInterrupt
    """
    try:
        return input(prompt).strip()
    except (EOFError, KeyboardInterrupt):
        return None


def wait_for_enter(message: str = "Press Enter to continue..."):
    """Wait for user to press Enter."""
    try:
        input(message)
    except (EOFError, KeyboardInterrupt):
        pass
