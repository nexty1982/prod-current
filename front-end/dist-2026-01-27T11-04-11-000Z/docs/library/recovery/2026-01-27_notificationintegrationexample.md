# Notification Integration Example

## Adding OCR Setup Notifications to Your Notification System

### Option 1: Add to Existing Notification Fetch

If you have a notification service/hook, add OCR setup checks:

```tsx
import { getOcrSetupNotificationsForChurches } from './services/ocrSetupNotifications';

// In your notification hook/service:
async function fetchAllNotifications(userId: number) {
  // ... existing notification fetching ...
  
  // Get user's accessible churches (from your auth/context)
  const userChurches = getUserChurches(); // [46, 47, ...]
  
  // Check OCR setup for each church
  const ocrSetupNotifications = await getOcrSetupNotificationsForChurches(userChurches);
  
  // Merge with existing notifications
  return [
    ...existingNotifications,
    ...ocrSetupNotifications
  ];
}
```

### Option 2: Add to Notification Bell Component

In your notification bell/badge component:

```tsx
import { useEffect, useState } from 'react';
import { getOcrSetupNotification } from '../services/ocrSetupNotifications';
import { Badge } from '@mui/material';

export function NotificationBell({ churchId }: { churchId: number }) {
  const [ocrNotification, setOcrNotification] = useState(null);
  
  useEffect(() => {
    async function checkOcrSetup() {
      const notification = await getOcrSetupNotification(churchId);
      setOcrNotification(notification);
    }
    checkOcrSetup();
  }, [churchId]);
  
  const hasOcrNotification = ocrNotification !== null;
  
  return (
    <Badge badgeContent={hasOcrNotification ? 1 : 0} color="info">
      <NotificationsIcon />
    </Badge>
  );
}
```

### Option 3: Standalone Notification Component

Create a dedicated component that shows OCR setup notifications:

```tsx
import React, { useEffect, useState } from 'react';
import { Alert, Button, Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { getOcrSetupNotification, OcrSetupNotification } from '../services/ocrSetupNotifications';

export function OcrSetupNotificationBanner({ churchId }: { churchId: number }) {
  const navigate = useNavigate();
  const [notification, setNotification] = useState<OcrSetupNotification | null>(null);
  
  useEffect(() => {
    async function check() {
      const notif = await getOcrSetupNotification(churchId);
      setNotification(notif);
    }
    check();
  }, [churchId]);
  
  if (!notification) return null;
  
  return (
    <Alert 
      severity="info" 
      action={
        <Button 
          size="small" 
          onClick={() => navigate(notification.link)}
        >
          Complete Setup
        </Button>
      }
      sx={{ mb: 2 }}
    >
      {notification.message}
    </Alert>
  );
}
```

### Option 4: Add to Main Layout/App Component

Add a persistent notification banner at the top of your app:

```tsx
import { OcrSetupNotificationBanner } from './components/OcrSetupNotificationBanner';

function App() {
  const { currentChurchId } = useAuth(); // or however you get current church
  
  return (
    <Box>
      {currentChurchId && (
        <OcrSetupNotificationBanner churchId={currentChurchId} />
      )}
      {/* rest of your app */}
    </Box>
  );
}
```

## Notification Badge Count

To show a badge count in your notification bell:

```tsx
const [ocrSetupCount, setOcrSetupCount] = useState(0);

useEffect(() => {
  async function checkAllChurches() {
    const churches = getUserChurches();
    const notifications = await getOcrSetupNotificationsForChurches(churches);
    setOcrSetupCount(notifications.length);
  }
  checkAllChurches();
}, []);

// Then in your badge:
<Badge badgeContent={totalNotifications + ocrSetupCount}>
  <NotificationsIcon />
</Badge>
```

## Auto-dismiss When Complete

The notification should automatically disappear when setup is complete:

```tsx
useEffect(() => {
  const interval = setInterval(async () => {
    const notif = await getOcrSetupNotification(churchId);
    if (!notif) {
      // Setup is complete, remove notification
      setNotification(null);
    }
  }, 30000); // Check every 30 seconds
  
  return () => clearInterval(interval);
}, [churchId]);
```
