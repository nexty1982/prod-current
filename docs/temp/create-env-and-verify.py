#!/usr/bin/env python3
"""Create .env file and verify Zammad setup"""
import os
import shutil
import stat
import subprocess
import sys
import time

def create_env_file():
    """Create .env from .secrets.env if it doesn't exist"""
    compose_dir = '/opt/zammad'
    secrets_file = os.path.join(compose_dir, '.secrets.env')
    env_file = os.path.join(compose_dir, '.env')
    
    print("=== Step 1: Creating .env file ===")
    
    if not os.path.exists(secrets_file):
        print(f"✗ ERROR: {secrets_file} not found!")
        return False
    
    if os.path.exists(env_file):
        print(f"✓ .env already exists")
        # Verify it has POSTGRES_PASSWORD
        with open(env_file, 'r') as f:
            if 'POSTGRES_PASSWORD' in f.read():
                print("✓ .env contains POSTGRES_PASSWORD")
                return True
            else:
                print("⚠ .env exists but missing POSTGRES_PASSWORD, recreating...")
    
    # Create .env from .secrets.env
    try:
        shutil.copy2(secrets_file, env_file)
        os.chmod(env_file, 0o600)
        print(f"✓ Created {env_file} with permissions 600")
        
        # Verify
        with open(env_file, 'r') as f:
            if 'POSTGRES_PASSWORD' in f.read():
                print("✓ .env contains POSTGRES_PASSWORD")
                return True
            else:
                print("✗ ERROR: .env created but missing POSTGRES_PASSWORD")
                return False
    except Exception as e:
        print(f"✗ ERROR creating .env: {e}")
        return False

def restart_containers():
    """Restart Zammad containers"""
    print("\n=== Step 2: Restarting containers ===")
    
    compose_dir = '/opt/zammad'
    os.chdir(compose_dir)
    
    try:
        # Stop containers
        result = subprocess.run(['docker', 'compose', 'down'], 
                              capture_output=True, text=True, check=True)
        print("✓ Containers stopped")
        
        # Start containers
        result = subprocess.run(['docker', 'compose', 'up', '-d'], 
                              capture_output=True, text=True, check=True)
        print("✓ Containers started")
        
        # Wait for initialization
        print("\nWaiting for containers to initialize...")
        time.sleep(15)
        
        return True
    except subprocess.CalledProcessError as e:
        print(f"✗ ERROR: {e.stderr}")
        return False

def verify_setup():
    """Verify containers are running and no warnings"""
    print("\n=== Step 3: Verification ===")
    
    compose_dir = '/opt/zammad'
    os.chdir(compose_dir)
    
    # Check for POSTGRES_PASSWORD warning
    print("\nChecking for POSTGRES_PASSWORD warning...")
    try:
        result = subprocess.run(['docker', 'compose', 'config'], 
                              capture_output=True, text=True, check=True)
        if 'POSTGRES_PASSWORD' in result.stderr.upper() and 'NOT SET' in result.stderr.upper():
            print("✗ WARNING: POSTGRES_PASSWORD warning still present!")
            print(result.stderr)
            return False
        else:
            print("✓ No POSTGRES_PASSWORD warning")
    except subprocess.CalledProcessError:
        pass  # config might have warnings but that's ok
    
    # Check container status
    print("\nContainer status:")
    try:
        result = subprocess.run(['docker', 'compose', 'ps'], 
                              capture_output=True, text=True, check=True)
        print(result.stdout)
        
        # Check if zammad is up and not restarting
        if 'zammad-app' in result.stdout:
            if 'restarting' in result.stdout.lower():
                print("✗ WARNING: zammad-app is restarting")
                return False
            elif 'up' in result.stdout.lower():
                print("✓ zammad-app is Up")
            else:
                print("⚠ zammad-app status unclear")
    except subprocess.CalledProcessError as e:
        print(f"✗ ERROR checking status: {e.stderr}")
        return False
    
    # Test local HTTP
    print("\nTesting local HTTP connection (http://127.0.0.1:3030/)...")
    time.sleep(5)  # Give it a bit more time
    try:
        result = subprocess.run(['curl', '-I', 'http://127.0.0.1:3030/'], 
                              capture_output=True, text=True, timeout=10)
        if result.returncode == 0:
            print("✓ HTTP connection successful")
            print(result.stdout.split('\n')[0])  # First line (HTTP status)
            return True
        else:
            print("✗ Connection failed or refused")
            print(result.stderr)
            return False
    except Exception as e:
        print(f"✗ ERROR testing HTTP: {e}")
        return False

def main():
    if os.geteuid() != 0:
        print("ERROR: This script must be run as root (use sudo)")
        sys.exit(1)
    
    success = True
    
    if not create_env_file():
        success = False
    
    if success and not restart_containers():
        success = False
    
    if success and not verify_setup():
        success = False
    
    if success:
        print("\n=== ✓ All Steps Complete ===")
        print("\nNext: Fix Nginx routing (Step 3)")
    else:
        print("\n=== ✗ Some steps failed ===")
        sys.exit(1)

if __name__ == '__main__':
    main()
