# 🔍 OrthodoxMetrics Backend Route Audit

## Summary of Issues

**Critical Problems Identified:**
- 114KB monolithic `admin.js` with 2,951 lines 
- Duplicate route files (e.g., multiple churches.js files)
- Inconsistent authentication middleware usage
- Mixed database context (some routes lack `orthodoxmetrics_db` specification)
- Session authentication failures documented across multiple known issues files

---

## 📊 Route Organization Audit

| Route File | Size | Lines | Path | Status | Authentication | Database Context | Issues |
|------------|------|-------|------|--------|---------------|------------------|--------|
| **admin.js** | 114KB | 2,951 | `/routes/admin.js` | ❌ **CRITICAL** | Mixed patterns | Inconsistent | Massive monolith, needs breaking down |
| **churches.js** | 18KB | 578 | `/routes/churches.js` | ⚠️ **NEEDS REFACTOR** | Has requireAuth/requireRole | Uses orthodoxmetrics_db | Good structure, needs session fixes |
| **admin/churches.js** | 18KB | 590 | `/routes/admin/churches.js` | ⚠️ **DUPLICATE** | Unknown | Unknown | Duplicate of main churches.js |
| **auth.js** | 5.3KB | 190 | `/routes/auth.js` | ✅ **GOOD** | Self-contained | Uses orthodoxmetrics_db | Well structured |
| **user.js** | 2.5KB | 79 | `/routes/user.js` | ✅ **GOOD** | requireAuth | Uses orthodoxmetrics_db | Clean implementation |
| **clients.js** | 15KB | 422 | `/routes/clients.js` | ⚠️ **REFACTOR** | No auth middleware | Uses promisePool | Multi-tenant logic, needs auth |
| **clientApi.js** | 12KB | 296 | `/routes/clientApi.js` | ⚠️ **LEGACY** | Custom middleware | Client-specific DBs | Legacy multi-tenant approach |
| **importRecords.js** | 12KB | 400 | `/routes/importRecords.js` | ⚠️ **REFACTOR** | requireAuth | Mixed contexts | Church DB logic needs updating |
| **ocr.js** | 20KB | 695 | `/routes/ocr.js` | ⚠️ **LARGE** | Unknown | Unknown | Large file, needs audit |
| **billing.js** | 20KB+ | - | `/routes/billing.js` | ⚠️ **REFACTOR** | requireAuth | Uses orthodoxmetrics_db | Good auth, needs church_id scoping |

---

## 🔥 Critical Issues by Category

### 1. Authentication Inconsistencies

| Route | Current Auth | Should Use | Issue |
|-------|-------------|------------|-------|
| `/routes/admin.js` | Mixed/inconsistent | `requireAuth + requireRole` | Monolithic file with inconsistent patterns |
| `/routes/clients.js` | None | `requireRole(['super_admin'])` | No authentication on client management |
| `/routes/importRecords.js` | `requireAuth` | `requireAuth + church context` | Missing church_id validation |
| `/routes/ocr.js` | Unknown | `requireAuth + church context` | Needs audit |

### 2. Database Context Problems

| Route | Current Usage | Should Use | Issue |
|-------|--------------|------------|-------|
| `/routes/clientApi.js` | Client-specific DBs | `orthodoxmetrics_db + church_id` | Legacy multi-tenant approach |
| `/routes/importRecords.js` | `CHURCH_DB_NAME = 'ssppoc_records_db'` | Dynamic church_id scoping | Hardcoded church database |
| `/routes/billing.js` | `orthodoxmetrics_db` | ✅ Correct | Needs church_id validation |

### 3. Route Organization Issues

| Problem | Count | Examples | Impact |
|---------|-------|----------|--------|
| **Duplicate Files** | 3+ | `churches.js` vs `admin/churches.js` | Confusion, maintenance burden |
| **Monolithic Files** | 1 | `admin.js` (114KB) | Unmaintainable, conflicting patterns |
| **Inconsistent Naming** | 10+ | `adminSystem.js`, `old_auth.js`, etc. | Unclear purpose, legacy drift |

---

## 🎯 Refactoring Priority Matrix

### **Phase 1: Critical (This Week)**
1. ✅ **Break down admin.js monolith** into proper modules
2. ✅ **Fix churches.js authentication** - resolve session issues
3. ✅ **Consolidate duplicate route files**

### **Phase 2: High Priority (Next Week)**  
1. **Audit and fix database contexts** - ensure all use `orthodoxmetrics_db`
2. **Standardize authentication middleware** across all routes
3. **Implement church_id scoping** where missing

### **Phase 3: Medium Priority (Following Week)**
1. **Clean up legacy files** (`old_auth.js`, `clientApi.js`)
2. **Organize into API v2 structure** per todo.md specification
3. **Add comprehensive error handling** and logging

---

## 🔧 Specific Route Actions Required

### `/routes/admin.js` (CRITICAL - 114KB Monolith)
```bash
# Break into modules:
/routes/admin/
├── dashboard.js      # Dashboard endpoints
├── users.js         # User management  
├── churches.js      # Church administration
├── system.js        # System stats
└── settings.js      # Configuration
```

### `/routes/churches.js` (HIGH PRIORITY)
```javascript
// Current issues to fix:
1. Session.user undefined after login
2. Add church_id scoping validation  
3. Ensure orthodoxmetrics_db only
4. Standardize error responses
```

### `/routes/auth.js` (MEDIUM - Session Fixes)
```javascript
// Session authentication issues:
1. Session persistence failures
2. Cookie transmission problems
3. Unknown_user redirects
```

---

## 📋 API v2 Target Structure

Based on `todo.md` specification:

```
/routes/
├── auth/           # Authentication endpoints
├── admin/          # Admin management
│   ├── users.js   
│   ├── churches.js
│   └── system.js
├── church/         # Church-specific operations
├── records/        # Record CRUD operations  
├── ocr/           # OCR processing
├── user/          # User profile management
└── system/        # System utilities
```

---

## ✅ Success Criteria

1. **No authentication bypasses** - all routes properly authenticated
2. **Consistent database usage** - only `orthodoxmetrics_db` with `church_id` scoping
3. **Session persistence working** - `session.user` maintains across requests
4. **Route organization** - logical grouping, no duplicates
5. **Error handling** - consistent JSON response format
6. **Performance** - eliminate database context errors

---

*Generated: January 17, 2025*  
*Next Review: After Phase 1 completion* 