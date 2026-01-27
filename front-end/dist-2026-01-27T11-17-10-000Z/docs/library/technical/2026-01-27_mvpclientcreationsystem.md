# MVP Client Creation System - Simplified Implementation

## MVP Scope (Weeks 1-2)

Instead of building the full enterprise system immediately, let's create a **Minimum Viable Product** that proves the concept and can be expanded.

### **MVP Features:**
- ✅ **Manual client database creation** (semi-automated)
- ✅ **Basic template deployment**
- ✅ **Simple subdomain routing**
- ✅ **Client-specific branding**
- ✅ **Basic user management**

### **MVP Architecture:**

```
Orthodox Metrics (localhost:3001)
├── /admin/clients          # Client management
├── /client/ssppoc         # Client template
├── /client/stmary         # Client A
└── /client/holytrinity    # Client B
```

## Step 1: Add Client Context to Current System

### **1.1 Modify Current index.js**

```javascript
// Add before existing routes
const clientMiddleware = require('./middleware/clientContext');

// Client-aware routing
app.use('/client/:clientSlug', clientMiddleware, (req, res, next) => {
  // Serve client-specific content
  req.clientSlug = req.params.clientSlug;
  next();
});

// Client API routes
app.use('/client/:clientSlug/api', clientMiddleware, require('./routes/clientApi'));
```

### **1.2 Client Context Middleware**

```javascript
// middleware/clientContext.js
const mysql = require('mysql2/promise');

const clientContext = async (req, res, next) => {
  const clientSlug = req.params.clientSlug || req.headers['x-client-slug'];
  
  if (!clientSlug) {
    return res.status(400).json({ error: 'Client not specified' });
  }
  
  try {
    // For MVP, use a simple clients table in existing database
    const [clients] = await req.db.execute(
      'SELECT * FROM clients WHERE slug = ? AND status = "active"',
      [clientSlug]
    );
    
    if (clients.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }
    
    req.client = clients[0];
    req.clientDatabase = `orthodox_${clientSlug}`;
    
    next();
  } catch (error) {
    res.status(500).json({ error: 'Client context error' });
  }
};

module.exports = clientContext;
```

### **1.3 Add Clients Table to Current Database**

```sql
-- Add to existing orthodox database
USE orthodox;

CREATE TABLE clients (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    database_name VARCHAR(100) UNIQUE NOT NULL,
    status ENUM('active', 'suspended', 'trial') DEFAULT 'trial',
    contact_email VARCHAR(255) NOT NULL,
    branding_config JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add sample clients
INSERT INTO clients (name, slug, database_name, contact_email, branding_config) VALUES
('Saints Peter & Paul Orthodox Church', 'ssppoc', 'orthodox_ssppoc', 'admin@ssppoc.org', '{"primaryColor": "#1976d2", "secondaryColor": "#dc004e"}'),
('St. Mary Orthodox Church', 'stmary', 'orthodox_stmary', 'admin@stmary.org', '{"primaryColor": "#d32f2f", "secondaryColor": "#1976d2"}'),
('Holy Trinity Cathedral', 'holytrinity', 'orthodox_holytrinity', 'admin@holytrinity.org', '{"primaryColor": "#388e3c", "secondaryColor": "#d32f2f"}');
```

## Step 2: Manual Database Creation Script

### **2.1 Database Creation Script**

