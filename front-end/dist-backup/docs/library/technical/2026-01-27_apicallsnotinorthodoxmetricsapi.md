# Backend API Calls NOT Using orthodox-metrics.api.ts

## 🔍 Overview
This document lists all backend API calls that bypass the centralized `orthodox-metrics.api.ts` client. These calls use direct `fetch()`, `axios`, or other HTTP methods.

## 📊 Summary
- **Total Direct Fetch Calls**: 50+ 
- **Total Axios Calls**: 40+
- **Files with Direct API Calls**: 25+

---

## 🚨 **CRITICAL ISSUES FOUND**

### 1. **Authentication Issues**
- **SmartRedirect.tsx**: Uses direct fetch to `/api/auth/check` ✅ (Recently fixed)
- **AuthContext.tsx**: May have direct auth calls

### 2. **Inconsistent Error Handling**
- Some use `fetch()` with manual error handling
- Others use `axios` with different interceptors
- No standardized error response format

### 3. **Duplicate API Endpoints**
- Same endpoints called from multiple places
- No centralized API versioning
- Potential for inconsistent behavior

---

## 📁 **FRONTEND DIRECT FETCH CALLS**

### **Authentication & User Management**
```typescript
// utils/logger.ts
fetch('/api/logs/frontend', { ... })

// services/accountService.ts  
fetch(`${this.baseUrl}/profile`, { ... })
fetch(`${this.baseUrl}/change-password`, { ... })
fetch('/api/languages', { ... })
```

### **Admin & System Management**
```typescript
// views/settings/ServiceManagement.tsx
fetch('/api/admin/services/status')
fetch('/api/admin/services/health')
fetch('/api/admin/services/actions/recent')
fetch(`/api/admin/services/${serviceName}/${action}`, { ... })
fetch('/api/admin/services/backend/logs?lines=50')
fetch('/api/admin/services/frontend/rebuild', { ... })
fetch(`/api/admin/services/${serviceName}/logs?lines=100`)

// views/admin/OrthodoxMetricsAdmin.tsx
fetch('/api/clients')
fetch(`/api/clients/${clientId}/stats`)
fetch(`/api/clients/${clientId}/test-connection`)
fetch('/api/metrics/orthodox')
fetch('/api/admin/system/system-stats')
fetch('/api/admin/system/database-health')
fetch('/api/admin/system/server-metrics')
fetch('/api/admin/system/backups')
```

### **Church Management**
```typescript
// views/apps/church-management/ChurchForm.tsx
fetch(`/api/admin/churches/${churchId}/users`, { ... })
fetch(`/api/admin/churches/${churchId}/record-counts`, { ... })
fetch(`/api/admin/churches/${churchId}/database-info`, { ... })
fetch(`/api/admin/churches/${churchId}/test-connection`, { ... })
fetch(`/api/admin/churches/${id}/users/${user.id}/${action}`, { ... })
fetch(`/api/admin/churches/${id}/users/${user.id}/reset-password`, { ... })
fetch('/api/admin/churches?preferred_language=en', { ... })

// views/apps/church-management/ChurchSetupWizard.tsx
fetch('/api/admin/churches?preferred_language=en', { ... })
fetch(`/api/admin/churches/${church.id}/tables`, { ... })
fetch('/api/admin/churches/wizard', { ... })

// views/admin/ChurchAdminList.tsx
fetch('/api/admin/churches', { ... })

// views/admin/ChurchAdminPanelWorking.tsx
fetch(`/api/admin/church/${churchId}/overview`, { ... })
```

### **Records Management**
```typescript
// views/records/ChurchRecordsPage.tsx
fetch('/api/admin/churches?is_active=1', { ... })
fetch('/api/user/church', { ... })
fetch(`/api/admin/church-database/${churchDbId}/record-counts`, { ... })

// views/records/BaptismRecordsPage.tsx
fetch(`/api/${selectedType.apiEndpoint}-records?limit=1000&search=${encodeURIComponent(searchTerm)}`)
fetch(`/api/${selectedType.apiEndpoint}-records/dropdown-options/clergy?table=${tableName}`)

// views/records/SSPPOCRecordsPage.tsx
fetch(`/api/${selectedType.apiEndpoint}-records?limit=1000&search=${encodeURIComponent(searchTerm)}`)
fetch(`/api/${selectedType.apiEndpoint}-records/dropdown-options/clergy?table=${tableName}`)
```

