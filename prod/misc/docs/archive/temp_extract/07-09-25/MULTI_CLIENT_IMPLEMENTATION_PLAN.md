# Implementation Plan - Multi-Client Template System

## Phase 1: Template Standardization (Week 1)

### 1.1 Clean ssppoc Template
- [ ] Remove hardcoded church names/logos from ssppoc
- [ ] Create `client-config.json` structure
- [ ] Make branding elements configurable
- [ ] Extract database schema as template

### 1.2 Configuration System
```javascript
// client-config.json example
{
  "client": {
    "name": "St. Peter & Paul Orthodox Church",
    "subdomain": "ssppoc",
    "contact": {
      "email": "admin@ssppoc.org",
      "phone": "(555) 123-4567",
      "address": "123 Orthodox Way, City, State"
    },
    "branding": {
      "primaryColor": "#1976d2",
      "secondaryColor": "#dc004e",
      "logo": "/assets/client/ssppoc/logo.png",
      "favicon": "/assets/client/ssppoc/favicon.ico"
    },
    "features": {
      "baptismRecords": true,
      "marriageRecords": true,
      "funeralRecords": true,
      "cemeteryRecords": true,
      "certificateGeneration": true
    },
    "language": "en",
    "timezone": "America/New_York"
  }
}
```

## Phase 2: Multi-Tenant Database (Week 2)

### 2.1 Database Architecture
```sql
-- Client management tables
CREATE TABLE clients (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  subdomain VARCHAR(100) UNIQUE NOT NULL,
  config JSON,
  status ENUM('active', 'suspended', 'trial') DEFAULT 'trial',
  plan_type ENUM('basic', 'premium', 'enterprise') DEFAULT 'basic',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Client-specific record tables (prefixed with client_id or separate schemas)
CREATE TABLE client_baptism_records (
  id INT PRIMARY KEY AUTO_INCREMENT,
  client_id INT NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  birth_date DATE,
  reception_date DATE,
  birthplace VARCHAR(150),
  entry_type VARCHAR(50),
  sponsors TEXT,
  parents TEXT,
  clergy VARCHAR(150),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  INDEX idx_client_baptism (client_id, reception_date)
);

-- Similar structure for marriage, funeral, cemetery records
```

### 2.2 Client-Aware Middleware
```javascript
// middleware/clientContext.js
const clientContext = async (req, res, next) => {
  const subdomain = req.subdomains[0];
  
  if (subdomain && subdomain !== 'www' && subdomain !== 'admin') {
    // Load client configuration
    const client = await getClientBySubdomain(subdomain);
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }
    
    req.client = client;
    req.clientId = client.id;
  }
  
  next();
};
```

## Phase 3: Template Engine (Week 3)

### 3.1 Dynamic Component System
```javascript
// components/ClientTemplate.jsx
const ClientTemplate = ({ client, children }) => {
  const theme = {
    palette: {
      primary: { main: client.branding.primaryColor },
      secondary: { main: client.branding.secondaryColor }
    }
  };
  
  return (
    <ThemeProvider theme={theme}>
      <ClientHeader client={client} />
      {children}
      <ClientFooter client={client} />
    </ThemeProvider>
  );
};
```

### 3.2 Client-Specific Routing
```javascript
// routes/clientRoutes.js
const express = require('express');
const { clientContext } = require('../middleware/clientContext');

const router = express.Router();

// Apply client context to all routes
router.use(clientContext);

// Client-specific record routes
router.use('/api/baptism-records', require('./baptismRecords'));
router.use('/api/marriage-records', require('./marriageRecords'));
router.use('/api/funeral-records', require('./funeralRecords'));

module.exports = router;
```

## Phase 4: Client Management Platform (Week 4)

### 4.1 Orthodox Metrics Admin Dashboard
- **Client Management**: Create, edit, suspend clients
- **Template Marketplace**: Choose from available templates
- **Billing Integration**: Subscription management
- **Analytics**: Usage statistics per client

### 4.2 Client Onboarding Flow
1. **Sign Up**: Church fills out registration form
2. **Template Selection**: Choose from ssppoc or other templates
3. **Customization**: Upload logo, set colors, configure features
4. **Domain Setup**: Choose subdomain (e.g., stmary.orthodoxmetrics.com)
5. **Initial Setup**: Create admin user, import initial data
6. **Go Live**: Site deployed and accessible

## Phase 5: Deployment Automation (Week 5)

### 5.1 Client Site Generator
```javascript
// services/clientSiteGenerator.js
class ClientSiteGenerator {
  async createClientSite(clientConfig) {
    // 1. Create database entry
    const client = await this.createClientRecord(clientConfig);
    
    // 2. Setup subdomain routing
    await this.configureSubdomain(client.subdomain);
    
    // 3. Deploy template files
    await this.deployTemplate(client.template, client.id);
    
    // 4. Configure branding
    await this.applyBranding(client.id, client.branding);
    
    // 5. Create initial admin user
    await this.createAdminUser(client.id, clientConfig.adminUser);
    
    return client;
  }
}
```

### 5.2 Template Deployment Script
```bash
#!/bin/bash
# deploy-client.sh

CLIENT_ID=$1
TEMPLATE=$2
SUBDOMAIN=$3

echo "Deploying client site: $SUBDOMAIN"

# Create client directory
mkdir -p /var/www/clients/$CLIENT_ID

# Copy template files
cp -r /var/www/templates/$TEMPLATE/* /var/www/clients/$CLIENT_ID/

# Configure nginx subdomain
envsubst < /etc/nginx/templates/client.conf.template > /etc/nginx/sites-available/$SUBDOMAIN
ln -s /etc/nginx/sites-available/$SUBDOMAIN /etc/nginx/sites-enabled/

# Reload nginx
nginx -s reload

echo "Client site deployed successfully!"
```

## Implementation Checklist

### Week 1: Template Preparation
- [ ] Extract ssppoc as configurable template
- [ ] Create client configuration schema
- [ ] Implement dynamic branding system
- [ ] Remove hardcoded client-specific content

### Week 2: Database Design
- [ ] Design multi-tenant database schema
- [ ] Create client management tables
- [ ] Implement client-aware data access layer
- [ ] Add client context middleware

### Week 3: Template Engine
- [ ] Build dynamic component system
- [ ] Implement client-specific routing
- [ ] Create template deployment system
- [ ] Test template customization

### Week 4: Admin Platform
- [ ] Build Orthodox Metrics admin dashboard
- [ ] Create client management interface
- [ ] Implement client onboarding flow
- [ ] Add billing integration

### Week 5: Automation
- [ ] Create automated deployment scripts
- [ ] Setup subdomain management
- [ ] Implement site generation pipeline
- [ ] Add monitoring and maintenance tools

## Success Metrics

### Technical
- [ ] Deploy 3 test client sites successfully
- [ ] All features work independently per client
- [ ] Data isolation verified between clients
- [ ] Performance benchmarks met

### Business
- [ ] Client onboarding time < 24 hours
- [ ] Template customization < 2 hours
- [ ] 99.9% uptime per client site
- [ ] Support ticket volume manageable

## Risk Mitigation

### Technical Risks
- **Data Isolation**: Implement strict client-aware queries
- **Performance**: Use connection pooling and caching
- **Security**: Regular security audits and penetration testing
- **Scalability**: Plan for horizontal scaling from day one

### Business Risks
- **Client Migration**: Provide easy data export options
- **Template Lock-in**: Design modular, swappable templates
- **Support Scaling**: Create self-service options and documentation

This implementation plan provides a clear roadmap for transforming Orthodox Metrics into a scalable multi-client SaaS platform using ssppoc as the foundation template.
