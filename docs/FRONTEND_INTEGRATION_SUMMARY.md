# Frontend Power Search Integration Summary

## Files Created

### 1. PowerSearchInput Component
**Location:** `/front-end/src/components/PowerSearchInput.tsx`

**Features:**
- Debounced search input (300ms default)
- Built-in help popover with syntax examples
- Warning display for invalid fields
- Loading state indicator
- Clear button
- Fully styled with MUI components

**Usage:**
```tsx
import PowerSearchInput from '@/components/PowerSearchInput';

<PowerSearchInput
  value={query}
  onChange={setQuery}
  onSearch={handleSearch}
  loading={loading}
  warnings={warnings}
  placeholder="Search records..."
  debounceMs={300}
/>
```

### 2. usePowerSearch Hook
**Location:** `/front-end/src/hooks/usePowerSearch.ts`

**Features:**
- Manages search state
- URL synchronization (query, page, pageSize, sortBy, sortDir)
- Automatic API calls on state changes
- Error handling
- Warning display
- TypeScript typed

**Usage:**
```tsx
import { usePowerSearch } from '@/hooks/usePowerSearch';

const {
  query,
  setQuery,
  results,
  total,
  page,
  pageSize,
  totalPages,
  sortBy,
  sortDir,
  loading,
  error,
  warnings,
  search,
  setPage,
  setPageSize,
  setSort,
  refresh,
} = usePowerSearch({
  endpoint: '/api/records/baptism',
  churchId: selectedChurch,
  initialPageSize: 25,
  initialSortBy: 'baptism_date',
  initialSortDir: 'desc',
});
```

## Integration Steps for BaptismRecordsPage

### Step 1: Import Components and Hook

Add these imports to `BaptismRecordsPage.tsx`:

```tsx
import PowerSearchInput from '../../components/PowerSearchInput';
import { usePowerSearch } from '../../hooks/usePowerSearch';
```

### Step 2: Replace Current Search State

**Remove:**
```tsx
const [searchTerm, setSearchTerm] = useState<string>('');
const [records, setRecords] = useState<BaptismRecord[]>([]);
const [page, setPage] = useState<number>(0);
const [rowsPerPage, setRowsPerPage] = useState<number>(10);
// ... other state related to search/pagination
```

**Add:**
```tsx
const powerSearch = usePowerSearch({
  endpoint: '/api/records/baptism',
  churchId: selectedChurch,
  initialPageSize: 25,
  initialSortBy: 'baptism_date',
  initialSortDir: 'desc',
});
```

### Step 3: Replace Search Input

**Remove:**
```tsx
<TextField
  placeholder="Search Records"
  value={searchTerm}
  onChange={(e) => setSearchTerm(e.target.value)}
  InputProps={{
    startAdornment: (
      <InputAdornment position="start">
        <SearchIcon />
      </InputAdornment>
    ),
  }}
/>
```

**Add:**
```tsx
<PowerSearchInput
  value={powerSearch.query}
  onChange={powerSearch.setQuery}
  onSearch={powerSearch.search}
  loading={powerSearch.loading}
  warnings={powerSearch.warnings}
/>
```

### Step 4: Update Data Source

**Remove:**
```tsx
const filteredAndSortedRecords = useMemo(() => {
  let filtered = records;
  if (searchTerm) {
    const searchLower = searchTerm.toLowerCase();
    filtered = filtered.filter(record =>
      Object.values(record).some(value =>
        value?.toString().toLowerCase().includes(searchLower)
      )
    );
  }
  // ... sorting logic
  return filtered;
}, [records, searchTerm, sortConfig]);
```

**Replace with:**
```tsx
// Use powerSearch.results directly - it's already filtered and sorted
const displayRecords = powerSearch.results;
```

### Step 5: Update Pagination

**Remove:**
```tsx
<TablePagination
  rowsPerPageOptions={[5, 10, 25, 50]}
  component="div"
  count={filteredAndSortedRecords.length}
  rowsPerPage={rowsPerPage}
  page={page}
  onPageChange={handleChangePage}
  onRowsPerPageChange={handleChangeRowsPerPage}
/>
```

**Add:**
```tsx
<TablePagination
  rowsPerPageOptions={[10, 25, 50, 100]}
  component="div"
  count={powerSearch.total}
  rowsPerPage={powerSearch.pageSize}
  page={powerSearch.page - 1} // MUI uses 0-based, API uses 1-based
  onPageChange={(_, newPage) => powerSearch.setPage(newPage + 1)}
  onRowsPerPageChange={(e) => powerSearch.setPageSize(parseInt(e.target.value, 10))}
/>
```

### Step 6: Update Sorting

**Remove:**
```tsx
const handleSort = (key: keyof BaptismRecord) => {
  setSortConfig(prev => ({
    key,
    direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
  }));
};
```

**Add:**
```tsx
const handleSort = (key: string) => {
  const newDir = powerSearch.sortBy === key && powerSearch.sortDir === 'asc' ? 'desc' : 'asc';
  powerSearch.setSort(key, newDir);
};
```

### Step 7: Remove Client-Side Filtering Logic

