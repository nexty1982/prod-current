# Testing Guide

## 🧪 Orthodox Metrics Testing Framework

This document provides comprehensive testing procedures and scripts for the Orthodox Metrics church management system.

## 🎯 Testing Overview

### Testing Strategy
- **Unit Testing**: Individual component and function testing
- **Integration Testing**: API endpoint and database testing
- **End-to-End Testing**: Complete user workflow testing
- **Security Testing**: Authentication and authorization testing
- **Performance Testing**: Load and stress testing
- **Manual Testing**: User acceptance testing

### Testing Levels
1. **Component Level**: Frontend components and backend functions
2. **API Level**: REST endpoint testing
3. **Database Level**: Data integrity and query testing
4. **System Level**: Complete workflow testing
5. **Security Level**: Authentication and authorization testing

## 🔧 Test Environment Setup

### 1. Development Environment

#### Test Database Setup
```bash
# Create test database
mysql -u root -p -e "CREATE DATABASE orthodox_metrics_test;"

# Import test schema
mysql -u root -p orthodox_metrics_test < database/schema.sql

# Import test data
mysql -u root -p orthodox_metrics_test < database/test_data.sql
```

#### Environment Configuration
```bash
# .env.test
NODE_ENV=test
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=orthodox_metrics_test
SESSION_SECRET=test_secret_key
JWT_SECRET=test_jwt_secret
```

### 2. Testing Dependencies

#### Package Installation
```bash
# Install testing dependencies
npm install --save-dev \
  jest \
  supertest \
  @testing-library/react \
  @testing-library/jest-dom \
  cypress \
  artillery \
  eslint-plugin-jest
```

#### Jest Configuration
```javascript
// jest.config.js
module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testMatch: [
    '<rootDir>/tests/**/*.test.js',
    '<rootDir>/tests/**/*.spec.js'
  ],
  collectCoverageFrom: [
    'server/**/*.js',
    '!server/node_modules/**',
    '!server/tests/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html']
};
```

## 🧪 Unit Testing

### 1. Backend Unit Tests

#### Authentication Tests
```javascript
// tests/auth.test.js
const request = require('supertest');
const app = require('../server/index');
const db = require('../server/database/connection');

describe('Authentication', () => {
  beforeEach(async () => {
    // Clear users table
    await db.execute('DELETE FROM users');
    
    // Insert test user
    await db.execute(`
      INSERT INTO users (email, password, name, role, is_active) 
      VALUES ('test@example.com', '$2a$10$hashedpassword', 'Test User', 'admin', 1)
    `);
  });

  describe('POST /auth/login', () => {
    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe('test@example.com');
    });

    it('should reject invalid credentials', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid credentials');
    });

    it('should reject inactive user', async () => {
      // Deactivate user
      await db.execute('UPDATE users SET is_active = 0 WHERE email = ?', ['test@example.com']);

      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Account is inactive');
    });
  });

  describe('POST /auth/logout', () => {
    it('should logout successfully', async () => {
      // Login first
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      const cookies = loginResponse.headers['set-cookie'];

      // Logout
      const response = await request(app)
        .post('/auth/logout')
        .set('Cookie', cookies);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Logout successful');
    });
  });
});
```

#### User Management Tests
```javascript
// tests/userManagement.test.js
const request = require('supertest');
const app = require('../server/index');
const db = require('../server/database/connection');

describe('User Management', () => {
  let adminSession;

  beforeEach(async () => {
    // Clear users table
    await db.execute('DELETE FROM users');
    
    // Insert admin user
    await db.execute(`
      INSERT INTO users (email, password, name, role, is_active) 
      VALUES ('admin@example.com', '$2a$10$hashedpassword', 'Admin User', 'admin', 1)
    `);

    // Login as admin
    const loginResponse = await request(app)
      .post('/auth/login')
      .send({
        email: 'admin@example.com',
        password: 'password123'
      });

    adminSession = loginResponse.headers['set-cookie'];
  });

  describe('GET /admin/users', () => {
    it('should get all users', async () => {
      const response = await request(app)
        .get('/admin/users')
        .set('Cookie', adminSession);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.users).toBeDefined();
      expect(Array.isArray(response.body.users)).toBe(true);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/admin/users');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /admin/users', () => {
    it('should create new user', async () => {
      const userData = {
        email: 'newuser@example.com',
        name: 'New User',
        password: 'password123',
        role: 'user'
      };

      const response = await request(app)
        .post('/admin/users')
        .set('Cookie', adminSession)
        .send(userData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.user.email).toBe(userData.email);
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/admin/users')
        .set('Cookie', adminSession)
        .send({
          email: 'test@example.com'
          // Missing name and password
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /admin/users/:id/toggle', () => {
    it('should toggle user status', async () => {
      // Create test user
      const [result] = await db.execute(`
        INSERT INTO users (email, password, name, role, is_active) 
        VALUES ('toggleuser@example.com', '$2a$10$hashedpassword', 'Toggle User', 'user', 1)
      `);

      const userId = result.insertId;

      const response = await request(app)
        .put(`/admin/users/${userId}/toggle`)
        .set('Cookie', adminSession);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.is_active).toBe(false);
    });
  });
});
```

