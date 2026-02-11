# Integration Guide: New Import System with Existing UI

## Current System Overview

### Existing UI Components ✅
- **Records Management Page**: Main interface with church/record type selectors
- **Data Grid**: Displays records with sorting, filtering, pagination
- **Action Buttons**: Add Record, Import Records, Advanced Grid
- **Navigation Menu**: Records Management, Browser, Dashboard, Legacy Records

### Existing Backend Routes ✅
- `GET /api/records/:recordType` - List records (baptism/marriage/funeral)
- `GET /api/records/:recordType/:id` - Get single record
- `POST /api/records/:recordType` - Create record
- `PUT /api/records/:recordType/:id` - Update record
- `DELETE /api/records/:recordType/:id` - Delete record
- `GET /api/records/:recordType/:id/history` - Audit history

### New Backend Routes (Created in Phase 5) ✅
- `POST /api/records/import/upload` - Upload import file
- `POST /api/records/import/preview` - Preview with field mapping
- `POST /api/records/import/commit` - Execute import
- `GET /api/records/import/status/:jobId` - Check import status
- `GET /api/records/import/recent` - Recent import jobs
- `GET /api/records/dashboard` - Dashboard statistics
- `GET /api/records/dashboard/summary` - Quick summary

## Integration Points

### 1. Import Records Button
The existing "Import Records" button should trigger:
```javascript
// When Import Records clicked
async function handleImportClick() {
  // Open file upload dialog
  const file = await selectFile();
  
  // Upload file
  const formData = new FormData();
  formData.append('file', file);
  formData.append('type', getCurrentRecordType()); // 'baptisms', 'marriages', 'funerals'
  
  const uploadResponse = await fetch('/api/records/import/upload', {
    method: 'POST',
    body: formData
  });
  
  const { jobId } = await uploadResponse.json();
  
  // Get preview
  const previewResponse = await fetch('/api/records/import/preview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jobId })
  });
  
  const { detectedFields, suggestedMappings, preview } = await previewResponse.json();
  
  // Show mapping UI (already exists)
  const mapping = await showMappingDialog(detectedFields, suggestedMappings);
  
  // Commit import
  await fetch('/api/records/import/commit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jobId, mapping })
  });
  
  // Poll for status
  pollImportStatus(jobId);
}
```

### 2. Dashboard Integration
The Records Dashboard page can use:
```javascript
// Fetch dashboard data
const response = await fetch('/api/records/dashboard');
const dashboardData = await response.json();

// dashboardData contains:
// - counts: { baptisms, marriages, funerals, total }
// - trends: { baptisms: [...], marriages: [...], funerals: [...] }
// - recentImports: [...]
// - duplicates: { baptisms: [...], marriages: [...], funerals: [...] }
// - yearOverYear: { baptisms: {...}, marriages: {...}, funerals: {...} }
```

### 3. Record Type Mapping
- UI uses: "Baptism Records", "Marriage Records", "Funeral Records"
- Backend expects: "baptisms", "marriages", "funerals"
- Conversion needed in frontend

### 4. Church Context
The system already handles church context through:
- `req.user.church_id` - Set from authenticated user
- `req.tenantId` - Set by tenant middleware
- Church selector in UI updates context

## Required Frontend Updates

### 1. Import Dialog Component
```jsx
// Minimal changes needed - just wire to new endpoints
const ImportDialog = () => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState([]);
  const [mapping, setMapping] = useState({});
  const [jobId, setJobId] = useState(null);
  
  // Use new import endpoints
  const handleUpload = async () => {
    // POST to /api/records/import/upload
  };
  
  const handlePreview = async () => {
    // POST to /api/records/import/preview
  };
  
  const handleCommit = async () => {
    // POST to /api/records/import/commit
  };
};
```

### 2. Dashboard Charts
```jsx
// Use new dashboard endpoint
const Dashboard = () => {
  useEffect(() => {
    fetch('/api/records/dashboard')
      .then(res => res.json())
      .then(data => {
        // Update charts with data.trends
        // Update stats with data.counts
        // Show recent imports from data.recentImports
      });
  }, []);
};
```

## File Format Support

### CSV Example
```csv
First Name,Last Name,Baptism Date,Birth Date,Priest Name
John,Doe,2024-01-15,2023-12-01,Fr. James
```

### JSON Example
```json
[
  {
    "first_name": "John",
    "last_name": "Doe",
    "baptism_date": "2024-01-15",
    "birth_date": "2023-12-01",
    "priest_name": "Fr. James"
  }
]
```

### XML Example
```xml
<records>
  <record>
    <first_name>John</first_name>
    <last_name>Doe</last_name>
    <baptism_date>2024-01-15</baptism_date>
    <birth_date>2023-12-01</birth_date>
    <priest_name>Fr. James</priest_name>
  </record>
</records>
```

## Testing the Integration

### 1. Test Import Flow
```bash
# Upload a CSV file
curl -X POST http://localhost:3000/api/records/import/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test.csv" \
  -F "type=baptisms"

# Preview
curl -X POST http://localhost:3000/api/records/import/preview \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"jobId": 1}'

# Commit with mapping
curl -X POST http://localhost:3000/api/records/import/commit \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"jobId": 1, "mapping": {"First Name": "first_name"}}'
```

### 2. Test Dashboard
```bash
curl http://localhost:3000/api/records/dashboard \
  -H "Authorization: Bearer $TOKEN"
```

## Benefits of Integration

1. **No UI Changes Required**: Existing UI can use new backend with minimal JavaScript updates
2. **Enhanced Features**: Import supports CSV, JSON, SQL, XML (vs just CSV before)
3. **Better Tracking**: Import jobs table tracks all imports with status
4. **Idempotency**: Duplicate prevention via source_hash
5. **Field Mapping**: Flexible mapping with suggested defaults
6. **Dashboard Analytics**: Comprehensive statistics and trends

## Migration Path

1. **Phase 1**: Wire Import button to new upload endpoint
2. **Phase 2**: Add preview/mapping dialog using preview endpoint
3. **Phase 3**: Update dashboard to use new statistics endpoint
4. **Phase 4**: Add import history view using recent jobs endpoint

The existing UI is already 90% ready - it just needs to call the new endpoints!
