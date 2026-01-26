# OCR Migration Troubleshooting Guide

## Common Issues and Solutions

### Issue 1: "Unknown column 'file_name' in 'SET'"

**Problem:** The migration SQL file on the server is outdated and still uses the old UPDATE syntax.

**Solution:** 
1. Ensure the updated migration file is deployed to the server
2. The file should be at: `/var/www/orthodoxmetrics/prod/server/database/migrations/normalize_ocr_schema.sql`
3. Verify it uses dynamic SQL (PREPARE/EXECUTE) for column migrations

**Quick Fix:** Run migration directly with updated file:
```bash
cd /var/www/orthodoxmetrics/prod/server
mysql -u orthodoxapps -p om_church_46 < database/migrations/normalize_ocr_schema.sql
```

### Issue 2: "Could not find database for church 46"

**Problem:** The script can't query the main database to get the church database name.

**Solution:** Provide the database name directly:
```bash
./run-ocr-migration.sh 46 om_church_46
```

Or check the database name manually:
```sql
USE orthodoxmetrics_db;
SELECT id, name, database_name FROM churches WHERE id = 46;
```

### Issue 3: Password Prompt Issues

**Problem:** Script doesn't handle password prompts correctly.

**Solution Options:**

**Option A:** Set password as environment variable:
```bash
export DB_PASSWORD="your_password"
./run-ocr-migration.sh 46
```

**Option B:** Use MySQL config file (`~/.my.cnf`):
```ini
[client]
user=orthodoxapps
password=your_password
host=localhost
port=3306
```

**Option C:** Run migration directly:
```bash
cd /var/www/orthodoxmetrics/prod/server
mysql -u orthodoxapps -p om_church_46 < database/migrations/normalize_ocr_schema.sql
```

### Issue 4: "ADD COLUMN IF NOT EXISTS" Syntax Error

**Problem:** Older MariaDB/MySQL versions don't support `IF NOT EXISTS` for `ADD COLUMN`.

**Solution:** The updated migration uses dynamic SQL which is compatible with all versions. Ensure you're using the latest migration file.

### Issue 5: Migration Partially Completes

**Problem:** Migration stops partway through.

**Solution:** The migration is idempotent - you can run it multiple times safely:
```bash
# Run again - it will skip existing columns/indexes
mysql -u orthodoxapps -p om_church_46 < database/migrations/normalize_ocr_schema.sql
```

## Verification Steps

After migration, verify columns were added:

```sql
USE om_church_46;

-- Check ocr_jobs columns
SHOW COLUMNS FROM ocr_jobs LIKE 'ocr_result_json';
SHOW COLUMNS FROM ocr_jobs LIKE 'filename';
SHOW COLUMNS FROM ocr_jobs LIKE 'ocr_text';

-- Check ocr_fused_drafts columns
SHOW COLUMNS FROM ocr_fused_drafts LIKE 'workflow_status';
SHOW COLUMNS FROM ocr_fused_drafts LIKE 'church_id';

-- Verify indexes
SHOW INDEXES FROM ocr_jobs WHERE Key_name = 'idx_status';
SHOW INDEXES FROM ocr_fused_drafts WHERE Key_name = 'idx_status';
```

## Manual Migration (If Scripts Fail)

If automated scripts fail, you can run the migration manually:

1. **Connect to database:**
   ```bash
   mysql -u orthodoxapps -p om_church_46
   ```

2. **Run migration SQL directly:**
   ```sql
   source /var/www/orthodoxmetrics/prod/server/database/migrations/normalize_ocr_schema.sql
   ```

3. **Or copy/paste the SQL** from the migration file into MySQL client.

## Getting Help

If issues persist:
1. Check server logs: `tail -f /var/log/mysql/error.log`
2. Verify database permissions: User needs `ALTER`, `CREATE`, `INDEX` privileges
3. Check migration file exists and is readable
4. Verify database name is correct
