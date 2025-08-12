# 🏛️ Orthodox Metrics Admin Interface

## Overview
The Orthodox Metrics Admin Interface provides comprehensive management and monitoring capabilities for the multi-tenant SaaS church management platform. This interface allows super administrators to oversee all client sites, monitor system health, manage backups, and maintain the entire platform.

## 🎯 Key Features

### 1. **Multi-Tenant Client Management**
- **Client Overview Dashboard**: View all church client sites at a glance
- **Real-Time Statistics**: Monitor baptisms, marriages, funerals across all clients
- **Client Health Monitoring**: Test database connections and system health
- **Status Management**: Activate, deactivate, or set maintenance mode for clients
- **Automated Client Creation**: One-click church site provisioning

### 2. **System Health Monitoring**
- **Server Metrics**: CPU, memory, disk usage monitoring
- **Database Health**: Connection testing and performance metrics
- **Uptime Tracking**: System availability and performance statistics
- **Resource Utilization**: Real-time resource consumption monitoring

### 3. **Database Administration**
- **Multi-Database Monitoring**: Health checks across all client databases
- **Connection Testing**: Verify connectivity to client databases
- **Performance Metrics**: Response times and query performance
- **Database Statistics**: Record counts and usage analytics

### 4. **Backup Management**
- **System-Wide Backups**: Full platform backup capabilities
- **Client-Specific Backups**: Individual church database backups
- **Automated Scheduling**: Scheduled backup operations
- **Backup History**: Track and manage backup files

### 5. **Configuration Management**
- **System Settings**: Platform-wide configuration options
- **Environment Management**: Development vs production settings
- **Feature Toggles**: Enable/disable platform features
- **Security Settings**: Authentication and authorization controls

## 🚀 Getting Started

### Prerequisites
- Super admin role access
- Orthodox Metrics platform running
- MariaDB root access configured
- Node.js backend server active

### Accessing the Admin Interface

1. **Navigate to Admin Dashboard**
   ```
   http://localhost:5173/admin/orthodox-metrics
   ```

2. **Authentication Required**
   - Must be logged in with `super_admin` role
   - Standard admin users have limited access

3. **Dashboard Overview**
   - Six main tabs for different administrative functions
   - Real-time data refresh every 10-30 seconds
   - Action-based interface with confirmation dialogs

## 📊 Dashboard Tabs

### 1. Client Sites Tab
**Purpose**: Manage all church client sites

**Features**:
- Client overview cards with key statistics
- Sortable table of all clients
- Quick actions: activate, deactivate, maintenance mode
- Database connection testing
- Direct links to client sites

**Key Metrics**:
- Total client count
- Active vs inactive sites
- Total records across all churches
- System health score

**Actions Available**:
- Create new client (redirects to setup wizard)
- Test client database connections
- Update client status
- View client statistics
- Access client sites directly

### 2. System Health Tab
**Purpose**: Monitor overall platform health

**Features**:
- CPU usage monitoring with color-coded alerts
- Memory utilization tracking
- Disk space monitoring
- Load average indicators
- Health score calculation

**Health Indicators**:
- 🟢 Green: Optimal performance (0-70% usage)
- 🟡 Yellow: Warning levels (70-85% usage)
- 🔴 Red: Critical levels (85%+ usage)

### 3. Database Monitor Tab
**Purpose**: Monitor all database connections and health

**Features**:
- Main database health check
- Client database connectivity testing
- Response time monitoring
- Database-specific statistics
- Connection pool status

**Health Checks**:
- Connection response times
- Query performance metrics
- Record count summaries
- Database user permissions

### 4. Server Metrics Tab
**Purpose**: Detailed server performance monitoring

**Features**:
- Real-time CPU and memory graphs
- Network interface monitoring
- Process information
- Platform details
- Load average trends

**Metrics Displayed**:
- CPU cores and model information
- Memory: total, used, free
- Network interfaces
- Process uptime and PID
- Operating system details

### 5. Backup Manager Tab
**Purpose**: Manage system and client backups

**Features**:
- Create full system backups
- Client-specific backup creation
- Backup file listing and management
- Automated backup scheduling
- Backup restoration tools

**Backup Types**:
- **System Backup**: All databases and configuration
- **Client Backup**: Individual church database
- **Incremental Backup**: Changes since last backup
- **Configuration Backup**: System settings only

### 6. System Settings Tab
**Purpose**: Configure platform-wide settings

**Features**:
- Environment configuration
- Feature toggle management
- Security settings
- Integration configurations
- Performance tuning

## 🔧 API Endpoints

### Client Management
- `GET /api/clients` - List all clients
- `GET /api/clients/:id` - Get specific client
- `POST /api/clients` - Create new client
- `PUT /api/clients/:id` - Update client
- `DELETE /api/clients/:id` - Deactivate client
- `GET /api/clients/:id/stats` - Client statistics
- `GET /api/clients/:id/test-connection` - Test database

### System Administration
- `GET /api/admin/system/system-stats` - System statistics
- `GET /api/admin/system/database-health` - Database health
- `GET /api/admin/system/server-metrics` - Server metrics
- `GET /api/admin/system/config` - System configuration
- `PUT /api/admin/system/config` - Update configuration

### Backup Management
- `POST /api/admin/system/backup` - Create system backup
- `POST /api/admin/system/backup/:clientId` - Create client backup
- `GET /api/admin/system/backups` - List all backups

## 🏗️ Architecture

