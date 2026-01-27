# Orthodox Metrics System - Performance Optimization Guide

## Overview

This guide provides comprehensive performance optimization strategies for the Orthodox Metrics church management system. It covers frontend optimization, backend performance tuning, database optimization, and system-level improvements.

## Frontend Performance Optimization

### 1. React Application Optimization

#### Code Splitting and Lazy Loading
```javascript
// src/App.tsx
import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LoadingSpinner from './components/LoadingSpinner';

// Lazy load components
const Dashboard = lazy(() => import('./pages/Dashboard'));
const UserManagement = lazy(() => import('./pages/UserManagement'));
const ChurchManagement = lazy(() => import('./pages/ChurchManagement'));
const Reports = lazy(() => import('./pages/Reports'));

function App() {
  return (
    <Router>
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/users" element={<UserManagement />} />
          <Route path="/churches" element={<ChurchManagement />} />
          <Route path="/reports" element={<Reports />} />
        </Routes>
      </Suspense>
    </Router>
  );
}
```

#### Memoization and Performance Hooks
```javascript
// src/components/UserList.tsx
import React, { memo, useMemo, useCallback } from 'react';

const UserList = memo(({ users, onUserSelect, onUserDelete }) => {
  // Memoize expensive calculations
  const sortedUsers = useMemo(() => {
    return users.sort((a, b) => a.name.localeCompare(b.name));
  }, [users]);

  // Memoize callback functions
  const handleUserClick = useCallback((userId) => {
    onUserSelect(userId);
  }, [onUserSelect]);

  const handleDeleteClick = useCallback((userId) => {
    onUserDelete(userId);
  }, [onUserDelete]);

  return (
    <div className="user-list">
      {sortedUsers.map(user => (
        <UserCard
          key={user.id}
          user={user}
          onClick={handleUserClick}
          onDelete={handleDeleteClick}
        />
      ))}
    </div>
  );
});

export default UserList;
```

#### Virtual Scrolling for Large Lists
```javascript
// src/components/VirtualizedTable.tsx
import React from 'react';
import { FixedSizeList as List } from 'react-window';

const VirtualizedTable = ({ data, height = 400 }) => {
  const Row = ({ index, style }) => (
    <div style={style} className="table-row">
      <div className="cell">{data[index].id}</div>
      <div className="cell">{data[index].name}</div>
      <div className="cell">{data[index].email}</div>
      <div className="cell">{data[index].role}</div>
    </div>
  );

  return (
    <List
      height={height}
      itemCount={data.length}
      itemSize={50}
      className="virtualized-table"
    >
      {Row}
    </List>
  );
};

export default VirtualizedTable;
```

### 2. Bundle Optimization

#### Webpack Bundle Analysis
```javascript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    react(),
    visualizer({
      filename: 'dist/stats.html',
      open: true,
      gzipSize: true,
      brotliSize: true,
    })
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          material: ['@mui/material', '@mui/icons-material'],
          charts: ['chart.js', 'react-chartjs-2'],
          calendar: ['@fullcalendar/react', '@fullcalendar/daygrid'],
        }
      }
    },
    chunkSizeWarningLimit: 1000,
  },
  server: {
    host: true,
    port: 3000,
  }
});
```

#### Tree Shaking Optimization
```javascript
// src/utils/index.ts
// Use named exports for better tree shaking
export const formatDate = (date: Date): string => {
  return date.toLocaleDateString();
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Import only what you need
import { formatDate, validateEmail } from './utils';
```

### 3. Caching Strategies

#### HTTP Caching Headers
```javascript
// src/services/api.ts
class ApiService {
  private cache = new Map();

  async fetchWithCache(url: string, options: RequestInit = {}) {
    const cacheKey = `${url}:${JSON.stringify(options)}`;
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < 300000) { // 5 minutes
        return cached.data;
      }
    }

    // Add cache headers
    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Cache-Control': 'max-age=300',
        'If-None-Match': this.getETag(url),
      }
    });

    if (response.ok) {
      const data = await response.json();
      this.cache.set(cacheKey, { data, timestamp: Date.now() });
      return data;
    }

    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
}
```

#### Service Worker for Offline Caching
```javascript
// public/sw.js
const CACHE_NAME = 'orthodox-metrics-v1';
const urlsToCache = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/api/users',
  '/api/churches',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      })
  );
});
```

## Backend Performance Optimization

### 1. Express.js Optimization

#### Middleware Optimization
```javascript
// server/middleware/performance.js
const compression = require('compression');
const helmet = require('helmet');
const cors = require('cors');

// Compression middleware
app.use(compression({
  level: 6,
  threshold: 1024,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS with caching
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
  maxAge: 86400, // 24 hours
}));
```

