module.exports = {
  apps: [
    {
      name: "orthodox-backend",
      cwd: "/var/www/orthodoxmetrics/prod/server",
      script: "dist/index.js",
      instances: 1,
      exec_mode: "fork",
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production"
      },
      env_file: "/var/www/orthodoxmetrics/prod/server/.env"
    },
    {
      name: "ocr-feeder-worker",
      cwd: "/var/www/orthodoxmetrics/prod/server",
      script: "dist/workers/ocrFeederWorker.js",
      instances: 1,
      exec_mode: "fork",
      watch: false,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production"
      },
      env_file: "/var/www/orthodoxmetrics/prod/server/.env",
      restart_delay: 5000,
      max_restarts: 10,
      min_uptime: "10s"
    },
    {
      name: "om-ops-hub",
      cwd: "/var/www/orthodoxmetrics/prod/ops-hub",
      script: "src/server.js",
      instances: 1,
      exec_mode: "fork",
      watch: false,
      max_memory_restart: "256M",
      env: {
        NODE_ENV: "production",
        PORT: 3010,
        ARTIFACTS_ROOT: "/var/backups/OM"
      },
      restart_delay: 2000,
      max_restarts: 5,
      min_uptime: "5s"
    }
  ]
};
