// PM2 Configuration for Orthodox Headlines Aggregation Service
module.exports = {
  apps: [
    {
      name: 'orthodox-headlines-aggregator',
      script: './cron/fetch-headlines.js',
      args: 'start',
      cwd: '/path/to/your/server', // Update this path
      instances: 1,
      exec_mode: 'fork',
      
      // Restart configuration
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      restart_delay: 10000,
      
      // Environment
      env: {
        NODE_ENV: 'production',
        TZ: 'UTC'
      },
      
      // Logging
      log_file: './logs/headlines-aggregator.log',
      out_file: './logs/headlines-aggregator-out.log',
      error_file: './logs/headlines-aggregator-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      
      // Monitoring
      min_uptime: '10s',
      max_restarts: 10,
      
      // Cron-like behavior (alternative to internal cron)
      cron_restart: '0 */6 * * *', // Every 6 hours
      
      // Additional settings
      kill_timeout: 30000,
      listen_timeout: 10000,
      shutdown_with_message: true
    }
  ]
};

/**
 * Usage Instructions:
 * 
 * 1. Install PM2 globally:
 *    npm install -g pm2
 * 
 * 2. Update the 'cwd' path above to your server directory
 * 
 * 3. Start the service:
 *    pm2 start pm2-headlines.config.js
 * 
 * 4. Monitor the service:
 *    pm2 status
 *    pm2 logs orthodox-headlines-aggregator
 * 
 * 5. Save PM2 configuration:
 *    pm2 save
 *    pm2 startup
 * 
 * 6. Stop the service:
 *    pm2 stop orthodox-headlines-aggregator
 * 
 * 7. Restart the service:
 *    pm2 restart orthodox-headlines-aggregator
 */ 