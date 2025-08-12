# Development Setup Guide

## 🛠️ Orthodox Metrics Development Environment

This document provides comprehensive instructions for setting up the Orthodox Metrics development environment.

## 🎯 Prerequisites

### System Requirements
- **Operating System**: Windows 10/11, macOS 10.15+, or Linux (Ubuntu 18.04+)
- **Node.js**: Version 18.x or higher
- **npm**: Version 8.x or higher (comes with Node.js)
- **MySQL**: Version 8.0 or higher
- **Git**: Latest version
- **Visual Studio Code**: Recommended IDE

### Hardware Requirements
- **RAM**: Minimum 8GB, recommended 16GB
- **Storage**: Minimum 10GB free space
- **CPU**: 2+ cores recommended

## 📦 Software Installation

### 1. Node.js Installation

#### Windows
```bash
# Download and install from https://nodejs.org/
# Or use Chocolatey
choco install nodejs

# Verify installation
node --version
npm --version
```

#### macOS
```bash
# Using Homebrew
brew install node

# Or download from https://nodejs.org/

# Verify installation
node --version
npm --version
```

#### Linux (Ubuntu/Debian)
```bash
# Using NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

### 2. MySQL Installation

#### Windows
```bash
# Download MySQL installer from https://dev.mysql.com/downloads/installer/
# Or use Chocolatey
choco install mysql

# Start MySQL service
net start MySQL80
```

#### macOS
```bash
# Using Homebrew
brew install mysql

# Start MySQL service
brew services start mysql

# Secure installation
mysql_secure_installation
```

#### Linux (Ubuntu/Debian)
```bash
# Install MySQL
sudo apt update
sudo apt install mysql-server

# Start MySQL service
sudo systemctl start mysql
sudo systemctl enable mysql

# Secure installation
sudo mysql_secure_installation
```

### 3. Git Installation

#### Windows
```bash
# Download from https://git-scm.com/
# Or use Chocolatey
choco install git
```

#### macOS
```bash
# Using Homebrew
brew install git

# Or install Xcode command line tools
xcode-select --install
```

#### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install git
```

## 🏗️ Project Setup

### 1. Repository Clone

```bash
# Clone the repository
git clone https://github.com/your-org/orthodox-metrics.git
cd orthodox-metrics

# Create development branch
git checkout -b develop
```

### 2. Environment Configuration

#### Backend Environment Setup
```bash
# Navigate to server directory
cd server

# Copy environment template
cp .env.example .env

# Edit environment variables
nano .env
```

#### Environment Variables (.env)
```bash
# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=orthodox_metrics_dev

# Session Configuration
SESSION_SECRET=your-super-secret-session-key-change-this-in-production
SESSION_ENCRYPTION_KEY=your-32-byte-encryption-key-for-sessions

# Application Configuration
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:3001

# Security Configuration
BCRYPT_ROUNDS=12
JWT_SECRET=your-jwt-secret-key

# File Upload Configuration
UPLOAD_MAX_SIZE=10485760
UPLOAD_ALLOWED_TYPES=pdf,doc,docx,txt,jpg,jpeg,png,gif

# Email Configuration (optional)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password

# Redis Configuration (optional)
REDIS_HOST=localhost
REDIS_PORT=6379

# Logging Configuration
LOG_LEVEL=debug
LOG_FILE=logs/app.log
```

#### Frontend Environment Setup
```bash
# Navigate to frontend directory
cd ../front-end

# Copy environment template
cp .env.example .env

# Edit environment variables
nano .env
```

#### Frontend Environment Variables (.env)
```bash
# API Configuration
REACT_APP_API_URL=http://localhost:3000
REACT_APP_API_TIMEOUT=30000

# Application Configuration
REACT_APP_NAME=Orthodox Metrics
REACT_APP_VERSION=1.0.0

# Development Configuration
REACT_APP_ENV=development
REACT_APP_DEBUG=true
```

### 3. Database Setup

#### Create Development Database
```bash
# Connect to MySQL
mysql -u root -p

# Create database
CREATE DATABASE orthodox_metrics_dev;

# Create test database
CREATE DATABASE orthodox_metrics_test;

# Create development user (optional)
CREATE USER 'orthodox_dev'@'localhost' IDENTIFIED BY 'dev_password';
GRANT ALL PRIVILEGES ON orthodox_metrics_dev.* TO 'orthodox_dev'@'localhost';
GRANT ALL PRIVILEGES ON orthodox_metrics_test.* TO 'orthodox_dev'@'localhost';
FLUSH PRIVILEGES;

# Exit MySQL
EXIT;
```

