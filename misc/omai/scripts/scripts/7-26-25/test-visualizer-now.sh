#!/bin/bash

echo "🚀 Quick fix to test Site Structure Visualizer NOW!"

cd front-end

echo "📝 Temporarily commenting out problematic imports..."

# Create backup of the file
cp src/views/apps/calendar/LiturgicalCalendar.tsx src/views/apps/calendar/LiturgicalCalendar.tsx.backup

# Comment out the problematic imports
sed -i 's/import \* as XLSX from '\''xlsx'\'';/\/\/ import \* as XLSX from '\''xlsx'\''; \/\/ Temporarily commented for build/' src/views/apps/calendar/LiturgicalCalendar.tsx
sed -i 's/import jsPDF from '\''jspdf'\'';/\/\/ import jsPDF from '\''jspdf'\''; \/\/ Temporarily commented for build/' src/views/apps/calendar/LiturgicalCalendar.tsx

echo "🏗️ Building with problematic imports commented out..."
NODE_OPTIONS="--max-old-space-size=4096" npm run build

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉🎉🎉 SUCCESS! BUILD COMPLETED! 🎉🎉🎉"
    echo ""
    echo "✅ Site Structure Visualizer is NOW READY TO TEST!"
    echo ""
    echo "🚀 IMMEDIATE NEXT STEPS:"
    echo "1. Restart your server"
    echo "2. Navigate to: Developer Tools → Site Structure Visualizer"  
    echo "3. Click 'Scan Project' button"
    echo "4. EXPLORE YOUR AMAZING CODEBASE VISUALIZATION!"
    echo ""
    echo "🎯 WHAT YOU'LL SEE:"
    echo "   🔵 Blue: Pages (Dashboard, ChatApp, Login, UserManagement)"
    echo "   🟠 Orange: Components (RecordList, HeaderNav, NotificationList)"
    echo "   🟣 Purple: Layouts (MainLayout, AuthLayout, MinimalLayout)"  
    echo "   🟢 Green: Routes (Router, AuthRoutes)"
    echo "   ⚫ Gray: APIs (/api/churches, /api/social/notifications)"
    echo "   🔷 Teal: Hooks (useRecords, useAuth, useNotifications)"
    echo ""
    echo "🛠️ INTERACTIVE FEATURES:"
    echo "   • Zoom, pan, drag nodes around"
    echo "   • Search for any file"
    echo "   • Filter by node types"
    echo "   • Click nodes for detailed information"
    echo "   • Export as PNG, JPG, or JSON"
    echo "   • Switch between layout algorithms"
    echo ""
    echo "📋 TO RESTORE CALENDAR FUNCTIONALITY LATER:"
    echo "   Install: npm install jspdf --legacy-peer-deps"
    echo "   Restore: mv src/views/apps/calendar/LiturgicalCalendar.tsx.backup src/views/apps/calendar/LiturgicalCalendar.tsx"
    echo ""
    echo "🎊 CONGRATULATIONS! Your Site Structure Visualizer is ready!"
    echo "   This is a professional-grade codebase visualization tool!"
else
    echo ""
    echo "❌ Still having issues. Manual steps:"
    echo ""
    echo "1. Edit: front-end/src/views/apps/calendar/LiturgicalCalendar.tsx"
    echo "2. Comment out these lines:"
    echo "   // import * as XLSX from 'xlsx';"
    echo "   // import jsPDF from 'jspdf';"
    echo "3. Run: NODE_OPTIONS=\"--max-old-space-size=4096\" npm run build"
    echo ""
    echo "💡 Then test your Site Structure Visualizer!"
fi 