```javascript
// scripts/createClientDatabase.js
const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

async function createClientDatabase(clientSlug, clientName, contactEmail) {
    const databaseName = `orthodox_${clientSlug}`;
    
    // Connect as root to create database
    const rootConnection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: process.env.DB_ROOT_PASSWORD
    });
    
    try {
        console.log(`Creating database: ${databaseName}`);
        
        // Create database
        await rootConnection.execute(`CREATE DATABASE IF NOT EXISTS ${databaseName}`);
        
        // Read template schema
        const schemaPath = path.join(__dirname, 'clientDatabaseTemplate.sql');
        const schemaSql = await fs.readFile(schemaPath, 'utf8');
        
        // Replace placeholders
        const clientSql = schemaSql
            .replace(/{DATABASE_NAME}/g, databaseName)
            .replace(/{CLIENT_NAME}/g, clientName)
            .replace(/{CONTACT_EMAIL}/g, contactEmail);
        
        // Execute schema
        const statements = clientSql.split(';').filter(stmt => stmt.trim());
        
        await rootConnection.execute(`USE ${databaseName}`);
        
        for (const statement of statements) {
            if (statement.trim()) {
                await rootConnection.execute(statement);
            }
        }
        
        console.log(`✅ Database ${databaseName} created successfully`);
        
        // Update client status
        const mainConnection = await mysql.createConnection({
            host: 'localhost',
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: 'orthodox'
        });
        
        await mainConnection.execute(
            'UPDATE clients SET status = "active" WHERE slug = ?',
            [clientSlug]
        );
        
        await mainConnection.end();
        
    } catch (error) {
        console.error('Error creating client database:', error);
        throw error;
    } finally {
        await rootConnection.end();
    }
}

// Usage: node createClientDatabase.js ssppoc "Saints Peter & Paul Orthodox Church" "admin@ssppoc.org"
if (require.main === module) {
    const [,, clientSlug, clientName, contactEmail] = process.argv;
    
    if (!clientSlug || !clientName || !contactEmail) {
        console.log('Usage: node createClientDatabase.js <slug> <name> <email>');
        process.exit(1);
    }
    
    createClientDatabase(clientSlug, clientName, contactEmail)
        .then(() => {
            console.log('Client database creation completed');
            process.exit(0);
        })
        .catch(error => {
            console.error('Failed to create client database:', error);
            process.exit(1);
        });
}

module.exports = createClientDatabase;
```

### **2.2 Client Database Template**

```sql
-- scripts/clientDatabaseTemplate.sql
USE {DATABASE_NAME};

-- Church information
CREATE TABLE church_info (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL DEFAULT '{CLIENT_NAME}',
    address TEXT,
    phone VARCHAR(50),
    email VARCHAR(255) DEFAULT '{CONTACT_EMAIL}',
    website VARCHAR(255),
    primary_color VARCHAR(7) DEFAULT '#1976d2',
    secondary_color VARCHAR(7) DEFAULT '#dc004e',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default church info
INSERT INTO church_info (name, email) VALUES ('{CLIENT_NAME}', '{CONTACT_EMAIL}');

-- Users table
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role ENUM('admin', 'priest', 'deacon', 'secretary', 'viewer') DEFAULT 'viewer',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Baptism records
CREATE TABLE baptism_records (
    id INT PRIMARY KEY AUTO_INCREMENT,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    birth_date DATE,
    reception_date DATE NOT NULL,
    birthplace VARCHAR(150),
    entry_type VARCHAR(50),
    sponsors TEXT,
    parents TEXT NOT NULL,
    clergy VARCHAR(150) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Marriage records  
CREATE TABLE marriage_records (
    id INT PRIMARY KEY AUTO_INCREMENT,
    groom_first_name VARCHAR(100) NOT NULL,
    groom_last_name VARCHAR(100) NOT NULL,
    bride_first_name VARCHAR(100) NOT NULL,
    bride_last_name VARCHAR(100) NOT NULL,
    marriage_date DATE NOT NULL,
    marriage_place VARCHAR(150),
    witnesses TEXT,
    clergy VARCHAR(150) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Funeral records
CREATE TABLE funeral_records (
    id INT PRIMARY KEY AUTO_INCREMENT,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    birth_date DATE,
    death_date DATE NOT NULL,
    funeral_date DATE,
    burial_place VARCHAR(150),
    clergy VARCHAR(150),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add sample data for testing
INSERT INTO baptism_records (first_name, last_name, reception_date, parents, clergy) VALUES
('John', 'Smith', '2024-01-15', 'Michael and Sarah Smith', 'Fr. Peter'),
('Mary', 'Johnson', '2024-02-20', 'David and Anna Johnson', 'Fr. Paul');
```

