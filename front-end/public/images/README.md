# Shared Image Directories

This directory contains shared images for the OrthodoxMetrics application.

## Directory Structure

### `/profile/`
- **Purpose**: User profile images uploaded by users
- **File Naming**: `profile_[timestamp]_[originalname]`
- **Size Limit**: 5MB per image
- **Allowed Formats**: JPG, PNG, GIF, WebP
- **Usage**: Profile pictures for user accounts

### `/banner/`
- **Purpose**: Banner/cover images uploaded by users
- **File Naming**: `banner_[timestamp]_[originalname]`
- **Size Limit**: 10MB per image
- **Allowed Formats**: JPG, PNG, GIF, WebP
- **Usage**: Cover photos for user profiles

## API Endpoints

### Upload Profile Image
```
POST /api/upload/profile
Content-Type: multipart/form-data

Form Data:
- profile: [image file]
- fileName: [optional custom filename]
```

### Upload Banner Image
```
POST /api/upload/banner
Content-Type: multipart/form-data

Form Data:
- banner: [image file]
- fileName: [optional custom filename]
```

## Response Format

```json
{
  "success": true,
  "message": "Image uploaded successfully",
  "fileName": "profile_1234567890_image.jpg",
  "imageUrl": "/images/profile/profile_1234567890_image.jpg"
}
```

## Security Features

- File type validation (images only)
- File size limits
- Unique filename generation
- Automatic directory creation
- Error handling and logging

## Usage in Frontend

Images are automatically saved to localStorage and loaded on page refresh:

```javascript
// Save image URL
localStorage.setItem('userProfileImage', imageUrl);
localStorage.setItem('userBannerImage', imageUrl);

// Load image URL
const savedImage = localStorage.getItem('userProfileImage');
```

## File Management

- Files are stored permanently in the shared directories
- No automatic cleanup (manual maintenance required)
- Files are accessible via direct URL paths
- Backup recommended for production environments 