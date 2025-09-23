#!/bin/bash

# Dump schema only for orthodoxmetrics_db and omai_db from 192.168.1.239

USER="root"
HOST="192.168.1.239"
DUMP_DIR="./dump"
DATE=$(date +"%Y-%m-%d")

mkdir -p "$DUMP_DIR"

for DB in orthodoxmetrics_db omai_db; do
  echo "Dumping schema for $DB..."
  mysqldump -h "$HOST" -u "$USER" -p --no-data "$DB" > "$DUMP_DIR/${DB}_schema_$DATE.sql"
done

echo "Schema-only dump complete."
