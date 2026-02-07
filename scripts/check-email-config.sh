#!/bin/bash

# Check Email Configuration for OM Tasks
# Verifies that email settings are properly configured in the database

set -e

echo "🔍 Checking OM Tasks Email Configuration"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Database credentials
DB_NAME="om"
DB_USER="omuser"

# Check if running as a user with database access
if ! command -v mysql &> /dev/null; then
    echo -e "${RED}❌ MySQL client not installed${NC}"
    exit 1
fi

echo -e "${BLUE}📊 Step 1: Checking Database Connection${NC}"
echo "Database: $DB_NAME"
echo ""

# Check if email_settings table exists
echo -e "${BLUE}📊 Step 2: Checking email_settings Table${NC}"
TABLE_EXISTS=$(mysql -u"$DB_USER" "$DB_NAME" -sN -e "SHOW TABLES LIKE 'email_settings';" 2>&1)

if [ -z "$TABLE_EXISTS" ]; then
    echo -e "${RED}❌ email_settings table does NOT exist${NC}"
    echo ""
    echo "Creating email_settings table..."
    
    mysql -u"$DB_USER" "$DB_NAME" <<'SQL'
CREATE TABLE IF NOT EXISTS email_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  provider VARCHAR(50) NOT NULL DEFAULT 'Custom',
  smtp_host VARCHAR(255) NOT NULL,
  smtp_port INT NOT NULL DEFAULT 587,
  smtp_secure BOOLEAN NOT NULL DEFAULT FALSE,
  smtp_user VARCHAR(255) NOT NULL,
  smtp_pass VARCHAR(255) NULL,
  sender_name VARCHAR(255) NOT NULL DEFAULT 'OMAI Task System',
  sender_email VARCHAR(255) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
SQL
    
    echo -e "${GREEN}✅ email_settings table created${NC}"
else
    echo -e "${GREEN}✅ email_settings table exists${NC}"
fi

echo ""

# Check if smtp_pass column exists
echo -e "${BLUE}📊 Step 3: Checking smtp_pass Column${NC}"
COLUMN_EXISTS=$(mysql -u"$DB_USER" "$DB_NAME" -sN -e "SHOW COLUMNS FROM email_settings LIKE 'smtp_pass';" 2>&1)

if [ -z "$COLUMN_EXISTS" ]; then
    echo -e "${YELLOW}⚠️  smtp_pass column does NOT exist${NC}"
    echo "Adding smtp_pass column..."
    
    mysql -u"$DB_USER" "$DB_NAME" -e "ALTER TABLE email_settings ADD COLUMN smtp_pass VARCHAR(255) NULL;"
    
    echo -e "${GREEN}✅ smtp_pass column added${NC}"
else
    echo -e "${GREEN}✅ smtp_pass column exists${NC}"
fi

echo ""

# Check current email configuration
echo -e "${BLUE}📊 Step 4: Checking Current Email Configuration${NC}"
CONFIG_COUNT=$(mysql -u"$DB_USER" "$DB_NAME" -sN -e "SELECT COUNT(*) FROM email_settings WHERE is_active = TRUE;" 2>&1)

if [ "$CONFIG_COUNT" -eq 0 ]; then
    echo -e "${RED}❌ No active email configuration found${NC}"
    echo ""
    echo "Email needs to be configured!"
    echo ""
    echo -e "${YELLOW}To configure email:${NC}"
    echo "  1. Log in to https://orthodoxmetrics.com as super admin"
    echo "  2. Go to /devel-tools/om-tasks"
    echo "  3. Click 'Settings' button"
    echo "  4. Fill in email configuration with Microsoft 365 settings"
    echo ""
    echo -e "${YELLOW}Microsoft 365 SMTP Settings:${NC}"
    echo "  Provider: Outlook365"
    echo "  SMTP Host: smtp-mail.outlook.com"
    echo "  SMTP Port: 587"
    echo "  SMTP Security: STARTTLS (unchecked)"
    echo "  Username: info@orthodoxmetrics.com"
    echo "  Password: [App Password from Microsoft Account Security]"
    echo ""
    echo "📖 See: /var/www/orthodoxmetrics/prod/docs/OPERATIONS/fixing-om-tasks-email-outlook.md"
