# User Profile API Implementation Guide

## Database Schema
The ProfileBanner component expects the following fields in the `users` table:

```sql
ALTER TABLE users
ADD COLUMN full_name VARCHAR(255),
ADD COLUMN introduction TEXT,
ADD COLUMN institute_name VARCHAR(255),
ADD COLUMN website_url VARCHAR(255),
ADD COLUMN location VARCHAR(255);
```

## Required API Endpoints

### 1. GET /api/user/profile
**Purpose**: Retrieve user profile information
**Headers**: 
- `user-email`: The email of the current user

**Response**:
```json
{
  "full_name": "John Orthodox",
  "introduction": "Orthodox Christian dedicated to preserving church traditions...",
  "institute_name": "St. Nicholas Orthodox Seminary", 
  "website_url": "https://orthodoxfaith.com",
  "location": "New York, NY"
}
```

### 2. PUT /api/user/profile
**Purpose**: Update user profile information
**Headers**: 
- `user-email`: The email of the current user
- `Content-Type`: application/json

**Request Body**:
```json
{
  "full_name": "Updated Name",
  "introduction": "Updated introduction...",
  "institute_name": "Updated Institute",
  "website_url": "https://updated-site.com",
  "location": "Updated Location"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Profile updated successfully"
}
```

## Implementation Notes

1. **Authentication**: The component uses the `user-email` header to identify the current user. This should match your existing authentication system.

2. **Validation**: Consider adding validation for:
   - Website URL format
   - Maximum lengths for text fields
   - Required fields (if any)

3. **Error Handling**: The frontend expects standard HTTP status codes:
   - 200: Success
   - 400: Bad request (validation errors)
   - 401: Unauthorized
   - 500: Server error

4. **User Context**: The component assumes users are not assigned to a church (using orthodoxmetrics_db.users table directly). If church assignment logic is needed, modify the API to check user church assignments.

## Example Server-side Implementation (Node.js/Express)

```javascript
// GET /api/user/profile
app.get('/api/user/profile', async (req, res) => {
  try {
    const userEmail = req.headers['user-email'];
    if (!userEmail) {
      return res.status(401).json({ error: 'User email required' });
    }

    const user = await db.query(
      'SELECT full_name, introduction, institute_name, website_url, location FROM users WHERE email = ?',
      [userEmail]
    );

    if (user.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user[0]);
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/user/profile
app.put('/api/user/profile', async (req, res) => {
  try {
    const userEmail = req.headers['user-email'];
    if (!userEmail) {
      return res.status(401).json({ error: 'User email required' });
    }

    const { full_name, introduction, institute_name, website_url, location } = req.body;

    await db.query(
      'UPDATE users SET full_name = ?, introduction = ?, institute_name = ?, website_url = ?, location = ? WHERE email = ?',
      [full_name, introduction, institute_name, website_url, location, userEmail]
    );

    res.json({ success: true, message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

## Frontend Features

The updated ProfileBanner component now includes:

1. **Editable Profile Fields**:
   - Full Name (displayed in the header)
   - Introduction (multi-line text)
   - Institute/Organization name
   - Website URL (clickable link)
   - Location

2. **Edit Mode Toggle**: Click "Edit" to switch to form mode, "Save" to persist changes

3. **Real-time Updates**: Changes are immediately reflected in the UI after saving

4. **Error Handling**: Shows success/error messages via snackbar notifications

5. **Responsive Design**: Works on mobile and desktop

6. **Orthodox Theme**: Removed social media elements, focused on church/faith context
