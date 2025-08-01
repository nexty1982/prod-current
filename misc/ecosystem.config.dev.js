module.exports = {
  apps: [
    {
      name: 'orthodmetrics-backend',
      script: 'server/index.js',
      cwd: '/var/www/orthodmetrics/dev',
      watch: false,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'development',
        PORT: 3002,
        DB_HOST: 'localhost',
        DB_PORT: 3306,
        DB_NAME: 'orthodmetrics_dev',
        DB_USER: 'orthodapps',
        DB_PASS: 'Summerof1982@!',
        BASE_URL: 'http://orthodmetrics.com:3002',
        SESSION_SECRET: 'change_this_for_dev',
        JWT_SECRET: 'also_change_this_for_dev',
        LOG_LEVEL: 'debug'
      },
      error_file: '/var/log/orthodmetrics/pm2-error.log',
      out_file: '/var/log/orthodmetrics/pm2-out.log',
      log_file: '/var/log/orthodmetrics/pm2-combined.log',
      time: true
    }
  ]
};

