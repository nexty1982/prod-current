# Google API Setup for Orthodox Metrics

This guide covers setting up Google Sheets integration for agent task tracking.

## Prerequisites

- Google account with access to Google Cloud Console
- Admin access to the Orthodox Metrics server

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **Select a project** → **New Project**
3. Name it (e.g., `orthodoxmetrics-tasks`)
4. Click **Create**

## Step 2: Enable the Google Sheets API

1. In your project, go to **APIs & Services** → **Library**
2. Search for "Google Sheets API"
3. Click on it and click **Enable**

## Step 3: Create a Service Account

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **Service Account**
3. Fill in:
   - **Name**: `agent-tasks` (or similar)
   - **ID**: auto-generated
4. Click **Create and Continue**
5. Skip the optional steps, click **Done**

## Step 4: Generate Credentials JSON

1. In **Credentials**, find your service account
2. Click on the service account email
3. Go to **Keys** tab
4. Click **Add Key** → **Create new key**
5. Select **JSON** format
6. Click **Create** — the file will download

## Step 5: Install Credentials on Server

```bash
# Create secrets directory (outside of git repo)
sudo mkdir -p /var/www/orthodoxmetrics/secrets
sudo chown $USER:www-data /var/www/orthodoxmetrics/secrets
chmod 750 /var/www/orthodoxmetrics/secrets

# Copy the credentials file
cp ~/Downloads/your-credentials-file.json /var/www/orthodoxmetrics/secrets/

# Secure permissions
chmod 640 /var/www/orthodoxmetrics/secrets/*.json
```

## Step 6: Create and Share the Google Sheet

1. Create a new Google Sheet
2. Name it (e.g., `OrthodoxMetrics Agent Tasks`)
3. Copy the **Sheet ID** from the URL:
   ```
   https://docs.google.com/spreadsheets/d/SHEET_ID_HERE/edit
   ```
4. Click **Share**
5. Add the service account email (found in credentials JSON as `client_email`)
6. Give it **Editor** access
7. Click **Send** (uncheck "Notify people" if prompted)

## Step 7: Configure the Application

Update the credentials path and sheet ID in:

**`server/src/services/googleSheets.ts`**
```typescript
const CREDENTIALS_PATH = '/var/www/orthodoxmetrics/secrets/your-credentials.json';
const SPREADSHEET_ID = 'your-sheet-id-here';
```

## Step 8: Test the Integration

```bash
cd /var/www/orthodoxmetrics/prod/server

# Test the connection
npx ts-node -e "
import { googleSheetsService } from './src/services/googleSheets';
googleSheetsService.logAgentTask({
  agent: 'test',
  description: 'Test connection',
  status: 'COMPLETE'
}).then(() => console.log('Success!'));
"
```

Check your Google Sheet — you should see a new row.

## Usage

### Sync Tasks from Markdown

```bash
npm run sync-tasks
# or
npx ts-node scripts/sync-tasks.ts path/to/TASKS.md
```

### Log a Task Programmatically

```typescript
import { googleSheetsService } from './services/googleSheets';

// Start a task
await googleSheetsService.logAgentTask({
  agent: 'claude-code',
  description: 'Implement user authentication',
  status: 'IN_PROGRESS',
  branch: 'feature/auth',
});

// Mark complete
await googleSheetsService.markTaskCompleteByDescription(
  'Implement user authentication',
  'COMPLETE',
  'Added JWT support'
);
```

## Current Configuration

| Setting | Value |
|---------|-------|
| Credentials | `/var/www/orthodoxmetrics/secrets/agenttasks-62c073a72f34.json` |
| Sheet ID | `1at3lPN30ajgLs1ngxdj23HamFD-3mH-x8Bucevxyc80` |
| Sheet Name | `Tasks` |

## Troubleshooting

### "The caller does not have permission"

- Ensure the sheet is shared with the service account email
- Check the service account has **Editor** access

### "Could not load the default credentials"

- Verify the credentials file path is correct
- Check file permissions (should be readable by the Node process)

### "API not enabled"

- Go to Google Cloud Console → APIs & Services → Library
- Search for "Google Sheets API" and enable it

## Security Notes

- **Never commit credentials** to git
- The `/var/www/orthodoxmetrics/secrets/` directory is outside the repo
- Credentials file should have `640` permissions
- Service account only has access to sheets explicitly shared with it
