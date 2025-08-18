#!/bin/bash

echo "🔍 CHECKING NGINX COOKIE CONFIGURATION"
echo "======================================"
echo ""

echo "🎯 CHECKING FOR NGINX CONFIG FILES:"
echo "==================================="

# Check for common nginx config locations
NGINX_CONFIGS=(
    "/etc/nginx/sites-available/orthodoxmetrics"
    "/etc/nginx/sites-available/orthodox-church-mgmt"
    "/etc/nginx/sites-available/default"
    "/etc/nginx/conf.d/orthodoxmetrics.conf"
    "/etc/nginx/conf.d/orthodox-church-mgmt.conf"
)

for config in "${NGINX_CONFIGS[@]}"; do
    if [ -f "$config" ]; then
        echo "✅ Found nginx config: $config"
        echo "   Checking for cookie forwarding directives..."
        
        if grep -q "proxy_set_header Cookie" "$config"; then
            echo "   ✅ proxy_set_header Cookie found"
        else
            echo "   ❌ proxy_set_header Cookie MISSING"
        fi
        
        if grep -q "proxy_pass_header Set-Cookie" "$config"; then
            echo "   ✅ proxy_pass_header Set-Cookie found"
        else
            echo "   ❌ proxy_pass_header Set-Cookie MISSING"
        fi
        
        if grep -q "proxy_cookie_path" "$config"; then
            echo "   ✅ proxy_cookie_path found"
        else
            echo "   ❌ proxy_cookie_path MISSING"
        fi
        
        if grep -q "proxy_cookie_domain" "$config"; then
            echo "   ✅ proxy_cookie_domain found"
        else
            echo "   ❌ proxy_cookie_domain MISSING"
        fi
        
        echo ""
    else
        echo "❌ Not found: $config"
    fi
done

echo "🔧 RECOMMENDED NGINX CONFIGURATION:"
echo "==================================="
echo ""
echo "OUTER NGINX (facing internet) should include:"
echo "location / {"
echo "    proxy_pass http://inner-nginx-server;"
echo "    proxy_set_header Host \$host;"
echo "    proxy_set_header X-Real-IP \$remote_addr;"
echo "    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;"
echo "    proxy_set_header X-Forwarded-Proto \$scheme;"
echo "    proxy_set_header Cookie \$http_cookie;"
echo "    proxy_pass_header Set-Cookie;"
echo "    proxy_cookie_path / /;"
echo "    proxy_cookie_domain localhost .orthodoxmetrics.com;"
echo "}"
echo ""
echo "INNER NGINX (facing Node.js) should include:"
echo "location / {"
echo "    proxy_pass http://127.0.0.1:3001;"
echo "    proxy_set_header Host \$host;"
echo "    proxy_set_header X-Real-IP \$remote_addr;"
echo "    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;"
echo "    proxy_set_header X-Forwarded-Proto \$scheme;"
echo "    proxy_set_header Cookie \$http_cookie;"
echo "    proxy_pass_header Set-Cookie;"
echo "    proxy_cookie_path / /;"
echo "    proxy_cookie_domain 127.0.0.1 .orthodoxmetrics.com;"
echo "}"
echo ""

echo "🧪 TESTING COOKIE TRANSMISSION:"
echo "==============================="
echo "Testing direct Node.js access (bypassing nginx):"
if curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
    echo "✅ Node.js server responding directly"
    echo "   This confirms the issue is nginx-related"
else
    echo "❌ Node.js server not responding directly"
    echo "   Check if server is running on port 3001"
fi

echo ""
echo "🎯 NEXT STEPS:"
echo "=============="
echo "1. If cookie directives are missing, add them to nginx configs"
echo "2. Reload nginx: sudo systemctl reload nginx"
echo "3. Clear browser storage completely"
echo "4. Test login flow again"
echo ""

echo "🏁 NGINX COOKIE CHECK COMPLETE!" 