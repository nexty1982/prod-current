# OCR Setup Wizard Integration Guide

## Files Created

### Backend
1. **`server/database/migrations/create_ocr_setup_state_table.sql`** - Database migration for setup state table
2. **`server/src/index.ts`** - Added 3 endpoints:
   - `GET /api/church/:churchId/ocr/setup-state`
   - `PUT /api/church/:churchId/ocr/setup-state`
   - `POST /api/church/:churchId/ocr/setup-validate`

### Frontend
1. **`front-end/src/pages/OcrSetupWizardPage.tsx`** - Main wizard component

## Integration Steps

### 1. Add Route to Router.tsx

Add this route to your Router component:

```tsx
import OcrSetupWizardPage from './pages/OcrSetupWizardPage';

// In your routes array or Route components:
<Route 
  path="/devel/ocr-setup-wizard" 
  element={<OcrSetupWizardPage />} 
/>
```

### 2. Add Menu Item to MenuItems.ts

Add this to your Devel Tools menu section:

```tsx
{
  label: 'OCR Setup Wizard',
  path: '/devel/ocr-setup-wizard',
  icon: 'Settings',
  requiresPermission: 'admin' // or appropriate permission
}
```

### 3. Gate Enhanced OCR Uploader

In your Enhanced OCR Uploader page component, add this check at the top:

```tsx
import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Alert, Button, Box } from '@mui/material';

export default function EnhancedOcrUploaderPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const churchId = parseInt(searchParams.get('church_id') || '46');
  const [setupComplete, setSetupComplete] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkSetupStatus();
  }, [churchId]);

  const checkSetupStatus = async () => {
    try {
      const response = await fetch(`/api/church/${churchId}/ocr/setup-state`);
      if (response.ok) {
        const data = await response.json();
        setSetupComplete(data.isComplete);
      }
    } catch (err) {
      console.error('Failed to check setup status:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Box>Loading...</Box>;
  }

  if (!setupComplete) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning" sx={{ mb: 2 }}>
          OCR setup is incomplete. Please complete the setup wizard first.
        </Alert>
        <Button
          variant="contained"
          onClick={() => navigate(`/devel/ocr-setup-wizard?church_id=${churchId}`)}
        >
          Go to Setup Wizard
        </Button>
      </Box>
    );
  }

  // ... rest of your Enhanced OCR Uploader component
}
```

### 4. Add Notification Badge

In your notifications component/service, add this check:

```tsx
// In your notifications fetch/hook:
const checkOcrSetupNotification = async (churchId: number) => {
  try {
    const response = await fetch(`/api/church/${churchId}/ocr/setup-state`);
    if (response.ok) {
      const data = await response.json();
      if (!data.isComplete) {
        return {
          id: `ocr-setup-${churchId}`,
          type: 'info',
          title: 'OCR Setup Incomplete',
          message: `Complete OCR setup for church ${churchId} to enable Enhanced OCR Uploader`,
          link: `/devel/ocr-setup-wizard?church_id=${churchId}`,
          timestamp: new Date()
        };
      }
    }
  } catch (err) {
    console.error('Failed to check OCR setup:', err);
  }
  return null;
};

// Call this for each church the user has access to
```

### 5. Run Database Migration

For each church database, run:

```bash
mysql om_church_46 < server/database/migrations/create_ocr_setup_state_table.sql
```

Or run it programmatically when the endpoint is first called (already implemented in the endpoints).

## Testing

1. Navigate to `/devel/ocr-setup-wizard?church_id=46`
2. Complete all wizard steps
3. Verify setup state persists after refresh
4. Verify Enhanced OCR Uploader is gated
5. Verify notification appears when setup is incomplete
