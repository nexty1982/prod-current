# 👥 User Management Architecture

## Overview

OrthodoxMetrics follows a centralized user management approach where all users are stored in the main `orthodoxmetrics_db` and assigned to churches through a junction table. Church databases contain **only records data** - never user accounts.

## Database Architecture

### ✅ Correct Architecture

```
orthodoxmetrics_db/
├── users                    # All user accounts
├── churches                 # Church metadata  
├── church_users            # User-Church assignments (junction table)
└── ...

orthodox_church1_records_db/
├── baptism_records         # Only records
├── marriage_records        # Only records  
├── funeral_records         # Only records
└── church_info            # Local church config

orthodox_church2_records_db/
├── baptism_records         # Only records
├── marriage_records        # Only records
├── funeral_records         # Only records
└── church_info            # Local church config
```

### ❌ Incorrect Architecture (Legacy)

```
orthodox_church1_records_db/
├── users                   # ❌ Users should NOT be here
├── baptism_records
└── ...
```

## User-Church Assignment Flow

### 1. User Creation

Users are **always** created in `orthodoxmetrics_db.users`:

```javascript
// ✅ Correct - creates user in orthodoxmetrics_db
POST /api/admin/users
{
  "email": "john@example.com",
  "first_name": "John",
  "last_name": "Smith", 
  "role": "user",
  "church_id": 1  // Optional church association
}
```

### 2. Church Assignment

Users are assigned to churches via the `church_users` junction table:

```javascript
// ✅ Correct - assigns existing user to church
POST /api/churches/{churchId}/users
{
  "user_id": 123,
  "role": "viewer"  // Church-specific role
}
```

### 3. User Roles

Users have two types of roles:

- **System Role** (`users.role`): Global permissions (super_admin, admin, user, etc.)
- **Church Role** (`church_users.role`): Church-specific permissions (priest, deacon, viewer, admin)

## Edit Church User Management

The "Edit Church" interface should:

### ✅ What It Does (Correct)

1. **List Assigned Users**: Shows users from `church_users` table for the church
2. **Assign Existing Users**: Adds entries to `church_users` table  
3. **Remove Users**: Removes entries from `church_users` table
4. **Update Church Roles**: Updates `role` in `church_users` table

### ❌ What It Should NOT Do

1. **Create New Users**: Should not create user accounts directly
2. **Store Users in Church DB**: Never add users to church databases
3. **Duplicate User Data**: User info stays in orthodoxmetrics_db only

## API Endpoints

### Church User Management

```javascript
// Get users assigned to a church
GET /api/churches/{churchId}/users
// Returns: Array of users with church-specific roles

// Assign existing user to church  
POST /api/churches/{churchId}/users
{
  "user_id": 123,
  "role": "viewer"
}

// Update user's role in church
PUT /api/churches/{churchId}/users/{userId}
{
  "role": "admin"
}

// Remove user from church
DELETE /api/churches/{churchId}/users/{userId}
```

### System User Management

```javascript
// Create new user in system
POST /api/admin/users
{
  "email": "user@example.com",
  "first_name": "First",
  "last_name": "Last",
  "role": "user"
}

// Search existing users for assignment
GET /api/admin/users?search=john
```

## Database Schema

### Users Table (orthodoxmetrics_db)

```sql
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role ENUM('super_admin', 'admin', 'user', 'viewer') DEFAULT 'user',
    church_id INT NULL,  -- Default church association
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (church_id) REFERENCES churches(id) ON DELETE SET NULL
);
```

### Church Users Junction Table (orthodoxmetrics_db)

```sql
CREATE TABLE church_users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    church_id INT NOT NULL,
    user_id INT NOT NULL,
    role ENUM('priest', 'deacon', 'viewer', 'admin') DEFAULT 'viewer',
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (church_id) REFERENCES churches(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_church_user (church_id, user_id)
);
```

## Frontend Implementation

### Edit Church Modal Flow

