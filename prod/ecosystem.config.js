module.exports = {
  apps: [
    {
      name: 'orthodox-backend',
      script: 'server/index.js',
      cwd: process.env.PROJECT_ROOT || '/var/www/orthodoxmetrics/prod',
      env: {
        NODE_ENV: 'production'
      },
      env_production: {
        NODE_ENV: 'development'
      },
      env_file: '.env.production',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '1G',
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true
    },
    {
      name: 'omai-background',
      script: 'server/services/omaiBackgroundService.js',
      cwd: process.env.PROJECT_ROOT || '/var/www/orthodoxmetrics/prod',
      env: {
        NODE_ENV: 'production',
        OMAI_LOG_LEVEL: 'info'
      },
      env_production: {
        NODE_ENV: 'production',
        OMAI_LOG_LEVEL: 'warn'
      },
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '512M',
      error_file: './logs/omai-err.log',
      out_file: './logs/omai-out.log',
      log_file: './logs/omai-combined.log',
      time: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 5000
    }
  ]
}; 