#### Import Database Schema
```bash
# Navigate to server directory
cd server

# Import main schema
mysql -u root -p orthodox_metrics_dev < database/schema.sql

# Import test schema
mysql -u root -p orthodox_metrics_test < database/schema.sql

# Import sample data (optional)
mysql -u root -p orthodox_metrics_dev < database/sample_data.sql
```

### 4. Dependencies Installation

#### Backend Dependencies
```bash
# Navigate to server directory
cd server

# Install production dependencies
npm install

# Install development dependencies
npm install --save-dev \
  jest \
  supertest \
  nodemon \
  eslint \
  prettier
```

#### Frontend Dependencies
```bash
# Navigate to frontend directory
cd ../front-end

# Install production dependencies
npm install

# Install development dependencies
npm install --save-dev \
  @testing-library/react \
  @testing-library/jest-dom \
  @testing-library/user-event \
  cypress \
  eslint \
  prettier
```

## 🔧 Development Tools Configuration

### 1. ESLint Configuration

#### Backend ESLint (.eslintrc.js)
```javascript
// server/.eslintrc.js
module.exports = {
  env: {
    node: true,
    es2021: true,
    jest: true
  },
  extends: [
    'eslint:recommended'
  ],
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module'
  },
  rules: {
    'no-console': 'warn',
    'no-unused-vars': 'error',
    'no-undef': 'error',
    'indent': ['error', 2],
    'quotes': ['error', 'single'],
    'semi': ['error', 'always']
  }
};
```

#### Frontend ESLint (.eslintrc.js)
```javascript
// front-end/.eslintrc.js
module.exports = {
  env: {
    browser: true,
    es2021: true,
    jest: true
  },
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
    'react-app',
    'react-app/jest'
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaFeatures: {
      jsx: true
    },
    ecmaVersion: 2021,
    sourceType: 'module'
  },
  plugins: [
    'react',
    '@typescript-eslint'
  ],
  rules: {
    'react/prop-types': 'off',
    '@typescript-eslint/no-unused-vars': 'error',
    'no-console': 'warn'
  }
};
```

### 2. Prettier Configuration

#### Prettier Config (.prettierrc)
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false,
  "bracketSpacing": true,
  "arrowParens": "avoid",
  "endOfLine": "lf"
}
```

### 3. VS Code Configuration

#### Workspace Settings (.vscode/settings.json)
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.preferences.importModuleSpecifier": "relative",
  "emmet.includeLanguages": {
    "javascript": "javascriptreact",
    "typescript": "typescriptreact"
  },
  "files.exclude": {
    "**/node_modules": true,
    "**/coverage": true,
    "**/dist": true,
    "**/build": true
  }
}
```

#### Recommended Extensions (.vscode/extensions.json)
```json
{
  "recommendations": [
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-typescript-next",
    "formulahendry.auto-rename-tag",
    "christian-kohler.path-intellisense",
    "ms-vscode.vscode-json",
    "redhat.vscode-yaml",
    "ms-vscode.vscode-docker"
  ]
}
```

## 🚀 Development Scripts

### 1. Package.json Scripts

#### Backend Scripts (server/package.json)
```json
{
  "scripts": {
    "start": "node index.js",
    "dev": "nodemon index.js",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "format": "prettier --write .",
    "migrate": "node database/migrate.js",
    "seed": "node database/seed.js",
    "db:reset": "npm run migrate && npm run seed"
  }
}
```

#### Frontend Scripts (front-end/package.json)
```json
{
  "scripts": {
    "start": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:e2e": "cypress open",
    "test:e2e:run": "cypress run",
    "lint": "eslint src --ext .ts,.tsx",
    "lint:fix": "eslint src --ext .ts,.tsx --fix",
    "format": "prettier --write src",
    "type-check": "tsc --noEmit"
  }
}
```

### 2. Development Helper Scripts

#### Database Reset Script
```bash
#!/bin/bash
# scripts/reset-db.sh

echo "Resetting development database..."

# Drop and recreate database
mysql -u root -p -e "DROP DATABASE IF EXISTS orthodox_metrics_dev; CREATE DATABASE orthodox_metrics_dev;"

# Import schema
mysql -u root -p orthodox_metrics_dev < server/database/schema.sql

# Import sample data
mysql -u root -p orthodox_metrics_dev < server/database/sample_data.sql

echo "Database reset complete!"
```

