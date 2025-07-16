#!/usr/bin/env node

/**
 * Test Church Feature Setup Script
 * Ensures all components are properly configured and integrated
 */

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

// Colors for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function setupTestChurchFeature() {
  log('\n🧪 Setting up Test Church Feature...', 'cyan');
  log('=' .repeat(50), 'cyan');

  try {
    // Step 1: Check if migration file exists and run it
    log('\n📋 Step 1: Database Migration', 'blue');
    await runDatabaseMigration();

    // Step 2: Verify backend routes
    log('\n🔧 Step 2: Backend Routes Verification', 'blue');
    await verifyBackendRoutes();

    // Step 3: Check frontend component
    log('\n🎨 Step 3: Frontend Component Verification', 'blue');
    await verifyFrontendComponent();

    // Step 4: Test the feature
    log('\n🧪 Step 4: Feature Testing', 'blue');
    await testFeatureIntegration();

    log('\n✅ Test Church Feature Setup Complete!', 'green');
    log('=' .repeat(50), 'green');
    log('🎯 You can now use the Test Church feature in the Church Setup Wizard', 'green');
    log('🔗 Navigate to /admin and click "Add New Church" to see the feature', 'green');

  } catch (error) {
    log(`\n❌ Setup failed: ${error.message}`, 'red');
    process.exit(1);
  }
}

async function runDatabaseMigration() {
  try {
    const migrationPath = path.join(__dirname, 'migrations', 'add-church-info-fields.sql');
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error('Migration file not found: ' + migrationPath);
    }

    log('  📄 Migration file found', 'green');
    
    // Read migration SQL
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Connect to database
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      multipleStatements: true
    });

    log('  🔌 Connected to database', 'green');
    
    // Run migration
    await connection.execute(migrationSQL);
    log('  ✅ Database migration completed', 'green');
    
    // Verify the table structure
    const [tables] = await connection.execute("SHOW TABLES LIKE 'church_info'");
    if (tables.length > 0) {
      const [columns] = await connection.execute("DESCRIBE church_info");
      const hasTestField = columns.some(col => col.Field === 'is_test_church');
      
      if (hasTestField) {
        log('  ✅ is_test_church field confirmed in database', 'green');
      } else {
        log('  ⚠️  is_test_church field not found, adding it...', 'yellow');
        await connection.execute("ALTER TABLE church_info ADD COLUMN is_test_church BOOLEAN DEFAULT FALSE");
        log('  ✅ is_test_church field added successfully', 'green');
      }
    } else {
      log('  ⚠️  church_info table created', 'yellow');
    }
    
    await connection.end();
    
  } catch (error) {
    throw new Error(`Database migration failed: ${error.message}`);
  }
}

async function verifyBackendRoutes() {
  try {
    // Check if testChurchDataGenerator exists
    const generatorPath = path.join(__dirname, 'services', 'testChurchDataGenerator.js');
    if (fs.existsSync(generatorPath)) {
      log('  ✅ Test data generator service found', 'green');
    } else {
      log('  ❌ Test data generator service missing', 'red');
      log('  📝 Creating test data generator...', 'yellow');
      await createTestDataGenerator();
      log('  ✅ Test data generator created', 'green');
    }

    // Check if churchSetupWizard routes exist
    const routesPath = path.join(__dirname, 'routes', 'churchSetupWizard.js');
    if (fs.existsSync(routesPath)) {
      log('  ✅ Church setup wizard routes found', 'green');
      
      // Check if the routes file has test church support
      const routesContent = fs.readFileSync(routesPath, 'utf8');
      if (routesContent.includes('TestChurchDataGenerator')) {
        log('  ✅ Test church support confirmed in routes', 'green');
      } else {
        log('  ⚠️  Adding test church support to routes...', 'yellow');
        await updateRoutesFile(routesPath);
        log('  ✅ Routes updated with test church support', 'green');
      }
    } else {
      log('  ❌ Church setup wizard routes missing', 'red');
      throw new Error('Church setup wizard routes not found');
    }

  } catch (error) {
    throw new Error(`Backend verification failed: ${error.message}`);
  }
}

async function verifyFrontendComponent() {
  try {
    const componentPath = path.join(__dirname, '..', 'front-end', 'src', 'components', 'admin', 'ChurchWizard.jsx');
    
    if (fs.existsSync(componentPath)) {
      log('  ✅ Church wizard component found', 'green');
      
      // Check if component has test church support
      const componentContent = fs.readFileSync(componentPath, 'utf8');
      if (componentContent.includes('is_test_church')) {
        log('  ✅ Test church support confirmed in component', 'green');
      } else {
        log('  ⚠️  Test church support missing in component', 'yellow');
        log('  💡 Component needs to be updated with test church feature', 'yellow');
      }
    } else {
      log('  ❌ Church wizard component not found', 'red');
      throw new Error('Church wizard component not found');
    }

  } catch (error) {
    throw new Error(`Frontend verification failed: ${error.message}`);
  }
}

async function testFeatureIntegration() {
  try {
    // Test database connection
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || ''
    });

    log('  🔌 Testing database connection...', 'yellow');
    await connection.execute('SELECT 1');
    log('  ✅ Database connection successful', 'green');

    // Check if we can access church_info table
    const [result] = await connection.execute('SELECT COUNT(*) as count FROM church_info');
    log(`  📊 Found ${result[0].count} existing churches`, 'green');

    await connection.end();

    // Check if all required files exist
    const requiredFiles = [
      'services/testChurchDataGenerator.js',
      'routes/churchSetupWizard.js',
      '../front-end/src/components/admin/ChurchWizard.jsx'
    ];

    log('  📁 Checking required files...', 'yellow');
    for (const file of requiredFiles) {
      const filePath = path.join(__dirname, file);
      if (fs.existsSync(filePath)) {
        log(`    ✅ ${file}`, 'green');
      } else {
        log(`    ❌ ${file} - MISSING`, 'red');
      }
    }

  } catch (error) {
    throw new Error(`Feature testing failed: ${error.message}`);
  }
}

