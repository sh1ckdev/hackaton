#!/bin/bash
set -e

DB_NAME="${DB_NAME:-hackathon_db}"
DB_USER="${DB_USER:-postgres}"

echo "Проверка существования базы данных $DB_NAME..."

if psql -U "$DB_USER" -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
    echo "База данных $DB_NAME уже существует"
else
    echo "Создание базы данных $DB_NAME..."
    psql -v ON_ERROR_STOP=1 -U "$DB_USER" <<-EOSQL
        CREATE DATABASE $DB_NAME;
EOSQL
    echo "База данных $DB_NAME создана успешно"
fi
