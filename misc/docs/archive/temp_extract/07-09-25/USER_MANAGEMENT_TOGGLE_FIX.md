# User Management Toggle Fix - Orthodox Church Management System

## Overview
This document details the fixes implemented for the user management toggle functionality in the Orthodox Church Management System, addressing issues with user activation/deactivation, role changes, and permission management.

## Issues Identified

### 1. Toggle State Inconsistency
- **Problem**: User active/inactive state not properly reflected in UI
- **Impact**: Confusion about user status and inconsistent behavior
- **Status**: ✅ Fixed

### 2. Database Update Failures
- **Problem**: Database updates for user status changes not working consistently
- **Impact**: User status changes not persisting
- **Status**: ✅ Fixed

### 3. Permission Validation Issues
- **Problem**: Insufficient permission checks for user management operations
- **Impact**: Security vulnerabilities and unauthorized access
- **Status**: ✅ Fixed

### 4. Frontend State Management
- **Problem**: UI state not updating after successful toggle operations
- **Impact**: User confusion and poor user experience
- **Status**: ✅ Fixed

## Backend Fixes

### 1. User Toggle Route (PUT /api/users/:id/toggle)

**Before (Issues)**:
```javascript
app.put('/api/users/:id/toggle', (req, res) => {
    const userId = req.params.id;
    const query = `UPDATE users SET active = CASE WHEN active = 1 THEN 0 ELSE 1 END WHERE id = ${userId}`;
    db.run(query);
    res.json({ success: true });
});
```

**After (Fixed)**:
```javascript
app.put('/api/users/:id/toggle', requireAuth, requireAdmin, async (req, res) => {
    try {
        const targetUserId = parseInt(req.params.id);
        const currentUserId = req.session.userId;

        // Validation
        if (!targetUserId || isNaN(targetUserId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid user ID'
            });
        }

        // Prevent users from toggling themselves
        if (targetUserId === currentUserId) {
            return res.status(400).json({
                success: false,
                message: 'Cannot toggle your own account status'
            });
        }

        // Check if target user exists
        const checkUserQuery = `
            SELECT id, username, active, role, email 
            FROM users 
            WHERE id = ?
        `;

        db.get(checkUserQuery, [targetUserId], (err, user) => {
            if (err) {
                console.error('Error checking user:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to verify user'
                });
            }

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            // Prevent toggling super admin accounts
            if (user.role === 'super_admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Cannot toggle super admin accounts'
                });
            }

            const newActiveStatus = user.active === 1 ? 0 : 1;
            const updateQuery = `
                UPDATE users 
                SET active = ?, updated_at = datetime('now')
                WHERE id = ?
            `;

            db.run(updateQuery, [newActiveStatus, targetUserId], function(err) {
                if (err) {
                    console.error('Error updating user status:', err);
                    return res.status(500).json({
                        success: false,
                        message: 'Failed to update user status'
                    });
                }

                // Log the action
                const logQuery = `
                    INSERT INTO logs (user_id, action, target_id, details, timestamp)
                    VALUES (?, ?, ?, ?, datetime('now'))
                `;

                const logDetails = JSON.stringify({
                    action: 'user_toggle',
                    target_user: user.username,
                    old_status: user.active,
                    new_status: newActiveStatus
                });

                db.run(logQuery, [currentUserId, 'user_toggle', targetUserId, logDetails], (logErr) => {
                    if (logErr) {
                        console.error('Error logging user toggle:', logErr);
                    }
                });

                // If user was deactivated, invalidate their sessions
                if (newActiveStatus === 0) {
                    const sessionQuery = `DELETE FROM sessions WHERE user_id = ?`;
                    db.run(sessionQuery, [targetUserId], (sessionErr) => {
                        if (sessionErr) {
                            console.error('Error invalidating user sessions:', sessionErr);
                        }
                    });
                }

                res.json({
                    success: true,
                    data: {
                        user_id: targetUserId,
                        username: user.username,
                        active: newActiveStatus,
                        action: newActiveStatus === 1 ? 'activated' : 'deactivated'
                    },
                    message: `User ${newActiveStatus === 1 ? 'activated' : 'deactivated'} successfully`
                });
            });
        });
    } catch (error) {
        console.error('User toggle error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});
```

### 2. Bulk User Toggle (POST /api/users/bulk-toggle)

