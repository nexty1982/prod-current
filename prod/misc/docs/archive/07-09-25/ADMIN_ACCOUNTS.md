# Admin Accounts for OrthodoxMetrics

## Super Admin Accounts

Based on the database scripts, here are the admin accounts that should be available:

### Primary Super Admin Accounts

1. **admin@orthodoxmetrics.com**
   - Password: `admin123`
   - Role: `super_admin`
   - Full Name: Admin User
   - Landing Page: `/admin/users`

2. **superadmin@orthodoxmetrics.com**
   - Password: `admin123`
   - Role: `super_admin`
   - Full Name: Super Admin
   - Landing Page: `/admin/users`

### Test Admin Accounts

3. **test@admin.com**
   - Password: `hello` (hash: `$2b$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi`)
   - Role: `admin`
   - Full Name: Test Admin

4. **admin@password123.com**
   - Password: `password123`
   - Role: `admin`
   - Full Name: Admin Password123

## Password Hashes

The system uses bcrypt with 12 salt rounds. Here are the password mappings:

- `admin123` → `$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBdXIG.QVuQhWm`
- `hello` → `$2b$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi`
- `password123` → `$2b$12$3K7J4oJ8jF8qRqNZpW9T8uO3l9xQ5qNrK2qJrG9qO9cJ8zP3xV6T2`

## Database Setup

To create these accounts, run the following SQL scripts:

1. `z:\server\database\create_admin_user.sql` - Creates main super admin accounts
2. `z:\server\database\create_working_admin.sql` - Creates test admin accounts

## Testing Access

To test which accounts exist in your database:

```sql
SELECT id, email, first_name, last_name, role, is_active, created_at 
FROM users 
WHERE role IN ('admin', 'super_admin') 
ORDER BY created_at DESC;
```

## Login Instructions

1. Navigate to your frontend application
2. Go to the login page
3. Use any of the admin credentials listed above
4. After login, you should be redirected to the admin dashboard

## Role Permissions

- **super_admin**: Has access to all features including Menu Settings
- **admin**: Has access to most admin features but may be restricted from certain super admin functions

## Troubleshooting

If you cannot login with these credentials:

1. Check if the user exists in the database
2. Verify the password hash matches
3. Ensure the user is active (`is_active = TRUE`)
4. Check if the role is correctly set to 'super_admin' or 'admin'

## Security Note

**Important**: These are development/testing credentials. In production:
- Change all default passwords
- Use strong, unique passwords
- Enable proper authentication mechanisms
- Consider implementing 2FA for admin accounts