### **Settings & Configuration**
```typescript
// views/settings/ContentSettings.tsx
fetch('/api/admin/global-images')
fetch('/api/admin/global-images/upload', { ... })
fetch(`/api/admin/global-images/${image.id}?${params}`, { ... })

// views/settings/BackupSettings.tsx
fetch('/api/backup/settings', { ... })
fetch('/api/backup/files', { ... })
fetch('/api/backup/storage', { ... })
fetch('/api/backup/run', { ... })
fetch(`/api/backup/download/${backupId}`, { ... })
fetch(`/api/backup/delete/${backupId}`, { ... })

// views/settings/ImageGridExtractor.tsx
fetch('/api/admin/global-images/save-extracted', { ... })
```

### **Menu & Permissions**
```typescript
// views/admin/MenuManagement.tsx
fetch('/api/menu-management/permissions', { ... })

// views/admin/MenuPermissions.tsx
fetch('/api/menu-permissions', { ... })
fetch(`/api/menu-permissions/${menuId}`, { ... })
fetch('/api/menu-permissions/menu-item', { ... })
```

### **OCR & File Processing**
```typescript
// views/apps/ocr/OCRUpload.tsx
fetch(`/api/test-ocr`, { ... })
fetch('/api/email/send-ocr-results', { ... })

// views/apps/ocr/PublicOCRUpload.tsx
fetch('/api/public/ocr/process', { ... })
```

### **Logging & Monitoring**
```typescript
// views/apps/logs/Logs.tsx
fetch('/api/logs/components', { ... })
fetch(`/api/logs?${params}`, { ... })
fetch(`/api/logs/components/${component}/level`, { ... })
fetch(`/api/logs/components/${component}/toggle`, { ... })
fetch('/api/logs', { ... })
fetch('/api/logs/test', { ... })
```

---

## 📁 **FRONTEND AXIOS CALLS**

### **Social Features**
```typescript
// views/social/chat/SocialChat.tsx
axios.get('/api/social/chat/conversations')
axios.get(`/api/social/chat/conversations/${selectedConversation.id}/messages`)
axios.get(`/api/social/chat/conversations/${conversationId}`)
axios.put(`/api/social/chat/conversations/${selectedConversation.id}/read`)
axios.post(`/api/social/chat/conversations/${selectedConversation.id}/messages`, { ... })
axios.put(`/api/social/chat/messages/${messageId}`, { ... })
axios.delete(`/api/social/chat/messages/${messageId}`)
axios.post(`/api/social/chat/messages/${messageId}/react`, { ... })

// views/social/friends/FriendsList.tsx
axios.get('/api/social/friends')
axios.get('/api/social/friends/requests')
axios.get(`/api/social/friends/search?q=${encodeURIComponent(searchQuery)}`)
axios.post(`/api/social/friends/request/${userId}`)
axios.put(`/api/social/friends/requests/${requestId}`, { action })
axios.delete(`/api/social/friends/${friendId}`)
axios.post(`/api/social/chat/start/${friendId}`)

// views/social/notifications/NotificationCenter.tsx
axios.get(`/api/social/notifications?${params}`)
axios.get('/api/social/notifications/settings')
axios.put(`/api/social/notifications/${notificationId}/read`)
axios.put('/api/social/notifications/mark-all-read')
axios.delete(`/api/social/notifications/${notificationId}`)
axios.put('/api/social/notifications/settings', newSettings)

// views/social/blog/
axios.post('/api/social/blog/posts', formData)
axios.get(`/api/social/blog/posts?${params}`)
axios.post(`/api/social/blog/posts/${postId}/like`)
axios.get(`/api/social/blog/posts/${id}`)
axios.put(`/api/social/blog/posts/${id}`, formData)
axios.delete(`/api/social/blog/posts/${id}`)
```

### **Calendar & CMS**
```typescript
// views/orthodox-calendar/OrthodoxCalendar.jsx
axios.get('/api/liturgical-calendar/today')
axios.get(`/api/liturgical-calendar/month/${year}/${month}`)
axios.get(`/api/liturgical-calendar/date/${dateStr}`)

// views/apps/cms/
axios.post('/api/uploads/image', formData, { ... })
axios.get(`/api/pages/${slug}`)
axios.put(`/api/pages/${pageData.slug}`, dataToSave)
axios.get('/api/uploads/list')
```