```javascript
// 1. Load existing church users
const fetchAssignedUsers = async (churchId) => {
  const response = await axios.get(`/api/churches/${churchId}/users`);
  return response.data.users;
};

// 2. Search for users to assign
const searchUsers = async (searchTerm) => {
  const response = await axios.get(`/api/admin/users?search=${searchTerm}`);
  return response.data.users;
};

// 3. Assign user to church
const assignUser = async (churchId, userId, role) => {
  await axios.post(`/api/churches/${churchId}/users`, {
    user_id: userId,
    role: role
  });
};

// 4. Remove user from church  
const removeUser = async (churchId, userId) => {
  await axios.delete(`/api/churches/${churchId}/users/${userId}`);
};
```

### User Assignment Component

```jsx
function ChurchUserManagement({ churchId }) {
  const [assignedUsers, setAssignedUsers] = useState([]);
  const [availableUsers, setAvailableUsers] = useState([]);
  
  // Load assigned users
  useEffect(() => {
    fetchAssignedUsers(churchId).then(setAssignedUsers);
  }, [churchId]);
  
  // Search available users
  const handleUserSearch = async (searchTerm) => {
    const users = await searchUsers(searchTerm);
    // Filter out already assigned users
    const available = users.filter(user => 
      !assignedUsers.some(assigned => assigned.user_id === user.id)
    );
    setAvailableUsers(available);
  };
  
  return (
    <div>
      <h3>Assigned Users</h3>
      {assignedUsers.map(user => (
        <UserRow 
          key={user.user_id} 
          user={user} 
          onRemove={() => removeUser(churchId, user.user_id)}
        />
      ))}
      
      <h3>Add User</h3>
      <UserSearch 
        onSearch={handleUserSearch}
        onSelect={(user, role) => assignUser(churchId, user.id, role)}
        availableUsers={availableUsers}
      />
    </div>
  );
}
```

## Best Practices

### ✅ Do's

1. **Always search existing users first** before creating new ones
2. **Use the church_users junction table** for all church assignments
3. **Keep user data in orthodoxmetrics_db only**
4. **Validate user permissions** before allowing church assignments
5. **Log all user assignments** for audit purposes

### ❌ Don'ts

1. **Never create users in church databases**
2. **Don't duplicate user information** across databases  
3. **Don't bypass the junction table** for church assignments
4. **Don't allow direct database access** from frontend
5. **Don't forget to check user permissions** before operations

## Security Considerations

1. **Authentication Required**: All user management requires valid session
2. **Authorization Checks**: Only admins can assign users to churches
3. **Church Scope**: Users can only be assigned to churches they have access to
4. **Role Validation**: Church roles must be valid enum values
5. **Audit Logging**: All user assignments should be logged

## Migration Notes

If you have legacy church databases with users tables:

1. **Export user data** from church databases
2. **Import users** into orthodoxmetrics_db.users
3. **Create church assignments** in church_users table
4. **Drop users tables** from church databases
5. **Update application code** to use new architecture

## Testing

```javascript
// Test user assignment flow
describe('Church User Management', () => {
  it('should assign existing user to church', async () => {
    const user = await createUser({ email: 'test@example.com' });
    const church = await createChurch({ name: 'Test Church' });
    
    await assignUserToChurch(church.id, user.id, 'viewer');
    
    const assignments = await getChurchUsers(church.id);
    expect(assignments).toContainEqual({
      user_id: user.id,
      church_id: church.id,
      role: 'viewer'
    });
  });
  
  it('should not create users in church database', async () => {
    const church = await createChurch({ name: 'Test Church' });
    
    // This should fail - users should not be created in church DB
    expect(() => 
      createUserInChurchDB(church.database_name, { email: 'test@example.com' })
    ).toThrow('Users must be created in orthodoxmetrics_db only');
  });
});
```

---

## Summary

The correct approach is:

1. **All users in orthodoxmetrics_db.users** 
2. **Church assignments in orthodoxmetrics_db.church_users**
3. **No user data in church databases**
4. **Edit Church only manages assignments, not user creation**

This ensures clean separation of concerns, proper multi-tenancy, and centralized user management. 