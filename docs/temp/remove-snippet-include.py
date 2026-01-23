#!/usr/bin/env python3
"""Remove include statement for orthodoxmetrics-helpdesk snippet"""
import sys

config_file = '/etc/nginx/sites-available/orthodmetrics.com'

try:
    with open(config_file, 'r') as f:
        lines = f.readlines()
    
    # Find and remove the include line
    new_lines = []
    removed = False
    for i, line in enumerate(lines, 1):
        if 'orthodoxmetrics-helpdesk' in line:
            print(f'Found include on line {i}: {line.strip()}')
            removed = True
            continue  # Skip this line
        new_lines.append(line)
    
    if removed:
        with open(config_file, 'w') as f:
            f.writelines(new_lines)
        print(f'✓ Removed include statement from {config_file}')
        sys.exit(0)
    else:
        print('Include statement not found')
        sys.exit(0)
except PermissionError:
    print(f'ERROR: Permission denied. Run with sudo.')
    sys.exit(1)
except Exception as e:
    print(f'ERROR: {e}')
    sys.exit(1)