### 2. Frontend Unit Tests

#### Component Testing
```javascript
// front-end/src/components/__tests__/Login.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Login } from '../Login';
import { AuthProvider } from '../../contexts/AuthContext';

// Mock the auth service
jest.mock('../../services/auth', () => ({
  authService: {
    login: jest.fn()
  }
}));

describe('Login Component', () => {
  const renderLogin = () => {
    return render(
      <AuthProvider>
        <Login />
      </AuthProvider>
    );
  };

  it('should render login form', () => {
    renderLogin();
    
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
  });

  it('should validate required fields', async () => {
    renderLogin();
    
    const loginButton = screen.getByRole('button', { name: /login/i });
    fireEvent.click(loginButton);
    
    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    });
  });

  it('should submit login form', async () => {
    const mockLogin = require('../../services/auth').authService.login;
    mockLogin.mockResolvedValue({
      success: true,
      user: { id: 1, email: 'test@example.com' }
    });

    renderLogin();
    
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const loginButton = screen.getByRole('button', { name: /login/i });
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(loginButton);
    
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123'
      });
    });
  });
});
```

#### Hook Testing
```javascript
// front-end/src/hooks/__tests__/useAuth.test.ts
import { renderHook, act } from '@testing-library/react';
import { useAuth } from '../useAuth';
import { AuthProvider } from '../../contexts/AuthContext';

describe('useAuth Hook', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  );

  it('should initialize with no user', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    
    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('should login user', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    
    await act(async () => {
      await result.current.login({
        email: 'test@example.com',
        password: 'password123'
      });
    });
    
    expect(result.current.user).toBeDefined();
    expect(result.current.isAuthenticated).toBe(true);
  });
});
```

## 🔗 Integration Testing

### 1. API Integration Tests

#### Complete API Flow Tests
```javascript
// tests/integration/apiFlow.test.js
const request = require('supertest');
const app = require('../../server/index');
const db = require('../../server/database/connection');

describe('API Integration Flow', () => {
  let adminSession;
  let createdUserId;

  beforeAll(async () => {
    // Setup test database
    await db.execute('DELETE FROM users');
    await db.execute(`
      INSERT INTO users (email, password, name, role, is_active) 
      VALUES ('admin@example.com', '$2a$10$hashedpassword', 'Admin', 'admin', 1)
    `);
  });

  describe('Complete User Management Flow', () => {
    it('should complete full user lifecycle', async () => {
      // Step 1: Admin login
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          email: 'admin@example.com',
          password: 'password123'
        });

      expect(loginResponse.status).toBe(200);
      adminSession = loginResponse.headers['set-cookie'];

      // Step 2: Create user
      const createResponse = await request(app)
        .post('/admin/users')
        .set('Cookie', adminSession)
        .send({
          email: 'newuser@example.com',
          name: 'New User',
          password: 'password123',
          role: 'user'
        });

      expect(createResponse.status).toBe(201);
      createdUserId = createResponse.body.user.id;

      // Step 3: Get users list
      const getUsersResponse = await request(app)
        .get('/admin/users')
        .set('Cookie', adminSession);

      expect(getUsersResponse.status).toBe(200);
      expect(getUsersResponse.body.users).toHaveLength(2);

      // Step 4: Update user
      const updateResponse = await request(app)
        .put(`/admin/users/${createdUserId}`)
        .set('Cookie', adminSession)
        .send({
          name: 'Updated User Name'
        });

      expect(updateResponse.status).toBe(200);

      // Step 5: Toggle user status
      const toggleResponse = await request(app)
        .put(`/admin/users/${createdUserId}/toggle`)
        .set('Cookie', adminSession);

      expect(toggleResponse.status).toBe(200);
      expect(toggleResponse.body.is_active).toBe(false);

      // Step 6: Delete user
      const deleteResponse = await request(app)
        .delete(`/admin/users/${createdUserId}`)
        .set('Cookie', adminSession);

      expect(deleteResponse.status).toBe(200);

      // Step 7: Verify deletion
      const finalGetResponse = await request(app)
        .get('/admin/users')
        .set('Cookie', adminSession);

      expect(finalGetResponse.body.users).toHaveLength(1);
    });
  });
});
```

