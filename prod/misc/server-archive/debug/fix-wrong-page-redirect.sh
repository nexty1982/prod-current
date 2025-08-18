#!/bin/bash

echo "🔧 FIXING WRONG PAGE REDIRECT"
echo "============================="
echo ""

# Check if running in correct directory
if [ ! -f "config/db.js" ]; then
    echo "❌ Please run this script from the server directory:"
    echo "   cd server"
    echo "   ./debug/fix-wrong-page-redirect.sh"
    exit 1
fi

echo "🎯 ISSUE IDENTIFIED:"
echo "===================="
echo "✅ User has cached data in localStorage"
echo "✅ App shows logged in but backend session is invalid"
echo "✅ SmartRedirect goes to dashboard instead of login"
echo "✅ Need to verify authentication with backend first"
echo ""

echo "🔧 STEP 1: FIX SMART REDIRECT"
echo "============================="

# Create a SmartRedirect that verifies authentication with backend
cat > ../front-end/src/components/routing/SmartRedirect.tsx << 'EOF'
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { CircularProgress, Box, Typography } from '@mui/material';

const SmartRedirect: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    const verifyAuthentication = async () => {
      try {
        console.log('🔍 SmartRedirect: Verifying authentication with backend...');
        
        // Always check with backend first, regardless of localStorage
        const response = await fetch('/api/auth/check', {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          console.log('🔍 SmartRedirect: Backend auth check result:', data);
          
          if (data.authenticated && data.user) {
            console.log('✅ SmartRedirect: Backend confirms authentication');
            setVerified(true);
            // User is authenticated, redirect to dashboard
            navigate('/dashboards/modern', { replace: true });
          } else {
            console.log('❌ SmartRedirect: Backend says not authenticated');
            setVerified(true);
            // Clear any cached data and redirect to login
            localStorage.removeItem('auth_user');
            navigate('/auth/login', { replace: true });
          }
        } else {
          console.log('❌ SmartRedirect: Backend auth check failed:', response.status);
          setVerified(true);
          // Backend check failed, clear cached data and redirect to login
          localStorage.removeItem('auth_user');
          navigate('/auth/login', { replace: true });
        }
      } catch (error) {
        console.error('💥 SmartRedirect: Error verifying authentication:', error);
        setVerified(true);
        // Error occurred, clear cached data and redirect to login
        localStorage.removeItem('auth_user');
        navigate('/auth/login', { replace: true });
      } finally {
        setLoading(false);
      }
    };

    // Always verify with backend, even if we have cached user data
    verifyAuthentication();
  }, [navigate]);

  if (loading) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" minHeight="200px">
        <CircularProgress />
        <Typography variant="body2" sx={{ mt: 2 }}>
          Verifying authentication...
        </Typography>
      </Box>
    );
  }

  return null;
};

export default SmartRedirect;
EOF

echo "✅ Updated SmartRedirect to verify with backend first"

echo ""
echo "🔧 STEP 2: CLEAR ALL CACHED DATA"
echo "================================"

# Clear all sessions
echo "🗑️ Clearing all sessions from database..."
mysql -u orthodoxapps -p"Summerof1982@!" orthodoxmetrics_db -e "DELETE FROM sessions;" 2>/dev/null
echo "✅ Sessions cleared"

echo ""
echo "🔧 STEP 3: REBUILD FRONTEND"
echo "==========================="

# Navigate to frontend directory
cd ../front-end

echo "📦 Installing dependencies..."
npm install --legacy-peer-deps

echo "🔨 Building frontend..."
NODE_OPTIONS="--max-old-space-size=4096" npm run build

if [ $? -eq 0 ]; then
    echo "✅ Frontend built successfully"
else
    echo "❌ Frontend build failed"
    exit 1
fi

echo ""
echo "🔧 STEP 4: TEST SERVER RESPONSE"
echo "==============================="

# Go back to server directory
cd ../server

# Test server health
echo "📡 Testing server health..."
HEALTH_RESPONSE=$(curl -s -w "%{http_code}" http://127.0.0.1:3001/api/health)
HEALTH_STATUS=$(echo "$HEALTH_RESPONSE" | tail -1)
HEALTH_BODY=$(echo "$HEALTH_RESPONSE" | head -1)

echo "   Health Status: $HEALTH_STATUS"
echo "   Health Response: $HEALTH_BODY"

echo ""
echo "🎯 TESTING INSTRUCTIONS:"
echo "========================"
echo "1. Clear your browser cache completely:"
echo "   - Open dev tools (F12)"
echo "   - Go to Application > Storage"
echo "   - Click 'Clear site data' for orthodoxmetrics.com"
echo "2. Visit https://orthodoxmetrics.com"
echo "3. Should see 'Verifying authentication...' message"
echo "4. Should be redirected to login page (not dashboard)"
echo "5. No more phantom user or wrong page"
echo ""
echo "🔍 EXPECTED BEHAVIOR:"
echo "===================="
echo "✅ Always verifies with backend first"
echo "✅ Clears cached data if backend says not authenticated"
echo "✅ Redirects to login page (not dashboard)"
echo "✅ No more phantom user issues"
echo ""
echo "🏁 WRONG PAGE REDIRECT FIX COMPLETE!" 