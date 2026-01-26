# Development Guide - Orthodox Metrics

## 🚀 Developer Overview

This guide covers development setup, the new organized server structure, script usage, and development workflows for Orthodox Metrics.

## 🛠️ Development Environment Setup

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **MySQL**: v8.0 or higher
- **Git**: Latest version
- **VS Code**: Recommended with extensions
- **Postman/Insomnia**: For API testing

### Initial Setup
```bash
# Clone repository
git clone https://github.com/your-org/orthodoxmetrics.git
cd orthodoxmetrics/prod

# Install dependencies
cd server && npm install
cd ../front-end && npm install

# Setup environment
cp server/.env.example server/.env
# Edit .env with your configuration

# Initialize database
cd server
node database/database-manager.js setup
```

### Development Tools

#### Recommended VS Code Extensions
- **Orthodox Metrics Dev Pack**: Custom extension for this project
- **ES7+ React/Redux/React-Native snippets**
- **Prettier - Code formatter**
- **ESLint**
- **Thunder Client**: API testing
- **MySQL**: Database management

#### Environment Variables
```env
# Development specific settings
NODE_ENV=development
PORT=3000
DB_HOST=localhost
DB_USER=orthodoxapps
DB_PASSWORD=dev_password
DB_NAME=orthodox_metrics_dev

# Google Vision API (Development)
GOOGLE_APPLICATION_CREDENTIALS=./credentials/dev-service-account.json
GOOGLE_PROJECT_ID=orthodox-metrics-dev

# Debug settings
DEBUG=orthodox:*
LOG_LEVEL=debug
```

## 📁 New Organized Server Structure

The server has been completely reorganized from 73+ scattered scripts into logical directories:

### Directory Structure
```
server/
├── setup/                      # System setup and church creation
├── testing/                    # All test scripts and validation
├── database/                   # Database management and SQL files
├── maintenance/                # System maintenance and repairs
├── migration/                  # Data migration tools
├── deployment/                 # Production deployment scripts
├── legacy/                     # Archived deprecated scripts
│
├── config/                     # Application configuration
├── controllers/                # Business logic
├── middleware/                 # Express middleware
├── models/                     # Data models
├── routes/                     # API routes
├── services/                   # External service integrations
└── utils/                      # Utility functions
```

### Consolidated Scripts Overview

#### 🔧 Setup Scripts (`setup/`)
```bash
# Master setup script (replaces multiple phase runners)
node setup/master-setup.js [options]

# Church registration
node setup/register-existing-church.js
node setup/register-ssppoc-church.js

# Database creation
node setup/createClientDatabase.js

# Kanban board setup
node setup/setup-default-kanban-boards.js
```

#### 🧪 Testing Scripts (`testing/`)
```bash
# Unified test suite (consolidates 15+ test scripts)
node testing/unified-tests.js [options]

# Specific test categories
node testing/test-ocr-pipeline.js
node testing/test-api-routes.js
node testing/test-church-creation.js
node testing/debug-churches-api.js
```

#### 🗄️ Database Scripts (`database/`)
```bash
# Database manager (consolidated DB operations)
node database/database-manager.js <command> [options]

# Direct database operations
node database/check-database-connection.js
node database/setup-ocr-tables.js
node database/fix-database-tables.js
```

#### 🔧 Maintenance Scripts (`maintenance/`)
```bash
# System maintenance
node maintenance/database-maintenance.js
node maintenance/fix-ocr-schema.js
node maintenance/generate-ocr-text-files.js
```

## 🎯 Key Consolidated Scripts

### 1. Master Setup Script

**Location**: `setup/master-setup.js`
**Purpose**: Complete system setup replacing multiple phase runners

```bash
# Usage examples
node setup/master-setup.js                    # Full setup
node setup/master-setup.js --skip-database    # Skip database setup
node setup/master-setup.js --skip-ocr         # Skip OCR pipeline
node setup/master-setup.js --verbose          # Detailed logging
```

**Features**:
- Replaces `phase1-master-runner.js` and `phase2-master-runner.js`
- Intelligent dependency checking
- Progress tracking with colored output
- Error recovery and retry logic
- Comprehensive logging

