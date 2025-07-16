# 🏛️ Orthodox Metrics Multi-Tenant Client Management System

## Overview
The Orthodox Metrics platform now supports multi-tenant SaaS functionality, allowing you to create and manage multiple church sites using the ssppoc template. Each client gets their own isolated database, branding, and administrative access.

## ✨ Features

### 🎯 Client Management Dashboard
- **View All Clients**: See all church clients in a comprehensive dashboard
- **Client Statistics**: Track baptisms, marriages, funerals, and other church records
- **Status Management**: Monitor active/inactive client sites
- **Database Health**: Test client database connections

### 🏗️ Church Setup Component
- **Automated Client Creation**: Create new church sites with one form
- **Template Integration**: Uses ssppoc as the base template
- **Custom Branding**: Set client-specific colors, logos, and styling
- **Database Provisioning**: Automatically creates isolated databases

### 📋 Template Manager
- **ssppoc Template Management**: View and manage the base church template
- **Template Deployment**: Deploy template updates to client sites
- **Configuration Management**: Manage template configurations

## 🚀 Getting Started

### 1. Access Client Management
Navigate to **Apps → Client Management** in the admin panel.

### 2. Create a New Church Client
1. Click **"Add New Client"** in the Client Management Dashboard
2. Fill out the church information:
   - **Church Name**: Full name of the church
   - **Slug**: URL-friendly identifier (e.g., "stmary", "holytrinity")
   - **Contact Email**: Administrator email for the church
   - **Primary Color**: Church's brand color
   - **Secondary Color**: Accent color

3. Click **"Create Client"** to provision the new church site

### 3. Automated Provisioning
The system will automatically:
- ✅ Create a dedicated database (`orthodox_{slug}`)
- ✅ Deploy the complete church management schema
- ✅ Create a database user with appropriate permissions
- ✅ Set up an admin account for the church
- ✅ Configure custom branding
- ✅ Generate secure access credentials

### 4. Access the New Church Site
Once created, the church can be accessed at:
```
http://localhost:3001/client/{church-slug}
```

## 🔧 Technical Architecture

### Database Structure
Each client gets:
- **Isolated Database**: `orthodox_{slug}` 
- **Dedicated User**: `{slug}_user` with limited permissions
- **Complete Schema**: All tables for church management
- **Admin Account**: Ready-to-use administrative access

### API Endpoints
- **Main Client API**: `/api/clients` - CRUD operations for client management
- **Client-Specific API**: `/client/{slug}/api` - Isolated API for each church
- **Statistics**: `/api/clients/{id}/stats` - Church record statistics
- **Health Check**: `/api/clients/{id}/test-connection` - Database connectivity

### Frontend Components
- **ClientManagementDashboard**: Main administrative interface
- **ChurchSetup**: New church creation form  
- **TemplateManager**: Template management interface

## 📊 Client Management Dashboard Features

### Client Overview Cards
Each client displays:
- 🏛️ **Church Name & Slug**
- 📧 **Contact Email**
- 🎨 **Brand Colors**
- 📊 **Record Counts** (Baptisms, Marriages, Funerals)
- 🔄 **Status** (Active/Inactive)
- 🗄️ **Database Info**

### Actions Available
- **View Details**: See comprehensive client information
- **Edit Settings**: Update church information and branding
- **Test Connection**: Verify database connectivity
- **View Statistics**: Detailed record analytics
- **Deactivate**: Soft-delete a client (preserves data)

## 🛠️ Advanced Usage

### Manual Client Creation (CLI)
For advanced users, clients can be created via command line:

```bash
cd /var/www/orthodox-church-mgmt/scripts
node createClientDatabase.js stmary "St. Mary Orthodox Church" admin@stmary.org "#d32f2f" "#1976d2"
```

### Client Database Access
Each client database can be accessed directly:
```sql
USE orthodox_stmary;
SELECT * FROM church_info;
```

