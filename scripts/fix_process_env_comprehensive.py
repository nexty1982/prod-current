#!/usr/bin/env python3
"""
Comprehensive fix for all process.env references in config.ts
Handles both direct property access and dynamic property access
"""

import re

def fix_process_env_comprehensive():
    config_file = '/var/www/orthodoxmetrics/prod/front-end/src/config.ts'
    
    print('🔧 Comprehensive fix for process.env references...')
    
    with open(config_file, 'r') as f:
        content = f.read()
    
    # Fix direct property access: process.env.VARIABLE_NAME
    def replace_direct_env(match):
        env_var = match.group(1)
        return f'(typeof process !== "undefined" ? process.env.{env_var} : undefined)'
    
    direct_pattern = r'process\.env\.([A-Z_]+)'
    content = re.sub(direct_pattern, replace_direct_env, content)
    
    # Fix dynamic property access: process.env[variable]
    def replace_dynamic_env(match):
        var_name = match.group(1)
        return f'(typeof process !== "undefined" ? process.env?.[{var_name}] : undefined)'
    
    dynamic_pattern = r'process\.env\?\.\[([^\]]+)\]'
    content = re.sub(dynamic_pattern, replace_dynamic_env, content)
    
    # Also handle cases where we might have process.env[variable] without the ?.
    dynamic_pattern2 = r'process\.env\[([^\]]+)\]'
    content = re.sub(dynamic_pattern2, replace_dynamic_env, content)
    
    with open(config_file, 'w') as f:
        f.write(content)
    
    print('✅ Fixed all process.env references (direct and dynamic)')

if __name__ == "__main__":
    fix_process_env_comprehensive()