#### Development Start Script
```bash
#!/bin/bash
# scripts/dev-start.sh

echo "Starting Orthodox Metrics development environment..."

# Start backend
cd server
npm run dev &
BACKEND_PID=$!

# Start frontend
cd ../front-end
npm start &
FRONTEND_PID=$!

echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"

# Wait for processes
wait $BACKEND_PID $FRONTEND_PID
```

## 🔍 Development Workflow

### 1. Daily Development Routine

#### Morning Setup
```bash
# Pull latest changes
git pull origin develop

# Check for dependency updates
npm outdated

# Start development servers
npm run dev
```

#### Feature Development
```bash
# Create feature branch
git checkout -b feature/new-feature

# Make changes and commit
git add .
git commit -m "feat: add new feature"

# Push feature branch
git push origin feature/new-feature

# Create pull request
```

#### Testing Workflow
```bash
# Run all tests
npm test

# Run specific test types
npm run test:unit
npm run test:integration
npm run test:e2e

# Run tests with coverage
npm run test:coverage
```

### 2. Code Quality Checks

#### Pre-commit Hooks
```bash
# Install husky for git hooks
npm install --save-dev husky

# Setup pre-commit hook
npx husky install
npx husky add .husky/pre-commit "npm run lint && npm run test"
```

#### Code Review Checklist
- [ ] Code follows ESLint rules
- [ ] All tests pass
- [ ] Code coverage meets requirements
- [ ] No console.log statements in production code
- [ ] Proper error handling
- [ ] Security best practices followed
- [ ] Documentation updated

## 🐛 Debugging Setup

### 1. VS Code Debugging

#### Debug Configuration (.vscode/launch.json)
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Backend",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/server/index.js",
      "env": {
        "NODE_ENV": "development"
      },
      "console": "integratedTerminal",
      "restart": true,
      "runtimeExecutable": "nodemon",
      "runtimeArgs": ["--inspect"]
    },
    {
      "name": "Debug Frontend",
      "type": "pwa-chrome",
      "request": "launch",
      "url": "http://localhost:3001",
      "webRoot": "${workspaceFolder}/front-end/src"
    },
    {
      "name": "Debug Tests",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/server/node_modules/.bin/jest",
      "args": ["--runInBand", "--no-coverage"],
      "console": "integratedTerminal"
    }
  ]
}
```

### 2. Logging Setup

#### Development Logger
```javascript
// server/utils/devLogger.js
const winston = require('winston');

const devLogger = winston.createLogger({
  level: 'debug',
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      return `${timestamp} [${level}]: ${message} ${
        Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''
      }`;
    })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/dev.log' })
  ]
});

module.exports = devLogger;
```

## 🔧 Common Issues and Solutions

### 1. Database Connection Issues

#### MySQL Connection Errors
```bash
# Check MySQL service status
sudo systemctl status mysql

# Reset MySQL password
sudo mysql_secure_installation

# Check MySQL logs
sudo tail -f /var/log/mysql/error.log
```

### 2. Port Conflicts

#### Check Port Usage
```bash
# Check what's using port 3000
lsof -i :3000

# Kill process on port
kill -9 $(lsof -t -i :3000)
```

### 3. Node.js Version Issues

#### Node Version Management
```bash
# Install nvm (Node Version Manager)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Install and use Node.js 18
nvm install 18
nvm use 18

# Set default version
nvm alias default 18
```

### 4. Permission Issues

#### Fix npm Permission Issues
```bash
# Configure npm to use different directory
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'

# Add to PATH in ~/.bashrc or ~/.zshrc
export PATH=~/.npm-global/bin:$PATH
```

## 📚 Development Resources

### 1. Documentation Links
- **Node.js**: https://nodejs.org/docs/
- **Express.js**: https://expressjs.com/
- **React**: https://reactjs.org/docs/
- **MySQL**: https://dev.mysql.com/doc/
- **Jest**: https://jestjs.io/docs/
- **Cypress**: https://docs.cypress.io/

### 2. Code Style Guides
- **JavaScript**: https://standardjs.com/
- **React**: https://react.dev/learn
- **TypeScript**: https://www.typescriptlang.org/docs/

### 3. Development Tools
- **Postman**: API testing
- **MySQL Workbench**: Database management
- **Git GUI**: Source control
- **Chrome DevTools**: Browser debugging

## 🎯 Next Steps

After completing the development setup:

1. **Read the Architecture Documentation**: Understand the system structure
2. **Review the API Documentation**: Learn the available endpoints
3. **Run the Test Suite**: Ensure everything works correctly
4. **Create Your First Feature**: Start with a simple enhancement
5. **Join the Development Team**: Participate in code reviews and discussions

---

*This development setup guide should be updated whenever development tools, processes, or requirements change.*