## Step 3: Client-Aware Routing

### **3.1 Client API Router**

```javascript
// routes/clientApi.js
const express = require('express');
const mysql = require('mysql2/promise');

const router = express.Router();

// Middleware to connect to client database
router.use(async (req, res, next) => {
    try {
        req.clientDb = await mysql.createConnection({
            host: 'localhost',
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: req.clientDatabase
        });
        next();
    } catch (error) {
        res.status(500).json({ error: 'Client database connection failed' });
    }
});

// Client-specific baptism records
router.get('/baptism-records', async (req, res) => {
    try {
        const [records] = await req.clientDb.execute(
            'SELECT * FROM baptism_records ORDER BY reception_date DESC'
        );
        res.json({ records });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Client church info
router.get('/church-info', async (req, res) => {
    try {
        const [info] = await req.clientDb.execute('SELECT * FROM church_info LIMIT 1');
        res.json(info[0] || {});
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Clean up database connection
router.use(async (req, res, next) => {
    if (req.clientDb) {
        await req.clientDb.end();
    }
    next();
});

module.exports = router;
```

## Step 4: Quick MVP Test

### **4.1 Create Test Clients**

```bash
# Create client databases
node scripts/createClientDatabase.js ssppoc "Saints Peter & Paul Orthodox Church" "admin@ssppoc.org"
node scripts/createClientDatabase.js stmary "St. Mary Orthodox Church" "admin@stmary.org"
node scripts/createClientDatabase.js holytrinity "Holy Trinity Cathedral" "admin@holytrinity.org"
```

### **4.2 Test Client Access**

```bash
# Test client-specific APIs
curl http://localhost:3001/client/ssppoc/api/baptism-records
curl http://localhost:3001/client/stmary/api/baptism-records
curl http://localhost:3001/client/holytrinity/api/church-info
```

## Step 5: Simple Client Management UI

### **5.1 Client Management Route**

```javascript
// Add to index.js
app.use('/admin/clients', require('./routes/clientManagement'));
```

### **5.2 Client Management Interface**

```javascript
// routes/clientManagement.js
const express = require('express');
const createClientDatabase = require('../scripts/createClientDatabase');

const router = express.Router();

// List clients
router.get('/', async (req, res) => {
    try {
        const [clients] = await req.db.execute('SELECT * FROM clients ORDER BY created_at DESC');
        res.json(clients);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create new client (manual process)
router.post('/', async (req, res) => {
    const { name, slug, contactEmail } = req.body;
    
    try {
        // Insert client record
        await req.db.execute(
            'INSERT INTO clients (name, slug, database_name, contact_email) VALUES (?, ?, ?, ?)',
            [name, slug, `orthodox_${slug}`, contactEmail]
        );
        
        // Create database (this could be async)
        await createClientDatabase(slug, name, contactEmail);
        
        res.json({ success: true, message: 'Client created successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
```

## MVP Implementation Checklist

### **Week 1: Core Setup**
- [ ] Add clients table to existing database
- [ ] Create client context middleware
- [ ] Build client database creation script
- [ ] Test manual client creation

### **Week 2: Basic UI**
- [ ] Add client-aware routing
- [ ] Create client API endpoints
- [ ] Build simple client management interface
- [ ] Test with 2-3 sample clients

### **Success Criteria:**
- [ ] Can create new client with separate database
- [ ] Client-specific data isolation works
- [ ] Basic church records management per client
- [ ] Simple admin interface for client management

This MVP approach lets you **start small** and **prove the concept** while building the foundation for the full enterprise system. Each client gets their own database, but the deployment is manual/semi-automated rather than fully automated.
