#!/usr/bin/env python3
"""
om-md - Extract source code from a directory into a markdown file

Usage:
    om-md <directory_path> [output_file]

Examples:
    om-md /var/www/orthodoxmetrics/prod/front-end/src/devel-tools/refactor-console
      # Creates: docs/OM-MD/01-26-2026/refactor-console.md
    om-md /var/www/orthodoxmetrics/prod/front-end/src/components custom-output.md
      # Creates: custom-output.md (override)

By default, output files are created in docs/OM-MD/MM-DD-YYYY/<directory_name>.md
The date directory (MM-DD-YYYY) is automatically created based on the current date.
"""

import os
import sys
from pathlib import Path
from datetime import datetime
import mimetypes

# Source code file extensions
SOURCE_EXTENSIONS = {
    '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
    '.py', '.java', '.cpp', '.c', '.h', '.hpp', '.cxx', '.cc',
    '.cs', '.go', '.rs', '.rb', '.php', '.swift', '.kt', '.scala',
    '.vue', '.svelte',
    '.sql', '.sh', '.bash',
    '.css', '.scss', '.sass', '.less',
    '.json', '.yaml', '.yml', '.toml', '.xml',
    '.html', '.htm',
    '.md', '.txt'
}

# Language mapping for syntax highlighting
LANG_MAP = {
    '.ts': 'typescript', '.tsx': 'typescript',
    '.js': 'javascript', '.jsx': 'javascript', '.mjs': 'javascript', '.cjs': 'javascript',
    '.py': 'python',
    '.java': 'java',
    '.cpp': 'cpp', '.cxx': 'cpp', '.cc': 'cpp', '.hpp': 'cpp',
    '.c': 'c', '.h': 'c',
    '.cs': 'csharp',
    '.go': 'go',
    '.rs': 'rust',
    '.rb': 'ruby',
    '.php': 'php',
    '.swift': 'swift',
    '.kt': 'kotlin',
    '.scala': 'scala',
    '.vue': 'vue',
    '.svelte': 'svelte',
    '.sql': 'sql',
    '.sh': 'bash', '.bash': 'bash',
    '.css': 'css',
    '.scss': 'scss', '.sass': 'scss',
    '.less': 'less',
    '.json': 'json',
    '.yaml': 'yaml', '.yml': 'yaml',
    '.toml': 'toml',
    '.xml': 'xml',
    '.html': 'html', '.htm': 'html',
    '.md': 'markdown',
    '.txt': 'text'
}


def is_text_file(file_path):
    """Check if a file is a text file."""
    try:
        mime_type, _ = mimetypes.guess_type(str(file_path))
        if mime_type and mime_type.startswith('text/'):
            return True
        
        # Try to read first few bytes
        with open(file_path, 'rb') as f:
            chunk = f.read(512)
            # Check if it's likely text (no null bytes, mostly printable)
            if b'\x00' in chunk:
                return False
            try:
                chunk.decode('utf-8')
                return True
            except UnicodeDecodeError:
                return False
    except Exception:
        return False


def find_source_files(directory):
    """Find all source code files in directory and subdirectories."""
    source_files = []
    directory = Path(directory).resolve()
    
    for root, dirs, files in os.walk(directory):
        # Skip hidden directories
        dirs[:] = [d for d in dirs if not d.startswith('.')]
        
        for file in files:
            # Skip hidden files
            if file.startswith('.'):
                continue
            
            file_path = Path(root) / file
            ext = file_path.suffix.lower()
            
            if ext in SOURCE_EXTENSIONS:
                source_files.append(file_path)
    
    return sorted(source_files)


def get_language(file_path):
    """Get language identifier for syntax highlighting."""
    ext = file_path.suffix.lower()
    return LANG_MAP.get(ext, 'text')


def escape_markdown(text):
    """Escape special markdown characters."""
    return text.replace('[', '\\[').replace(']', '\\]')


def create_anchor(text):
    """Create markdown anchor from text."""
    return text.lower().replace(' ', '-').replace('/', '-').replace('\\', '-')


