/*
  verify-backup-role.sql

  READ ONLY. One SELECT that returns one row. Run it by hand in the Supabase
  SQL editor after create-backup-role.sql. The nightly backup workflow also
  runs it, connected as moneymap_readonly, before every dump.

  It names the role literally, so the answer is the same whether you run it
  as postgres or as moneymap_readonly itself.

  Expect ok = true. Any other result means the role is missing or has more
  power than a backup needs. Columns:
    role_exists          the role is there
    not_super...         attribute checks, all must be true
    no_memberships       the role is a member of no other role
    read_only_default    default_transaction_read_only = on is set on the role
    write_grants         must be empty: every schema.table:privilege the role
                         holds that could change data (INSERT, UPDATE,
                         DELETE, TRUNCATE, REFERENCES, TRIGGER; sequence
                         USAGE or UPDATE), across all non-system schemas
    create_on_schemas    must be empty: schemas where the role can create
                         objects
    missing_select       must be empty: public tables the role cannot read
    ok                   all of the above are satisfied
*/
WITH r AS (
  SELECT * FROM pg_roles WHERE rolname = 'moneymap_readonly'
),
objs AS (
  SELECT c.oid, n.nspname, c.relname, c.relkind
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE c.relkind IN ('r', 'p', 'v', 'm', 'f', 'S')
    AND n.nspname <> 'information_schema'
    AND n.nspname NOT LIKE 'pg\_%'
),
checks AS (
  SELECT
    EXISTS (SELECT 1 FROM r) AS role_exists,
    COALESCE((SELECT NOT rolsuper FROM r), false) AS not_superuser,
    COALESCE((SELECT NOT rolcreaterole FROM r), false) AS not_createrole,
    COALESCE((SELECT NOT rolcreatedb FROM r), false) AS not_createdb,
    COALESCE((SELECT NOT rolreplication FROM r), false) AS not_replication,
    COALESCE((SELECT NOT rolbypassrls FROM r), false) AS not_bypassrls,
    COALESCE((SELECT NOT EXISTS (
      SELECT 1 FROM pg_auth_members m WHERE m.member = r.oid
    ) FROM r), false) AS no_memberships,
    COALESCE((SELECT 'default_transaction_read_only=on' = ANY (r.rolconfig) FROM r), false) AS read_only_default,
    ARRAY(
      SELECT o.nspname || '.' || o.relname || ':' || p
      FROM r
      CROSS JOIN objs o
      CROSS JOIN LATERAL unnest(
        CASE WHEN o.relkind = 'S'
          THEN ARRAY['USAGE', 'UPDATE']
          ELSE ARRAY['INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER']
        END
      ) AS p
      WHERE CASE WHEN o.relkind = 'S'
        THEN has_sequence_privilege(r.oid, o.oid, p)
        ELSE has_table_privilege(r.oid, o.oid, p)
      END
      ORDER BY 1
    ) AS write_grants,
    ARRAY(
      SELECT n.nspname
      FROM r
      CROSS JOIN pg_namespace n
      WHERE n.nspname <> 'information_schema'
        AND n.nspname NOT LIKE 'pg\_%'
        AND has_schema_privilege(r.oid, n.oid, 'CREATE')
      ORDER BY 1
    ) AS create_on_schemas,
    ARRAY(
      SELECT o.relname
      FROM r
      CROSS JOIN objs o
      WHERE o.nspname = 'public'
        AND o.relkind IN ('r', 'p')
        AND NOT has_table_privilege(r.oid, o.oid, 'SELECT')
      ORDER BY 1
    ) AS missing_select
)
SELECT
  checks.*,
  (
    role_exists AND not_superuser AND not_createrole AND not_createdb
    AND not_replication AND not_bypassrls AND no_memberships AND read_only_default
    AND cardinality(write_grants) = 0
    AND cardinality(create_on_schemas) = 0
    AND cardinality(missing_select) = 0
  ) AS ok
FROM checks;