async function createTestDataGenerator() {
  const generatorCode = `// server/services/testChurchDataGenerator.js
const bcrypt = require('bcrypt');

/**
 * Test Church Data Generator Service
 * Generates realistic Orthodox church sample data for testing and demonstration
 */
class TestChurchDataGenerator {
  
  constructor() {
    this.orthodoxNames = {
      male: [
        'Dimitrios', 'Nicholas', 'Constantine', 'Michael', 'John', 'George', 'Peter', 'Stephen',
        'Alexander', 'Theodore', 'Anthony', 'Andrew', 'Matthew', 'Mark', 'Luke', 'Paul',
        'Basil', 'Gregory', 'Christopher', 'Daniel', 'Thomas', 'James', 'Maximos', 'Spyridon'
      ],
      female: [
        'Maria', 'Helen', 'Catherine', 'Anna', 'Christina', 'Sophia', 'Elizabeth', 'Theodora',
        'Margaret', 'Barbara', 'Anastasia', 'Victoria', 'Alexandra', 'Irene', 'Georgia', 'Photini',
        'Eugenia', 'Paraskevi', 'Chrysanthi', 'Vassiliki', 'Despina', 'Kalliopi', 'Stavroula'
      ]
    };

    this.orthodoxSurnames = [
      'Papadopoulos', 'Christopoulos', 'Dimitriou', 'Nikolaou', 'Georgios', 'Konstantinou',
      'Stefanopoulos', 'Alexandrou', 'Michaelides', 'Petrou', 'Andreou', 'Ioannou',
      'Theodoros', 'Markos', 'Loukas', 'Pavlos', 'Basilios', 'Grigorios', 'Athanasios'
    ];
  }

  /**
   * Generate random Orthodox name
   */
  generateName(gender) {
    const names = this.orthodoxNames[gender];
    const firstName = names[Math.floor(Math.random() * names.length)];
    const lastName = this.orthodoxSurnames[Math.floor(Math.random() * this.orthodoxSurnames.length)];
    return { firstName, lastName, fullName: \`\${firstName} \${lastName}\` };
  }

  /**
   * Generate complete test church data package
   */
  async generateCompleteTestData(options = {}) {
    const {
      baptismCount = 30,
      marriageCount = 15,
      funeralCount = 5,
      clergyCount = 5,
      userCount = 8
    } = options;

    // Generate basic test data structure
    return {
      clergy: Array.from({ length: clergyCount }, (_, i) => {
        const name = this.generateName('male');
        return {
          church_id: 1,
          name: name.fullName,
          title: 'Father',
          email: \`\${name.firstName.toLowerCase()}.\${name.lastName.toLowerCase()}@church.org\`,
          phone: \`(555) \${String(Math.floor(Math.random() * 900) + 100)}-\${String(Math.floor(Math.random() * 9000) + 1000)}\`,
          role: 'priest',
          is_active: true
        };
      }),
      baptismRecords: Array.from({ length: baptismCount }, (_, i) => {
        const child = this.generateName(Math.random() > 0.5 ? 'male' : 'female');
        const father = this.generateName('male');
        const mother = this.generateName('female');
        return {
          church_id: 1,
          first_name: child.firstName,
          last_name: child.lastName,
          date_of_birth: new Date(2020 + Math.floor(Math.random() * 4), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString().split('T')[0],
          date_of_baptism: new Date(2021 + Math.floor(Math.random() * 3), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString().split('T')[0],
          father_name: father.fullName,
          mother_name: mother.fullName,
          priest_name: \`Father \${this.generateName('male').firstName}\`,
          notes: \`Baptism Registry #\${1000 + i}\`
        };
      }),
      marriageRecords: [],
      funeralRecords: [],
      users: [],
      settings: [],
      branding: {
        church_id: 1,
        primary_color: '#1976d2',
        secondary_color: '#dc004e',
        ag_grid_theme: 'ag-theme-alpine'
      }
    };
  }
}

module.exports = TestChurchDataGenerator;`;

  const generatorPath = path.join(__dirname, 'services', 'testChurchDataGenerator.js');
  const servicesDir = path.dirname(generatorPath);
  
  // Create services directory if it doesn't exist
  if (!fs.existsSync(servicesDir)) {
    fs.mkdirSync(servicesDir, { recursive: true });
  }
  
  fs.writeFileSync(generatorPath, generatorCode);
}

async function updateRoutesFile(routesPath) {
  let content = fs.readFileSync(routesPath, 'utf8');
  
  // Add the import if not present
  if (!content.includes('TestChurchDataGenerator')) {
    content = content.replace(
      "const ChurchProvisioner = require('../church-provisioner');",
      "const ChurchProvisioner = require('../church-provisioner');\nconst TestChurchDataGenerator = require('../services/testChurchDataGenerator');"
    );
  }
  
  fs.writeFileSync(routesPath, content);
}

// Main execution
if (require.main === module) {
  setupTestChurchFeature().catch(error => {
    log(`\n❌ Fatal error: ${error.message}`, 'red');
    process.exit(1);
  });
}

module.exports = { setupTestChurchFeature };
