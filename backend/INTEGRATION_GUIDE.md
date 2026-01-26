# Interactive Reports Backend Integration Guide

## Routes Integration

Add the interactive reports routes to your Express app:

```typescript
// In your main server file (e.g., server.ts, app.ts, or index.ts)
import interactiveReportsRouter from './routes/interactiveReports';

// Mount the routes
app.use('/api/records/interactive-reports', interactiveReportsRouter);
app.use('/r/interactive', interactiveReportsRouter); // Public routes
```

## Database Migration

Run the migration to create the tables:

```bash
psql -d orthodoxmetrics_db -f migrations/create_interactive_reports_tables.sql
```

## Email Service Configuration

Update `backend/utils/emailService.ts` to use your actual email service:

### Option 1: Nodemailer (SMTP)

```typescript
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function sendEmail(options: EmailOptions): Promise<void> {
  await transporter.sendMail({
    from: process.env.EMAIL_FROM || 'noreply@orthodoxmetrics.com',
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text || options.html.replace(/<[^>]*>/g, ''),
  });
}
```

### Option 2: SendGrid

```typescript
import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

async function sendEmail(options: EmailOptions): Promise<void> {
  await sgMail.send({
    from: process.env.EMAIL_FROM || 'noreply@orthodoxmetrics.com',
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
  });
}
```

## Environment Variables

Add to your `.env`:

```
FRONTEND_URL=http://localhost:5173
EMAIL_FROM=noreply@orthodoxmetrics.com
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASS=your-password
```

## Rate Limiting

The rate limiting middleware is included. For production, consider using Redis-based rate limiting:

```typescript
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import Redis from 'ioredis';

const redisClient = new Redis(process.env.REDIS_URL);

const recipientLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
  }),
  windowMs: 60 * 1000,
  max: 60,
});
```

## Security Notes

1. **Token Security**: Tokens are hashed before storage. Never log or return plain tokens.
2. **SQL Injection**: All queries use parameterized statements.
3. **Field Validation**: Server-side validation ensures only allowed fields are accepted.
4. **Assignment Validation**: Recipients can only submit for assigned records.
5. **Expiration**: Expired/revoked tokens are rejected.

## Testing

1. Create a report via POST `/api/records/interactive-reports`
2. Check email for recipient link
3. Access recipient page with token
4. Submit patches
5. Review patches in priest review screen
6. Accept/reject patches
7. Verify records are updated in database
