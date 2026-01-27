/**
 * PM2 Ecosystem Configuration
 *
 * Manages multiple services including the main backend and OM-Librarian agent
 * 
 * Usage:
 *   pm2 start ecosystem.config.js                    # Start all apps
 *   pm2 start ecosystem.config.js --only orthodox-backend  # Start only backend
 *   pm2 start ecosystem.config.js --only om-librarian      # Start only librarian
 */

module.exports = {
  apps: [
    // Main Orthodox Metrics Backend Server
    {
      name: 'orthodox-backend',
      script: 'dist/index.js',
      cwd: '/var/www/orthodoxmetrics/prod/server',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
      },
      env_file: '/var/www/orthodoxmetrics/prod/server/.env',
      error_file: '/var/www/orthodoxmetrics/prod/logs/orthodox-backend-error.log',
      out_file: '/var/www/orthodoxmetrics/prod/logs/orthodox-backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
    },
    // OM-Librarian Agent
    {
      name: 'om-librarian',
      script: './server/src/agents/omLibrarian.js',
      cwd: '/var/www/orthodoxmetrics/prod',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
      },
      error_file: '/var/www/orthodoxmetrics/prod/logs/om-librarian-error.log',
      out_file: '/var/www/orthodoxmetrics/prod/logs/om-librarian-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
    },
  ],
};
