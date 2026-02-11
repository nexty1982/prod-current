# Scripts Directory - Orthodox Metrics Server

## 📁 Directory Structure

```
scripts/
├── 📂 setup/           # Initial setup and installation
├── 📂 database/        # Database management and migrations  
├── 📂 testing/         # All testing and validation scripts
├── 📂 deployment/      # Production deployment scripts
├── 📂 maintenance/     # Ongoing maintenance and utilities
├── 📂 migration/       # Server migration tools
└── 📂 legacy/          # Deprecated scripts (to be removed)
```

## 🎯 **Quick Commands**

### **Initial Setup**
```bash
# Fresh installation
npm run setup:fresh

# Database setup
npm run setup:database

# Church registration
npm run setup:church
```

### **Testing & Validation**
```bash
# Quick health check
npm run test:health

# OCR pipeline test
npm run test:ocr

# Full integration test
npm run test:integration
```

### **Deployment**
```bash
# Deploy to production
npm run deploy:production

# Migrate to new server
npm run migrate:server --host=192.168.1.100
```

### **Maintenance**
```bash
# Database maintenance
npm run maintain:database

# Check system status
npm run maintain:status

# Backup system
npm run backup:full
```

## 📋 **Script Categories**

### **🏗️ Setup Scripts**
- Fresh installation and configuration
- Database schema creation
- Initial data seeding
- Church registration

### **🗄️ Database Scripts**
- Schema migrations
- Data transformations
- Connection testing
- Backup/restore operations

### **🧪 Testing Scripts**
- Unit and integration tests
- OCR pipeline validation
- API endpoint testing
- Performance benchmarks

### **🚀 Deployment Scripts**
- Production deployment
- Server migration
- Configuration management
- Service orchestration

### **🔧 Maintenance Scripts**
- System monitoring
- Log management
- Database optimization
- Security updates

## 🚨 **Deprecated Scripts**

The following scripts are marked for removal or consolidation:
- Multiple duplicate test-ocr-* scripts
- Redundant debug-* scripts  
- Old phase-* scripts (replaced by organized workflows)
- Legacy migration scripts

## 📚 **Usage Guidelines**

1. **Always use npm scripts** instead of running files directly
2. **Check logs** in `/var/log/orthodox-metrics/` for troubleshooting
3. **Backup before** running migration or maintenance scripts
4. **Test in staging** before production deployment
5. **Follow naming conventions** for new scripts

## 🔗 **Related Documentation**

- [Deployment Guide](../docs/DEPLOYMENT_GUIDE.md)
- [Migration Guide](../docs/MIGRATION_GUIDE.md)
- [Troubleshooting](../docs/TROUBLESHOOTING.md)
- [API Documentation](../docs/API_REFERENCE.md)
