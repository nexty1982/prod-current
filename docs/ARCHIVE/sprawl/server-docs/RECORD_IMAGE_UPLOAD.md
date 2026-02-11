# Record Image Upload Endpoint

## Overview

The `POST /api/admin/churches/:id/record-images` endpoint allows authenticated users to upload images for church records (baptism, marriage, funeral, logo, bg, g1, omLogo, recordImage).

## Configuration

### Environment Variables

- `RECORD_IMAGES_DIR` (optional): Base directory for storing uploaded images
  - Default: `/var/www/orthodoxmetrics/uploads/record-images`
  - Files are organized as: `${RECORD_IMAGES_DIR}/${churchId}/${type}/${filename}`

### File Limits

- **Max file size**: 25MB
- **Allowed MIME types**: `image/png`, `image/jpeg`, `image/jpg`, `image/webp`
- **Allowed types**: `baptism`, `marriage`, `funeral`, `logo`, `bg`, `g1`, `omLogo`, `recordImage`

## API Endpoint

### Request

```
POST /api/admin/churches/:id/record-images
Content-Type: multipart/form-data
Cookie: connect.sid=<session-cookie>
```

**URL Parameters:**
- `id` (required): Church ID (positive integer)

**Form Data:**
- `image` (required): Image file (field name must be "image")
- `type` (required): Image type (baptism, marriage, funeral, logo, bg, g1, omLogo, recordImage)

**Query Parameters (alternative):**
- `type` (optional): Can be provided as query parameter instead of form data

### Response

**Success (201 Created):**
```json
{
  "ok": true,
  "success": true,
  "message": "Image uploaded successfully",
  "churchId": 46,
  "type": "baptism",
  "filename": "1234567890-987654321.png",
  "path": "/var/www/orthodoxmetrics/uploads/record-images/46/baptism/1234567890-987654321.png",
  "url": "/images/records/46/baptism/1234567890-987654321.png"
}
```

**Error Responses:**

- **400 Bad Request** - Invalid input:
  ```json
  {
    "success": false,
    "error": "No image file provided. Ensure field name is \"image\".",
    "code": "NO_FILE"
  }
  ```

- **401 Unauthorized** - Not authenticated:
  ```json
  {
    "success": false,
    "error": "Not authenticated",
    "code": "UNAUTHORIZED"
  }
  ```

- **500 Internal Server Error** - Server error:
  ```json
  {
    "success": false,
    "error": "Failed to upload image",
    "code": "INTERNAL_ERROR"
  }
  ```

## Error Codes

- `NO_FILE`: No file provided in request
- `MISSING_TYPE`: Type parameter is missing
- `INVALID_CHURCH_ID`: Church ID is not a valid positive integer
- `FILE_TOO_LARGE`: File size exceeds 25MB limit
- `UPLOAD_ERROR`: General multer error
- `UNEXPECTED_FIELD`: Wrong field name (expected "image")
- `UNAUTHORIZED`: Not authenticated
- `INTERNAL_ERROR`: Server-side error

## Testing

### Using curl

```bash
# Test without authentication (should return 401)
curl -X POST \
  -F "image=@./test-image.png" \
  -F "type=baptism" \
  http://127.0.0.1:3001/api/admin/churches/46/record-images

# Test with authentication
curl -X POST \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE" \
  -F "image=@./test-image.png" \
  -F "type=baptism" \
  http://127.0.0.1:3001/api/admin/churches/46/record-images

# Test with type as query parameter
curl -X POST \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE" \
  -F "image=@./test-image.png" \
  "http://127.0.0.1:3001/api/admin/churches/46/record-images?type=baptism"
```

### Using the test script

```bash
chmod +x scripts/test-record-image-upload.sh
./scripts/test-record-image-upload.sh 46 ./test-image.png baptism "connect.sid=abc123..."
```

## Logging

All upload requests are logged with structured information:

- Request ID (for tracking)
- User ID and email
- Church ID
- File metadata (name, size, MIME type)
- Upload status and errors

Logs are written to console and can be viewed via PM2:

```bash
pm2 logs orthodox-backend --lines 100
```

## File Organization

Uploaded files are organized as follows:

```
${RECORD_IMAGES_DIR}/
  ${churchId}/
    ${type}/
      ${timestamp}-${random}.${ext}
```

Example:
```
/var/www/orthodoxmetrics/uploads/record-images/
  46/
    baptism/
      1234567890-987654321.png
    marriage/
      1234567891-123456789.jpg
```

## Nginx Configuration

Ensure nginx is configured to handle large file uploads:

```nginx
http {
  client_max_body_size 25m;
  
  location /api/ {
    proxy_pass http://127.0.0.1:3001;
    proxy_read_timeout 300s;
    proxy_connect_timeout 300s;
    proxy_send_timeout 300s;
  }
}
```

## Troubleshooting

### 500 Internal Server Error

1. Check PM2 logs: `pm2 logs orthodox-backend`
2. Verify directory permissions: `ls -la ${RECORD_IMAGES_DIR}`
3. Ensure directory exists: `mkdir -p ${RECORD_IMAGES_DIR}`
4. Check disk space: `df -h`

### File Not Found After Upload

1. Verify file was saved: `ls -la ${RECORD_IMAGES_DIR}/${churchId}/${type}/`
2. Check file permissions: `chmod 644 ${RECORD_IMAGES_DIR}/${churchId}/${type}/*`
3. Ensure static file server is configured to serve from upload directory

### Authentication Issues

1. Verify session cookie is valid
2. Check user has access to the church
3. Review authentication middleware logs

