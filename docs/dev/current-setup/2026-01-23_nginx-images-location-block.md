# Nginx Configuration for /images/ Location Block

**Date:** 2026-01-23  
**Purpose:** Template for adding `/images/` location block to Nginx config

## Required Nginx Configuration

Add the following location block to `/etc/nginx/sites-enabled/orthodoxmetrics.com`:

**Placement:** BEFORE the main `location /` proxy block

```nginx
    # Serve /images/* directly from dist (bypass backend)
    # This ensures images are served with correct content-types and caching headers
    # and prevents backend catch-all routes from intercepting image requests
    location ^~ /images/ {
        alias /var/www/orthodoxmetrics/prod/front-end/dist/images/;
        expires 30d;
        add_header Cache-Control "public, immutable";
        
        # Ensure correct content types
        types {
            image/png png;
            image/jpeg jpg jpeg;
            image/svg+xml svg;
            image/webp webp;
            image/gif gif;
        }
        default_type image/png;
        
        # Security: prevent directory listing
        autoindex off;
        
        # Logging (optional, can remove in production)
        access_log off;
    }
```

## Why `location ^~ /images/`?

- `^~` prefix means "longest match, no regex evaluation"
- This ensures `/images/*` requests are matched BEFORE any regex-based location blocks
- Prevents conflicts with SPA catch-all routes

## Verification

After adding this block:

1. Test config: `sudo nginx -t`
2. Reload: `sudo systemctl reload nginx`
3. Test image: `curl -I https://orthodoxmetrics.com/images/logos/biz-logo.png`
4. Should return: `HTTP/1.1 200 OK` and `Content-Type: image/png`

## Alternative: If Nginx Config Cannot Be Modified

If you cannot modify Nginx config, ensure backend static middleware is working:

1. Verify `app.use('/images', express.static(...))` comes BEFORE `app.get('*', ...)`
2. Verify image files exist in `front-end/dist/images/`
3. Check backend logs for image serving messages

However, **Nginx direct serving is preferred** because:
- Faster (no backend processing)
- More reliable (bypasses backend crashes)
- Better caching headers
- Correct content-types guaranteed