### 2. Database Integration Tests

#### Database Operations Testing
```javascript
// tests/integration/database.test.js
const db = require('../../server/database/connection');

describe('Database Operations', () => {
  beforeEach(async () => {
    // Clear test data
    await db.execute('DELETE FROM users WHERE email LIKE "%test%"');
  });

  describe('User Operations', () => {
    it('should insert and retrieve user', async () => {
      // Insert user
      const [insertResult] = await db.execute(`
        INSERT INTO users (email, password, name, role, is_active) 
        VALUES ('dbtest@example.com', 'hashedpassword', 'DB Test', 'user', 1)
      `);

      expect(insertResult.insertId).toBeDefined();

      // Retrieve user
      const [users] = await db.execute(
        'SELECT * FROM users WHERE id = ?',
        [insertResult.insertId]
      );

      expect(users).toHaveLength(1);
      expect(users[0].email).toBe('dbtest@example.com');
    });

    it('should handle duplicate email constraint', async () => {
      // Insert first user
      await db.execute(`
        INSERT INTO users (email, password, name, role, is_active) 
        VALUES ('duplicate@example.com', 'hashedpassword', 'User 1', 'user', 1)
      `);

      // Try to insert duplicate
      await expect(
        db.execute(`
          INSERT INTO users (email, password, name, role, is_active) 
          VALUES ('duplicate@example.com', 'hashedpassword', 'User 2', 'user', 1)
        `)
      ).rejects.toThrow();
    });
  });

  describe('Session Operations', () => {
    it('should store and retrieve session', async () => {
      const sessionId = 'test-session-id';
      const sessionData = JSON.stringify({
        user: { id: 1, email: 'test@example.com' },
        loginTime: new Date()
      });

      // Store session
      await db.execute(`
        INSERT INTO sessions (session_id, expires, data) 
        VALUES (?, DATE_ADD(NOW(), INTERVAL 1 HOUR), ?)
      `, [sessionId, sessionData]);

      // Retrieve session
      const [sessions] = await db.execute(
        'SELECT * FROM sessions WHERE session_id = ?',
        [sessionId]
      );

      expect(sessions).toHaveLength(1);
      expect(sessions[0].session_id).toBe(sessionId);
    });
  });
});
```

## 🚀 End-to-End Testing

### 1. Cypress E2E Tests

#### E2E Test Setup
```javascript
// cypress/support/commands.js
Cypress.Commands.add('login', (email, password) => {
  cy.request({
    method: 'POST',
    url: '/auth/login',
    body: { email, password }
  }).then((response) => {
    expect(response.status).to.eq(200);
    expect(response.body.success).to.be.true;
  });
});

Cypress.Commands.add('createUser', (userData) => {
  cy.request({
    method: 'POST',
    url: '/admin/users',
    body: userData
  }).then((response) => {
    expect(response.status).to.eq(201);
    return response.body.user;
  });
});
```

