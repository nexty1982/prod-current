# Fixing 404 Routing Issue for Unauthenticated Users

## Problem Description

When unauthenticated users visit `https://orthodoxmetrics.com`, they see a 404 error or the maintenance page instead of being redirected to the login page.

## Root Cause

### Issue #1: External Nginx (.221) - Intercepting All 404s

**File**: `config/nginx-external-221.conf`

**Problem** (Lines 46-47):
```nginx
proxy_intercept_errors on;
error_page 404 502 503 504 /updating.html;
```

This configuration intercepts **ALL 404 errors**, including legitimate routing requests from the React SPA, and shows the `/updating.html` maintenance page instead.

### Issue #2: Internal Nginx (.239) - Incorrect try_files

**File**: `config/nginx-internal-239.conf`

**Problem** (Lines 69, 78):
```nginx
location = /index.html {
    try_files $uri =404;  # Returns 404 if not found
}

location ~* \.(html)$ {
    try_files $uri =404;  # Returns 404 if not found
}
```

This returns a hard 404 instead of falling back to serve `index.html` for SPA routing.

---

## The Solution

### Fix #1: External Nginx - Only Intercept Backend Errors

**Changed From:**
```nginx
error_page 404 502 503 504 /updating.html;
```

**Changed To:**
```nginx
error_page 502 503 504 /updating.html;
```

**Result**: 404 errors now pass through to the application, allowing React Router to handle SPA routes.

### Fix #2: Internal Nginx - Proper SPA Fallback

**Changed From:**
```nginx
location = /index.html {
    try_files $uri =404;
}

location ~* \.(html)$ {
    try_files $uri =404;
}
```

**Changed To:**
```nginx
location = /index.html {
    try_files $uri /index.html;
}

location ~* ^(?!/index\.html$).*\.html$ {
    try_files $uri /index.html;
}
```

**Result**: Missing HTML files fall back to `index.html`, allowing React Router to handle the route.

---

## Deployment Steps

### Automated Deployment (Recommended)

Run the deployment script:

```bash
sudo /var/www/orthodoxmetrics/prod/scripts/fix-404-routing.sh
```

### Manual Deployment

#### On Internal Server (.239):

```bash
# Copy config
sudo cp /var/www/orthodoxmetrics/prod/config/nginx-internal-239.conf \
     /etc/nginx/sites-available/orthodoxmetrics.com

# Test configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

#### On External Server (.221):

```bash
# Copy config from .239 to .221
sudo scp user@192.168.1.239:/var/www/orthodoxmetrics/prod/config/nginx-external-221.conf \
     /etc/nginx/sites-available/orthodoxmetrics.com

# Test configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

---

## Verification

### Test 1: Unauthenticated Access

```bash
# Should return 200 and serve index.html
curl -I https://orthodoxmetrics.com

# Expected headers:
# HTTP/1.1 200 OK
# Content-Type: text/html
# Cache-Control: no-store, no-cache, must-revalidate
```

### Test 2: Browser Test (Incognito Mode)

1. Open browser in **incognito/private mode** (to test as unauthenticated)
2. Visit: `https://orthodoxmetrics.com`
3. **Expected**: Redirect to `/auth/login2` (login page)
4. **Before Fix**: 404 error or `/updating.html` maintenance page

### Test 3: SPA Routing

```bash
# Should return 200 and serve index.html (React Router handles the route)
curl -I https://orthodoxmetrics.com/apps/records/baptism

# Expected: 200 OK with index.html
# React Router will then handle the /apps/records/baptism route
```

### Test 4: Check Logs

```bash
# Monitor nginx access logs
sudo tail -f /var/log/nginx/orthodoxmetrics.access.log

# Look for:
# GET / → 200 (good)
# GET / → 404 → 302 /updating.html (bad - means fix not applied)
```

---

## How It Works Now

### For Unauthenticated Users:

1. User visits `https://orthodoxmetrics.com`
2. External nginx (.221) proxies to internal (.239)
3. Internal nginx serves `/front-end/dist/index.html`
4. React app loads
5. `SmartRedirect` component checks authentication
6. User is redirected to `/auth/login2` (login page)
7. ✅ User sees login page, not 404!

### For Authenticated Users:

1. User visits `https://orthodoxmetrics.com`
2. Same flow as above
3. `SmartRedirect` detects authentication
4. Redirects based on role:
   - `super_admin`/`admin` → `/dashboards/super`
   - `priest` → `/dashboards/user`
   - Others → `/dashboards/user`
5. ✅ User sees appropriate dashboard

---

## What Changed

| Before | After |
|--------|-------|
| External nginx intercepts ALL 404s | External nginx only intercepts 502, 503, 504 |
| Shows `/updating.html` for routing | Allows React Router to handle 404s |
| Hard 404 for index.html if missing | Falls back to index.html for SPA routing |
| Users see 404 or maintenance page | Users redirected to login properly |

---

## Important Notes

### Don't Revert These Changes!

The old configuration was designed to show a maintenance page during deployments, but it was too aggressive and broke normal SPA routing for unauthenticated users.

### Error Pages Still Work

- **502 Bad Gateway**: Still shows `/updating.html` ✅
- **503 Service Unavailable**: Still shows `/updating.html` ✅
- **504 Gateway Timeout**: Still shows `/updating.html` ✅
- **404 Not Found**: Now handled by React Router ✅

### Testing After Deployment

Always test in **incognito mode** to simulate unauthenticated users:
- Chrome: `Ctrl+Shift+N`
- Firefox: `Ctrl+Shift+P`
- Safari: `Cmd+Shift+N`

---

## Troubleshooting

### Still Seeing 404 After Fix?

1. **Clear browser cache**:
   ```bash
   Ctrl+Shift+Delete → Clear cached images and files
   ```

2. **Check if index.html exists**:
   ```bash
   ls -lh /var/www/orthodoxmetrics/prod/front-end/dist/index.html
   ```

3. **Verify nginx configs deployed**:
   ```bash
   # On .239
   sudo nginx -T | grep "error_page"
   
   # Should show: error_page 502 503 504 /updating.html
   # Should NOT show: error_page 404 502 503 504 /updating.html
   ```

4. **Check nginx error logs**:
   ```bash
   sudo tail -50 /var/log/nginx/orthodoxmetrics.error.log
   ```

### If Maintenance Page Still Shows

The maintenance mode might be enabled. Check:

```bash
# On .239 server
ls -l /var/www/orthodoxmetrics/maintenance.on

# If exists, remove it to disable maintenance
sudo rm /var/www/orthodoxmetrics/maintenance.on

# Reload nginx
sudo systemctl reload nginx
```

---

## Summary

**TL;DR**: Nginx was intercepting 404 errors and showing the maintenance page. Fixed by only intercepting backend errors (502, 503, 504) and allowing React Router to handle 404s properly.

**Deploy**: Run `sudo /var/www/orthodoxmetrics/prod/scripts/fix-404-routing.sh`

**Test**: Open `https://orthodoxmetrics.com` in incognito mode → should redirect to login page ✅
