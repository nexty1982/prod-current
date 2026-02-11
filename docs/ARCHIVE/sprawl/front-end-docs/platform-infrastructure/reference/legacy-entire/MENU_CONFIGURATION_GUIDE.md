# 🎛️ Menu Configuration System - Super Admin Guide

## Overview
The Menu Configuration System allows super administrators to control which menu items are visible to different user roles in the Orthodox Metrics application. This provides granular control over the user interface based on roles and permissions.

---

## ✨ Features

### 1. **Role-Based Menu Visibility**
- Configure which menu items each role can see
- Support for multiple user roles (Super Admin, Admin, Manager, Priest, Deacon, User, Viewer)
- Protect system-required menu items from being disabled

### 2. **Dual View Modes**
- **Role View**: Configure all menu items for a specific role
- **Menu View**: See and configure all roles for each menu item in a grid

### 3. **Bulk Operations**
- Enable/disable all menu items for a role at once
- Bulk update permissions across multiple roles
- Export and import menu configurations

### 4. **Real-Time Search & Filter**
- Search menu items by title, key, or description
- Toggle visibility of system-required items
- Hierarchical menu structure with expand/collapse

### 5. **Change Tracking**
- Visual indication of unsaved changes
- Reset functionality to discard changes
- Save confirmation with success/error notifications

---

## 🚀 Accessing Menu Configuration

### For Super Admins Only
1. Log in with super admin credentials
2. Navigate to: **Admin OMAI Studio** → **🎛️ Menu Configuration**
3. Or directly access: `/admin/menu-configuration`

---

## 📋 How to Use

### Role-Based Configuration (Recommended)

1. **Select View Mode**
   - Click on "View by Role" tab
   
2. **Choose a Role**
   - Select the role you want to configure from the dropdown
   - Roles include: Super Admin, Admin, Manager, Priest, Deacon, User, Viewer

3. **Configure Menu Items**
   - Toggle switches to show/hide menu items for the selected role
   - Hierarchical items can be expanded/collapsed
   - System-required items are marked and cannot be disabled

4. **Bulk Actions**
   - Use "Enable All" to show all menu items for the role
   - Use "Disable All" to hide all non-required menu items

5. **Save Changes**
   - Click "Save Changes" button when configuration is complete
   - Changes are tracked and indicated in the status panel

### Menu-Based Configuration

1. **Select View Mode**
   - Click on "View by Menu" tab

2. **View Grid**
   - Each row represents a menu item
   - Each column represents a user role
   - Check/uncheck boxes to control visibility

3. **Configure Across Roles**
   - Quickly see which roles have access to each menu item
   - Configure multiple roles for a single menu item at once

---

## 🎯 Available Roles

| Role | Icon | Description | Typical Access Level |
|------|------|-------------|---------------------|
| **Super Admin** | 👑 | Full system access | Everything |
| **Admin** | 🛡️ | Administrative functions | Most features except system config |
| **Manager** | 📊 | Church management | Operational features |
| **Priest** | ⛪ | Clergy functions | Church records, calendar, members |
| **Deacon** | ✝️ | Assistant clergy | Limited church functions |
| **User** | 👤 | Regular user | Basic features |
| **Viewer** | 👁️ | Read-only access | Minimal features |

---

## 🔧 Technical Implementation

### Frontend Components

#### 1. **MenuConfiguration Component**
- Location: `front-end/src/components/admin/MenuConfiguration.tsx`
- Features:
  - Dual view modes (Role/Menu)
  - Real-time search
  - Change tracking
  - Bulk operations
  - Responsive design

#### 2. **Menu Permission Service**
- Location: `front-end/src/services/menuPermissionService.ts`
- API Methods:
  - `getAllMenuItems()` - Fetch all menu items
  - `getRolePermissions()` - Get current permissions
  - `updateBulkPermissions()` - Save configuration
  - `exportConfiguration()` - Export settings
  - `importConfiguration()` - Import settings

### Backend API

#### Endpoints
- `GET /api/menu-permissions/items` - Get all menu items
- `GET /api/menu-permissions/permissions` - Get role permissions
- `POST /api/menu-permissions/bulk-update` - Update permissions
- `GET /api/menu-permissions/current-user` - Get user's menu
- `POST /api/menu-permissions/reset-defaults` - Reset to defaults

