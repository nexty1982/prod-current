# Credentials Directory

This directory contains Google Cloud service account credentials for the OCR processing system.

## Security Notice
- **Never commit credential files to version control**
- **Keep this directory secure and backed up**
- **Use different credentials for development and production**

## Expected Files
- `google-vision-credentials.json` - Google Cloud Vision API service account key

## Setup Instructions
1. Download your service account key from Google Cloud Console
2. Rename it to `google-vision-credentials.json`
3. Place it in this directory
4. Update your .env file with the correct path

## File Permissions
Ensure credential files have restricted permissions:
```bash
chmod 600 google-vision-credentials.json
```