#### Request Optimization
```javascript
// server/middleware/requestOptimization.js
const requestOptimization = (req, res, next) => {
  // Add request ID for tracking
  req.id = require('crypto').randomUUID();
  
  // Start performance timer
  req.startTime = Date.now();
  
  // Optimize JSON parsing
  if (req.is('application/json')) {
    req.body = JSON.parse(req.body);
  }
  
  // Add performance logging
  res.on('finish', () => {
    const duration = Date.now() - req.startTime;
    
    if (duration > 1000) {
      console.warn(`Slow request: ${req.method} ${req.path} - ${duration}ms`);
    }
    
    // Log to monitoring system
    logPerformanceMetric({
      requestId: req.id,
      method: req.method,
      path: req.path,
      duration,
      statusCode: res.statusCode,
      timestamp: new Date().toISOString()
    });
  });
  
  next();
};
```

### 2. Database Query Optimization

#### Query Optimization
```javascript
// server/models/User.js
class UserModel {
  // Optimized user search with pagination
  static async searchUsers(search, page = 1, limit = 50) {
    const offset = (page - 1) * limit;
    
    const query = `
      SELECT 
        u.id, u.username, u.email, u.role, u.created_at,
        c.name as church_name
      FROM users u
      LEFT JOIN churches c ON u.church_id = c.id
      WHERE 
        u.username LIKE ? OR 
        u.email LIKE ? OR 
        c.name LIKE ?
      ORDER BY u.created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    const searchTerm = `%${search}%`;
    const [rows] = await db.execute(query, [
      searchTerm, searchTerm, searchTerm, limit, offset
    ]);
    
    return rows;
  }
  
  // Batch operations for better performance
  static async createMultipleUsers(users) {
    const query = `
      INSERT INTO users (username, email, password_hash, role, church_id)
      VALUES ?
    `;
    
    const values = users.map(user => [
      user.username, user.email, user.password_hash, user.role, user.church_id
    ]);
    
    const [result] = await db.execute(query, [values]);
    return result;
  }
}
```

#### Database Connection Pooling
```javascript
// server/config/database.js
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 20,
  queueLimit: 0,
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true,
  // Performance optimizations
  ssl: false,
  bigNumberStrings: true,
  supportBigNumbers: true,
  dateStrings: true,
});

// Connection pool monitoring
pool.on('connection', (connection) => {
  console.log('New connection established:', connection.threadId);
});

pool.on('error', (err) => {
  console.error('Database pool error:', err);
  if (err.code === 'PROTOCOL_CONNECTION_LOST') {
    // Reconnect logic
    setTimeout(() => {
      pool.getConnection();
    }, 2000);
  }
});

module.exports = pool;
```

### 3. Caching Implementation

#### Redis Caching
```javascript
// server/middleware/cache.js
const redis = require('redis');
const client = redis.createClient({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  password: process.env.REDIS_PASSWORD,
});

const cache = (duration = 300) => {
  return async (req, res, next) => {
    const key = `cache:${req.method}:${req.originalUrl}`;
    
    try {
      const cached = await client.get(key);
      if (cached) {
        console.log('Cache hit:', key);
        return res.json(JSON.parse(cached));
      }
      
      // Store original json method
      const originalJson = res.json;
      
      // Override json method to cache response
      res.json = function(data) {
        client.setex(key, duration, JSON.stringify(data));
        console.log('Cache set:', key);
        return originalJson.call(this, data);
      };
      
      next();
    } catch (error) {
      console.error('Cache error:', error);
      next();
    }
  };
};

module.exports = cache;
```

#### In-Memory Caching
```javascript
// server/utils/memoryCache.js
class MemoryCache {
  constructor() {
    this.cache = new Map();
    this.timers = new Map();
  }
  
  set(key, value, ttl = 300000) { // 5 minutes default
    // Clear existing timer
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
    }
    
    // Set value
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      ttl
    });
    
    // Set expiration timer
    const timer = setTimeout(() => {
      this.delete(key);
    }, ttl);
    
    this.timers.set(key, timer);
  }
  
  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    // Check if expired
    if (Date.now() - item.timestamp > item.ttl) {
      this.delete(key);
      return null;
    }
    
    return item.value;
  }
  
  delete(key) {
    this.cache.delete(key);
    
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
      this.timers.delete(key);
    }
  }
  
  clear() {
    this.cache.clear();
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers.clear();
  }
}

module.exports = new MemoryCache();
```

## Database Performance Optimization

### 1. Index Optimization

#### Strategic Index Creation
```sql
-- Users table indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_church_id ON users(church_id);
CREATE INDEX idx_users_created_at ON users(created_at);