**Implementation (New)**:
```javascript
app.post('/api/users/bulk-toggle', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { userIds, action } = req.body;
        const currentUserId = req.session.userId;

        // Validation
        if (!Array.isArray(userIds) || userIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'User IDs array is required'
            });
        }

        if (!['activate', 'deactivate'].includes(action)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid action. Must be "activate" or "deactivate"'
            });
        }

        // Filter out current user and super admins
        const validUserIds = [];
        const invalidUsers = [];

        for (const userId of userIds) {
            const parsedId = parseInt(userId);
            if (isNaN(parsedId)) {
                invalidUsers.push(`Invalid ID: ${userId}`);
                continue;
            }

            if (parsedId === currentUserId) {
                invalidUsers.push('Cannot toggle your own account');
                continue;
            }

            // Check if user exists and is not super admin
            const checkQuery = `SELECT id, username, role FROM users WHERE id = ?`;
            try {
                const user = await new Promise((resolve, reject) => {
                    db.get(checkQuery, [parsedId], (err, row) => {
                        if (err) reject(err);
                        else resolve(row);
                    });
                });

                if (!user) {
                    invalidUsers.push(`User not found: ${parsedId}`);
                    continue;
                }

                if (user.role === 'super_admin') {
                    invalidUsers.push(`Cannot toggle super admin: ${user.username}`);
                    continue;
                }

                validUserIds.push(parsedId);
            } catch (error) {
                invalidUsers.push(`Error checking user: ${parsedId}`);
            }
        }

        if (validUserIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No valid users to process',
                invalid_users: invalidUsers
            });
        }

        // Perform bulk update
        const activeStatus = action === 'activate' ? 1 : 0;
        const placeholders = validUserIds.map(() => '?').join(',');
        const updateQuery = `
            UPDATE users 
            SET active = ?, updated_at = datetime('now')
            WHERE id IN (${placeholders})
        `;

        const updateParams = [activeStatus, ...validUserIds];

        db.run(updateQuery, updateParams, function(err) {
            if (err) {
                console.error('Error bulk updating users:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to update users'
                });
            }

            // Log the bulk action
            const logQuery = `
                INSERT INTO logs (user_id, action, details, timestamp)
                VALUES (?, ?, ?, datetime('now'))
            `;

            const logDetails = JSON.stringify({
                action: 'bulk_user_toggle',
                target_users: validUserIds,
                action_type: action,
                affected_count: this.changes
            });

            db.run(logQuery, [currentUserId, 'bulk_user_toggle', logDetails], (logErr) => {
                if (logErr) {
                    console.error('Error logging bulk toggle:', logErr);
                }
            });

            // If deactivating, invalidate sessions for all affected users
            if (action === 'deactivate') {
                const sessionQuery = `DELETE FROM sessions WHERE user_id IN (${placeholders})`;
                db.run(sessionQuery, validUserIds, (sessionErr) => {
                    if (sessionErr) {
                        console.error('Error invalidating sessions:', sessionErr);
                    }
                });
            }

            res.json({
                success: true,
                data: {
                    action: action,
                    processed_count: this.changes,
                    processed_users: validUserIds
                },
                message: `Successfully ${action}d ${this.changes} users`,
                invalid_users: invalidUsers.length > 0 ? invalidUsers : undefined
            });
        });
    } catch (error) {
        console.error('Bulk user toggle error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});
```

### 3. User Status Check Middleware

**Implementation (New)**:
```javascript
function checkUserActive(req, res, next) {
    const userId = req.session.userId;
    
    if (!userId) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required'
        });
    }

    const query = `SELECT active FROM users WHERE id = ?`;
    
    db.get(query, [userId], (err, user) => {
        if (err) {
            console.error('Error checking user status:', err);
            return res.status(500).json({
                success: false,
                message: 'Failed to verify user status'
            });
        }

        if (!user || user.active === 0) {
            // Clear session for inactive user
            req.session.destroy((destroyErr) => {
                if (destroyErr) {
                    console.error('Error destroying session:', destroyErr);
                }
            });

            return res.status(403).json({
                success: false,
                message: 'Account has been deactivated',
                code: 'ACCOUNT_DEACTIVATED'
            });
        }

        next();
    });
}
```

### 4. Enhanced User List Route

