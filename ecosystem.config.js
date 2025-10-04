export default {
  apps: [
    {
      name: 'orthodox-backend',
      script: 'server/index.js',
      cwd: process.env.PROJECT_ROOT || '/var/www/orthodoxmetrics/prod',
      env: {
        NODE_ENV: 'development'
      },
      env_production: {
        NODE_ENV: 'production'
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
    }
  ]
};
