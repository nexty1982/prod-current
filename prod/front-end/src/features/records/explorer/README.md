# Dynamic Records Explorer

A powerful tool for browsing any `om_church_##` database without predefining columns.

## Features

- **Dynamic Discovery**: Automatically discovers tables ending with `_records`
- **Column Auto-Detection**: Renders rows using column order (Field 1, Field 2, etc.)
- **Search & Filter**: Naive search across text columns
- **Pagination**: Server-side pagination with configurable page sizes
- **Sorting**: Click column headers to sort data
- **CSV Export**: Export current page data to CSV
- **Security**: Restricted to super_admin users only

## Usage

1. Navigate to `/devel/records-explorer` (super admin only)
2. Enter a church ID in the input field (e.g., `46` for `om_church_46`)
3. Select a table from the left sidebar
4. Browse, search, sort, and export data

## Security Notes

- **Access Control**: Only users with `super_admin` role can access this feature
- **Input Validation**: Church IDs must match `/^[0-9]{1,6}$/`
- **Table Validation**: Only tables matching `/^[a-zA-Z0-9_]+_records$/` are accessible
- **SQL Injection Protection**: All queries use parameterized statements
- **Database Isolation**: Each church's data is in separate databases

## Architecture

### Backend (`/api/records/`)
- `GET /:churchId/tables` - List record tables
- `GET /:churchId/:table/columns` - Get column metadata
- `GET /:churchId/:table` - Get paginated table data

### Frontend
- `useRecordsApi.ts` - API hooks for data fetching
- `RecordsExplorer.tsx` - Main component with MUI DataGrid

## Adding Field Labels

Currently uses fallback headers (Field 1, Field 2, etc.). To add custom labels:

1. Extend the backend to check for field-mapper configurations
2. Update the `DISPLAY_HEADER` logic in the columns endpoint
3. Create field mapping tables or configuration files

## Examples

With `om_church_46`:
- `baptism_records` - Baptism ceremonies and certificates
- `marriage_records` - Marriage records and documentation  
- `funeral_records` - Funeral services and memorials

## Dependencies

- **Backend**: Express.js, MySQL2, Session-based auth
- **Frontend**: React, TypeScript, MUI, MUI X DataGrid
- **Security**: Role-based access control