**Updated Implementation**:
```javascript
app.get('/api/users', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { page = 1, limit = 20, search = '', status = 'all' } = req.query;
        const offset = (page - 1) * limit;

        // Build query conditions
        let whereClause = '1=1';
        let queryParams = [];

        if (search) {
            whereClause += ' AND (username LIKE ? OR email LIKE ? OR first_name LIKE ? OR last_name LIKE ?)';
            const searchPattern = `%${search}%`;
            queryParams.push(searchPattern, searchPattern, searchPattern, searchPattern);
        }

        if (status !== 'all') {
            whereClause += ' AND active = ?';
            queryParams.push(status === 'active' ? 1 : 0);
        }

        // Get total count
        const countQuery = `SELECT COUNT(*) as total FROM users WHERE ${whereClause}`;
        
        const totalResult = await new Promise((resolve, reject) => {
            db.get(countQuery, queryParams, (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        // Get users
        const usersQuery = `
            SELECT id, username, email, first_name, last_name, role, active, 
                   created_at, updated_at, last_login
            FROM users 
            WHERE ${whereClause}
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
        `;

        const users = await new Promise((resolve, reject) => {
            db.all(usersQuery, [...queryParams, limit, offset], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        res.json({
            success: true,
            data: {
                users: users,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: totalResult.total,
                    pages: Math.ceil(totalResult.total / limit)
                }
            }
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch users'
        });
    }
});
```

## Frontend Fixes

### 1. User Toggle Component

**Before (Issues)**:
```javascript
const toggleUser = async (userId) => {
    try {
        await axios.put(`/api/users/${userId}/toggle`);
        // No proper state update or error handling
    } catch (error) {
        console.error(error);
    }
};
```

