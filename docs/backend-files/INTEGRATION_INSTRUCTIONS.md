# Backend Integration Instructions for Power Search

## Files to Copy

Copy these files from `/docs/backend-files/` to your server directory:

### 1. Power Search Parser
**Source:** `docs/backend-files/powerSearchParser.js`  
**Destination:** `server/src/utils/powerSearchParser.js`

This is the core query parser that tokenizes and builds SQL WHERE clauses.

### 2. Power Search API
**Source:** `docs/backend-files/powerSearchApi.js`  
**Destination:** `server/src/api/powerSearchApi.js`

This is the Express router with the `/api/records/baptism` endpoint.

### 3. Database Migration
**Source:** `docs/backend-files/add-search-indexes.sql`  
**Destination:** `server/database/add-search-indexes.sql`

SQL script to add performance indexes.

### 4. Unit Tests
**Source:** `docs/backend-files/powerSearchParser.test.js`  
**Destination:** `server/tests/powerSearchParser.test.js`

Unit tests for the parser (20 test cases).

---

## Integration Steps

### Step 1: Copy Files

```bash
# From the project root
cd /var/www/orthodoxmetrics/prod

# Copy parser
cp docs/backend-files/powerSearchParser.js server/src/utils/

# Copy API
cp docs/backend-files/powerSearchApi.js server/src/api/

# Copy migration
mkdir -p server/database
cp docs/backend-files/add-search-indexes.sql server/database/

# Copy tests
mkdir -p server/tests
cp docs/backend-files/powerSearchParser.test.js server/tests/
```

### Step 2: Register the API Router

Edit `server/src/index.ts` (or `server/src/index.js`):

```typescript
// Add import at the top with other routers
const powerSearchRouter = require('./api/powerSearchApi');

// Register the router (add with other app.use() calls)
app.use('/api/records', powerSearchRouter);
```

**Important:** The router should be mounted at `/api/records` so the endpoint becomes `/api/records/baptism`.

### Step 3: Update Database Connection in API

The `powerSearchApi.js` file needs access to your database connection. Update the DB access pattern to match your existing code:

**Option A: If you use `req.db`**
```javascript
const db = req.db;
```

**Option B: If you use a connection pool**
```javascript
const db = req.app.locals.db;
```

**Option C: If you use a different pattern**
Look at your existing API files (e.g., `baptism-records.js`) and copy the DB connection pattern.

**Find and replace in `powerSearchApi.js`:**
```javascript
// Current placeholder:
const db = req.db || req.app.locals.db;

// Replace with your actual pattern
```

### Step 4: Adapt Query Execution

The API uses `await db.query(sql, params)`. Update this to match your DB library:

**For mysql2/promise:**
```javascript
const [rows] = await db.query(sql, params);
const total = rows[0]?.total || 0;
```

**For mysql (callback-based with promisify):**
```javascript
const rows = await new Promise((resolve, reject) => {
  db.query(sql, params, (err, results) => {
    if (err) reject(err);
    else resolve(results);
  });
});
```

**For your existing pattern:**
Check your current `baptism-records.js` or similar files and copy the exact pattern.

### Step 5: Run Database Migration

Apply the indexes to **each church database**:

```bash
# For a single church
mysql -u root -p om_church_1 < server/database/add-search-indexes.sql

# For all churches (create a script)
for i in {1..10}; do
  mysql -u root -p om_church_$i < server/database/add-search-indexes.sql
done
```

Or use your existing migration system if you have one.

### Step 6: Run Tests

```bash
cd server
node tests/powerSearchParser.test.js
```

Expected output: `✅ All tests passed! (20/20)`

### Step 7: Restart Backend

```bash
pm2 restart orthodox-backend
```

### Step 8: Test the Endpoint

```bash
# Test basic search
curl "http://localhost:3001/api/records/baptism?q=john&churchId=1&page=1&pageSize=10"

# Test field search
curl "http://localhost:3001/api/records/baptism?q=first:john%20last:smith&churchId=1"

# Test date range
curl "http://localhost:3001/api/records/baptism?q=baptism:2024-01-01..2024-12-31&churchId=1"
```

---

## Troubleshooting

### Issue: "Database connection not available"
**Fix:** Update the DB connection pattern in `powerSearchApi.js` to match your existing API files.

### Issue: "Cannot find module './powerSearchParser'"
**Fix:** Ensure the parser is in `server/src/utils/` and the require path is correct:
```javascript
const { parseSearchQuery } = require('../utils/powerSearchParser');
```

### Issue: "Table 'baptism_records' doesn't exist"
**Fix:** Ensure you're querying the correct church database. Check your multi-tenancy routing.

### Issue: Indexes not created
**Fix:** Run the migration with proper permissions:
```bash
mysql -u root -p < server/migrations/add-search-indexes.sql
```

### Issue: 401 Unauthorized
**Fix:** Ensure the `requireAuth` middleware is properly configured and you're sending session cookies.

---

## Verification Checklist

- [ ] Parser file copied to `server/src/utils/powerSearchParser.js`
- [ ] API file copied to `server/src/api/powerSearchApi.js`
- [ ] Router registered in `server/src/index.ts`
- [ ] Database connection pattern updated
- [ ] Query execution pattern updated
- [ ] Indexes created on all church databases
- [ ] Tests run successfully
- [ ] Backend restarted
- [ ] Endpoint responds to test queries
- [ ] No console errors in server logs

---

## Next Steps

Once the backend is working:
1. Update the frontend (see separate instructions)
2. Test the full integration
3. Monitor performance with the new indexes
4. Extend to marriage and funeral records (use same pattern)

---

## Notes

- The parser is **SQL injection safe** - all values are parameterized
- Field names are **whitelisted** - only valid columns are allowed
- Sort columns are **whitelisted** - prevents SQL injection via ORDER BY
- Church scoping is **enforced** - users can only see their church's data
- The API is **extensible** - easy to add marriage/funeral support later
