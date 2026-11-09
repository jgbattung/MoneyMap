/*
  create-backup-role.sql

  WRITES (one time). Run it by hand in the Supabase SQL editor, only after
  reading the "Backup role" section of scripts/db/README.md.

  What it does: creates a login role, moneymap_readonly, that the nightly
  backup workflow uses to dump the database. The role can read every table
  in the public schema and can do nothing else:
    - LOGIN only; no superuser, createdb, createrole, replication or RLS bypass
    - no memberships in other roles (NOINHERIT, and none are granted)
    - at most 2 connections
    - default_transaction_read_only = on (a convenience; the real boundary
      is that the role holds no write privileges at all)
    - USAGE on schema public, SELECT on every existing table and sequence in
      public, plus default privileges so tables created later by postgres are
      readable too

  It touches no table rows. It only creates a role and grants.

  How to use: replace REPLACE_WITH_GENERATED_PASSWORD below with a generated
  password of at least 32 letters and digits (no symbols, so it is safe to
  put in a connection string). Then click Run.

  The whole block is one statement, so it is atomic. It stops with an error,
  and nothing is changed, unless:
    1. the role does not already exist,
    2. the password placeholder was replaced,
    3. the password is at least 32 characters and only letters and digits,
    4. you are running as postgres,
    5. every base table in public is owned by postgres (the default
       privileges below only cover tables postgres creates).

  Afterwards run verify-backup-role.sql and expect ok = true.
  To undo, run drop-backup-role.sql.
*/
DO $$
DECLARE
  v_password text := 'REPLACE_WITH_GENERATED_PASSWORD';
  v_foreign_owned integer;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'moneymap_readonly') THEN
    RAISE EXCEPTION 'Role moneymap_readonly already exists. Nothing was changed. Run drop-backup-role.sql first if you want to recreate it.';
  END IF;

  /* The placeholder is split here so a find-and-replace-all of the full token
     only changes the declaration above and leaves this guard intact. */
  IF v_password = 'REPLACE_WITH_' || 'GENERATED_PASSWORD' THEN
    RAISE EXCEPTION 'The password placeholder was not replaced. Nothing was changed.';
  END IF;

  IF length(v_password) < 32 OR v_password !~ '^[A-Za-z0-9]+$' THEN
    RAISE EXCEPTION 'The password must be at least 32 characters, letters and digits only. Nothing was changed.';
  END IF;

  IF current_user <> 'postgres' THEN
    RAISE EXCEPTION 'Run this as postgres (current user is %). Nothing was changed.', current_user;
  END IF;

  SELECT count(*) INTO v_foreign_owned
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind IN ('r', 'p')
    AND pg_get_userbyid(c.relowner) <> 'postgres';
  IF v_foreign_owned > 0 THEN
    RAISE EXCEPTION '% table(s) in public are not owned by postgres, so default privileges would not cover them. Nothing was changed.', v_foreign_owned;
  END IF;

  EXECUTE format(
    'CREATE ROLE moneymap_readonly LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 2 PASSWORD %L',
    v_password
  );
  ALTER ROLE moneymap_readonly SET default_transaction_read_only = on;

  GRANT USAGE ON SCHEMA public TO moneymap_readonly;
  GRANT SELECT ON ALL TABLES IN SCHEMA public TO moneymap_readonly;
  GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO moneymap_readonly;
  ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT ON TABLES TO moneymap_readonly;
  ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT ON SEQUENCES TO moneymap_readonly;
END
$$;
