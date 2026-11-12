-- Run once as a PostgreSQL administrator: psql -U postgres -f scripts/setup-db.sql
-- A password is requested interactively; no real password is stored in this file.
\set ON_ERROR_STOP on
CREATE ROLE balance_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;
\password balance_app
CREATE DATABASE balance_db OWNER balance_app;
REVOKE ALL ON DATABASE balance_db FROM PUBLIC;
GRANT CONNECT ON DATABASE balance_db TO balance_app;
\connect balance_db
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE, CREATE ON SCHEMA public TO balance_app;