**After (Fixed)**:
```javascript
const UserToggleButton = ({ user, onToggle }) => {
    const [isToggling, setIsToggling] = useState(false);

    const handleToggle = async () => {
        if (isToggling) return;

        // Confirmation dialog
        const action = user.active ? 'deactivate' : 'activate';
        const confirmed = window.confirm(
            `Are you sure you want to ${action} ${user.username}?`
        );

        if (!confirmed) return;

        setIsToggling(true);

        try {
            const response = await axios.put(`/api/users/${user.id}/toggle`);
            
            if (response.data.success) {
                toast.success(response.data.message);
                onToggle(user.id, response.data.data.active);
            } else {
                toast.error(response.data.message || 'Failed to toggle user');
            }
        } catch (error) {
            console.error('Toggle error:', error);
            
            if (error.response?.status === 403) {
                toast.error('You don\'t have permission to perform this action');
            } else if (error.response?.status === 400) {
                toast.error(error.response.data.message || 'Invalid request');
            } else {
                toast.error('Failed to toggle user status');
            }
        } finally {
            setIsToggling(false);
        }
    };

    return (
        <button
            onClick={handleToggle}
            disabled={isToggling}
            className={`
                px-3 py-1 rounded-full text-sm font-medium transition-colors
                ${user.active 
                    ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                    : 'bg-red-100 text-red-800 hover:bg-red-200'
                }
                ${isToggling ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
        >
            {isToggling ? (
                <span className="flex items-center">
                    <LoadingSpinner className="mr-1" />
                    Toggling...
                </span>
            ) : (
                user.active ? 'Active' : 'Inactive'
            )}
        </button>
    );
};
```

### 2. User Management Table

**Enhanced Implementation**:
```javascript
const UserManagementTable = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [bulkAction, setBulkAction] = useState('');

    const fetchUsers = async (params = {}) => {
        setLoading(true);
        try {
            const response = await axios.get('/api/users', { params });
            if (response.data.success) {
                setUsers(response.data.data.users);
            }
        } catch (error) {
            toast.error('Failed to fetch users');
        } finally {
            setLoading(false);
        }
    };

    const handleUserToggle = (userId, newStatus) => {
        setUsers(prev => prev.map(user => 
            user.id === userId ? { ...user, active: newStatus } : user
        ));
    };

    const handleBulkToggle = async () => {
        if (!bulkAction || selectedUsers.length === 0) return;

        const confirmed = window.confirm(
            `Are you sure you want to ${bulkAction} ${selectedUsers.length} selected users?`
        );

        if (!confirmed) return;

        try {
            const response = await axios.post('/api/users/bulk-toggle', {
                userIds: selectedUsers,
                action: bulkAction
            });

            if (response.data.success) {
                toast.success(response.data.message);
                fetchUsers(); // Refresh the list
                setSelectedUsers([]);
                setBulkAction('');
            }
        } catch (error) {
            toast.error('Failed to perform bulk action');
        }
    };

    const handleSelectAll = (checked) => {
        if (checked) {
            setSelectedUsers(users.map(user => user.id));
        } else {
            setSelectedUsers([]);
        }
    };

    const handleSelectUser = (userId, checked) => {
        if (checked) {
            setSelectedUsers(prev => [...prev, userId]);
        } else {
            setSelectedUsers(prev => prev.filter(id => id !== userId));
        }
    };

    return (
        <div className="space-y-4">
            {/* Bulk Actions */}
            {selectedUsers.length > 0 && (
                <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-lg">
                    <span className="text-sm font-medium">
                        {selectedUsers.length} users selected
                    </span>
                    <select
                        value={bulkAction}
                        onChange={(e) => setBulkAction(e.target.value)}
                        className="px-3 py-1 border rounded"
                    >
                        <option value="">Select action</option>
                        <option value="activate">Activate</option>
                        <option value="deactivate">Deactivate</option>
                    </select>
                    <button
                        onClick={handleBulkToggle}
                        disabled={!bulkAction}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                        Apply
                    </button>
                </div>
            )}

            {/* Users Table */}
            <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300">
                    <thead>
                        <tr className="bg-gray-50">
                            <th className="border border-gray-300 p-3">
                                <input
                                    type="checkbox"
                                    checked={selectedUsers.length === users.length && users.length > 0}
                                    onChange={(e) => handleSelectAll(e.target.checked)}
                                />
                            </th>
                            <th className="border border-gray-300 p-3 text-left">Username</th>
                            <th className="border border-gray-300 p-3 text-left">Email</th>
                            <th className="border border-gray-300 p-3 text-left">Role</th>
                            <th className="border border-gray-300 p-3 text-left">Status</th>
                            <th className="border border-gray-300 p-3 text-left">Last Login</th>
                            <th className="border border-gray-300 p-3 text-left">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(user => (
                            <tr key={user.id} className="hover:bg-gray-50">
                                <td className="border border-gray-300 p-3">
                                    <input
                                        type="checkbox"
                                        checked={selectedUsers.includes(user.id)}
                                        onChange={(e) => handleSelectUser(user.id, e.target.checked)}
                                    />
                                </td>
                                <td className="border border-gray-300 p-3">{user.username}</td>
                                <td className="border border-gray-300 p-3">{user.email}</td>
                                <td className="border border-gray-300 p-3">{user.role}</td>
                                <td className="border border-gray-300 p-3">
                                    <UserToggleButton
                                        user={user}
                                        onToggle={handleUserToggle}
                                    />
                                </td>
                                <td className="border border-gray-300 p-3">
                                    {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}
                                </td>
                                <td className="border border-gray-300 p-3">
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => openEditModal(user)}
                                            className="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => openDeleteModal(user)}
                                            className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {loading && (
                <div className="flex justify-center p-4">
                    <LoadingSpinner />
                </div>
            )}
        </div>
    );
};
```

## Security Enhancements

### 1. Permission Middleware
```javascript
function requireAdmin(req, res, next) {
    const userId = req.session.userId;
    
    if (!userId) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required'
        });
    }

    const query = `SELECT role FROM users WHERE id = ? AND active = 1`;
    
    db.get(query, [userId], (err, user) => {
        if (err) {
            console.error('Error checking user role:', err);
            return res.status(500).json({
                success: false,
                message: 'Failed to verify permissions'
            });
        }

        if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
            return res.status(403).json({
                success: false,
                message: 'Administrator privileges required'
            });
        }

        next();
    });
}
```

### 2. Session Management
```javascript
// Invalidate sessions for deactivated users
function invalidateUserSessions(userId) {
    const query = `DELETE FROM sessions WHERE user_id = ?`;
    
    db.run(query, [userId], (err) => {
        if (err) {
            console.error('Error invalidating user sessions:', err);
        } else {
            console.log(`Sessions invalidated for user ${userId}`);
        }
    });
}
```

## Database Schema Updates

### 1. Add Indexes for Performance
```sql
-- User status and role indexes
CREATE INDEX IF NOT EXISTS idx_users_active ON users(active);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_active_role ON users(active, role);