-- Churches table indexes
CREATE INDEX idx_churches_name ON churches(name);
CREATE INDEX idx_churches_location ON churches(location);
CREATE INDEX idx_churches_status ON churches(status);

-- Logs table indexes (for performance monitoring)
CREATE INDEX idx_logs_timestamp ON logs(timestamp);
CREATE INDEX idx_logs_level ON logs(level);
CREATE INDEX idx_logs_user_id ON logs(user_id);

-- Composite indexes for common queries
CREATE INDEX idx_users_role_church ON users(role, church_id);
CREATE INDEX idx_logs_user_timestamp ON logs(user_id, timestamp);
```

#### Index Performance Analysis
```sql
-- Check index usage
SELECT 
    table_name,
    index_name,
    column_name,
    cardinality,
    index_type
FROM information_schema.statistics 
WHERE table_schema = 'orthodox_metrics'
ORDER BY table_name, index_name;

-- Find unused indexes
SELECT 
    t.table_schema,
    t.table_name,
    s.index_name,
    s.column_name
FROM information_schema.tables t
LEFT JOIN information_schema.statistics s ON t.table_name = s.table_name
WHERE t.table_schema = 'orthodox_metrics'
AND s.index_name IS NULL;
```

### 2. Query Optimization

#### Optimized Queries
```sql
-- Efficient pagination
SELECT SQL_CALC_FOUND_ROWS
    u.id, u.username, u.email, u.role,
    c.name as church_name
FROM users u
LEFT JOIN churches c ON u.church_id = c.id
WHERE u.status = 'active'
ORDER BY u.created_at DESC
LIMIT 50 OFFSET ?;

-- Get total count
SELECT FOUND_ROWS() as total;

-- Optimized search with full-text search
ALTER TABLE users ADD FULLTEXT(username, email);
ALTER TABLE churches ADD FULLTEXT(name, description);

-- Full-text search query
SELECT 
    u.id, u.username, u.email, u.role,
    MATCH(u.username, u.email) AGAINST(? IN BOOLEAN MODE) as relevance
FROM users u
WHERE MATCH(u.username, u.email) AGAINST(? IN BOOLEAN MODE)
ORDER BY relevance DESC
LIMIT 20;
```

#### Query Performance Monitoring
```javascript
// server/middleware/queryMonitor.js
const queryMonitor = (req, res, next) => {
  const originalExecute = req.db.execute;
  
  req.db.execute = async function(query, params) {
    const startTime = Date.now();
    
    try {
      const result = await originalExecute.call(this, query, params);
      const duration = Date.now() - startTime;
      
      // Log slow queries
      if (duration > 1000) {
        console.warn(`Slow query (${duration}ms):`, query);
        
        // Store in monitoring system
        await storeSlowQuery({
          query,
          params,
          duration,
          timestamp: new Date().toISOString()
        });
      }
      
      return result;
    } catch (error) {
      console.error('Query error:', error);
      throw error;
    }
  };
  
  next();
};
```

### 3. Database Maintenance

#### Regular Maintenance Tasks
```sql
-- Optimize tables
OPTIMIZE TABLE users, churches, logs, sessions;

-- Update table statistics
ANALYZE TABLE users, churches, logs, sessions;

-- Check table integrity
CHECK TABLE users, churches, logs, sessions;

-- Rebuild indexes
ALTER TABLE users ENGINE=InnoDB;
ALTER TABLE churches ENGINE=InnoDB;
```

#### Automated Maintenance Script
```bash
#!/bin/bash
# db-maintenance.sh

DB_NAME="orthodox_metrics"
DB_USER="maintenance_user"
DB_PASS="maintenance_password"

echo "Starting database maintenance..."

# Optimize tables
mysql -u$DB_USER -p$DB_PASS $DB_NAME -e "
OPTIMIZE TABLE users, churches, logs, sessions;
ANALYZE TABLE users, churches, logs, sessions;
"

# Clean up old logs (keep 90 days)
mysql -u$DB_USER -p$DB_PASS $DB_NAME -e "
DELETE FROM logs WHERE timestamp < DATE_SUB(NOW(), INTERVAL 90 DAY);
"

# Clean up old sessions
mysql -u$DB_USER -p$DB_PASS $DB_NAME -e "
DELETE FROM sessions WHERE expires < NOW();
"