#### User Management E2E Tests
```javascript
// cypress/e2e/userManagement.cy.js
describe('User Management E2E', () => {
  beforeEach(() => {
    // Login as admin
    cy.login('admin@example.com', 'password123');
    cy.visit('/admin/users');
  });

  it('should create new user', () => {
    // Click create user button
    cy.get('[data-cy="create-user-button"]').click();

    // Fill form
    cy.get('[data-cy="user-name"]').type('Test User');
    cy.get('[data-cy="user-email"]').type('testuser@example.com');
    cy.get('[data-cy="user-password"]').type('password123');
    cy.get('[data-cy="user-role"]').select('user');

    // Submit form
    cy.get('[data-cy="submit-button"]').click();

    // Verify success message
    cy.get('[data-cy="success-message"]').should('contain', 'User created successfully');

    // Verify user appears in list
    cy.get('[data-cy="users-table"]').should('contain', 'testuser@example.com');
  });

  it('should edit user', () => {
    // Find user row and click edit
    cy.get('[data-cy="users-table"]')
      .contains('testuser@example.com')
      .closest('tr')
      .find('[data-cy="edit-button"]')
      .click();

    // Update name
    cy.get('[data-cy="user-name"]').clear().type('Updated User');

    // Submit changes
    cy.get('[data-cy="submit-button"]').click();

    // Verify update
    cy.get('[data-cy="success-message"]').should('contain', 'User updated successfully');
    cy.get('[data-cy="users-table"]').should('contain', 'Updated User');
  });

  it('should toggle user status', () => {
    // Find user and click toggle
    cy.get('[data-cy="users-table"]')
      .contains('testuser@example.com')
      .closest('tr')
      .find('[data-cy="toggle-button"]')
      .click();

    // Verify status change
    cy.get('[data-cy="users-table"]')
      .contains('testuser@example.com')
      .closest('tr')
      .should('contain', 'Inactive');
  });

  it('should delete user', () => {
    // Find user and click delete
    cy.get('[data-cy="users-table"]')
      .contains('testuser@example.com')
      .closest('tr')
      .find('[data-cy="delete-button"]')
      .click();

    // Confirm deletion
    cy.get('[data-cy="confirm-delete"]').click();

    // Verify user is removed
    cy.get('[data-cy="users-table"]').should('not.contain', 'testuser@example.com');
  });
});
```

#### Authentication E2E Tests
```javascript
// cypress/e2e/authentication.cy.js
describe('Authentication E2E', () => {
  it('should login and logout', () => {
    // Visit login page
    cy.visit('/login');

    // Enter credentials
    cy.get('[data-cy="email"]').type('admin@example.com');
    cy.get('[data-cy="password"]').type('password123');

    // Submit login
    cy.get('[data-cy="login-button"]').click();

    // Verify redirect to dashboard
    cy.url().should('include', '/admin/dashboard');
    cy.get('[data-cy="welcome-message"]').should('contain', 'Welcome');

    // Logout
    cy.get('[data-cy="logout-button"]').click();

    // Verify redirect to login
    cy.url().should('include', '/login');
  });

  it('should handle invalid credentials', () => {
    cy.visit('/login');

    cy.get('[data-cy="email"]').type('admin@example.com');
    cy.get('[data-cy="password"]').type('wrongpassword');
    cy.get('[data-cy="login-button"]').click();

    // Verify error message
    cy.get('[data-cy="error-message"]').should('contain', 'Invalid credentials');
  });

  it('should protect admin routes', () => {
    // Try to access admin page without login
    cy.visit('/admin/users');

    // Should redirect to login
    cy.url().should('include', '/login');
  });
});
```

## 🔒 Security Testing

### 1. Authentication Security Tests

#### Authentication Security Testing
```javascript
// tests/security/auth.test.js
const request = require('supertest');
const app = require('../../server/index');

describe('Authentication Security', () => {
  describe('Rate Limiting', () => {
    it('should rate limit login attempts', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };

      // Make multiple failed attempts
      for (let i = 0; i < 6; i++) {
        await request(app)
          .post('/auth/login')
          .send(credentials);
      }

      // Next attempt should be rate limited
      const response = await request(app)
        .post('/auth/login')
        .send(credentials);

      expect(response.status).toBe(429);
      expect(response.body.error).toMatch(/too many/i);
    });
  });

  describe('Input Validation', () => {
    it('should reject SQL injection attempts', async () => {
      const maliciousInput = {
        email: "'; DROP TABLE users; --",
        password: 'password'
      };

      const response = await request(app)
        .post('/auth/login')
        .send(maliciousInput);

      expect(response.status).toBe(400);
    });

    it('should reject XSS attempts', async () => {
      const maliciousInput = {
        email: '<script>alert("xss")</script>',
        password: 'password'
      };

      const response = await request(app)
        .post('/auth/login')
        .send(maliciousInput);

      expect(response.status).toBe(400);
    });
  });

  describe('Session Security', () => {
    it('should set secure session cookies', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'admin@example.com',
          password: 'password123'
        });

      const setCookie = response.headers['set-cookie'];
      expect(setCookie).toBeDefined();
      expect(setCookie[0]).toMatch(/HttpOnly/);
      expect(setCookie[0]).toMatch(/SameSite=strict/);
    });
  });
});
```

