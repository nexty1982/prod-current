# User Management Scripts for OrthodoxMetrics

This directory contains scripts for managing users in the OrthodoxMetrics system.

## Available Scripts

### 1. user-management-direct.js (Recommended)
A direct database connection script that automatically finds the correct database and works with the actual schema.

**Location:** `prod/server/scripts/user-management-direct.js`

**Usage:**
```bash
# From the server directory
cd /var/www/orthodoxmetrics/prod/server

# List all users
node scripts/user-management-direct.js list

# Add a new user
node scripts/user-management-direct.js add email@domain.com password role "Full Name"

# View a specific user
node scripts/user-management-direct.js view email@domain.com

# Change user password
node scripts/user-management-direct.js set-password email@domain.com newpassword

# Change user role
node scripts/user-management-direct.js set-role email@domain.com newrole

# Activate/deactivate user
node scripts/user-management-direct.js activate email@domain.com
node scripts/user-management-direct.js deactivate email@domain.com
```

### 2. manage-users.sh (Wrapper Script)
A bash wrapper script for easier access.

**Location:** `prod/server/manage-users.sh`

**Usage:**
```bash
# From anywhere in the server directory
./manage-users.sh list
./manage-users.sh add email@domain.com password role "Full Name"
```

## Available Roles

The system supports the following roles:

| Role | ID | Description |
|------|----|-----------| 
| `superadmin` | 1 | Full access to all churches and system-wide settings |
| `church_admin` | 2 | Admin for a specific church, can manage users and records |
| `editor` | 3 | Can add and edit records for their church |
| `viewer` | 4 | Read-only access to records |
| `auditor` | 5 | Can view logs and historical records, no editing allowed |

## Examples

### Create a Super Administrator
```bash
node scripts/user-management-direct.js add superadmin@mydomain.com SecurePassword123 superadmin "Super Administrator"
```

### Create a Church Administrator
```bash
node scripts/user-management-direct.js add admin@stnicholaschurch.com ChurchPass456 church_admin "Father John Smith"
```

### Create an Editor
```bash
node scripts/user-management-direct.js add secretary@stnicholaschurch.com EditorPass789 editor "Maria Kostas"
```

### Change a User's Role
```bash
# Promote a viewer to editor
node scripts/user-management-direct.js set-role user@church.com editor

# Make someone a church admin
node scripts/user-management-direct.js set-role user@church.com church_admin
```

### Reset a User's Password
```bash
node scripts/user-management-direct.js set-password user@church.com NewSecurePassword123
```

### View All Users
```bash
node scripts/user-management-direct.js list
```

### View Specific User Details
```bash
node scripts/user-management-direct.js view admin@orthodoxmetrics.com
```

## Database Information

The scripts automatically connect to the `orthodoxmetrics_auth_db` database where user information is stored. The database schema includes:

- **users table**: Contains user accounts with email, password_hash, full_name, role_id, etc.
- **roles table**: Contains role definitions and descriptions
- **Connection**: Uses the `orthodoxapps` database user with credentials from the server environment

## Security Notes

1. **Password Security**: All passwords are hashed using bcrypt with 12 salt rounds
2. **Database Access**: Scripts use the existing database credentials from the server environment
3. **Role Validation**: Only valid roles are accepted when creating or modifying users
4. **Safe Logging**: Passwords are never logged in plain text

## Troubleshooting

### Connection Issues
If you get database connection errors:

1. Ensure you're running the script from the server directory: `/var/www/orthodoxmetrics/prod/server`
2. Check that the database service is running
3. Verify the database credentials in the `.env` file

### Permission Issues
If you get permission errors:

1. Make sure the scripts are executable: `chmod +x scripts/user-management-direct.js`
2. Run with appropriate privileges (typically as root on the server)

### Role Errors
If you get invalid role errors:

1. Use exact role names: `superadmin`, `church_admin`, `editor`, `viewer`, `auditor`
2. Role names are case-sensitive

## Integration with Auth System

These scripts work with the same database and authentication system used by the web application. Users created with these scripts can immediately log in to the web interface using their email and password.

The login system will:
- Verify the email exists in the `users` table
- Check the password against the stored bcrypt hash
- Set up the user session with the appropriate role and permissions
- Redirect to the appropriate dashboard based on their role
