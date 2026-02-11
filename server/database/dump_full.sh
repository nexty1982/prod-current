#!/bin/bash

# Dump full schema and data for orthodoxmetrics_db and omai_db from 192.168.1.239

USER="root"
HOST="192.168.1.239"
DUMP_DIR="./db_dumps"
DATE=$(date +"%Y-%m-%d")

mkdir -p "$DUMP_DIR"

for DB in orthodoxmetrics_db omai_db; do
  echo "Dumping full database for $DB..."
  mysqldump -h "$HOST" -u "$USER" -p "$DB" > "$DUMP_DIR/${DB}_full_$DATE.sql"
done

echo "Full database dump complete."