echo "Database maintenance completed"
```

## System-Level Optimization

### 1. Nginx Optimization

#### Nginx Configuration
```nginx
# /etc/nginx/sites-available/orthodox-metrics
server {
    listen 80;
    server_name orthodox-metrics.com;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;
    
    # Browser caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # API proxy with caching
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_cache api_cache;
        proxy_cache_valid 200 5m;
        proxy_cache_key $scheme$proxy_host$request_uri;
        add_header X-Cache-Status $upstream_cache_status;
    }
    
    # Static file serving
    location / {
        root /var/www/orthodox-metrics/dist;
        try_files $uri $uri/ /index.html;
        
        # Security headers
        add_header X-Content-Type-Options nosniff;
        add_header X-Frame-Options DENY;
        add_header X-XSS-Protection "1; mode=block";
    }
}

# Cache configuration
proxy_cache_path /var/cache/nginx/api levels=1:2 keys_zone=api_cache:10m max_size=100m inactive=60m;
```

### 2. PM2 Optimization

#### PM2 Configuration
```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'orthodox-metrics',
    script: 'index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3001,
      UV_THREADPOOL_SIZE: 16
    },
    node_args: [
      '--max-old-space-size=2048',
      '--optimize-for-size'
    ],
    max_memory_restart: '1G',
    restart_delay: 4000,
    kill_timeout: 5000,
    listen_timeout: 8000,
    wait_ready: true,
    max_restarts: 5,
    min_uptime: '10s'
  }]
};
```

### 3. System Resource Optimization

#### Memory Optimization
```bash
# /etc/sysctl.conf
# Memory optimization
vm.swappiness=10
vm.dirty_ratio=5
vm.dirty_background_ratio=2

# Network optimization
net.core.rmem_max=16777216
net.core.wmem_max=16777216
net.ipv4.tcp_rmem=4096 87380 16777216
net.ipv4.tcp_wmem=4096 65536 16777216
```

## Performance Monitoring

### 1. Application Performance Monitoring

#### Performance Metrics Collection
```javascript
// server/utils/performanceMonitor.js
class PerformanceMonitor {
  constructor() {
    this.metrics = {
      requests: new Map(),
      database: new Map(),
      memory: [],
      cpu: []
    };
    
    // Start monitoring
    this.startMonitoring();
  }
  
  recordRequest(path, method, duration, statusCode) {
    const key = `${method}:${path}`;
    
    if (!this.metrics.requests.has(key)) {
      this.metrics.requests.set(key, {
        count: 0,
        totalDuration: 0,
        avgDuration: 0,
        maxDuration: 0,
        minDuration: Infinity,
        errors: 0
      });
    }
    
    const metric = this.metrics.requests.get(key);
    metric.count++;
    metric.totalDuration += duration;
    metric.avgDuration = metric.totalDuration / metric.count;
    metric.maxDuration = Math.max(metric.maxDuration, duration);
    metric.minDuration = Math.min(metric.minDuration, duration);
    
    if (statusCode >= 400) {
      metric.errors++;
    }
  }
  
  recordDatabase(query, duration) {
    const key = query.substring(0, 50);
    
    if (!this.metrics.database.has(key)) {
      this.metrics.database.set(key, {
        count: 0,
        totalDuration: 0,
        avgDuration: 0,
        maxDuration: 0
      });
    }
    
    const metric = this.metrics.database.get(key);
    metric.count++;
    metric.totalDuration += duration;
    metric.avgDuration = metric.totalDuration / metric.count;
    metric.maxDuration = Math.max(metric.maxDuration, duration);
  }
  
  startMonitoring() {
    setInterval(() => {
      const memUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      
      this.metrics.memory.push({
        timestamp: Date.now(),
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        external: memUsage.external,
        rss: memUsage.rss
      });
      
      this.metrics.cpu.push({
        timestamp: Date.now(),
        user: cpuUsage.user,
        system: cpuUsage.system
      });
      
      // Keep only last 100 entries
      if (this.metrics.memory.length > 100) {
        this.metrics.memory.shift();
      }
      if (this.metrics.cpu.length > 100) {
        this.metrics.cpu.shift();
      }
    }, 60000); // Every minute
  }
  
  getReport() {
    return {
      requests: Object.fromEntries(this.metrics.requests),
      database: Object.fromEntries(this.metrics.database),
      memory: this.metrics.memory.slice(-10),
      cpu: this.metrics.cpu.slice(-10)
    };
  }
}

module.exports = new PerformanceMonitor();
```

### 2. Performance Dashboard

#### Performance API Endpoint
```javascript
// server/routes/performance.js
const express = require('express');
const router = express.Router();
const performanceMonitor = require('../utils/performanceMonitor');

router.get('/metrics', (req, res) => {
  const report = performanceMonitor.getReport();
  res.json(report);
});