**Script Structure**:
```javascript
class OrthodoxSetup {
  constructor(options = {}) {
    this.options = {
      skipDatabase: false,
      skipOcr: false,
      skipChurch: false,
      verbose: false,
      ...options
    };
  }

  async runPhase1() {
    // Database setup
    // OCR table creation
    // Basic configuration
  }

  async runPhase2() {
    // API endpoint setup
    // Field mapping creation
    // Integration testing
  }
}
```

### 2. Unified Test Suite

**Location**: `testing/unified-tests.js`
**Purpose**: Consolidated testing replacing 15+ individual test scripts

```bash
# Usage examples
node testing/unified-tests.js                        # Basic tests
node testing/unified-tests.js --level full           # Full test suite
node testing/unified-tests.js --level debug          # Debug mode
node testing/unified-tests.js --skip-ocr             # Skip OCR tests
node testing/unified-tests.js --base-url http://prod.example.com
```

**Test Categories**:
- **Basic**: Database connectivity, core API functionality
- **Full**: OCR pipeline, authentication flows, data integrity
- **Debug**: Detailed diagnostics, performance metrics, security checks

**Test Structure**:
```javascript
class UnifiedTests {
  async runBasicTests() {
    await this.testDatabaseConnection();
    await this.testCoreAPIs();
    await this.testAuthentication();
  }

  async runFullTests() {
    await this.runBasicTests();
    await this.testOCRPipeline();
    await this.testDataIntegrity();
    await this.testPerformance();
  }

  async runDebugTests() {
    await this.runFullTests();
    await this.generateDiagnosticReport();
    await this.validateConfiguration();
  }
}
```

### 3. Database Manager

**Location**: `database/database-manager.js`
**Purpose**: Unified database operations replacing scattered DB scripts

```bash
# Commands
node database/database-manager.js setup                    # Full setup
node database/database-manager.js schema --dry-run         # Preview schema
node database/database-manager.js optimize                 # Optimize performance
node database/database-manager.js backup                   # Create backup
node database/database-manager.js validate                 # Validate schema
```

**Operations**:
```javascript
class DatabaseManager {
  async setupDatabase() {
    await this.createSchema();
    await this.setupOCRTables();
    await this.createIndexes();
    await this.seedDefaultData();
  }

  async optimizeDatabase() {
    await this.analyzeQueries();
    await this.optimizeIndexes();
    await this.cleanupTempData();
    await this.updateStatistics();
  }
}
```

## 🏗️ Development Workflows

### Local Development

#### Starting Development Environment
```bash
# Method 1: Using npm scripts (recommended)
cd server
npm run dev:backend        # Starts backend with nodemon
cd ../front-end
npm run dev:frontend       # Starts Vite dev server

# Method 2: Manual startup
cd server
npm run dev               # Backend only
cd ../front-end
npm run dev              # Frontend only
```

#### Development URLs
- **Frontend**: `http://localhost:5173`
- **Backend API**: `http://localhost:3000`
- **Admin Panel**: `http://localhost:3000/admin`

### Testing Workflows

#### Running Tests
```bash
# Quick health check
npm run test:health

# Comprehensive testing
npm run test:comprehensive

# Specific test categories
node testing/unified-tests.js --skip-database
node testing/unified-tests.js --level debug
```

#### Test-Driven Development
```javascript
// Example test structure
describe('OCR Processing', () => {
  beforeEach(async () => {
    await setupTestDatabase();
    await uploadTestDocument();
  });

  test('should extract baptism record data', async () => {
    const result = await processOCR('baptism-sample.pdf');
    expect(result.documentType).toBe('baptism');
    expect(result.confidence).toBeGreaterThan(0.85);
  });
});
```

### Database Development

#### Schema Changes
```bash
# Create migration
node database/database-manager.js create-migration "add_new_field"

# Apply migrations
node database/database-manager.js migrate

# Rollback migration
node database/database-manager.js rollback
```

