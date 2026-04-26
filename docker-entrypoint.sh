#!/bin/sh
set -eu

PGDATA="${PGDATA:-/var/lib/postgresql/data}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-hackathon_db}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-postgres}"

mkdir -p "$PGDATA"
chown -R postgres:postgres "$(dirname "$PGDATA")"

if [ ! -s "$PGDATA/PG_VERSION" ]; then
  su postgres -c "initdb -D '$PGDATA'"
fi

cat > "$PGDATA/postgresql.auto.conf" <<EOF
listen_addresses = '127.0.0.1'
port = $DB_PORT
EOF

if ! grep -Eq "^host[[:space:]]+all[[:space:]]+all[[:space:]]+127\\.0\\.0\\.1/32[[:space:]]+md5" "$PGDATA/pg_hba.conf"; then
  echo "host all all 127.0.0.1/32 md5" >> "$PGDATA/pg_hba.conf"
fi

su postgres -c "pg_ctl -D '$PGDATA' -w start"

su postgres -c "psql -v ON_ERROR_STOP=1 --username postgres --dbname postgres <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '$DB_USER') THEN
    CREATE ROLE $DB_USER WITH LOGIN PASSWORD '$DB_PASSWORD';
  ELSE
    ALTER ROLE $DB_USER WITH LOGIN PASSWORD '$DB_PASSWORD';
  END IF;
END
\$\$;

SELECT 'CREATE DATABASE $DB_NAME OWNER $DB_USER'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$DB_NAME')\\gexec
SQL"

export DATABASE_URL="${DATABASE_URL:-postgresql://$DB_USER:$DB_PASSWORD@127.0.0.1:$DB_PORT/$DB_NAME}"

cleanup() {
  su postgres -c "pg_ctl -D '$PGDATA' -m fast stop" || true
}

trap cleanup INT TERM EXIT

exec node server.js
