# NFS Test Button Troubleshooting Guide

## What the NFS Test Button Does

The NFS test button performs the following steps:

### 1. Frontend Action
- Sends a POST request to `/api/admin/nfs-backup/test`
- Includes the NFS Server IP and Remote Path from the form
- Shows loading state while testing

### 2. Backend Test Process
The backend performs these checks in order:

#### Step 1: Ping Test
```bash
ping -c 1 -W 3 <NFS_SERVER_IP>
```
- Tests if the NFS server is reachable on the network
- Timeout: 3 seconds
- If this fails: "NFS connection failed: ping timeout"

#### Step 2: NFS Exports Check
```bash
showmount -e <NFS_SERVER_IP>
```
- Checks what NFS exports are available on the server
- If this fails: "NFS connection failed: cannot access exports"

#### Step 3: Path Validation
- Checks if the specified remote path exists in the exports list
- If path not found: "Remote path not found in NFS exports"
- If path found: "NFS connection successful"

## Current Issue Analysis

Based on your console logs:
- ✅ **HTTP Request**: POST to `/api/admin/nfs-backup/test` 
- ✅ **HTTP Response**: 200 OK
- ❌ **UI Display**: "NFS connection test failed"

This suggests the backend is returning a 200 response but with `success: false` in the JSON body.

## How to Debug

### Option 1: Check Browser Network Tab
1. Open browser DevTools (F12)
2. Go to Network tab
3. Click the "Test Connection" button
4. Look for the request to `/api/admin/nfs-backup/test`
5. Click on it and check the "Response" tab
6. You should see something like:
   ```json
   {
     "success": false,
     "message": "NFS connection failed: ping timeout"
   }
   ```

### Option 2: Test Backend Directly
```bash
# Test the API endpoint directly
curl -X POST http://localhost:3001/api/admin/nfs-backup/test \
  -H "Content-Type: application/json" \
  -d '{"nfsServerIP":"192.168.1.230","remotePath":"/nfs/backup"}'
```

### Option 3: Manual NFS Testing
```bash
# Test network connectivity
ping -c 1 192.168.1.230

# Test NFS exports (requires nfs-common package)
showmount -e 192.168.1.230

# Check if NFS client tools are installed
dpkg -l | grep nfs-common
```

## Common Issues and Solutions

### Issue 1: NFS Server Not Reachable
**Symptoms**: "ping timeout" error
**Solutions**:
- Check if NFS server IP is correct
- Verify network connectivity
- Check firewall settings
- Ensure NFS server is running

### Issue 2: NFS Exports Not Accessible
**Symptoms**: "cannot access exports" error
**Solutions**:
- Install nfs-common: `sudo apt-get install nfs-common`
- Check NFS server configuration
- Verify firewall allows NFS traffic (port 2049)
- Check NFS server exports configuration

### Issue 3: Remote Path Not Found
**Symptoms**: "Remote path not found in NFS exports" error
**Solutions**:
- Verify the remote path is correctly exported on NFS server
- Check `/etc/exports` on NFS server
- Run `sudo exportfs -ra` on NFS server
- Ensure the path exists on NFS server

### Issue 4: Permission Issues
**Symptoms**: "Permission denied" errors
**Solutions**:
- Check NFS server export permissions
- Verify client IP is allowed in exports
- Check file permissions on NFS server

## NFS Server Configuration Example

On your NFS server, ensure `/etc/exports` contains:
```
/nfs/backup *(rw,sync,no_subtree_check)
```

Then reload exports:
```bash
sudo exportfs -ra
```

## Frontend Fix Applied

I've fixed the frontend component to properly handle the response. The issue was that the frontend was looking for `response.error` but the backend returns `response.message`.

**Before**:
```javascript
setError(response.error || 'NFS connection test failed');
```

**After**:
```javascript
setError(response.message || response.error || 'NFS connection test failed');
```

## Next Steps

1. **Rebuild the frontend** to apply the fix:
   ```bash
   cd front-end
   npm run build
   ```

2. **Test the button again** and check the browser console for the actual error message

3. **Use the debug script** (if on Linux) to get detailed diagnostics:
   ```bash
   ./debug-nfs-test.sh
   ```

4. **Check the actual NFS server** to ensure it's properly configured and accessible

The test button is working correctly - it's just that the NFS server at `192.168.1.230` is either not reachable or not properly configured for the path `/nfs/backup`. 