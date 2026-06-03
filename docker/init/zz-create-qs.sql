-- Creates the application role + database used by the Next.js app.
-- Runs after Supabase's own bootstrap scripts in /docker-entrypoint-initdb.d.
CREATE ROLE qs WITH LOGIN PASSWORD 'qs_local_dev' CREATEDB;
CREATE DATABASE qs_web OWNER qs;
GRANT ALL PRIVILEGES ON DATABASE qs_web TO qs;