### Frontend Components
```typescript
OrthodoxMetricsAdminDashboard
├── ClientSitesTab
│   ├── ClientOverviewCards
│   ├── ClientTableView
│   └── ClientActionMenu
├── SystemHealthTab
│   ├── HealthMetrics
│   ├── ResourceMonitoring
│   └── AlertIndicators
├── DatabaseMonitorTab
│   ├── ConnectionHealth
│   ├── PerformanceMetrics
│   └── DatabaseStats
├── ServerMetricsTab
│   ├── CPUMonitoring
│   ├── MemoryTracking
│   └── SystemInfo
├── BackupManagerTab
│   ├── BackupCreation
│   ├── BackupListing
│   └── BackupActions
└── SystemSettingsTab
    ├── ConfigManagement
    ├── FeatureToggles
    └── SecuritySettings
```

### Backend Architecture
```javascript
AdminSystemRouter
├── /system-stats - System overview
├── /database-health - DB monitoring
├── /server-metrics - Server performance
├── /backup - Backup operations
└── /config - Configuration management
```

### Data Flow
1. **React Query** manages data fetching and caching
2. **Real-time updates** with automatic refresh intervals
3. **Optimistic updates** for immediate UI feedback
4. **Error handling** with user-friendly messages
5. **Permission-based access** with role validation

## 🔐 Security Considerations

### Access Control
- **Super Admin Only**: Full access to all features
- **Admin Users**: Limited access to client management
- **Role-Based Permissions**: Granular access control
- **Session Management**: Secure authentication required

### Data Protection
- **Database Isolation**: Client data separation
- **Secure Connections**: Encrypted database connections
- **Audit Logging**: All administrative actions logged
- **Backup Encryption**: Encrypted backup storage

### API Security
- **Authentication Required**: All endpoints require valid session
- **Role Validation**: Endpoints check user permissions
- **Input Validation**: Sanitized and validated inputs
- **Rate Limiting**: Prevent abuse of administrative APIs

## 📈 Monitoring & Alerts

### Real-Time Monitoring
- **Auto-Refresh**: Data updates every 10-30 seconds
- **Health Scores**: Calculated health indicators
- **Status Indicators**: Visual health representations
- **Performance Metrics**: Real-time system metrics

### Alert Thresholds
- **CPU Usage**: Alert at 80%+
- **Memory Usage**: Alert at 85%+
- **Disk Space**: Alert at 90%+
- **Database Response**: Alert if >5s response time

### Notification Systems
- **In-App Alerts**: Dashboard notifications
- **Email Alerts**: Critical system notifications
- **Dashboard Badges**: Visual alert indicators
- **Log Integration**: Comprehensive logging

## 🛠️ Troubleshooting

### Common Issues

#### "Cannot connect to client database"
- **Check**: Database credentials in environment variables
- **Verify**: MariaDB server is running
- **Test**: Manual connection with mysql client
- **Fix**: Update database configuration

#### "Admin dashboard not loading"
- **Check**: User has super_admin role
- **Verify**: Backend server is running on port 3001
- **Test**: API endpoints directly
- **Fix**: Check authentication and permissions

#### "System metrics not updating"
- **Check**: Server has sufficient permissions
- **Verify**: Node.js process has system access
- **Test**: Manual API calls to metrics endpoints
- **Fix**: Restart backend server

### Debug Commands
```bash
# Test API connectivity
curl http://localhost:3001/api/admin/system/system-stats

# Check database connection
mysql -u root -p'Summerof1982@!' -e "SHOW DATABASES;"

# Verify client databases
mysql -u root -p'Summerof1982@!' -e "SHOW DATABASES LIKE 'orthodox_%';"

# Test backup functionality
node scripts/createClientDatabase.js testchurch "Test Church" admin@test.org
```

## 🚀 Future Enhancements

### Planned Features
1. **Advanced Analytics**: Detailed usage analytics and reporting
2. **Auto-Scaling**: Automatic resource scaling based on usage
3. **Multi-Region**: Support for multiple data centers
4. **Advanced Monitoring**: Integration with monitoring tools (Grafana, Prometheus)
5. **Automated Maintenance**: Scheduled maintenance windows
6. **Billing Integration**: Usage-based billing and invoicing
7. **API Rate Limiting**: Advanced API protection
8. **Custom Dashboards**: Configurable admin dashboards

### Integration Opportunities
- **Monitoring Tools**: Grafana, Datadog, New Relic
- **Backup Services**: AWS S3, Google Cloud Storage
- **Authentication**: SSO, LDAP, Active Directory
- **Notification Services**: Slack, Discord, Microsoft Teams
- **Logging**: ELK Stack, Splunk

## 📚 Additional Resources

### Documentation Links
- [Multi-Tenant Client Management Guide](./MULTI_TENANT_CLIENT_MANAGEMENT_GUIDE.md)
- [System Architecture Documentation](./SYSTEM_ARCHITECTURE.md)
- [API Documentation](./API_DOCUMENTATION.md)
- [Security Guide](./SECURITY_GUIDE.md)

### Support Contacts
- **Technical Issues**: Check logs in `/logs/` directory
- **Database Issues**: Verify MariaDB configuration
- **Permission Issues**: Check user roles and permissions
- **Performance Issues**: Monitor system metrics in admin dashboard

---

**🎉 Congratulations!** You now have a comprehensive admin interface for managing your Orthodox Metrics multi-tenant SaaS platform. The interface provides full visibility and control over all client sites, system health, and platform operations.
