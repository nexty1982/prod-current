/**
 * OCR Setup Notifications Service
 * 
 * Provides helper functions to check OCR setup status and generate notifications
 * for incomplete setups.
 */

export interface OcrSetupNotification {
  id: string;
  type: 'info' | 'warning';
  title: string;
  message: string;
  link: string;
  timestamp: Date;
  churchId: number;
}

/**
 * Check if OCR setup is complete for a church
 */
export async function checkOcrSetupComplete(churchId: number): Promise<boolean> {
  try {
    const response = await fetch(`/api/church/${churchId}/ocr/setup-state`);
    if (response.ok) {
      const data = await response.json();
      return data.isComplete === true;
    }
  } catch (err) {
    console.error(`Failed to check OCR setup for church ${churchId}:`, err);
  }
  return false;
}

/**
 * Get OCR setup notification if setup is incomplete
 */
export async function getOcrSetupNotification(churchId: number): Promise<OcrSetupNotification | null> {
  try {
    const response = await fetch(`/api/church/${churchId}/ocr/setup-state`);
    if (response.ok) {
      const data = await response.json();
      if (!data.isComplete) {
        return {
          id: `ocr-setup-incomplete-${churchId}`,
          type: 'info',
          title: 'OCR Setup Incomplete',
          message: `Complete OCR setup for church ${churchId} to enable Enhanced OCR Uploader`,
          link: `/devel/ocr-setup-wizard?church_id=${churchId}`,
          timestamp: new Date(data.updatedAt || Date.now()),
          churchId
        };
      }
    }
  } catch (err) {
    console.error(`Failed to get OCR setup notification for church ${churchId}:`, err);
  }
  return null;
}

/**
 * Get OCR setup notifications for multiple churches
 */
export async function getOcrSetupNotificationsForChurches(
  churchIds: number[]
): Promise<OcrSetupNotification[]> {
  const notifications: OcrSetupNotification[] = [];
  
  await Promise.all(
    churchIds.map(async (churchId) => {
      const notification = await getOcrSetupNotification(churchId);
      if (notification) {
        notifications.push(notification);
      }
    })
  );
  
  return notifications;
}
