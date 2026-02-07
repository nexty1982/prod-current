#!/bin/bash
# Email DNS Verification Script
# Checks SPF, DKIM, and DMARC records for orthodoxmetrics.com

DOMAIN="orthodoxmetrics.com"
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=================================================="
echo "Email DNS Verification for $DOMAIN"
echo "=================================================="
echo ""

# Function to check DNS record
check_dns() {
    local record_type=$1
    local hostname=$2
    local expected=$3
    local label=$4
    
    echo -n "Checking $label... "
    
    result=$(nslookup -type=txt $hostname 2>/dev/null | grep -A 10 "Name:" | grep "\"" | sed 's/.*"\(.*\)".*/\1/')
    
    if [ -z "$result" ]; then
        echo -e "${RED}❌ NOT FOUND${NC}"
        echo "  Expected: $expected"
        return 1
    else
        if echo "$result" | grep -q "$expected"; then
            echo -e "${GREEN}✅ PASS${NC}"
            echo "  Value: $result"
            return 0
        else
            echo -e "${YELLOW}⚠️  FOUND BUT INCORRECT${NC}"
            echo "  Found: $result"
            echo "  Expected: $expected"
            return 2
        fi
    fi
}

# Check SPF
echo "1. SPF Record"
echo "============================================"
check_dns "TXT" "$DOMAIN" "v=spf1" "SPF"
spf_status=$?
echo ""

# Check DKIM
echo "2. DKIM Record"
echo "============================================"
check_dns "TXT" "k1._domainkey.$DOMAIN" "v=DKIM1" "DKIM (selector: k1)"
dkim_status=$?

# Also try default selector
if [ $dkim_status -ne 0 ]; then
    echo "Trying default selector..."
    check_dns "TXT" "default._domainkey.$DOMAIN" "v=DKIM1" "DKIM (selector: default)"
    dkim_status=$?
fi
echo ""

# Check DMARC
echo "3. DMARC Record"
echo "============================================"
check_dns "TXT" "_dmarc.$DOMAIN" "v=DMARC1" "DMARC"
dmarc_status=$?
echo ""

# Summary
echo "=================================================="
echo "SUMMARY"
echo "=================================================="

if [ $spf_status -eq 0 ] && [ $dkim_status -eq 0 ] && [ $dmarc_status -eq 0 ]; then
    echo -e "${GREEN}✅ All DNS records configured correctly!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Send a test email"
    echo "2. Check email headers for SPF=PASS, DKIM=PASS, DMARC=PASS"
    echo "3. Verify email lands in inbox (not spam)"
    exit 0
else
    echo -e "${RED}❌ DNS configuration incomplete${NC}"
    echo ""
    echo "Required actions:"
    
    if [ $spf_status -ne 0 ]; then
        echo "  [ ] Add SPF record:"
        echo "      Type: TXT"
        echo "      Host: @"
        echo "      Value: v=spf1 include:secureserver.net -all"
    fi
    
    if [ $dkim_status -ne 0 ]; then
        echo "  [ ] Add DKIM record:"
        echo "      Contact GoDaddy support for DKIM public key"
        echo "      Or enable auto-DKIM in Workspace Email settings"
    fi
    
    if [ $dmarc_status -ne 0 ]; then
        echo "  [ ] Add DMARC record:"
        echo "      Type: TXT"
        echo "      Host: _dmarc"
        echo "      Value: v=DMARC1; p=none; rua=mailto:info@orthodoxmetrics.com"
    fi
    
    echo ""
    echo "See docs/OPERATIONS/email-deliverability-fix.md for detailed instructions"
    exit 1
fi
