-- Creates the Postgres role Dhaga's DATABASE_URL should connect as in hosted
-- (DHAGA_HOSTED_MODE) mode, and moves table ownership to it.
--
-- Why this exists: packages/ee's multi-tenant isolation is entirely
-- Row-Level Security (see src/db/rls-ddl.ts) — every "core" query is
-- tenant-agnostic and relies on RLS policies to filter rows by the
-- connecting session's app.current_user_id. RLS is enforced per *role*,
-- not per connection: a role with the BYPASSRLS attribute ignores every
-- RLS policy on every table, full stop, regardless of FORCE ROW LEVEL
-- SECURITY. Managed Postgres providers' default admin role commonly has
-- BYPASSRLS out of the box (Supabase's "postgres" role does). If
-- DATABASE_URL connects as that role, every tenant sees every other
-- tenant's data — silently, with no error, because nothing is malformed;
-- RLS is just never being evaluated at all for that role.
--
-- Run this once against the target Postgres database (Supabase: Dashboard
-- -> SQL Editor; self-hosted: psql), then point DATABASE_URL at the role
-- created here instead of the database's default admin/owner role.
--
-- Supabase specifically: the connection username through their pooler
-- (pooler.supabase.com) is "<role>.<project_ref>", not the plain role name
-- — e.g. dhaga_app.zgnpoeddgsrgpivqpkdk. The plain role name below is
-- still just "dhaga_app"; only the pooler's routing prefix differs.

-- Idempotent (safe to re-run this whole script from scratch): some hosted
-- SQL editors (Supabase's included) run a pasted script as one transaction
-- and roll back everything — including an already-succeeded CREATE ROLE —
-- if a later statement in the same paste errors.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'dhaga_app') THEN
    EXECUTE format(
      'CREATE ROLE dhaga_app WITH LOGIN PASSWORD %L NOBYPASSRLS NOSUPERUSER NOCREATEDB NOCREATEROLE',
      '<CHANGE_ME>'
    );
  END IF;
END $$;

-- Required before the ownership transfer below: reassigning a table TO a
-- role needs either superuser or membership in that role (the ability to
-- SET ROLE to it) — Supabase's "postgres" role is a powerful admin role but
-- not a true Postgres superuser, so this GRANT is not optional here.
GRANT dhaga_app TO CURRENT_USER;

-- If a table is locked by another active connection (e.g. the app itself,
-- still live on the old role while you run this), fail fast with a clear
-- error instead of hanging until the client eventually disconnects.
SET lock_timeout = '5s';

-- Move ownership of every existing table so dhaga_app can run the app's own
-- boot-time DDL (CREATE TABLE/ADD COLUMN IF NOT EXISTS, ENABLE/FORCE ROW
-- LEVEL SECURITY, CREATE POLICY) — those are ALTER TABLE operations, which
-- need ownership, not just GRANTed DML privileges.
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I OWNER TO dhaga_app', tbl);
  END LOOP;
END $$;

GRANT USAGE, CREATE ON SCHEMA public TO dhaga_app;
-- Supabase only: pgvector/pg_trgm live in a separate "extensions" schema.
-- Self-hosted Postgres with extensions installed directly in "public" can
-- skip this line.
GRANT USAGE ON SCHEMA extensions TO dhaga_app;
ALTER DEFAULT PRIVILEGES FOR ROLE dhaga_app IN SCHEMA public GRANT ALL ON TABLES TO dhaga_app;
ALTER DEFAULT PRIVILEGES FOR ROLE dhaga_app IN SCHEMA public GRANT ALL ON SEQUENCES TO dhaga_app;

-- Verify before switching DATABASE_URL over: must return exactly one row
-- with rolbypassrls = false. If this ever comes back true, stop — do not
-- point DATABASE_URL at this role.
SELECT rolname, rolbypassrls, rolsuper FROM pg_roles WHERE rolname = 'dhaga_app';