### Template Updates
To update all client sites with template changes:
1. Go to **Client Management → Template Manager**
2. Select **"Deploy to All Clients"**
3. Review changes and confirm deployment

## 🔐 Security Features

### Data Isolation
- **Database Separation**: Each client has completely isolated data
- **User Permissions**: Limited database users per client
- **API Isolation**: Client-specific API endpoints prevent cross-client access

### Access Control
- **Admin Authentication**: Required for client management operations
- **Permission-Based**: Uses `manage_clients` permission for access control
- **Secure Credentials**: Auto-generated secure passwords

## 🎨 Branding Customization

### Supported Customizations
- **Primary Color**: Main brand color
- **Secondary Color**: Accent color  
- **Logo**: Custom church logo (future enhancement)
- **Theme Settings**: Advanced theming options

### Implementation
Branding is stored in JSON format and applied at runtime:
```json
{
  "primaryColor": "#1976d2",
  "secondaryColor": "#dc004e", 
  "logo": "/assets/clients/stmary/logo.png"
}
```

## 📈 Monitoring & Analytics

### Client Statistics
Track key metrics for each church:
- **Total Records**: Combined count of all church records
- **Baptism Records**: Number of baptisms recorded
- **Marriage Records**: Number of marriages recorded  
- **Funeral Records**: Number of funerals recorded
- **Database Health**: Connection status and performance

### System Health
- **Database Connectivity**: Real-time connection testing
- **API Response Times**: Monitor client API performance
- **Error Tracking**: Log and track client-specific errors

## 🚀 Deployment Workflow

### Development to Production
1. **Test Locally**: Use the development environment to test new clients
2. **Database Migration**: Run migration scripts on production
3. **DNS Configuration**: Set up subdomains for client sites (optional)
4. **SSL Certificates**: Configure SSL for client domains
5. **Monitoring Setup**: Configure monitoring for new client sites

### Backup Strategy
- **Individual Backups**: Each client database backed up separately
- **Automated Backups**: Scheduled backups for all client data
- **Recovery Testing**: Regular restore testing for client databases

## 🛟 Troubleshooting

### Common Issues

#### "Client slug already exists"
- **Solution**: Choose a unique slug for the church
- **Check**: Query the clients table to see existing slugs

#### "Database creation failed"
- **Check**: MariaDB root credentials are correct
- **Verify**: Database server is running and accessible
- **Review**: Error logs for specific database issues

#### "Cannot connect to client database"
- **Test**: Use the "Test Connection" feature in the dashboard
- **Verify**: Client database user permissions
- **Check**: Database server status and connectivity

### Debug Endpoints
- **API Test**: `GET /api/test` - Verify API is responding
- **Churches Debug**: `GET /api/debug/churches` - Test main database
- **Routes Debug**: `GET /api/debug/routes` - List all available routes

## 📚 Next Steps

### Planned Enhancements
1. **Subdomain Routing**: Automatic subdomain creation (stmary.orthodoxmetrics.com)
2. **Advanced Theming**: Full theme customization per client
3. **Billing Integration**: Usage-based billing for church sites
4. **Migration Tools**: Easy data migration between clients
5. **Backup Management**: Client-specific backup scheduling
6. **Analytics Dashboard**: Advanced analytics per church

### Integration Opportunities
- **Email Services**: Client-specific email configurations
- **Payment Processing**: Church-specific payment gateways
- **Document Storage**: Isolated document storage per client
- **Notification Systems**: Client-specific notification preferences

## 🤝 Support

For technical support or questions about the multi-tenant system:
1. Check the troubleshooting section above
2. Review the error logs in `/logs/`
3. Test API endpoints using the debug routes
4. Contact the development team with specific error details

---

**🎉 Congratulations!** You now have a fully functional multi-tenant SaaS platform for Orthodox church management. Each church gets their own isolated, secure, and customizable site powered by the proven ssppoc template.
