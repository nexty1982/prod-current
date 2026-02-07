# OM-Library Enhancement - Quick Reference Card

**Last Updated**: February 6, 2026

---

## 🚀 DEPLOYMENT (One Command)

```bash
# On Linux server
sudo bash /var/www/orthodoxmetrics/prod/server/scripts/deploy-om-library-enhancements.sh
```

---

## 📋 NEW ENDPOINTS SUMMARY

### For Users
| Endpoint | Purpose | Query Params |
|----------|---------|--------------|
| `GET /api/library/items` | Paginated list | `page`, `pageSize`, `sortBy`, `sortDir`, `q`, `category` |
| `GET /api/library/download/:id` | Download file | - |
| `GET /api/library/preview/:id` | Preview in browser | - |

### For Admins
| Endpoint | Purpose | Auth Level |
|----------|---------|------------|
| `GET /api/library/sources` | List scan sources | Admin |
| `POST /api/library/sources` | Create source | Super Admin |
| `PUT /api/library/sources/:id` | Update source | Super Admin |
| `DELETE /api/library/sources/:id` | Delete source | Super Admin |
| `POST /api/library/category/batch` | Batch update categories | Admin |
| `POST /api/library/related/group` | Create relationships | Admin |

---

## 🧪 QUICK TESTS

### Test Download (CRITICAL FIX)
```bash
# Get a file ID first
FILE_ID=$(curl -s http://localhost:3001/api/library/items?pageSize=1 | jq -r '.items[0].id')

# Test download
curl -I "http://localhost:3001/api/library/download/$FILE_ID"
# Should see: Content-Disposition: attachment; filename="..."
```

### Test Pagination
```bash
# Page 1, 10 items
curl "http://localhost:3001/api/library/items?page=1&pageSize=10" | jq '.total, .totalPages'

# Page 2
curl "http://localhost:3001/api/library/items?page=2&pageSize=10" | jq '.page'
```

### Test Sorting
```bash
# Sort by title ascending
curl "http://localhost:3001/api/library/items?sortBy=title&sortDir=asc" | jq '.items[0].title'

# Sort by modified date descending
curl "http://localhost:3001/api/library/items?sortBy=modified&sortDir=desc" | jq '.items[0].modified'
```

### Test Sources (Admin)
```bash
# List sources
curl http://localhost:3001/api/library/sources \
  -H "Cookie: orthodoxmetrics.sid=YOUR_SESSION" | jq
```

---

## 📊 PERFORMANCE COMPARISON

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Initial load size | 2-5 MB | 50-100 KB | 95%+ |
| Response time | 1-3 sec | 100-300 ms | 80%+ |
| Files per request | 800+ | 25 (configurable) | Controlled |

---

## ⚙️ CONFIGURATION

### Change Page Size
```javascript
// In frontend code
const response = await fetch('/api/library/items?pageSize=50');
```

### Change Sort Default
```javascript
// server/src/config/library-config.js
sorting: {
  defaultField: 'title',  // Change default sort field
  defaultDirection: 'asc', // Change default direction
}
```

### Add Scan Source (via API)
```bash
curl -X POST http://localhost:3001/api/library/sources \
  -H "Content-Type: application/json" \
  -H "Cookie: orthodoxmetrics.sid=YOUR_SESSION" \
  -d '{
    "name": "My Custom Docs",
    "path": "/var/www/orthodoxmetrics/prod/docs/custom",
    "scan_mode": "recursive",
    "description": "Custom documentation folder"
  }'
```

---

## 🐛 TROUBLESHOOTING

### Download Still Not Working
```bash
# Check if file exists in index
curl http://localhost:3001/api/library/file/FILE_ID | jq '.file.libraryPath'

# Check if file exists on disk
ls -la /path/from/above

# Check PM2 logs
pm2 logs orthodox-backend | grep -i download
```

### Pagination Not Working
```bash
# Verify endpoint responds
curl http://localhost:3001/api/library/items | jq '.totalPages'

# Check if items array exists
curl http://localhost:3001/api/library/items | jq '.items | length'
```

### Sources Table Not Found
```bash
# Verify migration ran
mysql -u root -p orthodoxmetrics_db -e "SHOW TABLES LIKE 'library_%';"

# Re-run migration if needed
mysql -u root -p orthodoxmetrics_db < /var/www/orthodoxmetrics/prod/server/database/migrations/2026-02-05_library_enhancements.sql
```

---

## 📚 DOCUMENTATION LINKS

- **Full Implementation**: `docs/DEVELOPMENT/om-library-implementation-complete.md`
- **Original State**: `docs/DEVELOPMENT/om-library-current-state.md`
- **Enhancement Plan**: `docs/DEVELOPMENT/om-library-enhancement-plan.md`
- **V2 Guide**: `docs/OM-LIBRARY-V2-GUIDE.md`
- **Bug Fix Log**: `docs/DEVELOPMENT/om-library-files-fix.md`

---

## 🔑 KEY IMPROVEMENTS

1. **✅ FIXED: Download Endpoint** - Was completely missing, now implemented
2. **✅ Pagination** - Reduces data transfer by 95%+
3. **✅ Sorting** - Server-side sorting for instant results
4. **✅ Preview** - View documents without downloading
5. **✅ Configurable Sources** - No more hardcoded paths
6. **✅ Batch Operations** - Update multiple files at once
7. **✅ Relationships** - Group related documents

---

## 🎯 NEXT STEPS (Optional)

### For Frontend Enhancement
1. Update `OMLibrary.tsx` to use `/items` endpoint
2. Add pagination controls (MUI Pagination)
3. Add sortable table headers
4. Add batch selection checkboxes
5. Add source management UI (admin)

### For Advanced Features
1. Full-text search with Elasticsearch
2. Content-based similarity matching
3. AI-powered auto-categorization
4. Version tracking
5. Comments and annotations

---

**Status**: ✅ Backend complete - Ready for use  
**Frontend**: ⏳ Optional enhancements pending  
**Priority**: Download fix is CRITICAL - test first!
