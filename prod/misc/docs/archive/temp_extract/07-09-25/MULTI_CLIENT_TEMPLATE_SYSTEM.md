# Orthodox Metrics - Multi-Client Template System

## Business Model Overview

**Orthodox Metrics** = Parent SaaS Platform
**ssppoc** = Client Template/Reference Implementation
**Future Clients** = New church sites based on ssppoc template

## Architecture Strategy

### 1. **Template-Based Deployment Model**

```
Orthodox Metrics (Parent Platform)
├── Core Admin Dashboard
├── Client Management System
├── Template Management
├── Billing & Subscriptions
└── Multi-Tenant Infrastructure

Client Sites (Based on ssppoc template)
├── Client A Church (stmary.orthodoxmetrics.com)
├── Client B Church (holytrinity.orthodoxmetrics.com)
├── Client C Church (stnicolas.orthodoxmetrics.com)
└── ssppoc (showcase/demo site)
```

### 2. **Template System Components**

#### **Core Template Features (from ssppoc)**
- ✅ **Baptism Records Management**
- ✅ **Marriage Records Management** 
- ✅ **Funeral Records Management**
- ✅ **Cemetery Records Management**
- ✅ **Certificate Generation**
- ✅ **Advanced Search & Filtering**
- ✅ **Import/Export Functionality**
- ✅ **AG Grid Data Tables**
- ✅ **PDF Export Capabilities**
- ✅ **Two-Mode Interface** (View/Edit)

#### **Customizable Elements Per Client**
- **Church Branding** (logos, colors, fonts)
- **Church Information** (name, address, contact)
- **Language Settings** (English, Greek, Romanian, Russian)
- **Custom Fields** per record type
- **Certificate Templates** with church-specific designs
- **User Roles & Permissions**
- **Domain/Subdomain** configuration

### 3. **Implementation Strategy**

#### **Phase 1: Template Extraction**
1. **Clean ssppoc Template**
   - Remove client-specific branding
   - Create configurable components
   - Extract reusable UI patterns
   - Standardize API endpoints

2. **Create Template Engine**
   - Configuration system for client customization
   - Dynamic branding system
   - Multi-language support
   - Template deployment automation

#### **Phase 2: Multi-Tenant Infrastructure**
1. **Database Architecture**
   ```sql
   -- Multi-tenant database structure
   CREATE TABLE clients (
     id INT PRIMARY KEY,
     name VARCHAR(255),
     subdomain VARCHAR(100),
     config JSON,
     created_at TIMESTAMP
   );
   
   -- Client-specific record tables
   CREATE TABLE client_baptism_records (
     id INT PRIMARY KEY,
     client_id INT,
     -- standard baptism fields
     FOREIGN KEY (client_id) REFERENCES clients(id)
   );
   ```

2. **Subdomain Routing**
   ```javascript
   // Dynamic subdomain routing
   app.use((req, res, next) => {
     const subdomain = req.subdomains[0];
     if (subdomain && subdomain !== 'www') {
       req.client = getClientBySubdomain(subdomain);
     }
     next();
   });
   ```

#### **Phase 3: Client Onboarding System**
1. **Automated Site Generation**
   - Client signs up through Orthodox Metrics
   - Choose template (ssppoc-based)
   - Customize branding and settings
   - Deploy client site automatically

2. **Configuration Management**
   - Church information setup
   - User account creation
   - Initial data import
   - Domain/subdomain setup

### 4. **Technical Architecture**

#### **Parent Platform (Orthodox Metrics)**
```
z:\
├── server\                 # Parent platform backend
├── front-end\             # Parent platform admin interface
├── templates\             # Client site templates
│   ├── ssppoc\           # ssppoc template
│   ├── standard\         # Standard template
│   └── premium\          # Premium template
├── client-sites\         # Deployed client sites
└── shared\               # Shared components/utilities
```

#### **Client Site Structure (Based on ssppoc)**
```
client-sites\{client-name}\
├── config\               # Client-specific configuration
├── branding\            # Logos, colors, fonts
├── data\                # Client database
├── certificates\        # Custom certificate templates
└── uploads\             # Client file uploads
```

### 5. **Revenue Model Integration**

#### **Subscription Tiers**
- **Basic**: ssppoc template, standard features
- **Premium**: Advanced templates, custom branding
- **Enterprise**: Custom development, dedicated support

#### **Billing Integration**
- Per-client billing through Orthodox Metrics
- Usage-based pricing (records, storage, users)
- Template licensing fees
- Custom development charges

### 6. **Development Roadmap**

#### **Week 1-2: Template Preparation**
- [ ] Extract ssppoc as reusable template
- [ ] Create configuration system
- [ ] Implement dynamic branding
- [ ] Test template deployment

#### **Week 3-4: Multi-Tenant Infrastructure**
- [ ] Setup subdomain routing
- [ ] Implement client management system
- [ ] Create automated deployment
- [ ] Add client onboarding flow

#### **Week 5-6: Client Management Platform**
- [ ] Build Orthodox Metrics admin dashboard
- [ ] Add client creation/management
- [ ] Implement billing integration
- [ ] Create template marketplace

### 7. **Immediate Next Steps**

1. **Clean ssppoc Template**
   - Remove hardcoded church-specific content
   - Make branding configurable
   - Extract configuration variables

2. **Test Template Deployment**
   - Create second client site from ssppoc
   - Verify all features work independently
   - Document customization process

3. **Design Multi-Tenant Database**
   - Plan client separation strategy
   - Design shared vs client-specific tables
   - Implement client-aware queries

### 8. **Technical Considerations**

#### **Security**
- Client data isolation
- Secure subdomain routing
- Role-based access per client
- Secure file storage separation

#### **Performance**
- Efficient multi-tenant queries
- Client-specific caching
- Optimized template loading
- Database connection pooling

#### **Scalability**
- Horizontal scaling for client sites
- Load balancing across subdomains
- Distributed file storage
- CDN for template assets

## Conclusion

This multi-client template system positions Orthodox Metrics as a comprehensive SaaS platform for Orthodox churches, with ssppoc serving as the flagship template. The system can scale to support hundreds of client churches while maintaining centralized management and billing through the parent platform.

**Key Benefits:**
- **Scalable**: Easy deployment of new client sites
- **Maintainable**: Centralized template management
- **Profitable**: Subscription-based revenue model
- **Customizable**: Client-specific branding and features
- **Efficient**: Shared codebase with client isolation
