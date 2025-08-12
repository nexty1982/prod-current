module.exports = {
    apps: [
        {
            name: 'orthodox-backend',
            script: 'index.js',
            cwd: '/var/www/orthodox-church-mgmt/orthodoxmetrics/prod/server',
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: '1G',
            env: {
                NODE_ENV: 'production',
                PORT: 3001
            },
            log_file: './logs/orthodox-backend.log',
            out_file: './logs/orthodox-backend-out.log',
            error_file: './logs/orthodox-backend-error.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
            merge_logs: true
        },
        {
            name: 'orthodox-frontend',
            script: 'npm',
            args: ['run', 'build'],
            interpreter: 'node',
            cwd: '/var/www/orthodox-church-mgmt/orthodoxmetrics/prod/front-end',
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: '1G',
            env: {
                NODE_ENV: 'production',
                PORT: 5173
            },
            log_file: './logs/orthodox-frontend.log',
            out_file: './logs/orthodox-frontend-out.log',
            error_file: './logs/orthodox-frontend-error.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
            merge_logs: true
        },
        {
            name: 'orthodmetrics-portal-backend',
            script: 'index.js',
            cwd: '/var/www/orthodox-church-mgmt/orthodoxmetrics/portal/server',
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: '1G',
            env: {
                NODE_ENV: 'production',
                ORTHODMETRICS_PORT: 3002
            },
            log_file: './logs/orthodmetrics-portal-backend.log',
            out_file: './logs/orthodmetrics-portal-backend-out.log',
            error_file: './logs/orthodmetrics-portal-backend-error.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
            merge_logs: true
        },
        {
            name: 'orthodmetrics-portal-frontend',
            script: 'npm',
            args: ['run', 'build'],
            interpreter: 'node',
            cwd: '/var/www/orthodox-church-mgmt/orthodoxmetrics/portal/frontend',
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: '1G',
            env: {
                NODE_ENV: 'production',
                PORT: 5175
            },
            log_file: './logs/orthodmetrics-portal-frontend.log',
            out_file: './logs/orthodmetrics-portal-frontend-out.log',
            error_file: './logs/orthodmetrics-portal-frontend-error.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
            merge_logs: true
        }
    ]
};