Delete these functions/useMemo blocks:
- `filteredAndSortedRecords`
- `paginatedRecords`
- Any manual filtering/sorting logic

The Power Search API handles all of this server-side.

### Step 8: Update Error Handling

**Add:**
```tsx
{powerSearch.error && (
  <Alert severity="error" sx={{ mb: 2 }}>
    {powerSearch.error}
  </Alert>
)}
```

### Step 9: Update Loading State

**Replace:**
```tsx
{loading && <CircularProgress />}
```

**With:**
```tsx
{powerSearch.loading && <CircularProgress />}
```

## URL Synchronization

The hook automatically syncs these parameters to the URL:
- `?q=search+query` - Search query
- `?page=2` - Current page
- `?pageSize=50` - Page size
- `?sortBy=person_last` - Sort column
- `?sortDir=asc` - Sort direction

**Benefits:**
- Bookmarkable searches
- Shareable links
- Browser back/forward works
- Refresh preserves state

## Example: Complete Integration

```tsx
const BaptismRecordsPage: React.FC = () => {
  const [selectedChurch, setSelectedChurch] = useState<number>(0);
  
  // Power Search hook
  const powerSearch = usePowerSearch({
    endpoint: '/api/records/baptism',
    churchId: selectedChurch,
    initialPageSize: 25,
    initialSortBy: 'baptism_date',
    initialSortDir: 'desc',
  });

  return (
    <Box>
      {/* Church Selector */}
      <Select
        value={selectedChurch}
        onChange={(e) => setSelectedChurch(Number(e.target.value))}
      >
        {/* ... church options */}
      </Select>

      {/* Power Search Input */}
      <PowerSearchInput
        value={powerSearch.query}
        onChange={powerSearch.setQuery}
        onSearch={powerSearch.search}
        loading={powerSearch.loading}
        warnings={powerSearch.warnings}
      />

      {/* Error Display */}
      {powerSearch.error && (
        <Alert severity="error">{powerSearch.error}</Alert>
      )}

      {/* Results Table */}
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>
              <TableSortLabel
                active={powerSearch.sortBy === 'person_first'}
                direction={powerSearch.sortBy === 'person_first' ? powerSearch.sortDir : 'asc'}
                onClick={() => handleSort('person_first')}
              >
                First Name
              </TableSortLabel>
            </TableCell>
            {/* ... more columns */}
          </TableRow>
        </TableHead>
        <TableBody>
          {powerSearch.results.map((record) => (
            <TableRow key={record.id}>
              <TableCell>{record.person_first}</TableCell>
              {/* ... more cells */}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Pagination */}
      <TablePagination
        count={powerSearch.total}
        page={powerSearch.page - 1}
        rowsPerPage={powerSearch.pageSize}
        onPageChange={(_, newPage) => powerSearch.setPage(newPage + 1)}
        onRowsPerPageChange={(e) => powerSearch.setPageSize(parseInt(e.target.value, 10))}
      />
    </Box>
  );
};
```

## Testing Checklist

- [ ] Search input appears and is styled correctly
- [ ] Help icon shows popover with examples
- [ ] Typing triggers debounced search (300ms delay)
- [ ] Clear button clears search
- [ ] Loading indicator shows during search
- [ ] Results update after search
- [ ] Warnings display for invalid fields
- [ ] Pagination works (page numbers, page size)
- [ ] Sorting works (click column headers)
- [ ] URL updates with search parameters
- [ ] Refresh preserves search state
- [ ] Browser back/forward works
- [ ] Shareable links work
- [ ] Church selection triggers new search
- [ ] Empty search shows all records
- [ ] Complex queries work (field:value, operators, ranges)

## Performance Notes

- **Debouncing**: Prevents excessive API calls while typing
- **Server-side filtering**: Scalable for large datasets
- **Server-side pagination**: Only loads visible records
- **Server-side sorting**: Fast ordering without client processing
- **Database indexes**: Ensure indexes are created for optimal performance

## Troubleshooting

### Issue: "Cannot find module '@/components/PowerSearchInput'"
**Fix:** Check tsconfig.json paths configuration or use relative imports

### Issue: Search not triggering
**Fix:** Ensure `churchId` is set in usePowerSearch options

### Issue: Pagination shows wrong page
**Fix:** Remember MUI uses 0-based pages, API uses 1-based. Convert: `page - 1` for display, `page + 1` for API

### Issue: URL not updating
**Fix:** Ensure component is wrapped in React Router's BrowserRouter

### Issue: Results not updating
**Fix:** Check browser console for API errors. Verify backend is running and endpoint is correct.

## Next Steps

1. Integrate Power Search into BaptismRecordsPage
2. Test all functionality
3. Extend to Marriage Records (same pattern)
4. Extend to Funeral Records (same pattern)
5. Add saved searches feature (future enhancement)
6. Add export filtered results (future enhancement)

---

**Documentation:** See `/docs/power-search.md` for complete Power Search syntax reference
**Backend:** See `/docs/backend-files/INTEGRATION_INSTRUCTIONS.md` for backend setup
