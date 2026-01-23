#!/bin/bash
cd /opt/zammad || exit 1
cp docker-compose.yml docker-compose.yml.backup.\
sed -i '/^version:/d' docker-compose.yml
sed -i '51s|.*|      POSTGRES_HOST: postgres|' docker-compose.yml
sed -i '52i\      POSTGRES_USER: zammad' docker-compose.yml
sed -i '53i\      POSTGRES_DB: zammad' docker-compose.yml
grep -A 3 'environment:' docker-compose.yml | grep -A 3 zammad
