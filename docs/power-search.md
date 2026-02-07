# Power Search Documentation

## Overview

Power Search is a production-grade search system for Baptism Records (extensible to Marriage and Funeral records) that provides:

- **Field-scoped queries** - Search specific columns
- **Operator support** - Exact match, partial match, date comparisons, ranges
- **Quoted phrases** - Search for multi-word terms
- **Server-side filtering** - Scalable for large datasets
- **Server-side pagination** - Efficient data loading
- **Server-side sorting** - Fast ordering
- **Field aliases** - User-friendly field names

---

## Query Grammar

### Basic Syntax

Power Search uses a simple, intuitive syntax:

```
[field][operator]value
```

### Global Search (No Field Specified)

Search across multiple fields simultaneously:

```
john smith
```

This searches for "john" AND "smith" across all searchable fields:
- First name
- Last name
- Full name
- Father name
- Mother name
- Officiant name
- Place name
- Godparents
- Notes

### Field-Scoped Search

Search specific fields using the colon (`:`) separator:

```
first:john
last:smith
clergy:david
```

### Operators

#### Default (Partial Match)
No operator = partial match (LIKE %value%)

```
first:john          → person_first LIKE '%john%'
last:smi            → person_last LIKE '%smi%'
```

#### Exact Match (`=`)
Exact string match

```
last=Smith          → person_last = 'Smith'
clergy="Rev. David" → officiant_name = 'Rev. David'
```

#### Explicit Partial Match (`~`)
Same as default, but explicit

```
last~smi            → person_last LIKE '%smi%'
```

#### Date Comparisons (`>`, `<`, `>=`, `<=`)
Compare dates

```
birth>2020          → birth_date >= '2020-12-31'
baptism<2025        → baptism_date < '2025-01-01'
birth>=2020-06-15   → birth_date >= '2020-06-15'
```

#### Range (`..`)
Date range (inclusive)

```
baptism:2024-01-01..2024-12-31  → baptism_date BETWEEN '2024-01-01' AND '2024-12-31'
birth:2020..2025                → birth_date BETWEEN '2020-01-01' AND '2025-12-31'
```

### Quoted Phrases

Use double quotes to search for multi-word terms:

```
"Rev. David Smith"
clergy:"Rev. David"
"John Michael Smith"
```

### Combining Queries

Combine multiple search terms:

```
john first:mary birth>2020 clergy:"Rev. David"
```

**Logic:**
- Global terms are ORed across fields, then ANDed together
- Field terms are ANDed together
- All conditions are ANDed

---

## Field Reference

### Field Aliases

User-friendly names that map to database columns:

| Alias | DB Column | Description |
|-------|-----------|-------------|
| `first`, `fname`, `firstname` | `person_first` | First name |
| `last`, `lname`, `lastname` | `person_last` | Last name |
| `middle` | `person_middle` | Middle name |
| `name`, `fullname` | `person_full` | Full name |
| `birth`, `birthdate`, `dob` | `birth_date` | Birth date |
| `baptism`, `baptismdate` | `baptism_date` | Baptism date |
| `reception` | `reception_date` | Reception date |
| `place`, `birthplace`, `location` | `place_name` | Place/location |
| `father` | `father_name` | Father's name |
| `mother` | `mother_name` | Mother's name |
| `clergy`, `priest`, `officiant` | `officiant_name` | Officiating clergy |
| `godparents`, `sponsors` | `godparents` | Godparents |
| `certificate`, `cert` | `certificate_no` | Certificate number |
| `book` | `book_no` | Book number |
| `page` | `page_no` | Page number |
| `entry` | `entry_no` | Entry number |
| `notes` | `notes` | Notes |

### Date Fields

Special handling for date comparisons and ranges:

- `birth_date` / `birth`
- `baptism_date` / `baptism`
- `reception_date` / `reception`

**Date Formats:**
- `YYYY` - Year (e.g., `2020`)
- `YYYY-MM` - Month (e.g., `2020-06`)
- `YYYY-MM-DD` - Exact date (e.g., `2020-06-15`)

