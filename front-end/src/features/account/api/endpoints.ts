// API endpoints for account features
// Adjust these constants to match your backend implementation

export const API_BASE = "/api";

export const endpoints = {
  // User profile endpoints
  me: () => `${API_BASE}/profile/me`,
  profile: () => `${API_BASE}/profile`,
  avatar: () => `${API_BASE}/profile/avatar`,
  
  // Security endpoints  
  password: () => `${API_BASE}/auth/change-password`,
  mfa: () => `${API_BASE}/auth/mfa`,
  
  // Sessions endpoints
  sessions: () => `${API_BASE}/sessions`,
  revokeSession: (sessionId: string) => `${API_BASE}/sessions/${sessionId}`,
  
  // Notifications endpoints
  notifications: () => `${API_BASE}/profile/preferences`,
  testNotification: () => `${API_BASE}/profile/preferences/test`,
  
  // Privacy endpoints
  privacy: () => `${API_BASE}/profile/privacy`,
  dataExport: () => `${API_BASE}/profile/data-export`,
  deleteAccount: () => `${API_BASE}/profile/delete-account`,
  
  // Connections endpoints (OAuth providers)
  connections: () => `${API_BASE}/profile/connections`,
  disconnectConnection: (provider: string) => `${API_BASE}/profile/connections/${provider}`,
  connectProvider: (provider: string) => `${API_BASE}/auth/connect/${provider}`,
} as const;
