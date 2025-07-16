# Orthodox Metrics - Menu Items Integration Guide

## Table of Contents
1. [Overview](#overview)
2. [Authentication & Permissions](#authentication--permissions)
3. [Church Management](#church-management)
4. [Invoice Management](#invoice-management)
5. [Account Settings](#account-settings)
6. [Menu Settings (Super Admin Only)](#menu-settings-super-admin-only)
7. [Code Examples](#code-examples)
8. [Troubleshooting](#troubleshooting)

---

## Overview

This guide covers how to integrate frontend menu items with backend server routes in the Orthodox Metrics system. Each menu item corresponds to specific functionality with dedicated API endpoints, authentication requirements, and permission levels.

### System Architecture
- **Frontend**: React + TypeScript + Material-UI
- **Backend**: Node.js + Express + MySQL
- **Authentication**: Session-based with role-based access control
- **Database**: `orthodoxmetrics_db` MySQL database

---

## Authentication & Permissions

### User Roles Hierarchy
```typescript
type UserRole = 'super_admin' | 'admin' | 'manager' | 'user' | 'viewer' | 'priest' | 'deacon';
```

### Permission Levels
| Feature | super_admin | admin | manager | user | viewer | priest | deacon |
|---------|-------------|-------|---------|------|--------|--------|--------|
| Church Management | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| Invoice Management | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Account Settings | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Menu Settings | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| User Management | ✅ | ✅* | ❌ | ❌ | ❌ | ❌ | ❌ |

*\*Admins can manage users but cannot create other admins or super_admins*

---

## Church Management

### Frontend Components
- **Location**: `z:\front-end\src\views\apps\church-management\`
- **Main Component**: `ChurchManagement.tsx`
- **Route**: `/apps/church-management`

### Backend API Endpoints

#### Base URL: `/api/admin/churches`

```javascript
// Get all churches
GET /api/admin/churches
```

```javascript
// Get specific church
GET /api/admin/churches/:id
```

```javascript
// Create new church
POST /api/admin/churches
```

```javascript
// Update church
PUT /api/admin/churches/:id
```

```javascript
// Delete church
DELETE /api/admin/churches/:id
```

### Database Schema
```sql
CREATE TABLE churches (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    phone VARCHAR(50),
    email VARCHAR(255),
    website VARCHAR(255),
    pastor_name VARCHAR(255),
    denomination VARCHAR(100),
    established_date DATE,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### Frontend Integration Example

```typescript
// z:\front-end\src\services\churchService.ts
export class ChurchService {
    private static baseUrl = '/api/admin/churches';

    static async getAllChurches(): Promise<Church[]> {
        const response = await fetch(this.baseUrl, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch churches: ${response.status}`);
        }

        const data = await response.json();
        return data.churches;
    }

    static async createChurch(church: Partial<Church>): Promise<Church> {
        const response = await fetch(this.baseUrl, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(church),
        });

        if (!response.ok) {
            throw new Error(`Failed to create church: ${response.status}`);
        }

        const data = await response.json();
        return data.church;
    }

    static async updateChurch(id: number, updates: Partial<Church>): Promise<Church> {
        const response = await fetch(`${this.baseUrl}/${id}`, {
            method: 'PUT',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(updates),
        });

        if (!response.ok) {
            throw new Error(`Failed to update church: ${response.status}`);
        }

        const data = await response.json();
        return data.church;
    }

    static async deleteChurch(id: number): Promise<void> {
        const response = await fetch(`${this.baseUrl}/${id}`, {
            method: 'DELETE',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error(`Failed to delete church: ${response.status}`);
        }
    }
}
```

### React Component Example

```typescript
// z:\front-end\src\views\apps\church-management\ChurchManagement.tsx
import React, { useState, useEffect } from 'react';
import { Box, Button, Card, CardContent, Typography, DataGrid } from '@mui/material';
import { ChurchService } from '../../../services/churchService';
import { useAuth } from '../../../context/AuthContext';

const ChurchManagement: React.FC = () => {
    const [churches, setChurches] = useState<Church[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { user, hasRole } = useAuth();

    // Check permissions
    if (!hasRole(['super_admin', 'admin', 'manager', 'priest'])) {
        return (
            <Box p={3}>
                <Typography color="error">
                    You do not have permission to access church management.
                </Typography>
            </Box>
        );
    }

    useEffect(() => {
        loadChurches();
    }, []);

    const loadChurches = async () => {
        try {
            setLoading(true);
            const churchData = await ChurchService.getAllChurches();
            setChurches(churchData);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateChurch = async (churchData: Partial<Church>) => {
        try {
            const newChurch = await ChurchService.createChurch(churchData);
            setChurches(prev => [...prev, newChurch]);
        } catch (err: any) {
            setError(err.message);
        }
    };

    return (
        <Box p={3}>
            <Typography variant="h4" gutterBottom>
                Church Management
            </Typography>
            
            {error && (
                <Typography color="error" gutterBottom>
                    {error}
                </Typography>
            )}

            <Card>
                <CardContent>
                    {/* Church listing and management UI */}
                    <DataGrid
                        rows={churches}
                        columns={[
                            { field: 'name', headerName: 'Church Name', width: 200 },
                            { field: 'pastor_name', headerName: 'Pastor', width: 150 },
                            { field: 'denomination', headerName: 'Denomination', width: 150 },
                            { field: 'status', headerName: 'Status', width: 100 },
                        ]}
                        loading={loading}
                        autoHeight
                    />
                </CardContent>
            </Card>
        </Box>
    );
};

export default ChurchManagement;
```

---

## Invoice Management

### Frontend Components
- **Location**: `z:\front-end\src\views\apps\invoice\`
- **Main Component**: `Invoice.tsx`
- **Route**: `/apps/invoice`

### Backend API Endpoints

#### Base URL: `/api/invoices`

```javascript
// Get all invoices
GET /api/invoices
```

```javascript
// Get specific invoice
GET /api/invoices/:id
```

```javascript
// Create new invoice
POST /api/invoices
```

```javascript
// Update invoice
PUT /api/invoices/:id
```

```javascript
// Delete invoice
DELETE /api/invoices/:id
```

```javascript
// Generate invoice PDF
GET /api/invoices/:id/pdf
```

### Database Schema
```sql
CREATE TABLE invoices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    church_id INT,
    client_name VARCHAR(255) NOT NULL,
    client_email VARCHAR(255),
    client_address TEXT,
    issue_date DATE NOT NULL,
    due_date DATE NOT NULL,
    status ENUM('draft', 'sent', 'paid', 'overdue', 'cancelled') DEFAULT 'draft',
    subtotal DECIMAL(10,2) DEFAULT 0.00,
    tax_amount DECIMAL(10,2) DEFAULT 0.00,
    total_amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    notes TEXT,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (church_id) REFERENCES churches(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE invoice_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    invoice_id INT NOT NULL,
    description TEXT NOT NULL,
    quantity DECIMAL(10,2) NOT NULL DEFAULT 1.00,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
);
```

### Backend Route Example

```javascript
// z:\server\routes\invoices.js
const express = require('express');
const { promisePool } = require('../config/db');
const router = express.Router();

// Middleware to check if user can manage invoices
const requireInvoicePermission = (req, res, next) => {
    if (!req.session.user) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required'
        });
    }

    const userRole = req.session.user.role;
    const allowedRoles = ['super_admin', 'admin', 'manager'];
    
    if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({
            success: false,
            message: 'Insufficient permissions for invoice management'
        });
    }

    next();
};

// GET /api/invoices - Get all invoices
router.get('/', requireInvoicePermission, async (req, res) => {
    try {
        const { status, church_id, limit = 50, offset = 0 } = req.query;
        
        let query = `
            SELECT 
                i.*,
                c.name as church_name,
                u.name as created_by_name
            FROM invoices i
            LEFT JOIN churches c ON i.church_id = c.id
            JOIN users u ON i.created_by = u.id
            WHERE 1=1
        `;
        
        const params = [];
        
        if (status) {
            query += ` AND i.status = ?`;
            params.push(status);
        }
        
        if (church_id) {
            query += ` AND i.church_id = ?`;
            params.push(church_id);
        }
        
        query += ` ORDER BY i.created_at DESC LIMIT ? OFFSET ?`;
        params.push(parseInt(limit), parseInt(offset));
        
        const [invoices] = await promisePool.query(query, params);
        
        res.json({
            success: true,
            invoices,
            total: invoices.length
        });
    } catch (err) {
        console.error('Error fetching invoices:', err);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching invoices'
        });
    }
});

// POST /api/invoices - Create new invoice
router.post('/', requireInvoicePermission, async (req, res) => {
    try {
        const {
            church_id,
            client_name,
            client_email,
            client_address,
            issue_date,
            due_date,
            items,
            notes
        } = req.body;
        
        const userId = req.session.user.id;
        
        // Validation
        if (!client_name || !issue_date || !due_date || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Client name, dates, and items are required'
            });
        }
        
        // Calculate totals
        let subtotal = 0;
        items.forEach(item => {
            if (!item.description || !item.quantity || !item.unit_price) {
                throw new Error('Invalid item data');
            }
            item.total_price = item.quantity * item.unit_price;
            subtotal += item.total_price;
        });
        
        const tax_amount = subtotal * 0.08; // 8% tax
        const total_amount = subtotal + tax_amount;
        
        // Generate invoice number
        const invoice_number = `INV-${Date.now()}`;
        
        // Start transaction
        await promisePool.query('START TRANSACTION');
        
        try {
            // Insert invoice
            const [invoiceResult] = await promisePool.query(
                `INSERT INTO invoices (
                    invoice_number, church_id, client_name, client_email, client_address,
                    issue_date, due_date, subtotal, tax_amount, total_amount, notes, created_by
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    invoice_number, church_id, client_name, client_email, client_address,
                    issue_date, due_date, subtotal, tax_amount, total_amount, notes, userId
                ]
            );
            
            const invoiceId = invoiceResult.insertId;
            
            // Insert invoice items
            for (const item of items) {
                await promisePool.query(
                    `INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, total_price)
                     VALUES (?, ?, ?, ?, ?)`,
                    [invoiceId, item.description, item.quantity, item.unit_price, item.total_price]
                );
            }
            
            await promisePool.query('COMMIT');
            
            // Fetch the created invoice
            const [newInvoice] = await promisePool.query(
                `SELECT i.*, c.name as church_name, u.name as created_by_name
                 FROM invoices i
                 LEFT JOIN churches c ON i.church_id = c.id
                 JOIN users u ON i.created_by = u.id
                 WHERE i.id = ?`,
                [invoiceId]
            );
            
            res.status(201).json({
                success: true,
                message: 'Invoice created successfully',
                invoice: newInvoice[0]
            });
        } catch (transactionErr) {
            await promisePool.query('ROLLBACK');
            throw transactionErr;
        }
    } catch (err) {
        console.error('Error creating invoice:', err);
        res.status(500).json({
            success: false,
            message: 'Server error while creating invoice'
        });
    }
});

module.exports = router;
```

---

## Account Settings

### Frontend Components
- **Location**: `z:\front-end\src\views\pages\account-setting\`
- **Main Component**: `AccountSetting.tsx`
- **Route**: `/pages/account-setting`

### Backend API Endpoints

#### Base URL: `/api/auth/profile`

```javascript
// Get current user profile
GET /api/auth/profile
```

```javascript
// Update user profile
PUT /api/auth/profile
```

```javascript
// Change password
PUT /api/auth/change-password
```

```javascript
// Upload profile image
POST /api/auth/profile/avatar
```

### Frontend Service Example

```typescript
// z:\front-end\src\services\accountService.ts
export class AccountService {
    private static baseUrl = '/api/auth';

    static async getProfile(): Promise<UserProfile> {
        const response = await fetch(`${this.baseUrl}/profile`, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch profile: ${response.status}`);
        }

        const data = await response.json();
        return data.user;
    }

    static async updateProfile(updates: Partial<UserProfile>): Promise<UserProfile> {
        const response = await fetch(`${this.baseUrl}/profile`, {
            method: 'PUT',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(updates),
        });

        if (!response.ok) {
            throw new Error(`Failed to update profile: ${response.status}`);
        }

        const data = await response.json();
        return data.user;
    }

    static async changePassword(currentPassword: string, newPassword: string): Promise<void> {
        const response = await fetch(`${this.baseUrl}/change-password`, {
            method: 'PUT',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                currentPassword,
                newPassword,
            }),
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.message || 'Failed to change password');
        }
    }
}
```

### React Component Example

```typescript
// z:\front-end\src\views\pages\account-setting\AccountSetting.tsx
import React, { useState, useEffect } from 'react';
import {
    Box,
    Card,
    CardContent,
    TextField,
    Button,
    Typography,
    Alert,
    Tabs,
    Tab,
    Grid
} from '@mui/material';
import { AccountService } from '../../../services/accountService';
import { useAuth } from '../../../context/AuthContext';

const AccountSetting: React.FC = () => {
    const [activeTab, setActiveTab] = useState(0);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const { user, refreshAuth } = useAuth();

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        try {
            setLoading(true);
            const profileData = await AccountService.getProfile();
            setProfile(profileData);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleProfileUpdate = async (formData: Partial<UserProfile>) => {
        try {
            setLoading(true);
            setError(null);
            
            const updatedProfile = await AccountService.updateProfile(formData);
            setProfile(updatedProfile);
            setSuccess('Profile updated successfully!');
            
            // Refresh auth context
            await refreshAuth();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordChange = async (currentPassword: string, newPassword: string) => {
        try {
            setLoading(true);
            setError(null);
            
            await AccountService.changePassword(currentPassword, newPassword);
            setSuccess('Password changed successfully!');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box p={3}>
            <Typography variant="h4" gutterBottom>
                Account Settings
            </Typography>

            {success && (
                <Alert severity="success" sx={{ mb: 2 }}>
                    {success}
                </Alert>
            )}

            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            <Card>
                <CardContent>
                    <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
                        <Tab label="Profile" />
                        <Tab label="Security" />
                        <Tab label="Preferences" />
                    </Tabs>

                    {activeTab === 0 && (
                        <ProfileTab
                            profile={profile}
                            onUpdate={handleProfileUpdate}
                            loading={loading}
                        />
                    )}

                    {activeTab === 1 && (
                        <SecurityTab
                            onPasswordChange={handlePasswordChange}
                            loading={loading}
                        />
                    )}

                    {activeTab === 2 && (
                        <PreferencesTab
                            profile={profile}
                            onUpdate={handleProfileUpdate}
                            loading={loading}
                        />
                    )}
                </CardContent>
            </Card>
        </Box>
    );
};

export default AccountSetting;
```

---

## Menu Settings (Super Admin Only)

### 403 Error Resolution

The 403 error on Menu Settings occurs because this feature is restricted to **super_admin** role only. Here's how to resolve it:

#### Check Current User Role
```bash
# Use the debug endpoint to check your current role
curl -X GET http://localhost:3001/api/debug/session --cookie-jar cookies.txt --cookie cookies.txt
```

#### Create Super Admin User (if needed)
```sql
-- Connect to database and update your user role
UPDATE users SET role = 'super_admin' WHERE email = 'your-email@example.com';
```

### Frontend Components
- **Location**: `z:\front-end\src\views\admin\MenuManagement.tsx`
- **Route**: `/admin/menu`
- **Permission**: **super_admin ONLY**

### Backend API Endpoints

#### Base URL: `/api/menu-management`

```javascript
// Get all menu permissions (super admin only)
GET /api/menu-management/permissions
```

```javascript
// Update menu permissions (super admin only)  
PUT /api/menu-management/permissions
```

```javascript
// Get menu items for specific role
GET /api/menu-management/for-role/:role
```

### Permission Middleware Example

```javascript
// z:\server\routes\menuManagement.js
const requireSuperAdmin = (req, res, next) => {
    if (!req.session.user) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required'
        });
    }

    const userRole = req.session.user.role;
    if (userRole !== 'super_admin') {
        return res.status(403).json({
            success: false,
            message: 'Super administrator privileges required'
        });
    }

    next();
};

// All menu management routes use this middleware
router.get('/permissions', requireSuperAdmin, async (req, res) => {
    // Only super_admin can access this
});
```

---

## Code Examples

### 1. Creating a New Menu Item Integration

#### Step 1: Create Frontend Service
```typescript
// z:\front-end\src\services\myFeatureService.ts
export class MyFeatureService {
    private static baseUrl = '/api/my-feature';

    static async getData(): Promise<any[]> {
        const response = await fetch(this.baseUrl, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch data: ${response.status}`);
        }

        const data = await response.json();
        return data.items;
    }
}
```

#### Step 2: Create Backend Route
```javascript
// z:\server\routes\myFeature.js
const express = require('express');
const { promisePool } = require('../config/db');
const router = express.Router();

// Authentication middleware
const requireAuth = (req, res, next) => {
    if (!req.session.user) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required'
        });
    }
    next();
};

