#!/bin/bash
# PostgreSQL 다중 DB 초기화 (keycloak DB 추가 생성)
set -e

function create_user_and_database() {
  local database=$1
  echo "  Creating database '$database'"
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    SELECT 'CREATE DATABASE ${database}' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '${database}')\gexec
    GRANT ALL PRIVILEGES ON DATABASE ${database} TO ${POSTGRES_USER};
EOSQL
}

# dookdak DB는 이미 POSTGRES_DB로 생성됨
# keycloak, temporal DB 추가 생성
create_user_and_database "keycloak"
create_user_and_database "temporal"

echo "Multiple databases initialized."
