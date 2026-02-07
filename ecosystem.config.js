module.exports = {
  apps: [
    {
      name: "orthodox-backend",
      cwd: "/var/www/orthodoxmetrics/prod/server",
      script: "dist/index.js",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "900M",
      time: true,
      env: {
        NODE_ENV: "production",
        PORT: "3001",
        HOST: "0.0.0.0"
      },
      out_file: "/var/www/orthodoxmetrics/prod/server/logs/orthodox-backend-out.log",
      error_file: "/var/www/orthodoxmetrics/prod/server/logs/orthodox-backend-err.log",
      log_file: "/var/www/orthodoxmetrics/prod/server/logs/orthodox-backend-combined.log"
    },
    {
      name: "om-librarian",
      cwd: "/var/www/orthodoxmetrics/prod",
      script: "server/src/agents/omLibrarianV3.js",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "600M",
      time: true,
      env: {
        NODE_ENV: "production",
        OML_LOG_LEVEL: "info"
      },
      out_file: "/var/www/orthodoxmetrics/prod/logs/om-librarian-out.log",
      error_file: "/var/www/orthodoxmetrics/prod/logs/om-librarian-err.log",
      log_file: "/var/www/orthodoxmetrics/prod/logs/om-librarian-combined.log"
    }
  ]
};
