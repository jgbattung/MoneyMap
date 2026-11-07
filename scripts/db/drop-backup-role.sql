/*
  drop-backup-role.sql

  WRITES. Undo for create-backup-role.sql. Run it by hand in the Supabase
  SQL editor.

  What it does: removes everything create-backup-role.sql granted to
  moneymap_readonly, then drops the role. It touches no table rows. If the
  role does not exist it does nothing.

  The whole block is one statement, so it is atomic.

  After this, the nightly backup workflow can no longer log in. Remove or
  replace the BACKUP_DATABASE_URL secret too.
*/
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'moneymap_readonly') THEN
    RAISE NOTICE 'Role moneymap_readonly does not exist. Nothing to undo.';
    RETURN;
  END IF;

  ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE SELECT ON TABLES FROM moneymap_readonly;
  ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE SELECT ON SEQUENCES FROM moneymap_readonly;
  REVOKE ALL ON ALL TABLES IN SCHEMA public FROM moneymap_readonly;
  REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM moneymap_readonly;
  REVOKE USAGE ON SCHEMA public FROM moneymap_readonly;
  DROP ROLE moneymap_readonly;
END
$$;
