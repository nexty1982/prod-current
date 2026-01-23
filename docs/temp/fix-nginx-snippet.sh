#!/bin/bash
# Quick fix: Remove problematic Nginx snippet file and include statements
# Run with: sudo bash fix-nginx-snippet.sh

# Remove snippet file
if [ -f /etc/nginx/snippets/orthodoxmetrics-helpdesk.conf ]; then
    sudo rm /etc/nginx/snippets/orthodoxmetrics-helpdesk.conf
    echo "✓ Removed /etc/nginx/snippets/orthodoxmetrics-helpdesk.conf"
fi

# Remove include statements from config files
FIXED=0
for config_file in /etc/nginx/sites-available/orthodmetrics.com /etc/nginx/sites-available/orthodoxmetrics.com; do
    if [ -f "$config_file" ] && grep -q "orthodoxmetrics-helpdesk" "$config_file"; then
        sudo sed -i '/orthodoxmetrics-helpdesk/d' "$config_file"
        echo "✓ Removed include statement from $(basename $config_file)"
        FIXED=1
    fi
done

if [ $FIXED -eq 0 ] && [ ! -f /etc/nginx/snippets/orthodoxmetrics-helpdesk.conf ]; then
    echo "No snippet file or include statements found - nothing to fix"
fi

echo ""
echo "Testing Nginx configuration..."
sudo nginx -t
if [ $? -eq 0 ]; then
    echo ""
    echo "✓ Nginx configuration is valid"
    echo "Reloading Nginx..."
    sudo systemctl reload nginx
    echo "✓ Nginx reloaded"
else
    echo ""
    echo "✗ Nginx configuration test failed - check errors above"
    exit 1
fi
