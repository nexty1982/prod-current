#!/bin/bash

echo "🔍 CHECKING OUTER NGINX CONFIGURATION"
echo "====================================="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "❌ This script must be run as root (use sudo)"
    exit 1
fi

echo "🎯 IDENTIFYING NGINX CONFIGURATIONS:"
echo "===================================="

# Common locations for outer nginx configs
OUTER_NGINX_LOCATIONS=(
    "/etc/nginx/sites-available/orthodoxmetrics"
    "/etc/nginx/sites-available/orthodox-church-mgmt"
    "/etc/nginx/sites-available/default"
    "/etc/nginx/conf.d/orthodoxmetrics.conf"
    "/etc/nginx/conf.d/orthodox-church-mgmt.conf"
    "/etc/nginx/nginx.conf"
)

echo "🔍 Searching for nginx configuration files..."
echo ""

FOUND_CONFIGS=()

for config in "${OUTER_NGINX_LOCATIONS[@]}"; do
    if [ -f "$config" ]; then
        echo "✅ Found: $config"
        FOUND_CONFIGS+=("$config")
        
        # Check if this config contains proxy_pass to inner nginx
        if grep -q "proxy_pass.*nginx\|proxy_pass.*127.0.0.1\|proxy_pass.*localhost" "$config"; then
            echo "   🔍 This appears to be an OUTER nginx config (contains proxy_pass)"
            echo "   📋 Checking for cookie forwarding directives..."
            
            if grep -q "proxy_set_header Cookie" "$config"; then
                echo "   ✅ proxy_set_header Cookie - FOUND"
            else
                echo "   ❌ proxy_set_header Cookie - MISSING"
            fi
            
            if grep -q "proxy_pass_header Set-Cookie" "$config"; then
                echo "   ✅ proxy_pass_header Set-Cookie - FOUND"
            else
                echo "   ❌ proxy_pass_header Set-Cookie - MISSING"
            fi
            
            if grep -q "proxy_cookie_path" "$config"; then
                echo "   ✅ proxy_cookie_path - FOUND"
            else
                echo "   ❌ proxy_cookie_path - MISSING"
            fi
            
            if grep -q "proxy_cookie_domain" "$config"; then
                echo "   ✅ proxy_cookie_domain - FOUND"
            else
                echo "   ❌ proxy_cookie_domain - MISSING"
            fi
        else
            echo "   🔍 This appears to be an INNER nginx config (no proxy_pass to nginx)"
        fi
        echo ""
    fi
done

echo "🔧 CHECKING NGINX PROCESSES:"
echo "============================"

# Check for multiple nginx processes
NGINX_PROCESSES=$(ps aux | grep nginx | grep -v grep | wc -l)
echo "📊 Number of nginx processes: $NGINX_PROCESSES"

if [ "$NGINX_PROCESSES" -gt 1 ]; then
    echo "🔍 Multiple nginx processes detected - checking for outer/inner setup..."
    ps aux | grep nginx | grep -v grep
    echo ""
fi

echo "🔍 CHECKING NGINX PORTS:"
echo "========================"

# Check what ports nginx is listening on
echo "📋 Ports nginx is listening on:"
netstat -tlnp | grep nginx || ss -tlnp | grep nginx
echo ""

echo "🔍 CHECKING FOR INNER NGINX SERVER:"
echo "==================================="

# Try to identify the inner nginx server
INNER_NGINX_IP=""
INNER_NGINX_PORT=""

# Check common inner nginx configurations
for config in "${FOUND_CONFIGS[@]}"; do
    if grep -q "proxy_pass.*nginx\|proxy_pass.*127.0.0.1\|proxy_pass.*localhost" "$config"; then
        echo "🔍 Found proxy_pass in: $config"
        grep "proxy_pass" "$config" | head -5
        echo ""
        
        # Extract the proxy_pass target
        PROXY_TARGET=$(grep "proxy_pass" "$config" | head -1 | sed 's/.*proxy_pass\s*//' | sed 's/;.*//')
        if [ ! -z "$PROXY_TARGET" ]; then
            echo "🎯 Proxy target: $PROXY_TARGET"
            INNER_NGINX_IP=$(echo "$PROXY_TARGET" | sed 's|http://||' | sed 's|https://||' | cut -d: -f1)
            INNER_NGINX_PORT=$(echo "$PROXY_TARGET" | sed 's|http://||' | sed 's|https://||' | cut -d: -f2 | sed 's|/.*||')
            echo "   IP: $INNER_NGINX_IP"
            echo "   Port: $INNER_NGINX_PORT"
        fi
    fi
done

echo ""
echo "🎯 RECOMMENDED OUTER NGINX CONFIGURATION:"
echo "========================================="

cat << 'EOF'
# OUTER NGINX CONFIGURATION (facing internet)
server {
    listen 80;
    listen 443 ssl;
    server_name orthodoxmetrics.com www.orthodoxmetrics.com;
    
    # SSL configuration (if using HTTPS)
    ssl_certificate /path/to/your/certificate.crt;
    ssl_certificate_key /path/to/your/private.key;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Proxy to INNER nginx server
    location / {
        proxy_pass http://INNER_NGINX_IP:INNER_NGINX_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # 🔧 CRITICAL: Cookie forwarding directives for OUTER nginx
        proxy_set_header Cookie $http_cookie;
        proxy_pass_header Set-Cookie;
        proxy_cookie_path / /;
        proxy_cookie_domain INNER_NGINX_IP .orthodoxmetrics.com;
        
        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

echo ""
echo "🔧 NEXT STEPS:"
echo "=============="
echo "1. Identify which nginx config is your OUTER nginx"
echo "2. Add the cookie forwarding directives to the OUTER nginx config"
echo "3. Replace INNER_NGINX_IP and INNER_NGINX_PORT with actual values"
echo "4. Test the nginx configuration: nginx -t"
echo "5. Reload nginx: systemctl reload nginx"
echo ""
echo "🏁 OUTER NGINX CHECK COMPLETE!" 