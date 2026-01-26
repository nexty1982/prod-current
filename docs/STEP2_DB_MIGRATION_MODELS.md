# Step 2: DB Migration + Models - Complete

## What Changed

### Database Migration
- **File**: `server/src/database/2025-01-XX_create_ocr_extractors.sql`
- **Tables Created**:
  1. `ocr_extractors` - Extractor definitions (name, description, record_type, page_mode)
  2. `ocr_extractor_fields` - Field definitions with nested support via `parent_field_id`
- **Features**:
  - Idempotent (uses `IF NOT EXISTS`)
  - Foreign keys with CASCADE delete
  - Unique constraint on `(extractor_id, key)` for field keys
  - Indexes for common queries
  - Target: `orthodoxmetrics_db` (main DB, not church DBs)

### TypeScript Types
- **File**: `server/src/ocr/extractors/types.ts`
- **Types Defined**:
  - `OcrExtractor` - Base extractor model
  - `OcrExtractorField` - Field model
  - `OcrExtractorWithFields` - Extractor with nested fields
  - `CreateExtractorInput`, `UpdateExtractorInput` - API input types
  - `ExtractorTestInput`, `ExtractorTestResult` - Test endpoint types
  - `RunExtractionInput`, `RunExtractionResult` - Extraction endpoint types

### Repository Layer
- **File**: `server/src/ocr/extractors/repo.ts`
- **Class**: `ExtractorRepo`
- **Methods**:
  - `list()` - List all extractors
  - `getById(id)` - Get single extractor
  - `getWithFields(id)` - Get extractor with nested fields
  - `create(input)` - Create extractor + fields (transactional)
  - `update(id, input)` - Update extractor + fields (transactional)
  - `delete(id)` - Delete extractor (cascades to fields)
  - `getFieldsByExtractorId(id)` - Get all fields for extractor
- **Features**:
  - Uses main DB pool (`getAppPool()`)
  - Recursive field insertion for nested groups
  - Transaction support for atomic operations

### Service Layer
- **File**: `server/src/ocr/extractors/service.ts`
- **Class**: `ExtractorService`
- **Methods**: Wraps repo with business logic
  - Validates field key uniqueness
  - Checks existence before update/delete
  - Delegates to `ExtractorRepo`

### Validation Schemas
- **File**: `server/src/ocr/extractors/validators.ts`
- **Schemas** (Zod):
  - `CreateExtractorSchema` - Create extractor validation
  - `UpdateExtractorSchema` - Update extractor validation
  - `CreateFieldSchema` - Recursive field validation
  - `ExtractorTestSchema` - Test endpoint validation
  - `RunExtractionSchema` - Extraction endpoint validation
- **Features**:
  - Field key regex: `^[a-z0-9_]+$` (lowercase alphanumeric + underscore)
  - Validates at least one of `imageId`, `jobId`, or `fileRef` for test
  - Type-safe validation with error messages

## Database Schema

### `ocr_extractors`
```sql
id INT PRIMARY KEY
name VARCHAR(255) NOT NULL
description TEXT NULL
record_type VARCHAR(50) DEFAULT 'custom'
page_mode ENUM('single', 'variable') DEFAULT 'single'
created_at TIMESTAMP
updated_at TIMESTAMP
```

### `ocr_extractor_fields`
```sql
id INT PRIMARY KEY
extractor_id INT FK -> ocr_extractors(id) CASCADE
parent_field_id INT FK -> ocr_extractor_fields(id) CASCADE (nullable)
name VARCHAR(255) NOT NULL
key VARCHAR(255) NOT NULL (unique per extractor)
field_type ENUM('text', 'number', 'date', 'group')
multiple TINYINT(1) DEFAULT 0
instructions TEXT NULL
sort_order INT DEFAULT 0
created_at TIMESTAMP
updated_at TIMESTAMP
```

## How to Test

### 1. Run Migration
```bash
# Connect to orthodoxmetrics_db and run:
mysql -u <user> -p orthodoxmetrics_db < server/src/database/2025-01-XX_create_ocr_extractors.sql
```

### 2. Verify Tables
```sql
SHOW TABLES LIKE 'ocr_extractors%';
DESCRIBE ocr_extractors;
DESCRIBE ocr_extractor_fields;
```

### 3. Test TypeScript Compilation
```bash
cd server
npm run build:ts
```

### 4. Manual Repository Test (optional)
Create a test script to verify CRUD operations work:
```typescript
import { ExtractorService } from './src/ocr/extractors/service.js';

const service = new ExtractorService();
const extractor = await service.create({
  name: 'Test Extractor',
  record_type: 'baptism',
  fields: [
    { name: 'Name', key: 'name', field_type: 'text', sort_order: 0 },
    { name: 'Date', key: 'date', field_type: 'date', sort_order: 1 }
  ]
});
console.log('Created:', extractor);
```

## Next Steps

1. **Backend Routes** (Step 3):
   - Add CRUD endpoints in `server/src/index.ts`
   - Add `/api/ocr/extractors/:id/test` endpoint
   - Add `/api/ocr/jobs/:jobId/extract` endpoint
   - Wire up validation and error handling

2. **Extraction Engine** (Step 4):
   - Create `runExtractor()` function
   - Implement token clustering for repeating groups
   - Add field assignment logic

## Notes

- All code uses TypeScript with strict typing
- Repository uses main DB pool (not church DB)
- Fields support nested groups via `parent_field_id`
- Repeating groups: `field_type='group'` + `multiple=true`
- Field keys must be unique within an extractor
- Migration is idempotent (safe to run multiple times)