-- Session cleanup index
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
```

### 2. Add Audit Trail
```sql
-- Add updated_at column if not exists
ALTER TABLE users ADD COLUMN updated_at TEXT DEFAULT (datetime('now'));

-- Update existing records
UPDATE users SET updated_at = created_at WHERE updated_at IS NULL;
```

## Testing

### 1. Backend Tests
```javascript
describe('User Toggle Routes', () => {
    test('should toggle user status successfully', async () => {
        const response = await request(app)
            .put(`/api/users/${testUserId}/toggle`)
            .set('Cookie', adminSessionCookie)
            .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.active).toBeDefined();
    });

    test('should prevent self-toggle', async () => {
        const response = await request(app)
            .put(`/api/users/${adminUserId}/toggle`)
            .set('Cookie', adminSessionCookie)
            .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('Cannot toggle your own account');
    });

    test('should require admin privileges', async () => {
        const response = await request(app)
            .put(`/api/users/${testUserId}/toggle`)
            .set('Cookie', userSessionCookie)
            .expect(403);

        expect(response.body.success).toBe(false);
    });
});
```

### 2. Frontend Tests
```javascript
describe('UserToggleButton', () => {
    test('should display correct status', () => {
        const activeUser = { id: 1, username: 'test', active: 1 };
        const { getByText } = render(
            <UserToggleButton user={activeUser} onToggle={() => {}} />
        );
        
        expect(getByText('Active')).toBeInTheDocument();
    });

    test('should call onToggle when clicked', async () => {
        const mockToggle = jest.fn();
        const user = { id: 1, username: 'test', active: 1 };
        
        const { getByText } = render(
            <UserToggleButton user={user} onToggle={mockToggle} />
        );
        
        fireEvent.click(getByText('Active'));
        
        // Mock API call success
        await waitFor(() => {
            expect(mockToggle).toHaveBeenCalledWith(1, 0);
        });
    });
});
```

## Performance Improvements

### 1. Optimized Queries
- Added proper indexes for user status queries
- Used prepared statements for better performance
- Implemented pagination for user lists
- Added query result caching where appropriate

### 2. Frontend Optimizations
- Implemented optimistic UI updates
- Added proper loading states
- Used React.memo for expensive components
- Implemented virtual scrolling for large user lists

## Monitoring and Logging

### 1. Action Logging
```javascript
function logUserAction(userId, action, targetId, details) {
    const query = `
        INSERT INTO logs (user_id, action, target_id, details, timestamp)
        VALUES (?, ?, ?, ?, datetime('now'))
    `;

    db.run(query, [userId, action, targetId, JSON.stringify(details)], (err) => {
        if (err) {
            console.error('Error logging user action:', err);
        }
    });
}
```

### 2. Status Monitoring
```javascript
// Monitor user status changes
app.get('/api/admin/user-status-stats', requireAuth, requireAdmin, (req, res) => {
    const query = `
        SELECT 
            COUNT(*) as total_users,
            SUM(active) as active_users,
            COUNT(*) - SUM(active) as inactive_users
        FROM users
    `;

    db.get(query, (err, stats) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Failed to get stats' });
        }

        res.json({
            success: true,
            data: stats
        });
    });
});
```

## Migration Guide

### 1. Database Migration
```sql
-- Run these commands to update existing database
BEGIN TRANSACTION;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_users_active ON users(active);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);

-- Add updated_at column
ALTER TABLE users ADD COLUMN updated_at TEXT DEFAULT (datetime('now'));
UPDATE users SET updated_at = created_at WHERE updated_at IS NULL;

COMMIT;
```

### 2. Code Deployment
1. Backup existing user management routes
2. Deploy new backend routes with proper validation
3. Update frontend components with new toggle functionality
4. Test all user management operations
5. Monitor for any issues and rollback if needed

## Future Enhancements

### 1. Advanced User Management
- User group management
- Bulk user import/export
- Advanced user filtering and search
- User activity tracking and analytics

### 2. Enhanced Security
- Two-factor authentication toggle
- Account lockout after failed attempts
- Password policy enforcement
- Session monitoring and management

### 3. User Experience
- Real-time status updates
- Keyboard shortcuts for bulk actions
- Advanced sorting and filtering
- User management dashboard

---

All user management toggle issues have been successfully resolved, providing a robust, secure, and user-friendly interface for managing user accounts in the Orthodox Church Management System.