// Role-based authorization middleware
const requireRole = (allowedRoles) => (req, res, next) => {
    const userRole = req.session.user.role;
    if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({
            success: false,
            message: 'Insufficient permissions'
        });
    }
    next();
};

// Routes
router.get('/', requireAuth, requireRole(['admin', 'manager']), async (req, res) => {
    try {
        const [items] = await promisePool.query('SELECT * FROM my_table');
        res.json({
            success: true,
            items
        });
    } catch (err) {
        console.error('Error:', err);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

module.exports = router;
```

#### Step 3: Register Route in Server
```javascript
// z:\server\index.js
const myFeatureRoutes = require('./routes/myFeature');

// Add to routes section
app.use('/api/my-feature', myFeatureRoutes);
```

#### Step 4: Create React Component
```typescript
// z:\front-end\src\views\apps\my-feature\MyFeature.tsx
import React, { useState, useEffect } from 'react';
import { MyFeatureService } from '../../../services/myFeatureService';
import { useAuth } from '../../../context/AuthContext';

const MyFeature: React.FC = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const { hasRole } = useAuth();

    if (!hasRole(['admin', 'manager'])) {
        return <div>Access denied</div>;
    }

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const items = await MyFeatureService.getData();
            setData(items);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            {/* Your component UI */}
        </div>
    );
};

export default MyFeature;
```

### 2. Error Handling Pattern

```typescript
// Standard error handling pattern for all services
export class BaseService {
    protected static async handleResponse<T>(response: Response): Promise<T> {
        if (!response.ok) {
            if (response.status === 401) {
                // Redirect to login
                window.location.href = '/auth/login';
                throw new Error('Authentication required');
            } else if (response.status === 403) {
                throw new Error('You do not have permission to perform this action');
            } else if (response.status >= 500) {
                throw new Error('Server error. Please try again later.');
            } else {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Request failed: ${response.status}`);
            }
        }

        const data = await response.json();
        if (data.success === false) {
            throw new Error(data.message || 'Request failed');
        }

        return data;
    }
}
```

---

## Troubleshooting

### Common Issues

#### 1. 403 Forbidden Error
**Cause**: User doesn't have required role for the feature
**Solution**: 
- Check user role with `/api/debug/session`
- Update user role in database if needed
- Verify role requirements in documentation

#### 2. 401 Unauthorized Error
**Cause**: User not logged in or session expired
**Solution**:
- Log in through the frontend
- Check session cookies are being sent
- Verify session configuration

#### 3. CORS Issues
**Cause**: Frontend and backend on different ports
**Solution**: Backend already configured for CORS with these origins:
```javascript
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174', 
  'http://192.168.1.239:5174',
  // ... other origins
];
```

#### 4. Database Connection Issues
**Cause**: Database not running or wrong credentials
**Solution**: 
- Check MySQL is running
- Verify connection details in `z:\server\config\db.js`
- Test connection: `mysql -u root -p orthodoxmetrics_db`

#### 5. 500 Internal Server Error
**Error**: `Failed to load resource: the server responded with a status of 500 (Internal Server Error)`

**Cause**: Server-side error in the notes API endpoint

**Troubleshooting Steps**:

1. **Check Server Logs**
   ```bash
   # Check the server terminal for error details
   # Look for database connection errors or SQL syntax errors
   ```

2. **Verify Database Connection**
   ```sql
   -- Test database connection
   USE orthodoxmetrics_db;
   SELECT 1;
   
   -- Check if notes table exists
   SHOW TABLES LIKE 'notes';
   
   -- Check table structure
   DESCRIBE notes;
   ```

3. **Check Notes Table Schema**
   ```sql
   -- Ensure notes table has correct structure
   CREATE TABLE IF NOT EXISTS notes (
       id INT AUTO_INCREMENT PRIMARY KEY,
       title VARCHAR(255) NOT NULL,
       content TEXT,
       category VARCHAR(100) DEFAULT 'General',
       tags JSON,
       color VARCHAR(20) DEFAULT '#ffffff',
       is_pinned BOOLEAN DEFAULT FALSE,
       is_archived BOOLEAN DEFAULT FALSE,
       is_shared BOOLEAN DEFAULT FALSE,
       created_by INT NOT NULL,
       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
       updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
       
       FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
       INDEX idx_notes_created_by (created_by),
       INDEX idx_notes_created_at (created_at)
   );
   ```

4. **Test Backend Route Directly**
   ```bash
   # Test if the route is accessible
   curl -X GET http://localhost:3001/api/notes --cookie-jar cookies.txt --cookie cookies.txt
   
   # Test creating a note
   curl -X POST http://localhost:3001/api/notes \
     --cookie-jar cookies.txt --cookie cookies.txt \
     -H "Content-Type: application/json" \
     -d '{"title":"Test Note","content":"Test content"}'
   ```

5. **Check Required Fields**
   ```javascript
   // Ensure the backend route validates required fields properly
   // In z:\server\routes\notes.js
   if (!title || !content) {
       return res.status(400).json({
           success: false,
           message: 'Title and content are required'
       });
   }
   ```

#### 5. MUI IconButton Warning
**Warning**: `MUI: You are providing an onClick event listener to a child of a button element`

**Cause**: Nested click handlers in IconButton components

**Solution**: Apply onClick directly to IconButton, not to child elements

```typescript
// ❌ Incorrect - onClick on child element
<IconButton>
    <Icon onClick={handleClick} />
</IconButton>

// ✅ Correct - onClick on IconButton itself
<IconButton onClick={handleClick}>
    <Icon />
</IconButton>
```

**Fix for Header.tsx**:
```typescript
// z:\front-end\src\layouts\full\vertical\header\Header.tsx
<IconButton onClick={handleMenuToggle}>
    <IconMenu2 />
</IconButton>

// Instead of:
<IconButton>
    <IconMenu2 onClick={handleMenuToggle} />
</IconButton>
```

#### 6. Session-Based Authentication Issues
**Error**: Authentication works but notes still fail

**Cause**: Session not being properly passed to notes routes

**Solution**: Verify session middleware is properly configured

```javascript
// z:\server\routes\notes.js
const requireAuth = (req, res, next) => {
    console.log('🔍 Session check:', {
        hasSession: !!req.session,
        hasUser: !!req.session?.user,
        userId: req.session?.user?.id,
        sessionID: req.sessionID
    });

    if (!req.session?.user) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required'
        });
    }
    next();
};
```

#### 7. Database Foreign Key Constraints
**Error**: Foreign key constraint fails when creating notes

**Cause**: User ID doesn't exist in users table

**Solution**: Verify user exists and foreign key is properly set

```sql
-- Check if user exists
SELECT id, email, name FROM users WHERE id = ?;

-- Check foreign key constraints
SELECT 
    CONSTRAINT_NAME,
    TABLE_NAME,
    COLUMN_NAME,
    REFERENCED_TABLE_NAME,
    REFERENCED_COLUMN_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE TABLE_NAME = 'notes' AND REFERENCED_TABLE_NAME IS NOT NULL;
```

#### 8. Database Column Name Mismatch
**Error**: `Unknown column 'u.name' in 'SELECT'`

**Cause**: The `users` table doesn't have a `name` column as expected

**Solution**: Identify the correct column name in your users table

```sql
-- Check the structure of your users table
DESCRIBE users;

-- See all column names
SHOW COLUMNS FROM users;

-- Check what columns exist
SELECT COLUMN_NAME 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'users' 
AND TABLE_SCHEMA = 'orthodoxmetrics_db';
```

**Common column name variations**:
- `name` (expected)
- `username` 
- `full_name`
- `first_name` + `last_name`
- `display_name`
- `email` (as fallback)

**Fix the backend route**:

```javascript
// z:\server\routes\notes.js
// Option 1: If column is 'username'
const [newNote] = await promisePool.query(
    `SELECT n.*, u.username as created_by_name 
     FROM notes n
     JOIN users u ON n.created_by = u.id 
     WHERE n.id = ?`,
    [result.insertId]
);

// Option 2: If columns are 'first_name' and 'last_name'
const [newNote] = await promisePool.query(
    `SELECT n.*, CONCAT(u.first_name, ' ', u.last_name) as created_by_name 
     FROM notes n
     JOIN users u ON n.created_by = u.id 
     WHERE n.id = ?`,
    [result.insertId]
);

// Option 3: If only 'email' exists
const [newNote] = await promisePool.query(
    `SELECT n.*, u.email as created_by_name 
     FROM notes n
     JOIN users u ON n.created_by = u.id 
     WHERE n.id = ?`,
    [result.insertId]
);

// Option 4: Dynamic approach - check what columns exist first
const [columns] = await promisePool.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_NAME = 'users' AND TABLE_SCHEMA = DATABASE()`
);

let nameField = 'email'; // fallback
if (columns.some(col => col.COLUMN_NAME === 'name')) {
    nameField = 'name';
} else if (columns.some(col => col.COLUMN_NAME === 'username')) {
    nameField = 'username';
} else if (columns.some(col => col.COLUMN_NAME === 'full_name')) {
    nameField = 'full_name';
} else if (columns.some(col => col.COLUMN_NAME === 'first_name')) {
    nameField = 'CONCAT(first_name, " ", COALESCE(last_name, ""))';
}

const [newNote] = await promisePool.query(
    `SELECT n.*, u.${nameField} as created_by_name 
     FROM notes n
     JOIN users u ON n.created_by = u.id 
     WHERE n.id = ?`,
    [result.insertId]
);
```

**Quick Fix Command**:
```sql
-- Check your users table structure
DESCRIBE users;
```

**Immediate Fix** - Based on your table structure (first_name + last_name):
```javascript
// z:\server\routes\notes.js - Fix for your table structure
const [newNote] = await promisePool.query(
    `SELECT n.*, CONCAT(u.first_name, ' ', u.last_name) as created_by_name 
     FROM notes n
     JOIN users u ON n.created_by = u.id 
     WHERE n.id = ?`,
    [result.insertId]
);
```

**Alternative Fix** - Use email as display name:
```javascript
// z:\server\routes\notes.js - Email fallback
const [newNote] = await promisePool.query(
    `SELECT n.*, u.email as created_by_name 
     FROM notes n
     JOIN users u ON n.created_by = u.id 
     WHERE n.id = ?`,
    [result.insertId]
);
```

**Complete Fix for All Routes** - Update all queries in your notes.js file:
```javascript
// Replace ALL instances of 'u.name as created_by_name' with:
'CONCAT(u.first_name, " ", u.last_name) as created_by_name'

// Or use email:
'u.email as created_by_name'
```

#### 9. Missing Database Indexes
**Error**: Slow query performance or timeouts

**Cause**: Missing database indexes for foreign keys

**Solution**: Add proper indexes to improve performance

```sql
-- Add indexes for better performance
CREATE INDEX idx_notes_created_by ON notes(created_by);
CREATE INDEX idx_notes_created_at ON notes(created_at);
CREATE INDEX idx_notes_category ON notes(category);
```

#### 10. Notes Date Display Issue - "Invalid Date"
**Error**: Notes show "Invalid Date" instead of proper date formatting

**Cause**: Mismatch between backend date format and frontend date parsing

**Root Cause Analysis**:
1. **Backend Issue**: MySQL datetime format not being converted to ISO format
2. **Frontend Issue**: Frontend expecting different date field names (`datef` vs `created_at`)
3. **Compatibility Issue**: Legacy frontend code using `datef` field that doesn't exist in new backend response

**Solution**: Fixed in both backend and frontend

**Backend Fix** (Applied to `z:\server\routes\notes.js`):
```javascript
// All note endpoints now format dates consistently
const formattedNote = {
    ...note,
    tags: note.tags ? JSON.parse(note.tags) : [],
    is_owner: note.created_by === userId,
    created_at: note.created_at ? new Date(note.created_at).toISOString() : null,
    updated_at: note.updated_at ? new Date(note.updated_at).toISOString() : null,
};
```

**Frontend Fix** (Applied to `z:\front-end\src\context\NotesContext\index.tsx`):
```typescript
// Transform notes to include backward compatibility fields
const transformedNotes = data.notes.map((note: any) => ({
    ...note,
    tags: Array.isArray(note.tags) ? note.tags : (note.tags ? JSON.parse(note.tags) : []),
    datef: note.created_at || note.updated_at, // For backward compatibility
}));
```

**Frontend Component Fix** (Applied to `z:\front-end\src\components\apps\notes\NoteList.tsx`):
```typescript
// Safe date formatting with error handling
<Typography variant="caption">
  {(() => {
    try {
      const date = new Date(note.datef);
      return isNaN(date.getTime()) ? 'Invalid Date' : date.toLocaleDateString();
    } catch (error) {
      return 'Invalid Date';
    }
  })()}
</Typography>
```

---

## Notes Management - End-to-End Integration

### Overview
Notes functionality provides users with the ability to create, edit, delete, and organize personal notes with features like:
- Rich text content
- Color-coded categories
- Pin/archive functionality
- Date tracking
- User-specific notes with sharing capabilities

### Frontend Components Structure
```
z:\front-end\src\views\apps\notes\
├── Notes.tsx                    # Main notes page
├── components\apps\notes\
│   ├── AddNotes.tsx            # Add new note form
│   ├── NoteList.tsx            # List of notes (left sidebar)
│   ├── NoteContent.tsx         # Note editing area (right panel)
│   └── NoteSearch.tsx          # Search functionality
└── context\NotesContext\
    └── index.tsx               # Notes state management
```
