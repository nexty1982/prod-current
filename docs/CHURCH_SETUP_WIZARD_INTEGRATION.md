# Church Setup Wizard - Integration Guide

## 🎯 Overview

This guide shows how to integrate the new Church Setup Wizard into your existing OrthodoxMetrics application. The wizard implements a two-part workflow:

1. **Add Church Page** - Simple church creation form
2. **Church Setup Wizard** - Multi-step configuration process

## 📋 Components Created

### Frontend Components
- `ChurchSetupWizard.tsx` - Main wizard component with 5 steps
- `AddChurchPage.tsx` - Church creation form

### Backend Components  
- `churchSetupWizard.js` - API routes for wizard functionality
- `church-setup-wizard-schema.sql` - Database schema for new tables
- `setup-church-wizard.js` - Setup script for integration

## 🚀 Integration Steps

### 1. Database Setup

First, run the setup script to create the required database tables:

```bash
cd server
node setup-church-wizard.js
```

This will:
- Create main system database (`orthodoxmetrics_main`)
- Add new tables to existing church database
- Create upload directories for logos
- Add existing church to global registry

### 2. Backend Integration

Add the new routes to your Express server:

```javascript
// In server/index.js or your main server file
const churchSetupWizardRoutes = require('./routes/churchSetupWizard');

// Mount the routes
app.use('/api/churches', churchSetupWizardRoutes);
```

### 3. Frontend Integration

#### Install Required Dependencies

Make sure you have these packages installed:

```bash
cd front-end
npm install @mui/material @mui/icons-material notistack react-router-dom
```

#### Add Routes to Your Application

Add the new pages to your routing configuration:

```tsx
// In your main App.tsx or router configuration
import AddChurchPage from './pages/AddChurchPage';
import ChurchSetupWizard from './components/ChurchSetupWizard';

// Add these routes
<Route path="/add-church" element={<AddChurchPage />} />
<Route path="/church-setup-wizard" element={<ChurchSetupWizard />} />
```

#### Update Navigation

Add links to access the new functionality:

```tsx
// In your navigation component
<Button
  component={Link}
  to="/add-church"
  variant="contained"
  startIcon={<AddIcon />}
>
  Add Church
</Button>

<Button
  component={Link}
  to="/church-setup-wizard"
  variant="outlined"
  startIcon={<SettingsIcon />}
>
  Setup Wizard
</Button>
```

### 4. Environment Configuration

Ensure your environment variables are properly set:

```env
# Database configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password

# Upload configuration (optional)
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=5242880
```

## 🔧 API Endpoints

### Church Management
- `POST /api/churches` - Create new church
- `GET /api/churches/recent?limit=10` - Get recent churches

### Setup Wizard
- `POST /api/churches/test-connection/:church_id` - Test database connection
- `GET /api/churches/:church_id/details` - Get church details and record counts

### Clergy Management
- `GET /api/churches/:church_id/clergy` - Get clergy members
- `POST /api/churches/:church_id/clergy` - Add clergy member
- `DELETE /api/churches/:church_id/clergy/:clergy_id` - Remove clergy member

### Branding
- `POST /api/churches/:church_id/branding` - Save branding settings (with file upload)

## 📊 Database Schema

### Main System Database (`orthodoxmetrics_main`)

```sql
-- Churches registry
CREATE TABLE churches (
    id INT AUTO_INCREMENT PRIMARY KEY,
    church_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    database_name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    setup_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Setup progress tracking
CREATE TABLE church_setup_progress (
    id INT AUTO_INCREMENT PRIMARY KEY,
    church_id VARCHAR(50) NOT NULL,
    step_number INT NOT NULL,
    step_name VARCHAR(100) NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP NULL
);
```

### Individual Church Database Tables