router.get('/health', (req, res) => {
  const uptime = process.uptime();
  const memUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();
  
  res.json({
    status: 'healthy',
    uptime: uptime,
    memory: {
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
      external: Math.round(memUsage.external / 1024 / 1024),
      rss: Math.round(memUsage.rss / 1024 / 1024)
    },
    cpu: {
      user: cpuUsage.user,
      system: cpuUsage.system
    },
    loadAverage: require('os').loadavg()
  });
});

module.exports = router;
```

## Performance Testing

### 1. Load Testing

#### Artillery Load Test Configuration
```yaml
# load-test.yml
config:
  target: 'http://localhost:3001'
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
  defaults:
    headers:
      Content-Type: 'application/json'

scenarios:
  - name: "User operations"
    weight: 70
    flow:
      - post:
          url: "/api/auth/login"
          json:
            username: "testuser"
            password: "testpass"
      - get:
          url: "/api/users"
      - get:
          url: "/api/churches"
      - post:
          url: "/api/auth/logout"
  
  - name: "API endpoints"
    weight: 30
    flow:
      - get:
          url: "/api/health"
      - get:
          url: "/api/metrics"
```

#### Load Testing Script
```bash
#!/bin/bash
# run-load-test.sh

echo "Starting load test..."

# Install Artillery if not installed
if ! command -v artillery &> /dev/null; then
    npm install -g artillery
fi

# Run load test
artillery run load-test.yml --output load-test-results.json

# Generate report
artillery report load-test-results.json --output load-test-report.html

echo "Load test completed. Report: load-test-report.html"
```

### 2. Performance Benchmarks

#### Benchmark Tests
```javascript
// scripts/benchmark.js
const { performance } = require('perf_hooks');
const axios = require('axios');

class Benchmark {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.results = [];
  }
  
  async testEndpoint(path, method = 'GET', data = null) {
    const url = `${this.baseUrl}${path}`;
    const iterations = 100;
    const times = [];
    
    console.log(`Testing ${method} ${path}...`);
    
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      
      try {
        await axios({ method, url, data });
        const end = performance.now();
        times.push(end - start);
      } catch (error) {
        console.error(`Error in iteration ${i}:`, error.message);
      }
    }
    
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const min = Math.min(...times);
    const max = Math.max(...times);
    
    const result = {
      endpoint: `${method} ${path}`,
      iterations,
      avgTime: avg.toFixed(2),
      minTime: min.toFixed(2),
      maxTime: max.toFixed(2),
      timestamp: new Date().toISOString()
    };
    
    this.results.push(result);
    console.log(`Average: ${avg.toFixed(2)}ms, Min: ${min.toFixed(2)}ms, Max: ${max.toFixed(2)}ms`);
    
    return result;
  }
  
  async runBenchmarks() {
    console.log('Starting performance benchmarks...');
    
    await this.testEndpoint('/api/health');
    await this.testEndpoint('/api/users');
    await this.testEndpoint('/api/churches');
    await this.testEndpoint('/api/metrics');
    
    console.log('\nBenchmark Results:');
    console.table(this.results);
    
    return this.results;
  }
}

// Run benchmarks
const benchmark = new Benchmark('http://localhost:3001');
benchmark.runBenchmarks().then(results => {
  console.log('Benchmarks completed');
});
```

## Best Practices

### 1. Frontend Performance
- Use React.memo for expensive components
- Implement lazy loading for routes and components
- Optimize images and assets
- Use CDN for static assets
- Implement proper caching strategies

### 2. Backend Performance
- Use database connection pooling
- Implement caching at multiple levels
- Optimize database queries and indexes
- Use compression for HTTP responses
- Monitor and log performance metrics

### 3. Database Performance
- Create appropriate indexes
- Optimize query patterns
- Use prepared statements
- Implement query result caching
- Regular database maintenance

### 4. System Performance
- Configure web server optimization
- Use process managers (PM2)
- Implement proper logging
- Monitor system resources
- Regular performance testing

## Conclusion

Performance optimization is an ongoing process that requires continuous monitoring, testing, and improvement. This guide provides a comprehensive foundation for optimizing the Orthodox Metrics system across all layers of the application stack.

Regular performance audits, combined with proactive monitoring and testing, ensure that the system maintains optimal performance as it scales and evolves. The strategies outlined in this guide should be implemented gradually and tested thoroughly in a staging environment before deployment to production.

For additional information on monitoring and maintenance, refer to the [MONITORING_GUIDE.md](MONITORING_GUIDE.md) and [OPERATIONS_GUIDE.md](OPERATIONS_GUIDE.md) documentation.