else
    echo -e "${GREEN}✅ Found $CONFIG_COUNT active email configuration(s)${NC}"
    echo ""
    
    # Display current config (without password)
    echo -e "${BLUE}Current Configuration:${NC}"
    mysql -u"$DB_USER" "$DB_NAME" -e "
SELECT 
  id,
  provider,
  smtp_host,
  smtp_port,
  smtp_secure,
  smtp_user,
  CASE 
    WHEN smtp_pass IS NOT NULL AND LENGTH(smtp_pass) > 0 THEN '********'
    ELSE '[NOT SET]'
  END AS smtp_pass,
  sender_name,
  sender_email,
  is_active,
  updated_at
FROM email_settings 
WHERE is_active = TRUE 
ORDER BY updated_at DESC 
LIMIT 1;
" 2>&1
fi

echo ""

# Check for password status
echo -e "${BLUE}📊 Step 5: Checking Password Status${NC}"
PASSWORD_STATUS=$(mysql -u"$DB_USER" "$DB_NAME" -sN -e "
SELECT 
  CASE 
    WHEN smtp_pass IS NULL THEN 'NULL'
    WHEN LENGTH(smtp_pass) = 0 THEN 'EMPTY'
    ELSE 'SET'
  END
FROM email_settings 
WHERE is_active = TRUE 
LIMIT 1;
" 2>&1)

if [ "$PASSWORD_STATUS" = "NULL" ] || [ "$PASSWORD_STATUS" = "EMPTY" ]; then
    echo -e "${RED}❌ SMTP password is NOT set (${PASSWORD_STATUS})${NC}"
    echo "Emails will NOT work without a password!"
    echo ""
    echo "You MUST configure the SMTP password via the web UI."
else
    echo -e "${GREEN}✅ SMTP password is set${NC}"
fi

echo ""

# Test email connectivity (basic check)
echo -e "${BLUE}📊 Step 6: Testing SMTP Connectivity${NC}"

# Get SMTP host and port from config
SMTP_HOST=$(mysql -u"$DB_USER" "$DB_NAME" -sN -e "SELECT smtp_host FROM email_settings WHERE is_active = TRUE LIMIT 1;" 2>&1)
SMTP_PORT=$(mysql -u"$DB_USER" "$DB_NAME" -sN -e "SELECT smtp_port FROM email_settings WHERE is_active = TRUE LIMIT 1;" 2>&1)

if [ -n "$SMTP_HOST" ] && [ -n "$SMTP_PORT" ]; then
    echo "Testing connection to $SMTP_HOST:$SMTP_PORT..."
    
    # Try to connect (timeout after 5 seconds)
    if timeout 5 bash -c "echo > /dev/tcp/$SMTP_HOST/$SMTP_PORT" 2>/dev/null; then
        echo -e "${GREEN}✅ SMTP server is reachable${NC}"
    else
        echo -e "${YELLOW}⚠️  Could not connect to SMTP server${NC}"
        echo "This could be a firewall issue or the server is down."
        echo ""
        echo "Check firewall:"
        echo "  sudo ufw status"
        echo "  sudo ufw allow out $SMTP_PORT/tcp"
    fi
else
    echo -e "${YELLOW}⚠️  No SMTP configuration to test${NC}"
fi

echo ""

# Summary
echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}Summary:${NC}"
echo ""

if [ "$CONFIG_COUNT" -gt 0 ] && [ "$PASSWORD_STATUS" = "SET" ]; then
    echo -e "${GREEN}✅ Email configuration looks good!${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Test via web UI: /devel-tools/om-tasks → Settings → Test Email"
    echo "  2. Monitor logs: pm2 logs | grep -i email"
    echo "  3. Try generating a task link to send an email"
else
    echo -e "${RED}❌ Email configuration is INCOMPLETE${NC}"
    echo ""
    echo "Action required:"
    echo "  1. Configure email via web UI: /devel-tools/om-tasks → Settings"
    echo "  2. Use Microsoft 365 SMTP settings (see documentation)"
    echo "  3. Generate app password from Microsoft Account Security"
    echo ""
    echo "📖 Documentation: /var/www/orthodoxmetrics/prod/docs/OPERATIONS/fixing-om-tasks-email-outlook.md"
fi

echo ""
echo -e "${GREEN}Done!${NC}"