### 2. Authorization Security Tests

#### Authorization Testing
```javascript
// tests/security/authorization.test.js
const request = require('supertest');
const app = require('../../server/index');

describe('Authorization Security', () => {
  let userSession;
  let adminSession;

  beforeEach(async () => {
    // Create regular user session
    const userLogin = await request(app)
      .post('/auth/login')
      .send({
        email: 'user@example.com',
        password: 'password123'
      });
    userSession = userLogin.headers['set-cookie'];

    // Create admin session
    const adminLogin = await request(app)
      .post('/auth/login')
      .send({
        email: 'admin@example.com',
        password: 'password123'
      });
    adminSession = adminLogin.headers['set-cookie'];
  });

  describe('Role-Based Access', () => {
    it('should allow admin access to admin routes', async () => {
      const response = await request(app)
        .get('/admin/users')
        .set('Cookie', adminSession);

      expect(response.status).toBe(200);
    });

    it('should deny user access to admin routes', async () => {
      const response = await request(app)
        .get('/admin/users')
        .set('Cookie', userSession);

      expect(response.status).toBe(403);
    });

    it('should deny unauthenticated access', async () => {
      const response = await request(app)
        .get('/admin/users');

      expect(response.status).toBe(401);
    });
  });

  describe('Resource Access Control', () => {
    it('should prevent user from accessing other users data', async () => {
      // Try to access another user's profile
      const response = await request(app)
        .get('/admin/users/2')
        .set('Cookie', userSession);

      expect(response.status).toBe(403);
    });
  });
});
```

## 🚀 Performance Testing

### 1. Load Testing with Artillery

#### Load Testing Configuration
```yaml
# artillery.yml
config:
  target: 'http://localhost:3000'
  phases:
    - duration: 60
      arrivalRate: 10
      name: "Warm up"
    - duration: 120
      arrivalRate: 50
      name: "Load test"
    - duration: 60
      arrivalRate: 100
      name: "Stress test"
  processor: "./artillery-processor.js"

scenarios:
  - name: "Login and browse"
    weight: 70
    flow:
      - post:
          url: "/auth/login"
          json:
            email: "{{ $randomEmail }}"
            password: "password123"
          capture:
            - json: "$.success"
              as: "loginSuccess"
      - get:
          url: "/admin/users"
          headers:
            Cookie: "{{ sessionCookie }}"
      - get:
          url: "/admin/churches"
          headers:
            Cookie: "{{ sessionCookie }}"

  - name: "API stress test"
    weight: 30
    flow:
      - get:
          url: "/api/admin/users"
          headers:
            Cookie: "{{ sessionCookie }}"
      - post:
          url: "/api/admin/users"
          headers:
            Cookie: "{{ sessionCookie }}"
          json:
            name: "Test User {{ $randomInt }}"
            email: "test{{ $randomInt }}@example.com"
            password: "password123"
```

#### Performance Test Scripts
```javascript
// tests/performance/loadTest.js
const artillery = require('artillery');
const path = require('path');

const runLoadTest = async () => {
  const configPath = path.join(__dirname, 'artillery.yml');
  
  const runner = artillery.runner(configPath);
  
  runner.on('phaseStarted', (phase) => {
    console.log(`Phase started: ${phase.name}`);
  });
  
  runner.on('phaseCompleted', (phase) => {
    console.log(`Phase completed: ${phase.name}`);
  });
  
  runner.on('done', (report) => {
    console.log('Load test completed');
    console.log('Summary:', report.aggregate);
  });
  
  runner.run();
};

// Database performance test
const testDatabasePerformance = async () => {
  const db = require('../../server/database/connection');
  
  const startTime = Date.now();
  const iterations = 1000;
  
  for (let i = 0; i < iterations; i++) {
    await db.execute('SELECT * FROM users WHERE id = ?', [1]);
  }
  
  const endTime = Date.now();
  const avgTime = (endTime - startTime) / iterations;
  
  console.log(`Database performance: ${avgTime}ms per query`);
};

if (require.main === module) {
  runLoadTest();
  testDatabasePerformance();
}
```

### 2. Memory and CPU Testing

