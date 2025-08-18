# Global Images Directory

This directory contains global profile and banner images that are uploaded by super administrators and made available to all users.

## Directory Structure

### `/global/profile/`
- **Purpose**: Global profile images uploaded by super admins
- **File Naming**: `global_profile_[timestamp].[extension]`
- **Size Requirements**: 200x200 pixels
- **Allowed Formats**: JPG, PNG, or GIF files only
- **Usage**: Profile pictures available to all users

### `/global/banner/`
- **Purpose**: Global banner images uploaded by super admins
- **File Naming**: `global_banner_[timestamp].[extension]`
- **Size Requirements**: Recommended 1200x300 pixels
- **Allowed Formats**: JPG, PNG, or GIF files only
- **Usage**: Banner/cover images available to all users

## Admin API Endpoints

### Get All Global Images (Super Admin Only)
```
GET /api/admin/global-images
Authorization: Super Admin required
```

### Upload Global Image (Super Admin Only)
```
POST /api/admin/global-images/upload
Content-Type: multipart/form-data
Authorization: Super Admin required

Form Data:
- image: [image file]
- name: [image name]
- type: [profile|banner]
```

### Delete Global Image (Super Admin Only)
```
DELETE /api/admin/global-images/:imageId?type=profile&filename=image.jpg
Authorization: Super Admin required
```

### Get Available Global Images (Public)
```
GET /api/admin/global-images/available
No authorization required
```

## Response Format

```json
{
  "images": [
    {
      "id": "uuid",
      "name": "Image Name",
      "url": "/images/global/profile/image.jpg",
      "type": "profile",
      "size": "12345 bytes",
      "uploadedAt": "2025-01-20T12:00:00.000Z",
      "uploadedBy": "admin_username"
    }
  ]
}
```

## Security Features

- **Super Admin Only**: Upload and delete operations require super admin privileges
- **File Type Validation**: Only JPG, PNG, or GIF files allowed
- **File Size Limits**: 5MB maximum per image
- **Unique Filenames**: Timestamp-based naming prevents conflicts
- **Public Access**: Users can view available images without authentication

## Usage in User Profile

Users can select from global images in their profile settings:

1. **Profile Images**: Available in the avatar selection dialog
2. **Banner Images**: Available in the cover photo selection dialog
3. **Selection**: Click on any global image to apply it to your profile
4. **Persistence**: Selected images are saved to localStorage

## File Management

- **Automatic Creation**: Directories are created automatically when needed
- **No Auto-cleanup**: Files are stored permanently until manually deleted
- **Backup Recommended**: Regular backups for production environments
- **Access Control**: Only super admins can manage global images

## Admin Panel Integration

The Content tab in Admin Settings provides:

- **Upload Buttons**: Separate buttons for profile and banner images
- **Image Gallery**: Grid view of all uploaded global images
- **Preview/Download**: View and download images
- **Delete Function**: Remove images from the system
- **Requirements Display**: Shows size and format requirements

## User Experience

- **Seamless Integration**: Global images appear alongside Orthodox avatars
- **Visual Selection**: Click-to-select interface with hover effects
- **Immediate Feedback**: Success messages when images are selected
- **Fallback Support**: Users can still upload their own images 