def extract_to_markdown(source_dir, output_file=None):
    """Extract source code to markdown file."""
    source_dir = Path(source_dir).resolve()
    
    if not source_dir.is_dir():
        print(f"Error: Directory does not exist: {source_dir}", file=sys.stderr)
        sys.exit(1)
    
    dir_name = source_dir.name
    
    # Determine output file location
    # Default: Z:\docs\OM-MD\MM-DD-YYYY\filename.md
    # On Linux: /var/www/orthodoxmetrics/prod/docs/OM-MD/MM-DD-YYYY/filename.md
    if output_file is None:
        # Get actual script location (resolve symlinks)
        script_file = Path(__file__).resolve()
        script_dir = script_file.parent
        
        # Get project root (script is in tools/om-md/, so go up 2 levels)
        # tools/om-md -> tools -> project root
        project_root = script_dir.parent.parent
        
        # Verify we're in the right place (check for docs directory)
        if not (project_root / "docs").exists():
            # Fallback: try to find project root by looking for docs directory
            current_dir = project_root
            while current_dir != current_dir.parent:
                if (current_dir / "docs").exists():
                    project_root = current_dir
                    break
                current_dir = current_dir.parent
        
        # Final verification
        if not (project_root / "docs").exists():
            print(f"Error: Could not find project root (looking for docs/ directory)", file=sys.stderr)
            print(f"Current PROJECT_ROOT: {project_root}", file=sys.stderr)
            sys.exit(1)
        
        # Create date directory path (MM-DD-YYYY format)
        date_dir = datetime.now().strftime("%m-%d-%Y")
        output_base_dir = project_root / "docs" / "OM-MD" / date_dir
        
        # Create date directory if it doesn't exist
        output_base_dir.mkdir(parents=True, exist_ok=True)
        
        # Output filename
        output_file = output_base_dir / f"{dir_name}.md"
        
        # If output file exists, add timestamp to filename
        if output_file.exists():
            timestamp = datetime.now().strftime("%H%M%S")
            output_file = output_base_dir / f"{dir_name}_{timestamp}.md"
            print(f"Warning: Output file exists, using: {output_file.name}")
    else:
        # Use override if provided
        output_file = Path(output_file).resolve()
        if not output_file.is_absolute():
            output_file = Path.cwd() / output_file
        # Create output directory if it doesn't exist
        output_file.parent.mkdir(parents=True, exist_ok=True)
    
    print(f"Extracting source code from: {source_dir}")
    print(f"Output file: {output_file}")
    
    # Find all source files
    source_files = find_source_files(source_dir)
    total_files = len(source_files)
    
    with open(output_file, 'w', encoding='utf-8') as f:
        # Write header
        f.write(f"# Source Code Extraction: {dir_name}\n\n")
        f.write(f"**Extracted from:** `{source_dir}`\n")
        f.write(f"**Generated:** {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}\n\n")
        f.write("---\n\n")
        
        if total_files == 0:
            f.write("**No source files found in the specified directory.**\n")
        else:
            f.write(f"**Total files:** {total_files}\n\n")
            f.write("## Table of Contents\n\n")
            
            # Generate table of contents
            for file_path in source_files:
                relative_path = file_path.relative_to(source_dir)
                link_text = escape_markdown(str(relative_path))
                anchor = create_anchor(str(relative_path))
                f.write(f"- [{link_text}](#{anchor})\n")
            
            f.write("\n---\n\n")
            
            # Process each file
            for file_path in source_files:
                relative_path = file_path.relative_to(source_dir)
                
                f.write(f"## File: `{relative_path}`\n\n")
                
                # Get file info
                try:
                    file_size = file_path.stat().st_size
                    with open(file_path, 'rb') as file:
                        line_count = sum(1 for _ in file)
                except Exception:
                    file_size = 0
                    line_count = 0
                
                f.write(f"**Size:** {file_size} bytes | **Lines:** {line_count}\n\n")
                
                # Determine language
                lang = get_language(file_path)
                
                f.write(f"```{lang}\n")
                
                # Read and write file content
                if is_text_file(file_path):
                    try:
                        with open(file_path, 'r', encoding='utf-8', errors='replace') as file:
                            content = file.read()
                            f.write(content)
                            if content and not content.endswith('\n'):
                                f.write('\n')
                    except Exception as e:
                        f.write(f"# Error reading file: {e}\n")
                else:
                    f.write("# Binary file - content not displayed\n")
                
                f.write("```\n\n")
                f.write("---\n\n")
            
            f.write("\n---\n\n")
            f.write("**Extraction complete.**\n\n")
            f.write(f"Generated by `om-md` on {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}\n")
    
    print(f"✓ Successfully extracted {total_files} files to: {output_file}")


def main():
    if len(sys.argv) < 2:
        print("Usage: om-md <directory_path> [output_file]", file=sys.stderr)
        print("\nExtract source code from a directory into a markdown file.")
        print("\nArguments:")
        print("  directory_path  Path to the directory to extract source code from")
        print("  output_file     Optional. Override output file path (default: docs/OM-MD/MM-DD-YYYY/<directory_name>.md)")
        print("\nExamples:")
        print(f"  {sys.argv[0]} /var/www/orthodoxmetrics/prod/front-end/src/devel-tools/refactor-console")
        print("    # Creates: docs/OM-MD/01-26-2026/refactor-console.md")
        print(f"  {sys.argv[0]} /var/www/orthodoxmetrics/prod/front-end/src/components custom-output.md")
        print("    # Creates: custom-output.md (override)")
        sys.exit(1)
    
    source_dir = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else None
    
    extract_to_markdown(source_dir, output_file)


if __name__ == '__main__':
    main()
