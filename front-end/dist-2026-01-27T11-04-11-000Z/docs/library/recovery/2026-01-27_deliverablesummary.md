# Records Discovery Deliverable Summary

**Discovery Run**: `20260125_225538`  
**Generated**: January 25, 2026  
**Script**: `tools/records/scan_records_docs.sh`

## Discovery Folder Path

```
docs/records/discovery/20260125_225538/
```

## Top 15 Ranked Documentation Files

Based on keyword hit counts from `records_md_ranked.txt`:

1. **617 hits** - `./docs/ARCHIVE/sprawl/front-end-docs/features-tsx-files.md`
   - Keywords: records:382, records-centralized:157, records.old:49, baptism:15, marriage:2, funeral:1, ChurchRecords:7, RecordsPageWrapper:4

2. **503 hits** - `./docs/ARCHIVE/sprawl/front-end-docs/REFACTOR_INVENTORY_V2.md`
   - Keywords: records:322, /apps/records:9, records-centralized:101, baptism:17, marriage:13, funeral:10, death:3, ChurchRecords:19, RecordsPageWrapper:9

3. **307 hits** - `./docs/ARCHIVE/sprawl/front-end-public-docs/2025-12-17T09-26-06-588Z_BaptismRecordsPage-Documentation.md`
   - Keywords: records:138, /apps/records:12, records-centralized:7, baptism:70, marriage:41, funeral:36, death:1, clergy:2

4. **307 hits** - `./docs/ARCHIVE/sprawl/front-end-docs/workflow-user-experience/documentation/baptism-records-page.md`
   - Keywords: records:138, /apps/records:12, records-centralized:7, baptism:70, marriage:41, funeral:36, death:1, clergy:2

5. **282 hits** - `./docs/ARCHIVE/2024-12-19-records-routes-analysis.md`
   - Keywords: records:161, /apps/records:27, records-centralized:18, baptism:27, marriage:23, funeral:19, death:2, RecordsPageWrapper:5

6. **258 hits** - `./docs/ARCHIVE/sprawl/front-end-docs/workflow-user-experience/documentation/records-centralized.md`
   - Keywords: records:185, records-centralized:11, baptism:27, marriage:20, funeral:11, ChurchRecords:3, RecordsPageWrapper:1

7. **208 hits** - `./docs/ARCHIVE/sprawl/front-end-docs/REFACTOR_INVENTORY.md`
   - Keywords: records:174, records-centralized:10, baptism:1, marriage:1, funeral:1, ChurchRecords:21

8. **175 hits** - `./docs/ARCHIVE/sprawl/front-end-docs/workflow-user-experience/documentation/legacy-records-display.md`
   - Keywords: records:126, /apps/records:2, records-centralized:6, baptism:24, marriage:7, funeral:4, clergy:1, ChurchRecords:4, RecordsPageWrapper:1

9. **154 hits** - `./docs/ARCHIVE/sprawl/front-end-docs/dead-code-analysis.md`
   - Keywords: records:93, records-centralized:3, records.old:49, baptism:5, ChurchRecords:4

10. **114 hits** - `./docs/records/RECORDS_RESTORE_STATUS.md`
    - Keywords: records:45, /apps/records:6, records-centralized:7, baptism:17, marriage:17, funeral:15, death:3, clergy:4

11. **110 hits** - `./docs/ARCHIVE/sprawl/front-end-docs/platform-infrastructure/reference/legacy-entire/api-route-frontend.md`
    - Keywords: records:51, baptism:24, marriage:13, funeral:9, clergy:13

12. **110 hits** - `./docs/ARCHIVE/sprawl/front-end-docs/ingestion-digitization/documentation/enhanced-ocr-uploader.md`
    - Keywords: records:21, baptism:33, marriage:26, funeral:24, death:6

13. **109 hits** - `./docs/ARCHIVE/sprawl/front-end-docs/platform-infrastructure/reference/summary-2025-12-10.md`
    - Keywords: records:50, /apps/records:4, records-centralized:4, baptism:27, marriage:13, funeral:11

14. **98 hits** - `./docs/ARCHIVE/sprawl/front-end-public-docs/2025-12-17T07-10-18-078Z_12-2-25.md`
    - Keywords: records:4, baptism:18, marriage:40, funeral:12, death:4, clergy:20

15. **98 hits** - `./docs/ARCHIVE/sprawl/front-end-docs/analytics-intelligence/guides/analytics-implementation-plan-2025-12-02.md`
    - Keywords: records:4, baptism:18, marriage:40, funeral:12, death:4, clergy:20

## Top 15 Most Referenced Records Code Files

Based on code search hits (from `records_code_hits.txt` and component analysis):

### Frontend Components

1. `front-end/src/features/records-centralized/components/baptism/BaptismRecordsPage.tsx`
2. `front-end/src/features/records-centralized/components/marriage/MarriageRecordsPage.tsx`
3. `front-end/src/features/records-centralized/components/death/FuneralRecordsPage.tsx`
4. `front-end/src/features/records-centralized/components/records/RecordsPageWrapper.tsx`
5. `front-end/src/context/ChurchRecordsContext.tsx`
6. `front-end/src/features/records/baptism/BaptismRecordEntryPage.tsx`
7. `front-end/src/features/records/marriage/MarriageRecordEntryPage.tsx`
8. `front-end/src/features/records/funeral/FuneralRecordEntryPage.tsx`
9. `front-end/src/shared/lib/fetchWithChurchContext.ts`
10. `front-end/src/features/records/apps/records-ui/index.tsx`

### Backend Routes/Services

1. `server/src/routes/records/browse.ts`
2. `server/src/routes/records/dashboard.ts`
3. `server/src/routes/records/import.ts`
4. `server/src/modules/records/importService.ts`
5. `server/src/api/churches.js` (contains `/api/my/churches` endpoint)

## Key Findings

### Documentation Distribution
- **Total matching .md files**: ~100+ files found
- **Archive files**: Majority of high-hit files are in `docs/ARCHIVE/`
- **Active documentation**: Key active docs include:
  - `docs/records/RECORDS_RESTORE_STATUS.md`
  - `docs/auth/SUPERADMIN_CHURCH_CONTEXT.md`
  - `docs/records/discovery/README.md`

### Code Structure
- **Frontend**: Records components primarily in `front-end/src/features/records-centralized/`
- **Backend**: Records routes in `server/src/routes/records/`
- **Context**: ChurchRecordsContext provides centralized state management
- **API**: Church context resolution via `/api/my/churches`

### Most Common Keywords
1. `records` (most frequent)
2. `baptism`, `marriage`, `funeral` (record types)
3. `records-centralized` (feature name)
4. `/apps/records` (route path)
5. `ChurchRecords`, `RecordsPageWrapper` (component names)

## Generated Files

All files are located in: `docs/records/discovery/20260125_225538/`

1. **records_md_files.txt** - All matching markdown files (paths)
2. **records_md_ranked.txt** - Ranked documentation (hit count|path|keywords)
3. **records_code_hits.txt** - Code search results with context
4. **records_components.txt** - Records component files
5. **records_api_hits.txt** - Records API route files
6. **summary.txt** - Discovery summary statistics

## Re-running the Script

To generate a new discovery run:

```bash
bash tools/records/scan_records_docs.sh
```

This creates a new timestamped folder with fresh results.
