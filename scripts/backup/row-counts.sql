/*
  row-counts.sql

  READ ONLY. One query, creates nothing. Returns one row per base table in
  the public schema: table name and row count, ordered by name. Used by the
  nightly backup workflow (on the throwaway restore) and by the restore drill
  (on the local restore), so both are compared the same way. Counts only; no
  row contents.
*/
SELECT
  table_name,
  (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from %I.%I', table_schema, table_name), false, true, '')))[1]::text::bigint AS row_count
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY 1;
