# Admin Panel Features Documentation

## Overview

The Orthodox Metrics admin panel provides comprehensive management capabilities for users, churches, and system monitoring. This document outlines all admin features and their current implementation status.

## Admin Panel Access

### URL: `/admin` or `/api/admin`
### Required Role: `admin` or `super_admin`

## Features Overview

### ✅ Working Features
- User Management (List, Create, Edit, Delete)
- System Logs Viewing
- Debug Session Information

### ⚠️ Partially Working Features
- Church Management (backend working, frontend may have issues)
- Notifications (API endpoints working)

### ❌ Currently Not Working Features
- Password Change (session authentication issues)
- Notes Management (session authentication issues)

## User Management

### Location: `/admin/users`

#### Endpoints
```
GET    /admin/users              - List all users
POST   /admin/users              - Create new user  
PUT    /admin/users/:id          - Update user
DELETE /admin/users/:id          - Delete user
PUT    /admin/users/:id/toggle-status - Toggle active status
```

#### Features
- **List Users**: Display all users with role, church, and status information
- **Create User**: Generate new user accounts with temporary passwords
- **Edit User**: Modify user details, roles, and assignments
- **Delete User**: Remove user accounts (with role restrictions)
- **Toggle Status**: Activate/deactivate user accounts

#### Role-Based Permissions
- **Super Admin**: Can manage all users except other super admins
- **Admin**: Can manage regular users, cannot manage admin/super_admin users
- **Regular Users**: No access to user management

#### User Creation Process
1. Admin fills out user form (email, name, role, church assignment)
2. System generates temporary password
3. User account created in database
4. Optional: Welcome email sent to user (not implemented)
5. User must change password on first login

## Church Management

### Location: `/admin/churches`

#### Endpoints
```
GET    /admin/churches           - List all churches
POST   /admin/churches           - Create new church (super_admin only)
PUT    /admin/churches/:id       - Update church (super_admin only)
DELETE /admin/churches/:id       - Delete church (super_admin only)
```

#### Features
- **List Churches**: Display all churches with location and contact info
- **Create Church**: Add new church organizations
- **Edit Church**: Modify church details and settings
- **Delete Church**: Remove churches (only if no users assigned)

#### Church Information
- Name and contact details
- Address and location
- Website and social media
- Preferred language and timezone
- Currency settings
- Active/inactive status

#### Restrictions
- Only super_admins can create/edit/delete churches
- Cannot delete churches with assigned users
- Must reassign users before church deletion

## System Logs

### Location: `/admin/logs` or `/logs`

#### Endpoints
```
GET    /logs                     - View system logs
GET    /logs/download            - Download log files
```

#### Features
- **Log Viewer**: Real-time system log monitoring
- **Log Filtering**: Filter by component, level, date range
- **Log Download**: Export logs for analysis
- **Log Search**: Search through log entries

#### Log Types
- Authentication logs
- API request logs
- Database operation logs
- Error logs
- Email logs
- Upload logs
- OCR processing logs

## Notifications

### Location: `/admin/notifications` or `/notifications`

#### Endpoints
```
GET    /notifications/counts     - Get notification counts
GET    /notifications            - List notifications
POST   /notifications            - Create notification
PUT    /notifications/:id/read   - Mark as read
DELETE /notifications/:id        - Delete notification
```

#### Features
- **Notification Center**: Centralized notification management
- **Counts**: Real-time notification counters
- **Categories**: Different notification types (info, warning, error)
- **Read Status**: Track read/unread notifications
- **Auto-cleanup**: Automatic removal of old notifications

## Notes Management

### Location: `/admin/notes` or `/notes`

#### Endpoints
```
GET    /notes                    - List notes
POST   /notes                    - Create note
PUT    /notes/:id                - Update note
DELETE /notes/:id                - Delete note
```

#### Features
- **Note Creation**: Create administrative notes
- **Note Organization**: Categories and tags
- **Note Sharing**: Share notes between admin users
- **Note History**: Track note modifications

## Password Management

### Location: `/auth/change-password`

#### Endpoints
```
PUT    /auth/change-password     - Change user password
POST   /auth/admin-reset-password - Admin reset user password
```

#### Features
- **Self Password Change**: Users can change their own passwords
- **Admin Password Reset**: Admins can reset user passwords
- **Password Validation**: Enforce password complexity requirements
- **Password History**: Prevent password reuse (not implemented)

#### Password Requirements
- Minimum 8 characters
- Must contain uppercase and lowercase letters
- Must contain numbers
- Special characters recommended

## Debug Features

### Location: `/debug`

#### Endpoints
```
GET    /debug/session            - Session information
GET    /debug/database           - Database connectivity
GET    /debug/config             - System configuration
```

#### Features
- **Session Debug**: View current session state
- **Database Status**: Check database connectivity
- **Configuration Info**: System settings overview

## Current Issues & Status

### Authentication Problems
**Status**: 🔴 Critical Issue
**Description**: Session authentication not working properly
**Impact**: Users getting 401 errors on admin features
**Workaround**: Temporary authentication bypass active

### Session Management
**Status**: 🔴 Under Investigation  
**Description**: Session user data not persisting across requests
**Symptoms**: Session ID exists but user data is undefined
**Root Cause**: Unknown - investigating nginx proxy and session store

### Admin Feature Access
**Status**: 🟡 Partially Working
**Description**: Some admin features work, others fail
**Working**: User Management, Logs
**Not Working**: Password Change, Churches (inconsistent)

## Security Considerations

### Role-Based Access Control
- Strict role verification on all admin endpoints
- Super admin restrictions prevent privilege escalation
- Session-based authentication with proper expiration

### Data Protection
- Sensitive data (passwords) never logged
- User data access controlled by roles
- Audit trail for admin actions

### Session Security
- HTTPOnly cookies prevent XSS
- Secure session storage in MySQL
- Rolling session expiration on activity

## Planned Improvements

### Short Term
1. Fix session authentication issues
2. Remove temporary authentication bypasses
3. Implement proper error handling
4. Add comprehensive logging

### Medium Term
1. Implement email notifications for user creation
2. Add password history tracking
3. Enhance admin audit trail
4. Improve error messages and validation

### Long Term
1. Two-factor authentication for admin accounts
2. Advanced role management system
3. Bulk user operations
4. Admin dashboard with analytics
5. API rate limiting and security hardening

## Testing Guidelines

### Manual Testing Steps
1. Login as admin user
2. Navigate to admin panel
3. Test each feature systematically
4. Verify role-based restrictions
5. Check error handling

### Automated Testing (Planned)
- Unit tests for admin functions
- Integration tests for API endpoints  
- Security tests for authorization
- Performance tests for large data sets

## Support & Troubleshooting

### Common Issues
- **401 Errors**: Check session authentication
- **403 Errors**: Verify user role permissions
- **500 Errors**: Check backend logs and database connectivity

### Debug Steps
1. Check browser console for errors
2. Verify network requests in dev tools
3. Check backend logs for authentication issues
4. Verify database connectivity and session storage

### Log Locations
- Backend: `z:\server\logs\`
- Nginx: `/var/log/nginx/`
- Database: MySQL error logs