#### Development Database Management
```bash
# Reset development database
node database/database-manager.js reset --confirm

# Seed test data
node database/database-manager.js seed --type=development

# Validate schema
node database/database-manager.js validate
```

## 🔌 API Development

### API Development Workflow

#### Creating New Endpoints
```javascript
// 1. Define route in routes/
router.get('/api/new-endpoint', authMiddleware, validateInput, controller.newEndpoint);

// 2. Implement controller logic
const newEndpoint = async (req, res) => {
  try {
    const result = await service.processRequest(req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// 3. Add validation schema
const validationSchema = {
  body: {
    type: 'object',
    properties: {
      churchId: { type: 'number' },
      data: { type: 'string' }
    },
    required: ['churchId', 'data']
  }
};
```

#### API Testing
```bash
# Test specific endpoint
curl -X POST http://localhost:3000/api/new-endpoint \
  -H "Content-Type: application/json" \
  -d '{"churchId": 1, "data": "test"}'

# Use testing script
node testing/test-api-routes.js --endpoint=new-endpoint
```

### Frontend Component Development

#### Orthodox UI Component Pattern
```typescript
// Orthodox-styled component template
import { styled } from '@mui/material/styles';

const OrthodoxCard = styled(Card)(({ theme }) => ({
  background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
  border: '2px solid #FFD700',
  borderRadius: theme.spacing(1),
  boxShadow: '0 4px 20px rgba(107, 70, 193, 0.1)',
  '&:hover': {
    boxShadow: '0 8px 32px rgba(107, 70, 193, 0.2)',
    transform: 'translateY(-2px)',
  }
}));

const OrthodoxTypography = styled(Typography)(({ theme }) => ({
  fontFamily: '"Noto Serif", "Times New Roman", serif',
  color: '#6B46C1',
  fontWeight: 600,
}));
```

#### Component Testing
```typescript
// Component test example
import { render, screen } from '@testing-library/react';
import { OrthodoxButton } from '../components/orthodox/OrthodoxButton';

test('renders Orthodox button with liturgical styling', () => {
  render(<OrthodoxButton>Divine Liturgy</OrthodoxButton>);
  const button = screen.getByRole('button');
  expect(button).toHaveStyle('background: linear-gradient(135deg, #FFD700, #DAA520)');
});
```

## 🔧 Build and Deployment

### Development Build
```bash
# Frontend development build
cd front-end
npm run build:dev

# Backend development setup
cd server
npm run setup:dev
```

### Production Build
```bash
# Complete production build
npm run build:production

# Frontend production build
cd front-end
npm run build
npm run preview  # Preview production build

# Backend production setup
cd server
npm run setup:production
```

### Deployment Scripts
```bash
# Use deployment script
cd server
node deployment/RunScript.ps1

# Or use npm scripts
npm run deploy:staging
npm run deploy:production
```

## 🐛 Debugging

### Backend Debugging

#### Debug Logging
```javascript
// Enable debug logging
DEBUG=orthodox:* npm run dev

// Specific module debugging
DEBUG=orthodox:ocr,orthodox:auth npm run dev
```

#### Common Debug Commands
```bash
# Database connectivity
node testing/debug-database-connection.js

# OCR pipeline debugging
node testing/debug-ocr-results.js

# Church API debugging
node testing/debug-churches-api.js

# Permission debugging
node testing/debug-permissions.js
```

### Frontend Debugging

#### React DevTools
- Install React Developer Tools browser extension
- Enable detailed component inspection
- Monitor state changes and props

#### Network Debugging
```javascript
// API call debugging
const apiCall = async (endpoint, data) => {
  console.log(`API Call: ${endpoint}`, data);
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    console.log(`Response: ${endpoint}`, response);
    return response.json();
  } catch (error) {
    console.error(`API Error: ${endpoint}`, error);
    throw error;
  }
};
```

## 📝 Code Style and Standards

### JavaScript/TypeScript Standards
```javascript
// ESLint configuration
{
  "extends": ["eslint:recommended", "@typescript-eslint/recommended"],
  "rules": {
    "indent": ["error", 2],
    "quotes": ["error", "single"],
    "semi": ["error", "always"],
    "no-console": "warn",
    "prefer-const": "error"
  }
}
```

