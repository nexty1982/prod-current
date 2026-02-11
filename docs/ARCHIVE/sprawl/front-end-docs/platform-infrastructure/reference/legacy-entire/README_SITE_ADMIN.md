# Site Administration and User Management Updates

This document describes the changes made to implement the site administration page and update the user management system to use email as username.

## Overview

The following features have been implemented:

1. **Site Administration Page**
   - Create and manage custom pages with HTML/JavaScript content
   - Insert existing components into custom pages
   - Upload and manage images for use in custom pages

2. **User Management Updates**
   - Updated to use email as username for login and all operations
   - Existing users are automatically updated to use their email as username

## Database Changes

The following database tables have been added:

1. **pages** - Stores custom pages created through the site administration page
   - id: Primary key
   - name: Page name
   - url: Page URL (unique)
   - content: Page content (HTML/JavaScript)
   - created_at: Creation timestamp
   - updated_at: Last update timestamp

2. **components** - Stores components that can be inserted into custom pages
   - id: Primary key
   - name: Component name
   - description: Component description
   - type: Component type
   - properties: Component properties (JSON)

3. **images** - Stores images uploaded through the site administration page
   - id: Primary key
   - name: Image name
   - url: Image URL
   - mime_type: Image MIME type
   - size: Image size in bytes
   - created_at: Upload timestamp

## User Management Updates

The user management system has been updated to use email as username. This means:

1. Users now log in with their email address
2. All operations that previously used username now use email
3. Existing users have been updated to use their email as username

## How to Update the Database

Run the database update script to create the new tables and update existing users:

```bash
cd server/db
node update_database.js
```

## Testing the Changes

After updating the database, you can test the changes by:

1. Logging in with your email address
2. Navigating to the Site Administration page
3. Creating a new page, uploading images, and inserting components
4. Viewing the created page at the specified URL

## Troubleshooting

If you encounter any issues:

1. Check the server logs for error messages
2. Verify that the database update script ran successfully
3. Make sure the necessary npm packages are installed (multer for file uploads)
4. Ensure the uploads directory exists and is writable