### **Services**
```typescript
// services/aiService.ts
axios.get(`${this.baseURL}/api/content/generate`)
axios.get(`${this.baseURL}/api/translation/translate`)
axios.get(`${this.baseURL}/api/ocr/process`)
axios.get(`${this.baseURL}/api/analytics/insights`)
axios.get(`${this.baseURL}/health`)

// services/adminService.ts
axios.get<SystemInfoResponse>(`${API_BASE_URL}/admin/system/system-info`)

// services/autoLearningAPI.ts
axios.get(`${API_BASE}/health`)
axios.get(`${API_BASE}/status`)
axios.post(`${API_BASE}/start`, config)
axios.post(`${API_BASE}/stop`)
axios.get(`${API_BASE}/progress`)
axios.get(`${API_BASE}/rules`)
axios.get(`${API_BASE}/results?format=${format}`)
axios.post(`${API_BASE}/reset`)

// services/churchService.ts
axios.get('/api/churches')
axios.get<ApiResponse<Church>>(`/api/churches/${churchId}`)

// services/recordService.ts
axios.get<ApiResponse<PaginatedResponse<ChurchRecord>>>(url)
axios.get<ApiResponse<ChurchRecord>>(`${API_BASE}/${recordType}/${id}`)
axios.post<ApiResponse<{ id: string; recordType: string; message: string }>>(...)
axios.put<ApiResponse<{ id: string; recordType: string; message: string; version: number }>>(...)
axios.delete<ApiResponse<{ id: string; recordType: string; message: string }>>(...)
axios.post<ApiResponse<ValidationResult>>(...)
axios.get<ApiResponse<AuditLogEntry[]>>(...)

// services/templateService.ts
axios.get(`${this.baseURL}?${params}`)
axios.get(`${this.baseURL}/type/${recordType}?${params}`)
axios.get(url)
axios.get(`${this.baseURL}/church/${churchId}`)
axios.get(`${this.baseURL}/global/available`)
axios.post(`${this.baseURL}/duplicate`, { ... })
axios.post(`${this.baseURL}/generate`, { ... })
axios.get(`${this.baseURL}/${templateName}`)
axios.put(`${this.baseURL}/${templateName}`, { ... })
axios.post(`${this.baseURL}/sync`, { ... })
axios.post(`${this.baseURL}/analyze/${filename}`, { ... })
axios.get(`${this.baseURL}/predefined/definitions`)
axios.post(`${this.baseURL}/predefined/initialize`, { ... })
```

---

## 📁 **SERVER-SIDE API CALLS**

### **Testing & Debug Scripts**
```javascript
// server/testing/
axios.get(`${BASE_URL}/api/health`)
axios.post(`${SERVER_URL}/api/churches/create`, sampleChurch, { ... })
axios.get(`${BASE_URL}/api/records/sample/${recordType}`)
axios.get(`${BASE_URL}/api/churches`)
axios.post(`${BASE_URL}/api/records/import`, importRequest)
axios.get(url, { timeout: 10000 })
```

### **Scrapers & Monitoring**
```javascript
// server/scrapers/
axios.get(source.url, { ... })
axios.get(website, { ... })
axios.get(url, { ... })

// server/services/
fetch(`/api/church/${churchId}/${recordType}-records`, { ... })
```

---

## 🚨 **RECOMMENDATIONS**

### **Immediate Actions**
1. **Consolidate Authentication Calls** ✅ (SmartRedirect fixed)
2. **Standardize Error Handling** - Use orthodox-metrics.api.ts pattern
3. **Add API Versioning** - Implement `/api/v1/` structure

### **Medium Term**
1. **Migrate All Direct Calls** to orthodox-metrics.api.ts
2. **Implement Request/Response Interceptors** for consistent handling
3. **Add API Documentation** for all endpoints

### **Long Term**
1. **Create API Gateway** for centralized routing
2. **Implement Rate Limiting** and caching
3. **Add API Analytics** and monitoring

---

## 📋 **MIGRATION PRIORITY**

### **High Priority** (Security/Auth Related)
- [x] SmartRedirect.tsx ✅ (Fixed)
- [ ] AuthContext.tsx
- [ ] accountService.ts

### **Medium Priority** (Core Functionality)
- [ ] churchService.ts
- [ ] recordService.ts
- [ ] adminService.ts

### **Low Priority** (Features)
- [ ] Social features (chat, friends, notifications)
- [ ] CMS features
- [ ] Template services

---

*Last Updated: $(date)*
*Total Direct API Calls Found: 90+* 