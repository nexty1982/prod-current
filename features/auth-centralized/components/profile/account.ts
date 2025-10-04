// Account settings API helpers
export interface ProfileData {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  role: string;
  avatarUrl: string;
  bannerUrl: string;
  bio: string;
  website: string;
  location: string;
}

export interface NotificationPrefs {
  marketing_email: boolean;
  product_updates: boolean;
  security_alerts: boolean;
  weekly_digest: boolean;
}

export interface BillingSummary {
  subscriptions: any[];
  invoices: any[];
  paymentMethods: any[];
  billing_status: 'paid_in_full' | 'payment_plan' | 'overdue' | 'suspended';
  account_balance: number;
  last_payment_date: string | null;
  next_payment_due: string | null;
}

// Profile management
export async function getProfile(userId: number = 1): Promise<ProfileData | null> {
  try {
    const response = await fetch(`/api/account/profile?user_id=${userId}`);
    const data = await response.json();
    return data.ok ? data.profile : null;
  } catch (error) {
    console.error('Error fetching profile:', error);
    return null;
  }
}

export async function updateProfile(userId: number = 1, profileData: Partial<ProfileData>): Promise<boolean> {
  try {
    const response = await fetch('/api/account/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...profileData, user_id: userId })
    });
    const data = await response.json();
    return data.ok;
  } catch (error) {
    console.error('Error updating profile:', error);
    return false;
  }
}

export async function uploadAvatar(userId: number = 1, file: File): Promise<string | null> {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('user_id', userId.toString());

    const response = await fetch('/api/account/profile/avatar', {
      method: 'POST',
      body: formData
    });
    const data = await response.json();
    return data.ok ? data.url : null;
  } catch (error) {
    console.error('Error uploading avatar:', error);
    return null;
  }
}

export async function setAvatarFromLibrary(userId: number = 1, url: string): Promise<boolean> {
  try {
    const response = await fetch('/api/account/profile/avatar/library', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, user_id: userId })
    });
    const data = await response.json();
    return data.ok;
  } catch (error) {
    console.error('Error setting avatar from library:', error);
    return false;
  }
}

export async function setBannerFromLibrary(userId: number = 1, url: string): Promise<boolean> {
  try {
    const response = await fetch('/api/account/profile/banner/library', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, user_id: userId })
    });
    const data = await response.json();
    return data.ok;
  } catch (error) {
    console.error('Error setting banner from library:', error);
    return false;
  }
}

// Security
export async function changePassword(userId: number = 1, currentPassword: string, newPassword: string): Promise<boolean> {
  try {
    const response = await fetch('/api/account/security/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword, user_id: userId })
    });
    const data = await response.json();
    return data.ok;
  } catch (error) {
    console.error('Error changing password:', error);
    return false;
  }
}

// Notifications
export async function getNotifications(userId: number = 1): Promise<NotificationPrefs | null> {
  try {
    const response = await fetch(`/api/account/notifications?user_id=${userId}`);
    const data = await response.json();
    return data.ok ? data.prefs : null;
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return null;
  }
}

export async function saveNotifications(userId: number = 1, prefs: NotificationPrefs): Promise<boolean> {
  try {
    const response = await fetch('/api/account/notifications', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...prefs, user_id: userId })
    });
    const data = await response.json();
    return data.ok;
  } catch (error) {
    console.error('Error saving notifications:', error);
    return false;
  }
}

// Billing
export async function getBillingSummary(userId: number = 1): Promise<BillingSummary | null> {
  try {
    const response = await fetch(`/api/account/billing/summary?user_id=${userId}`);
    const data = await response.json();
    return data.ok ? data : null;
  } catch (error) {
    console.error('Error fetching billing summary:', error);
    return null;
  }
}