#### Database Schema

```sql
-- Menu items table
CREATE TABLE menu_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    menu_key VARCHAR(100) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    path VARCHAR(255),
    icon VARCHAR(100),
    parent_id INT NULL,
    display_order INT DEFAULT 0,
    is_system_required BOOLEAN DEFAULT FALSE,
    description TEXT
);

-- Role permissions table
CREATE TABLE role_menu_permissions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    role VARCHAR(50) NOT NULL,
    menu_item_id INT NOT NULL,
    is_visible BOOLEAN DEFAULT TRUE,
    UNIQUE KEY unique_role_menu (role, menu_item_id)
);
```

---

## 🎨 User Interface

### Status Panel
Displays real-time statistics:
- Total Menu Items
- User Roles
- Configured Items
- Configuration Status (Saved/Modified)

### Search & Filter
- Search by menu title, key, or description
- Toggle system-required items visibility
- Clear search with one click

### Visual Indicators
- 🔵 **Required Items**: Cannot be disabled (blue chip)
- ✅ **Enabled**: Menu item visible to role (switch on)
- ❌ **Disabled**: Menu item hidden from role (switch off)
- 🟡 **Modified**: Unsaved changes present (yellow status)

---

## 💡 Best Practices

### 1. **Start with Defaults**
- Use "Reset to Defaults" to start with recommended settings
- Customize from the baseline configuration

### 2. **Test Changes**
- After saving, log in with a test account for each role
- Verify the menu appears as expected

### 3. **Document Changes**
- Keep track of why certain items are hidden/shown
- Use the description field for menu items

### 4. **Regular Reviews**
- Periodically review menu permissions
- Adjust based on user feedback and needs

### 5. **Export Backups**
- Export configuration before major changes
- Keep backups of working configurations

---

## 🔒 Security Considerations

1. **Super Admin Only**
   - Only super administrators can access this feature
   - Protected by role-based authentication

2. **System Required Items**
   - Critical menu items cannot be disabled
   - Ensures users always have access to essential functions

3. **Audit Trail**
   - All changes are logged in the activity log
   - Track who made changes and when

4. **Database Transactions**
   - Bulk updates use transactions
   - Ensures data consistency

---

## 🐛 Troubleshooting

### Menu Changes Not Appearing
1. Ensure changes are saved (green "Saved" status)
2. User may need to refresh or re-login
3. Check browser console for errors

### Cannot Disable Certain Items
- Items marked as "Required" are system-critical
- These ensure basic functionality remains accessible

### Performance Issues
- Large menu structures may take time to load
- Use search to filter and improve performance

### Import/Export Issues
- Ensure export file format is not modified
- Check for version compatibility

---

## 📝 Example Configurations

### Minimal Viewer Access
```javascript
// Viewer role - minimal access
{
  'dashboard': true,
  'calendar': true,
  'profile': true,
  // All other items: false
}
```

### Church Staff Configuration
```javascript
// Priest role - church operations
{
  'dashboard': true,
  'records': true,
  'calendar': true,
  'members': true,
  'reports': true,
  // Administrative items: false
}
```

### Manager Setup
```javascript
// Manager role - operational access
{
  'dashboard': true,
  'records': true,
  'reports': true,
  'calendar': true,
  'invoices': true,
  // System settings: false
}
```

---

## 🚦 Implementation Status

✅ **Completed Features**:
- Menu configuration UI component
- Role-based permission management
- Backend API endpoints
- Database schema and migrations
- Frontend service integration
- Menu item in admin section

⏳ **Future Enhancements**:
- [ ] Per-user menu customization
- [ ] Menu item grouping and categories
- [ ] Conditional menu visibility based on church features
- [ ] Menu analytics and usage tracking
- [ ] Preset templates for common configurations
- [ ] Keyboard shortcuts for quick configuration

---

## 📞 Support

For issues or questions about menu configuration:
1. Check this documentation
2. Review the activity logs for errors
3. Contact system administrator
4. Submit a support ticket

---

*Last Updated: January 2025*
*Version: 1.0.0*