#### Performance Monitoring
```javascript
// tests/performance/monitor.js
const pidusage = require('pidusage');

const monitorPerformance = (pid, duration = 60000) => {
  const stats = [];
  
  const interval = setInterval(async () => {
    try {
      const stat = await pidusage(pid);
      stats.push({
        timestamp: Date.now(),
        cpu: stat.cpu,
        memory: stat.memory,
        elapsed: stat.elapsed
      });
    } catch (error) {
      console.error('Performance monitoring error:', error);
    }
  }, 1000);
  
  setTimeout(() => {
    clearInterval(interval);
    
    const avgCPU = stats.reduce((sum, stat) => sum + stat.cpu, 0) / stats.length;
    const avgMemory = stats.reduce((sum, stat) => sum + stat.memory, 0) / stats.length;
    
    console.log('Performance Summary:');
    console.log(`Average CPU: ${avgCPU.toFixed(2)}%`);
    console.log(`Average Memory: ${(avgMemory / 1024 / 1024).toFixed(2)}MB`);
    console.log(`Total samples: ${stats.length}`);
  }, duration);
};

module.exports = { monitorPerformance };
```

## 🔄 Test Automation

### 1. Continuous Integration Testing

#### GitHub Actions Workflow
```yaml
# .github/workflows/test.yml
name: Test Suite

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      mysql:
        image: mysql:8.0
        env:
          MYSQL_ROOT_PASSWORD: password
          MYSQL_DATABASE: orthodox_metrics_test
        ports:
          - 3306:3306
        options: --health-cmd="mysqladmin ping" --health-interval=10s --health-timeout=5s --health-retries=3

    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Setup test database
      run: |
        mysql -h 127.0.0.1 -u root -ppassword orthodox_metrics_test < database/schema.sql
    
    - name: Run unit tests
      run: npm run test:unit
      env:
        DB_HOST: 127.0.0.1
        DB_USER: root
        DB_PASSWORD: password
        DB_NAME: orthodox_metrics_test
    
    - name: Run integration tests
      run: npm run test:integration
      env:
        DB_HOST: 127.0.0.1
        DB_USER: root
        DB_PASSWORD: password
        DB_NAME: orthodox_metrics_test
    
    - name: Run E2E tests
      run: npm run test:e2e
    
    - name: Upload coverage reports
      uses: codecov/codecov-action@v3
```

### 2. Test Scripts

#### Package.json Test Scripts
```json
{
  "scripts": {
    "test": "npm run test:unit && npm run test:integration",
    "test:unit": "jest --testMatch='**/tests/unit/**/*.test.js'",
    "test:integration": "jest --testMatch='**/tests/integration/**/*.test.js'",
    "test:e2e": "cypress run",
    "test:e2e:open": "cypress open",
    "test:security": "jest --testMatch='**/tests/security/**/*.test.js'",
    "test:performance": "node tests/performance/loadTest.js",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:all": "npm run test:unit && npm run test:integration && npm run test:e2e && npm run test:security"
  }
}
```

## 📊 Test Reporting

### 1. Test Results Dashboard

#### Test Results Analysis
```javascript
// tests/utils/testReporter.js
const fs = require('fs');
const path = require('path');

class TestReporter {
  constructor() {
    this.results = {
      unit: [],
      integration: [],
      e2e: [],
      security: [],
      performance: []
    };
  }

  addResult(type, result) {
    this.results[type].push(result);
  }

  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        coverage: 0
      },
      details: this.results
    };

    // Calculate summary
    Object.values(this.results).forEach(typeResults => {
      typeResults.forEach(result => {
        report.summary.total++;
        if (result.status === 'passed') {
          report.summary.passed++;
        } else {
          report.summary.failed++;
        }
      });
    });

    return report;
  }

  saveReport(filename) {
    const report = this.generateReport();
    const reportPath = path.join(__dirname, '../reports', filename);
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`Test report saved to: ${reportPath}`);
  }
}

module.exports = TestReporter;
```

### 2. Coverage Reporting

#### Coverage Configuration
```javascript
// jest.config.js (coverage section)
module.exports = {
  // ... other config
  collectCoverageFrom: [
    'server/**/*.js',
    '!server/node_modules/**',
    '!server/tests/**',
    '!server/coverage/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
```

---

*This testing guide provides comprehensive coverage of testing procedures for the Orthodox Metrics system. It should be updated whenever new features are added or testing procedures are modified.*
