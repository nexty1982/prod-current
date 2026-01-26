# Backend Routes Integration

## Quick Integration

To integrate the Interactive Reports routes into your Express application:

### Option 1: Direct Mounting

In your main server file (wherever you mount other routes):

```typescript
import express from 'express';
import interactiveReportsRouter from './routes/interactiveReports';

const app = express();

// ... other middleware ...

// Mount interactive reports routes
app.use('/api/records/interactive-reports', interactiveReportsRouter);
app.use('/r/interactive', interactiveReportsRouter); // Public routes
```

### Option 2: Via Routes Index

If you have a routes index file that aggregates all routes:

```typescript
// routes/index.ts
import express from 'express';
import interactiveReportsRouter from './interactiveReports';

const router = express.Router();

// Mount interactive reports
router.use('/records/interactive-reports', interactiveReportsRouter);
router.use('/r/interactive', interactiveReportsRouter);

export default router;
```

Then in your main server file:
```typescript
import apiRoutes from './routes';
app.use('/api', apiRoutes); // This would mount /api/records/interactive-reports
app.use('/', apiRoutes); // This would mount /r/interactive
```

## Required Middleware

The routes expect:
- Authentication middleware: `authenticateToken` (for protected routes)
- Role middleware: `requireRole` (for protected routes)
- Database connection: `db` export from your db module
- Express body parser (for JSON)

## Route Summary

**Protected Routes (require auth):**
- `POST /api/records/interactive-reports` - Create report
- `GET /api/records/interactive-reports/:id` - Get report
- `GET /api/records/interactive-reports/:id/patches` - Get patches
- `POST /api/records/interactive-reports/:id/patches/:patchId/accept` - Accept patch
- `POST /api/records/interactive-reports/:id/patches/:patchId/reject` - Reject patch
- `POST /api/records/interactive-reports/:id/accept-all` - Accept all
- `POST /api/records/interactive-reports/:id/revoke` - Revoke report

**Public Routes (token-based):**
- `GET /r/interactive/:token` - Get recipient report (rate limited)
- `POST /r/interactive/:token/submit` - Submit patches (rate limited)
