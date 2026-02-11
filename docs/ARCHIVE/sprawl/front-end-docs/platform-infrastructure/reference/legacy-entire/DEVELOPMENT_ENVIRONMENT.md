# OrthodMetrics Development Environmen### 3. Access the Application
- **Frontend**: http://0.0.0.0:5174
- **Backend API**: http://orthodmetrics.com:3002**Frontend**: http://orthodmetrics.com:3000
- **Backend API**: http://orthodmetrics.com:3002
## Overview
This document describes the development environment setup for OrthodMetrics, configured to run cleanly without production OCR components.

## Environment Configuration

### Backend Server (Port 3002)
- **Database**: `orthodmetrics_dev` (clean development database)
- **Environment**: `NODE_ENV=development`
- **OCR Features**: Completely removed and archived
- **Base URL**: `http://orthodmetrics.com:3002`

### Frontend (Port 5174)
- **Development URL**: `http://0.0.0.0:5174` (Vite dev server)
- **API Base URL**: `http://orthodmetrics.com:3002`
- **Environment**: Vite development mode

## Quick Start

### 1. Database Setup
```bash
# Run the setup script
npm run setup-dev

# Or manually create the database
mysql -u orthodoxapps -p'Summerof1982@!' orthodmetrics_dev < database/create_dev_database.sql
```

### 2. Start Development Server
```bash
# Start backend on port 3002
npm run dev

# Start frontend (in separate terminal)
cd front-end && npm run dev
```

### 3. Access the Application
- **Frontend**: http://orthodoxmetrics.com:3000
- **Backend API**: http://orthodoxmetrics.com:3002

## Development Login Credentials

### Admin User
- **Username**: `devadmin`
- **Password**: `devpassword123`
- **Role**: Super Admin
- **Access**: Full system administration

### Priest User
- **Username**: `devpriest`
- **Password**: `devpassword123`
- **Role**: Priest
- **Access**: Records management

## Database Structure

### Core Tables
- `users` - User accounts and authentication
- `roles` - User roles and permissions
- `churches` - Church information
- `locations` - Geographic locations
- `baptism_records` - Baptism certificates and records
- `marriage_records` - Marriage certificates and records
- `funeral_records` - Funeral certificates and records
- `settings` - Application configuration
- `audit_logs` - Activity tracking

### Sample Data
- **Churches**: 1 development church
- **Users**: 2 test users (admin + priest)
- **Baptism Records**: 2 sample records
- **Marriage Records**: 1 sample record
- **Funeral Records**: 1 sample record

## Key Features Removed/Archived

### OCR Components (Production Only)
All OCR-related functionality has been removed from development and archived in `misc/ocr-archive/`:

- `server/routes/ocr.js`
- `server/routes/ocrSessions.js`
- `server/routes/ocrVision.js`
- `server/routes/preprocessOcr.js`
- `server/routes/church/ocr.js`
- `server/routes/public/ocr.js`
- `server/routes/autoLearningRoutes.js`
- `server/services/ocr/`
- `server/credentials/`
- `uploads/ocr/`
- `ocr-results/`

### Removed Environment Variables
- `OCR_DATABASE`
- `OCR_DB_HOST`
- `OCR_DB_USER`
- `OCR_DB_PASSWORD`
- `GOOGLE_APPLICATION_CREDENTIALS`

## Configuration Files

### Server Configuration
```bash
# server/.env
NODE_ENV=development
DB_NAME=orthodmetrics_dev
DB_HOST=localhost
API_BASE_URL=http://orthodmetrics.com:3002
CORS_ORIGIN=http://0.0.0.0:5174
```

### Frontend Configuration
```bash
# front-end/.env.development
VITE_API_BASE_URL=http://orthodmetrics.com:3002
```

## Development Workflow

### 1. Making Database Changes
```bash
# Update the schema in database/create_dev_database.sql
# Recreate development database
npm run setup-dev
```

### 2. Adding New Features
- Add routes to `server/routes/`
- Update frontend API calls in `front-end/src/api/`
- Test with development credentials

### 3. Testing
- Use sample data for testing new features
- All OCR functionality is disabled
- Authentication works with development users

## Architecture Changes from Production

### Removed Components
1. **OCR Processing**: All Google Vision API integration
2. **OCR Database**: Separate OCR database connections
3. **Image Processing**: Preprocessing and OCR pipelines
4. **Auto-learning**: AI-powered OCR improvement

### Simplified Stack
- **Database**: Single MySQL database (`orthodmetrics_dev`)
- **Authentication**: Session-based with development users
- **API**: Clean REST API without OCR endpoints
- **Frontend**: React/Vite with simplified API calls

## Environment Variables Reference

### Required for Development
```bash
NODE_ENV=development
DB_HOST=localhost
DB_USER=orthodoxapps
DB_PASSWORD=Summerof1982@!
DB_NAME=orthodmetrics_dev
SESSION_SECRET=9d7f4d9b84f74d28a693cbe843f928efad7e3bbd6f25f901a3c0e6f9f91e99e7
API_BASE_URL=http://orthodmetrics.com:3002
CORS_ORIGIN=http://0.0.0.0:5174
```

### Removed from Development
```bash
# OCR-related variables (production only)
OCR_DATABASE=*
OCR_DB_HOST=*
OCR_DB_USER=*
OCR_DB_PASSWORD=*
GOOGLE_APPLICATION_CREDENTIALS=*
```

## Troubleshooting

### Database Connection Issues
```bash
# Test database connection
mysql -u orthodoxapps -p'Summerof1982@!' orthodmetrics_dev -e "SELECT 'Connection OK'"

# Recreate database if needed
npm run setup-dev
```

### CORS Issues
- Ensure frontend is running on port 3000
- Ensure backend is running on port 3002
- Check CORS configuration in `server/index.js`

### Missing Sample Data
```bash
# Re-import sample data
mysql -u orthodoxapps -p'Summerof1982@!' orthodmetrics_dev < database/create_dev_database.sql
```

## Production vs Development

| Component | Production | Development |
|-----------|------------|-------------|
| Database | `orthodmetrics_db` | `orthodmetrics_dev` |
| OCR Features | Enabled | Disabled/Archived |
| Port | 3001 | 3002 |
| SSL | Enabled | Disabled |
| Environment | `production` | `development` |
| Sample Data | Real data | Test data |

## Next Steps

1. **Test Environment**: Verify all core features work without OCR
2. **Frontend Integration**: Update any remaining API calls
3. **Documentation**: Update any references to OCR features
4. **Team Onboarding**: Share development credentials and setup instructions

---

*This development environment provides a clean, OCR-free workspace for OrthodMetrics development while preserving all production OCR functionality in archived form.*