```sql
-- Clergy members
CREATE TABLE clergy (
    id INT AUTO_INCREMENT PRIMARY KEY,
    church_id INT NOT NULL DEFAULT 1,
    name VARCHAR(255) NOT NULL,
    title VARCHAR(100) DEFAULT '',
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50) DEFAULT '',
    role VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE
);

-- Branding settings
CREATE TABLE branding (
    id INT AUTO_INCREMENT PRIMARY KEY,
    church_id INT NOT NULL DEFAULT 1,
    logo_path VARCHAR(500) DEFAULT NULL,
    primary_color VARCHAR(7) DEFAULT '#1976d2',
    secondary_color VARCHAR(7) DEFAULT '#dc004e',
    ag_grid_theme VARCHAR(50) DEFAULT 'ag-theme-alpine'
);

-- Church configuration
CREATE TABLE church_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    church_id INT NOT NULL DEFAULT 1,
    setting_key VARCHAR(100) NOT NULL,
    setting_value TEXT DEFAULT NULL,
    setting_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string'
);
```

## 🎨 Features Implemented

### ✅ Step 1: Church Selection
- Dropdown with 10 most recently added churches
- Shows church name and creation timestamp
- Refresh functionality

### ✅ Step 2: Test Database Connection  
- Automatic connection testing
- Success/failure indicators
- Error message display

### ✅ Step 3: Church Information Summary
- Read-only display of church data
- Record counts for baptism, marriage, funeral
- Organized in clean card layout

### ✅ Step 4: Parish Clergy Information
- Add multiple clergy members
- Role-based categorization (Priest, Deacon, etc.)
- Contact information management
- Remove clergy functionality

### ✅ Step 5: Branding & Customization (Optional)
- Logo upload (PNG/SVG)
- Primary and secondary color selection
- AG Grid theme preferences
- Color picker integration

## 🧪 Testing the Integration

### 1. Test Church Creation

1. Navigate to `/add-church`
2. Fill out church information form
3. Submit to create church
4. Should redirect to setup wizard

### 2. Test Setup Wizard

1. Navigate to `/church-setup-wizard`
2. Select a church from dropdown
3. Verify connection test passes
4. Review church information
5. Add clergy members
6. Configure branding (optional)
7. Complete setup

### 3. Test API Endpoints

```bash
# Test church creation
curl -X POST http://localhost:3001/api/churches \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Church", "email": "test@church.org"}'

# Test recent churches
curl http://localhost:3001/api/churches/recent?limit=5

# Test connection
curl -X POST http://localhost:3001/api/churches/test-connection/CHURCH_123456
```

## 🔒 Security Considerations

### File Upload Security
- Only PNG and SVG files allowed for logos
- 5MB file size limit
- Files stored in secure upload directory
- Proper file validation and sanitization

### Database Security
- Parameterized queries prevent SQL injection
- Church-specific database isolation
- Role-based access control
- Input validation on all endpoints

### Data Privacy
- Church data isolated per database
- Secure password hashing
- Audit logging for all actions

## 🎯 Next Steps

### Immediate Tasks
1. Run the setup script: `node setup-church-wizard.js`
2. Add routes to your Express server
3. Add components to your React application
4. Test the complete workflow

### Future Enhancements
1. Add bulk church import functionality
2. Implement setup wizard progress saving
3. Add church admin dashboard
4. Create church switching interface for super admins
5. Add email notifications for setup completion

## 🆘 Troubleshooting

### Common Issues

**Database Connection Errors**
- Check environment variables
- Verify MySQL/MariaDB is running
- Ensure proper database permissions

**File Upload Errors** 
- Check upload directory permissions
- Verify file size limits
- Ensure multer configuration is correct

**Frontend Build Errors**
- Ensure all Material-UI packages are installed
- Check TypeScript configuration
- Verify import paths are correct

### Debug Commands

```bash
# Test database connection
node -e "
const mysql = require('mysql2/promise');
mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: ''
}).then(() => console.log('DB OK')).catch(console.error);
"

# Check file permissions
ls -la server/uploads/

# Test API endpoints
curl -v http://localhost:3001/api/churches/recent
```

## 📞 Support

If you encounter issues during integration:

1. Check the console logs for detailed error messages
2. Verify database tables were created correctly
3. Ensure all dependencies are installed
4. Review the API responses for debugging information

The Church Setup Wizard is now ready for integration into your OrthodoxMetrics application! 🎉
