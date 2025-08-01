# Orthodox Metrics Server Setup - Quick Start

## 1. Transfer Files to Server
Upload this entire package to ubuntu@192.168.1.239:/tmp/

## 2. Extract on Server
```bash
cd /tmp
unzip orthodox-deployment-package.zip
sudo mv orthodox-deployment/* /var/www/orthodox-church-mgmt/
```

## 3. Run Database Setup
```bash
cd /var/www/orthodox-church-mgmt
mysql -u root -p < orthodoxmetrics_db_schema.sql
```

## 4. Configure Environment
```bash
cp .env.example .env
nano .env  # Edit database credentials
```

## 5. Start Application
```bash
npm install --production
pm2 start server/index.js --name orthodox-church-mgmt
```

See SERVER_SETUP_GUIDE_192.168.1.239.md for complete instructions.
