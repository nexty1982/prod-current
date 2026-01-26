# Admin Routes Mount Verification & Fix

**Date:** 2025-01-XX  
**Purpose:** Verify and fix admin router mount to ensure CRUD endpoints are accessible

---

## 1. Runtime Entrypoint Verification

### Production Runtime
- **Entrypoint:** `dist/index.js` (compiled from `src/index.ts`)
- **Script:** `npm start` → `node dist/index.js`
- **Build Process:** TypeScript compilation (`tsc`) copies `src/` to `dist/`

### Development Runtime
- **Entrypoint:** `src/index.ts` (direct execution)
- **Script:** `npm run dev` → `tsx watch src/index.ts`
- **Runtime:** TypeScript executed directly via `tsx`

**Conclusion:** Both production and dev use `src/index.ts` as the source (dev directly, prod via compiled `dist/index.js`).

---

## 2. Admin Router Import Fix

### Problem Identified
- **Line 24:** `const adminRoutes = require('./routes/admin');`
- **File Check:** `server/src/routes/admin.js` **DOES NOT EXIST**
- **Actual Location:** Admin router is in `server/src/api/admin.js` (exports router at line 1691)

### Fix Applied
**File:** `server/src/index.ts`  
**Line 24:** Changed from:
```javascript
const adminRoutes = require('./routes/admin');
```
To:
```javascript
const adminRoutes = require('./api/admin'); // Admin routes are in api/admin.js, not routes/admin.js
```

### Mount Point
- **Line 325:** `app.use('/api/admin', adminRoutes);` - **UNCHANGED**
- Mount path remains `/api/admin` as required

---

## 3. Diagnostic Log Added

**File:** `server/src/index.ts`  
**Line 326:** Added startup log:
```javascript
console.log(`✅ Admin routes mounted at /api/admin from ${require.resolve('./api/admin')}`);
```

This will log the resolved module path at startup, confirming the correct router is mounted.

**Example Output:**
```
✅ Admin routes mounted at /api/admin from /path/to/server/dist/api/admin.js
```

---

## 4. Curl Test Plan

### Prerequisites
1. Server must be running (dev: `npm run dev`, prod: `npm start`)
2. Valid admin/super_admin session cookie required
3. Test user ID needed for PUT/DELETE operations

### Step 1: Authenticate and Capture Session Cookie

```bash
# Login and save cookies to jar
curl -c cookies.txt -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"yourpassword"}'

# Verify login (should return user data)
curl -b cookies.txt http://localhost:5000/api/auth/verify
```

**Expected Response:**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "email": "admin@example.com",
    "role": "admin"
  }
}
```

### Step 2: Test GET /api/admin/users

```bash
# List all users
curl -b cookies.txt http://localhost:5000/api/admin/users

# With query parameters
curl -b cookies.txt "http://localhost:5000/api/admin/users?search=test&role=admin&is_active=true"
```

**Expected Response:**
```json
{
  "success": true,
  "users": [
    {
      "id": 1,
      "email": "user@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "role": "admin",
      "church_id": 1,
      "is_active": true,
      ...
    }
  ],
  "count": 1
}
```

**Note:** Response should NOT include `password_hash` field.

### Step 3: Test PUT /api/admin/users/:id/toggle-status

```bash
# Toggle user status (replace :id with actual user ID)
curl -b cookies.txt -X PUT http://localhost:5000/api/admin/users/2/toggle-status
```

**Expected Response:**
```json
{
  "success": true,
  "message": "User activated successfully"
}
```
or
```json
{
  "success": true,
  "message": "User deactivated successfully"
}
```

### Step 4: Test PATCH /api/admin/users/:id/reset-password

```bash
# Reset password with auto-generated password
curl -b cookies.txt -X POST http://localhost:5000/api/admin/users/2/reset-password \
  -H "Content-Type: application/json"

# Reset password with custom password
curl -b cookies.txt -X PATCH http://localhost:5000/api/admin/users/2/reset-password \
  -H "Content-Type: application/json" \
  -d '{"new_password":"NewSecurePassword123!"}'
```

**Expected Response (POST - auto-generate):**
```json
{
  "success": true,
  "message": "Password reset successfully. New password has been logged securely for admin retrieval."
}
```

**Expected Response (PATCH - custom):**
```json
{
  "success": true,
  "message": "Password reset successfully"
}
```

### Step 5: Test Full CRUD (Optional)

```bash
# Create user
curl -b cookies.txt -X POST http://localhost:5000/api/admin/users \
  -H "Content-Type: application/json" \
  -d '{
    "email":"newuser@example.com",
    "first_name":"Jane",
    "last_name":"Smith",
    "role":"viewer",
    "church_id":1
  }'

# Update user (replace :id)
curl -b cookies.txt -X PUT http://localhost:5000/api/admin/users/3 \
  -H "Content-Type: application/json" \
  -d '{
    "first_name":"Jane Updated",
    "role":"editor"
  }'

# Delete user (replace :id)
curl -b cookies.txt -X DELETE http://localhost:5000/api/admin/users/3
```

### Error Cases to Test

```bash
# Should return 401 if not authenticated
curl http://localhost:5000/api/admin/users

# Should return 403 if user lacks admin role
# (use a non-admin session cookie)

# Should return 400 if trying to delete self
curl -b cookies.txt -X DELETE http://localhost:5000/api/admin/users/1
# (where user ID 1 is the logged-in user)
```

---

## Files Modified

1. **server/src/index.ts**
   - Line 24: Fixed adminRoutes require path from `./routes/admin` to `./api/admin`
   - Line 326: Added diagnostic log for mount verification

**Total Changes:** 2 lines modified

---

## Verification Steps

1. **Start server** (dev or prod)
2. **Check startup logs** for: `✅ Admin routes mounted at /api/admin from ...`
3. **Run curl tests** above to verify endpoints respond
4. **Check response format** - ensure `password_hash` is never returned
5. **Verify session auth** - unauthenticated requests should return 401

---

## Notes

- **Build Process:** After modifying `src/index.ts`, run `npm run build` to update `dist/index.js` for production
- **Session Cookies:** The `cookies.txt` file created by curl `-c` flag can be reused across requests
- **Port:** Adjust `localhost:5000` to match your server port (check server config or `.env`)
- **Database:** Ensure `orthodoxmetrics_db.users` table exists and is accessible

---

**End of Report**

