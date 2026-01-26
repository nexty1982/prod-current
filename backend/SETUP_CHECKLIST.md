# Interactive Reports Setup Checklist

## ✅ Required Steps (Do These Now)

### [ ] Step 1: Database Migration
- [ ] Run: `psql -d orthodoxmetrics_db -f backend/migrations/create_interactive_reports_tables.sql`
- [ ] Verify 6 tables created (see RUN_INTEGRATION.md)

### [ ] Step 2: Mount Routes in Express
- [ ] Find your Express server file (see COMPLETE_INTEGRATION_NOW.md)
- [ ] Add import: `import interactiveReportsRouter from './routes/interactiveReports';`
- [ ] Add route mounting:
  ```typescript
  app.use('/api/records/interactive-reports', interactiveReportsRouter);
  app.use('/r/interactive', interactiveReportsRouter);
  ```
- [ ] Restart backend server

### [ ] Step 3: Verify Setup
- [ ] Test endpoint: `curl http://localhost:3001/api/records/interactive-reports`
- [ ] Should return 401 (not 404)
- [ ] Try creating a report in UI - should work!

## 📋 Optional Steps (Can Do Later)

### [ ] Step 4: Configure Email (Optional)
- [ ] Install email provider (nodemailer or sendgrid)
- [ ] Update `backend/utils/emailService.ts`
- [ ] Set environment variables

### [ ] Step 5: Set Environment Variables
- [ ] `FRONTEND_URL=http://localhost:5173`
- [ ] `EMAIL_FROM=noreply@orthodoxmetrics.com`
- [ ] `VITE_ENABLE_INTERACTIVE_REPORT_RECIPIENTS=true`

## 🔍 Troubleshooting

**404 Error?**
- Routes not mounted → Complete Step 2
- Wrong import path → Check relative path from server file
- Routes mounted after error handlers → Move route mounting earlier

**Import Errors?**
- Check `backend/routes/interactiveReports.ts` import paths
- Verify `backend/middleware/auth.ts` and `backend/db.ts` exist
- Update import paths if files are in different locations

**Database Errors?**
- Run migration (Step 1)
- Check database connection
- Verify table names match

## 📚 Reference Documents

- `COMPLETE_INTEGRATION_NOW.md` - Quick setup guide
- `RUN_INTEGRATION.md` - Detailed step-by-step
- `backend/INTEGRATION_GUIDE.md` - Technical details
- `backend/QUICK_INTEGRATION.md` - Quick reference

---

**Status:** ⚠️ **Action Required** - Complete Steps 1-2 to enable interactive reports