**Date Expansion:**
- `birth>2020` → `birth_date >= '2020-12-31'` (after entire year)
- `birth<2020` → `birth_date < '2020-01-01'` (before year)
- `baptism:2024-06` → `BETWEEN '2024-06-01' AND '2024-06-30'` (entire month)

---

## Examples

### Example 1: Simple Name Search
```
john smith
```
Finds records where "john" appears in any searchable field AND "smith" appears in any searchable field.

### Example 2: Specific Field Search
```
first:john last:smith
```
Finds records where first name contains "john" AND last name contains "smith".

### Example 3: Exact Match
```
last=Smith
```
Finds records where last name is exactly "Smith" (case-sensitive).

### Example 4: Date Range
```
baptism:2024-01-01..2024-12-31
```
Finds all baptisms in 2024.

### Example 5: Year Comparison
```
birth>2020
```
Finds records where birth date is after 2020.

### Example 6: Clergy Search
```
clergy:"Rev. David"
```
Finds records where the officiating clergy is "Rev. David".

### Example 7: Complex Query
```
john first:mary birth>2020 clergy:"Rev. David" place:scranton
```
Finds records where:
- "john" appears anywhere
- First name contains "mary"
- Birth date is after 2020
- Clergy is "Rev. David"
- Place contains "scranton"

### Example 8: Certificate Lookup
```
certificate:123
```
Finds records with certificate number containing "123".

### Example 9: Month Range
```
baptism:2024-06
```
Finds all baptisms in June 2024.

### Example 10: Multiple Names
```
first:john first:mary
```
Finds records where first name contains "john" AND "mary" (unlikely to match, but valid syntax).

---

## API Reference

### Endpoint

```
GET /api/records/baptism
```

### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `q` | string | `""` | Search query with Power Search syntax |
| `page` | number | `1` | Page number (1-based) |
| `pageSize` | number | `25` | Records per page (max: 100) |
| `sortBy` | string | `baptism_date` | Column to sort by |
| `sortDir` | string | `desc` | Sort direction (`asc` or `desc`) |
| `churchId` | number | - | Church ID (required for non-super-admins) |

### Response Format

```json
{
  "success": true,
  "rows": [
    {
      "id": 1,
      "person_first": "John",
      "person_last": "Smith",
      "birth_date": "2020-06-15",
      "baptism_date": "2020-08-01",
      ...
    }
  ],
  "total": 150,
  "page": 1,
  "pageSize": 25,
  "totalPages": 6,
  "applied": {
    "query": "john birth>2020",
    "parsedSummary": {
      "globalTerms": 1,
      "fieldFilters": 1,
      "totalTokens": 2
    },
    "sortBy": "baptism_date",
    "sortDir": "desc",
    "churchId": 1
  },
  "warnings": []
}
```

### Error Response

```json
{
  "success": false,
  "error": "Search failed",
  "message": "Invalid date format",
  "warnings": ["Unknown field: invalidfield"]
}
```

---

## Frontend Integration

### URL Sync

Search queries are synced to the URL for bookmarking and sharing:

```
/apps/records/baptism?q=john+smith&page=2&sortBy=person_last
```

### Debouncing

Search input is debounced by 300ms to prevent excessive API calls.

### Help Popover

Click the `?` icon next to the search box to see examples and syntax help.

---

## Performance

### Database Indexes

The following indexes are created for optimal performance:

- `idx_church_lastname` - Church + last name
- `idx_church_firstname` - Church + first name
- `idx_church_fullname` - Church + full name
- `idx_church_birthdate` - Church + birth date
- `idx_church_baptismdate` - Church + baptism date
- `idx_church_receptiondate` - Church + reception date
- `idx_church_officiant` - Church + officiant
- `idx_church_place` - Church + place
- `idx_church_date_name` - Composite (church, baptism date, last, first)
- `idx_church_certificate` - Church + certificate number
- `idx_church_entry` - Church + entry number

### Query Optimization

