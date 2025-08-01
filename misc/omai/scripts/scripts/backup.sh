#!/bin/bash
echo "Starting database backup..."
mysqldump -u root orthodoxmetrics_db > /var/backups/db_$(date +%Y%m%d_%H%M%S).sql
echo "Backup completed"
