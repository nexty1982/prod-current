# Interactive Reports Integration Steps

## Step 1: Database Migration

Run the SQL migration to create the tables:

```bash
# Using psql
psql -d orthodoxmetrics_db -f backend/migrations/create_interactive_reports_tables.sql

# Or using your database management tool
# Execute the contents of backend/migrations/create_interactive_reports_tables.sql
```

## Step 2: Mount Routes in Express App

Add the interactive reports routes to your main Express server file.

### If you have a main server file (e.g., `server.js`, `app.js`, `index.js`):

```typescript
// Import the router
import interactiveReportsRouter from './routes/interactiveReports';

// Mount the routes
app.use('/api/records/interactive-reports', interactiveReportsRouter);
app.use('/r/interactive', interactiveReportsRouter); // Public routes (no /api prefix)
```

### If you use a routes index file:

Add to your routes index file:

```typescript
import interactiveReportsRouter from './routes/interactiveReports';

// In your route mounting section:
app.use('/api/records/interactive-reports', interactiveReportsRouter);
app.use('/r/interactive', interactiveReportsRouter);
```

## Step 3: Verify Dependencies

Ensure these files exist and are accessible:
- `backend/routes/interactiveReports.ts`
- `backend/utils/tokenUtils.ts`
- `backend/utils/emailService.ts`
- `backend/middleware/rateLimiter.ts`

## Step 4: Configure Email Service

Update `backend/utils/emailService.ts` with your email provider.

### Quick Setup (Nodemailer):

```bash
npm install nodemailer
npm install --save-dev @types/nodemailer
```

Then update the `sendEmail` function in `emailService.ts` (see INTEGRATION_GUIDE.md for examples).

## Step 5: Environment Variables

Add to your `.env` file:

```env
FRONTEND_URL=http://localhost:5173
EMAIL_FROM=noreply@orthodoxmetrics.com
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASS=your-password
VITE_ENABLE_INTERACTIVE_REPORT_RECIPIENTS=true
```

## Step 6: Verify Database Connection

Ensure your `db` export in `backend/db` (or wherever your database connection is) is accessible.

The routes use:
```typescript
import { db } from '../db';
```

Adjust the import path if your database connection is located elsewhere.

## Step 7: Test the Integration

1. Start your backend server
2. Test creating a report:
   ```bash
   curl -X POST http://localhost:3001/api/records/interactive-reports \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -d '{
       "churchId": 46,
       "recordType": "baptism",
       "title": "Test Report",
       "allowedFields": ["first_name", "last_name"],
       "recipients": [{"email": "test@example.com", "recordIds": [1, 2]}],
       "expiresDays": 30
     }'
   ```

3. Check that tables were created:
   ```sql
   SELECT * FROM interactive_reports LIMIT 1;
   ```

## Troubleshooting

- **Routes not found**: Verify routes are mounted before error handlers
- **Database errors**: Check database connection and schema
- **Email not sending**: Check email service configuration and logs
- **Token errors**: Verify tokenUtils is working correctly