- All queries use parameterized statements (SQL injection safe)
- Field names are whitelisted (only valid columns allowed)
- Sort columns are whitelisted (prevents ORDER BY injection)
- Church scoping is enforced server-side
- Pagination reduces data transfer
- Indexes speed up common search patterns

---

## Security

### SQL Injection Prevention

- All user input is parameterized
- No string concatenation in SQL
- Field names validated against whitelist
- Sort columns validated against whitelist

### Multi-Tenancy

- Church ID required for non-super-admins
- Church scoping enforced in WHERE clause
- Users can only access their assigned church data

### Authorization

- Requires authentication (`requireAuth` middleware)
- Role-based access control
- Session-based authentication

---

## Extensibility

### Adding New Record Types

To extend Power Search to Marriage or Funeral records:

1. **Update Field Aliases** in `powerSearchParser.js`:
   ```javascript
   // Add marriage-specific fields
   'groom': 'groom_first',
   'bride': 'bride_first',
   'marriage': 'marriage_date',
   ```

2. **Update Valid Columns**:
   ```javascript
   const VALID_COLUMNS_MARRIAGE = new Set([
     'groom_first', 'groom_last', 'bride_first', 'bride_last',
     'marriage_date', 'witness', ...
   ]);
   ```

3. **Add API Route**:
   ```javascript
   router.get('/marriage', requireAuth, async (req, res) => {
     // Similar to baptism endpoint
   });
   ```

4. **Create Indexes**:
   ```sql
   CREATE INDEX idx_church_groom ON marriage_records(church_id, groom_last);
   CREATE INDEX idx_church_bride ON marriage_records(church_id, bride_last);
   ```

---

## Troubleshooting

### No Results Found

**Check:**
- Is the church ID correct?
- Are you using the right field names? (Check aliases)
- Try a simpler query first (e.g., just a name)
- Check if records exist in the database

### Slow Queries

**Solutions:**
- Ensure indexes are created (`SHOW INDEXES FROM baptism_records`)
- Run `ANALYZE TABLE baptism_records`
- Reduce page size
- Use more specific field searches instead of global search

### Invalid Field Warning

**Cause:** Using a field name that doesn't exist or isn't aliased

**Solution:** Check the Field Reference table for valid field names

### Date Format Error

**Cause:** Invalid date format

**Solution:** Use `YYYY`, `YYYY-MM`, or `YYYY-MM-DD` format

---

## Testing

### Manual Test Checklist

- [ ] Global search returns results
- [ ] Field search works (e.g., `first:john`)
- [ ] Exact match works (e.g., `last=Smith`)
- [ ] Date comparison works (e.g., `birth>2020`)
- [ ] Date range works (e.g., `baptism:2024-01-01..2024-12-31`)
- [ ] Quoted phrases work (e.g., `clergy:"Rev. David"`)
- [ ] Invalid field produces warning (not crash)
- [ ] Pagination works correctly
- [ ] Sorting works correctly
- [ ] Church scoping is enforced
- [ ] URL sync works (refresh preserves search)
- [ ] Debouncing prevents excessive API calls

### Unit Tests

Run the parser tests:

```bash
node server/tests/powerSearchParser.test.js
```

Expected: `✅ All tests passed! (20/20)`

---

## Future Enhancements

### Potential Improvements

1. **Fuzzy Matching** - Soundex or Levenshtein distance for name variations
2. **Autocomplete** - Suggest field names and values as user types
3. **Saved Searches** - Allow users to save and reuse common queries
4. **Export Filtered Results** - Export only the filtered dataset
5. **Advanced Filters UI** - Visual query builder for non-technical users
6. **Full-Text Search** - MySQL FULLTEXT indexes for better text search
7. **Search History** - Track and display recent searches
8. **Bulk Operations** - Perform actions on filtered results

---

## Support

For issues or questions:

1. Check this documentation
2. Review the integration instructions
3. Check server logs for errors
4. Run unit tests to verify parser
5. Test API endpoint directly with curl

---

**Version:** 1.0.0  
**Last Updated:** February 5, 2026  
**Author:** OrthodoxMetrics Development Team
