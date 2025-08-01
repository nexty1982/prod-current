# Quick Start Guide - Orthodox Metrics

## 🚀 Getting Started

This guide will get you up and running with Orthodox Metrics in under 30 minutes.

## 📋 Prerequisites

### System Requirements
- **Node.js** v18.0.0 or higher
- **MySQL** v8.0 or higher
- **Git** (latest version)
- **4GB RAM** minimum
- **Ubuntu 20.04+** or **Windows 10+**

### Required Accounts
- **Google Cloud Account** (for OCR services)
- **Domain Name** (for production deployment)
- **SSL Certificate** (Let's Encrypt recommended)

## 🔧 Installation

### Step 1: Clone Repository
```bash
git clone https://github.com/your-org/orthodoxmetrics.git
cd orthodoxmetrics/prod
```

### Step 2: Install Dependencies
```bash
# Backend dependencies
cd server
npm install

# Frontend dependencies
cd ../front-end
npm install
```

### Step 3: Database Setup
```bash
cd ../server

# Use the consolidated database manager
node database/database-manager.js setup

# Alternative: Use npm script
npm run db:setup
```

### Step 4: Environment Configuration
```bash
# Copy environment template
cp .env.example .env

# Edit configuration
nano .env
```

**Required Environment Variables:**
```env
# Database Configuration
DB_HOST=localhost
DB_USER=orthodoxapps
DB_PASSWORD=your_secure_password
DB_NAME=orthodox_metrics

# Google Vision API (for OCR)
GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json
GOOGLE_PROJECT_ID=your-project-id

# Security
SESSION_SECRET=your_super_secure_session_secret
JWT_SECRET=your_jwt_secret

# Server Configuration
PORT=3000
NODE_ENV=development
```

### Step 5: Complete System Setup
```bash
# Run the master setup script
node setup/master-setup.js

# Or use npm script
npm run setup:fresh
```

## 🏛️ First Church Setup

### Step 1: Create Super Admin
```bash
# Run church registration
node setup/register-existing-church.js
```

Follow the prompts to create:
- Church basic information
- Super admin account
- Initial database structure

### Step 2: Access Admin Panel
1. Start the application: `npm run dev:backend`
2. Open browser: `http://localhost:3000/admin`
3. Login with super admin credentials
4. Complete church profile setup

### Step 3: Configure Church Details
In the admin panel:
- Upload church logo and banner
- Set church information (name, address, contact)
- Configure Orthodox calendar settings
- Set up multilingual preferences

## 👥 User Management

### Creating Additional Users
1. **Admin Panel**: Navigate to User Management
2. **Add User**: Click "Create New User"
3. **Set Role**: Choose appropriate role:
   - **Super Admin**: Full system access
   - **Admin**: Church administration
   - **User**: Basic access to records

### User Roles Explained
- **Super Admin**: System management, multiple churches
- **Admin**: Single church management, user creation
- **User**: View and edit assigned records only

## 📄 OCR Document Processing

### Step 1: Upload Documents
1. Go to **OCR Processing** in admin panel
2. Click **Upload Documents**
3. Select baptism, marriage, or funeral records
4. Choose document language

### Step 2: Review Results
1. System processes documents automatically
2. Review extracted text in **OCR Results**
3. Make manual corrections if needed
4. Approve and save to records database

### Supported Document Types
- **Baptism Records**: Orthodox baptismal certificates
- **Marriage Records**: Wedding certificates and licenses
- **Funeral Records**: Death certificates and memorial records

### Supported Languages
- English, Greek (Modern/Classical)
- Russian, Romanian, Georgian

## 🌐 Frontend Development

### Development Server
```bash
cd front-end
npm run dev
```
Access at: `http://localhost:5173`

### Key Components
- **Homepage**: `src/components/frontend-pages/homepage/`
- **Admin Panel**: `src/components/admin/`
- **OCR Interface**: `src/components/ocr/`

### Eastern Orthodox Styling
The frontend uses Orthodox liturgical colors:
- **Gold (#FFD700)**: Primary accent
- **Purple (#6B46C1)**: Text and secondary
- **Blue (#2563EB)**: Liturgical elements
- **Traditional fonts**: Noto Serif, Times New Roman

## 🧪 Testing Your Installation

### Basic Health Check
```bash
# Run comprehensive tests
npm run test:health

# Or direct execution
node testing/unified-tests.js --level basic
```

### Full System Test
```bash
# Complete test suite
node testing/unified-tests.js --level full
```

### Test Coverage
- Database connectivity
- OCR pipeline functionality
- API endpoint validation
- Authentication flows
- File upload capabilities

## 🔒 Security Setup

### Step 1: Configure HTTPS
```bash
# Install certbot for Let's Encrypt
sudo apt install certbot

# Generate certificate
sudo certbot certonly --standalone -d yourdomain.com
```

### Step 2: Update Nginx Configuration
```nginx
server {
    listen 443 ssl;
    server_name yourdomain.com;
    
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Step 3: Enable Security Headers
The application automatically includes:
- HTTPS enforcement
- XSS protection
- Content Security Policy
- SQL injection prevention

## 📊 Monitoring and Logging

### Application Logs
```bash
# View real-time logs
tail -f server/logs/app.log

# Check error logs
tail -f server/logs/error.log
```

### System Health
```bash
# Check system status
node testing/unified-tests.js --level debug

# Database health
node database/database-manager.js validate
```

## 🚦 Next Steps

1. **Complete Church Setup**: Add all church information and branding
2. **User Training**: Train administrators on the system
3. **Document Upload**: Begin uploading historical records
4. **Custom Configuration**: Adjust settings for your church's needs
5. **Backup Setup**: Configure automated backups

## 🆘 Common Quick Fixes

### Database Connection Issues
```bash
# Check MySQL service
sudo systemctl status mysql

# Restart if needed
sudo systemctl restart mysql

# Test connection
node database/database-manager.js validate
```

### OCR Not Working
```bash
# Verify Google credentials
echo $GOOGLE_APPLICATION_CREDENTIALS

# Test OCR service
node testing/unified-tests.js --level basic --skip-database
```

### Permission Errors
```bash
# Fix file permissions
sudo chown -R $USER:$USER /path/to/orthodoxmetrics
chmod -R 755 /path/to/orthodoxmetrics
```

### Frontend Not Loading
```bash
# Check if development server is running
ps aux | grep vite

# Restart frontend
cd front-end
npm run dev
```

## 📞 Need More Help?

- **Technical Issues**: See [Troubleshooting Guide](TROUBLESHOOTING.md)
- **Administration**: Check [Administration Guide](ADMINISTRATION_GUIDE.md)
- **Development**: Consult [Development Guide](DEVELOPMENT_GUIDE.md)
- **API Integration**: Review [API Reference](API_REFERENCE.md)

---

*You should now have a fully functional Orthodox Metrics installation. Welcome to the community!* 🏛️✨
