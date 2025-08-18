#!/bin/bash

echo "🔧 FIXING NGINX COOKIE FORWARDING"
echo "================================="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "❌ This script must be run as root (use sudo)"
    exit 1
fi

echo "🎯 FIXING NGINX CONFIGURATION:"
echo "=============================="

# Backup original config
NGINX_CONFIG="/etc/nginx/sites-available/default"
BACKUP_CONFIG="/etc/nginx/sites-available/default.backup.$(date +%Y%m%d_%H%M%S)"

if [ -f "$NGINX_CONFIG" ]; then
    echo "📋 Backing up original config to: $BACKUP_CONFIG"
    cp "$NGINX_CONFIG" "$BACKUP_CONFIG"
    
    echo "🔧 Adding cookie forwarding directives..."
    
    # Create a temporary file with the fixed configuration
    cat > /tmp/nginx_fixed.conf << 'EOF'
server {
    listen 80;
    server_name orthodoxmetrics.com www.orthodoxmetrics.com;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Frontend static files
    location / {
        root /var/www/orthodox-church-mgmt/orthodoxmetrics/prod/public;
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # API proxy to Node.js server
    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # 🔧 CRITICAL: Cookie forwarding directives
        proxy_set_header Cookie $http_cookie;
        proxy_pass_header Set-Cookie;
        proxy_cookie_path / /;
        proxy_cookie_domain 127.0.0.1 .orthodoxmetrics.com;
        
        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        proxy_cache_bypass $http_upgrade;
    }
    
    # WebSocket support for real-time features
    location /socket.io/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # 🔧 CRITICAL: Cookie forwarding for WebSocket
        proxy_set_header Cookie $http_cookie;
        proxy_pass_header Set-Cookie;
    }
    
    # Health check endpoint
    location /health {
        proxy_pass http://127.0.0.1:3001/health;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # 🔧 CRITICAL: Cookie forwarding for health check
        proxy_set_header Cookie $http_cookie;
        proxy_pass_header Set-Cookie;
    }
}
EOF

    # Replace the original config
    cp /tmp/nginx_fixed.conf "$NGINX_CONFIG"
    rm /tmp/nginx_fixed.conf
    
    echo "✅ Nginx configuration updated with cookie forwarding directives"
    
    # Test nginx configuration
    echo "🧪 Testing nginx configuration..."
    if nginx -t; then
        echo "✅ Nginx configuration is valid"
        
        # Reload nginx
        echo "🔄 Reloading nginx..."
        systemctl reload nginx
        
        if [ $? -eq 0 ]; then
            echo "✅ Nginx reloaded successfully"
        else
            echo "❌ Failed to reload nginx"
            exit 1
        fi
    else
        echo "❌ Nginx configuration test failed"
        echo "🔄 Restoring backup..."
        cp "$BACKUP_CONFIG" "$NGINX_CONFIG"
        exit 1
    fi
    
else
    echo "❌ Nginx config file not found: $NGINX_CONFIG"
    exit 1
fi

echo ""
echo "🔧 STEP 2: CLEAR ALL SESSIONS"
echo "=============================="
mysql -u orthodoxapps -p"Summerof1982@!" orthodoxmetrics_db -e "DELETE FROM sessions;" 2>/dev/null
echo "✅ Cleared all sessions from database"

echo ""
echo "🔧 STEP 3: RESTART BACKEND SERVER"
echo "=================================="
pm2 stop orthodox-backend
pm2 delete orthodox-backend
cd /var/www/orthodox-church-mgmt/orthodoxmetrics/prod/server
NODE_ENV=production pm2 start index.js --name orthodox-backend
echo "✅ Backend server restarted"

echo ""
echo "🎯 TESTING INSTRUCTIONS:"
echo "========================"
echo "1. Clear your browser cookies completely"
echo "2. Clear browser localStorage and sessionStorage"
echo "3. Visit https://orthodoxmetrics.com"
echo "4. Try logging in with your credentials"
echo "5. Check if the phantom user issue is resolved"
echo ""
echo "🔍 If the issue persists, check the browser dev tools:"
echo "   - Network tab: Look for cookie headers in requests"
echo "   - Application tab: Check if orthodoxmetrics.sid cookie is set"
echo "   - Console: Look for any authentication errors"
echo ""
echo "🏁 NGINX COOKIE FIX COMPLETE!" 