### Orthodox-Specific Conventions
```javascript
// Use Orthodox terminology consistently
const liturgicalColors = {
  GOLD: '#FFD700',      // Divine light
  PURPLE: '#6B46C1',    // Imperial purple
  BLUE: '#2563EB',      // Heavenly blue
  RED: '#DC2626',       // Martyrdom
  GREEN: '#059669',     // Life and renewal
  WHITE: '#FFFFFF',     // Purity
  BLACK: '#000000'      // Solemnity
};

// Orthodox calendar functions
const getOrthodoxDate = (date, calendar = 'new') => {
  // Handle Julian/Gregorian calendar differences
  if (calendar === 'old') {
    return new Date(date.getTime() - (13 * 24 * 60 * 60 * 1000));
  }
  return date;
};
```

### Database Naming Conventions
```sql
-- Table naming: lowercase with underscores
CREATE TABLE baptism_records (
  id INT AUTO_INCREMENT PRIMARY KEY,
  church_id INT NOT NULL,
  baptized_name VARCHAR(255) NOT NULL,
  baptism_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index naming: table_column_idx
CREATE INDEX baptism_records_church_id_idx ON baptism_records(church_id);
```

## 🧪 Testing Guidelines

### Test Structure
```javascript
// Test file naming: *.test.js or *.spec.js
describe('Orthodox Records Service', () => {
  describe('Baptism Records', () => {
    beforeEach(async () => {
      await setupTestData();
    });

    test('should create baptism record', async () => {
      const record = await createBaptismRecord(testData);
      expect(record.id).toBeDefined();
      expect(record.church_id).toBe(testData.church_id);
    });

    afterEach(async () => {
      await cleanupTestData();
    });
  });
});
```

### Integration Testing
```bash
# Run integration tests
node testing/unified-tests.js --level full

# Test specific integration
node testing/test-ocr-integration.js
node testing/test-auth-integration.js
```

## 📚 Documentation Standards

### Code Documentation
```javascript
/**
 * Process Orthodox church document through OCR pipeline
 * @param {File} document - Uploaded document file
 * @param {Object} metadata - Document metadata
 * @param {string} metadata.type - Document type (baptism|marriage|funeral)
 * @param {string} metadata.language - Expected language (en|el|ru|ro|ka)
 * @param {number} metadata.churchId - Church ID for processing
 * @returns {Promise<Object>} OCR processing result
 * @throws {Error} If document processing fails
 */
const processOrthodoxDocument = async (document, metadata) => {
  // Implementation
};
```

### API Documentation
```javascript
/**
 * @api {post} /api/ocr/upload Upload Document for OCR Processing
 * @apiName UploadOCRDocument
 * @apiGroup OCR
 * @apiVersion 1.0.0
 * 
 * @apiParam {File} document Document file to process
 * @apiParam {String} type Document type (baptism, marriage, funeral)
 * @apiParam {String} language Expected language (en, el, ru, ro, ka)
 * 
 * @apiSuccess {Boolean} success Operation success status
 * @apiSuccess {Object} data OCR session data
 * @apiSuccess {String} data.sessionId Unique session identifier
 * 
 * @apiError {Boolean} success Always false for errors
 * @apiError {Object} error Error details
 */
```

## 🔄 Continuous Integration

### Git Workflow
```bash
# Feature development workflow
git checkout -b feature/new-orthodox-feature
git commit -m "feat: add Orthodox calendar integration"
git push origin feature/new-orthodox-feature

# Create pull request for review
```

### Pre-commit Hooks
```javascript
// .husky/pre-commit
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

npm run lint
npm run test:quick
npm run type-check
```

### Automated Testing
```yaml
# GitHub Actions workflow
name: Orthodox Metrics CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm run test:comprehensive
      - run: npm run build:production
```

---

This development guide provides comprehensive coverage of the new organized server structure and development workflows for Orthodox Metrics. For deployment-specific information, see the [Deployment Guide](DEPLOYMENT_GUIDE.md). 🏛️⚡
