#!/usr/bin/env python3
"""
Fix all process.env references in config.ts to be browser-safe
"""

import re

def fix_process_env():
    config_file = '/var/www/orthodoxmetrics/prod/front-end/src/config.ts'
    
    print('🔧 Fixing process.env references for browser compatibility...')
    
    with open(config_file, 'r') as f:
        content = f.read()
    
    # Replace all process.env references with browser-safe versions
    def replace_process_env(match):
        env_var = match.group(1)
        return f'(typeof process !== "undefined" ? process.env.{env_var} : undefined)'
    
    # Pattern to match process.env.VARIABLE_NAME
    pattern = r'process\.env\.([A-Z_]+)'
    content = re.sub(pattern, replace_process_env, content)
    
    with open(config_file, 'w') as f:
        f.write(content)
    
    print('✅ Fixed all process.env references')

if __name__ == "__main__":
    fix_process_env()
