# Balance reconciliation scripts

User-run SQL for checking that each account's stored balance agrees with its transaction history, and for fixing the history if it does not. Nothing here is run by an agent or by the app. You run it by hand in the Supabase SQL editor.

- `reconcile-balances.sql` (read only): one SELECT. Shows each account's stored balance, expected balance, and `diff`.
- `repair-balances.sql` (writes): moves a diff into `initial_balance` for the accounts you list. Never touches `current_balance`.
- `undo-balance-repair.sql` (writes): reverses the repair for the same list.

## Before you start

- Repair only after the MM-030 fix is deployed. Before that, editing an account could reset its balance again and re-break a repair.
- Never use the Vercel preview for any of this. Previews use the production database.
- The repair never changes `current_balance`, so the balances you see in the app and your net worth do not change. It only changes the opening balance (`initial_balance`) so that the history adds up to the balance you already have.

## Steps

1. Open Supabase, then SQL editor. Paste the contents of `reconcile-balances.sql` and click Run. It only reads.
2. Read the result. The `diff` column is the stored balance minus the expected balance.
   - If `diff` is 0.00 on every one of your accounts, everything agrees. Stop here. No repair is needed.
   - The table also lists other people's accounts, because sign-ups are open. Ignore rows whose `user_id` is not yours.
3. For each of your accounts with a non-zero `diff`, decide. Your live balance matches your bank, so it is the history that is off. The repair moves the diff into the opening balance. Displayed balances and net worth stay the same.
4. Save the check output before you repair (a screenshot or a CSV export). It shows each account's current `initial_balance`, which is your exact record of what to go back to. If nightly backups exist by then, take one as well.
5. Paste `repair-balances.sql` into the SQL editor. Between the lines `/* ACCOUNTS START */` and `/* ACCOUNTS END */`, replace the placeholder row with one row per account, written as `('the-id', the-diff)`, copied exactly from the check. Separate rows with commas. Click Run.
   - Success means every safety check passed and the repair was applied.
   - An error means nothing changed. Read the message. The usual cause is a mistyped id or a diff that no longer matches, in which case re-run the check and copy again.
6. Run `reconcile-balances.sql` again. The repaired accounts should now show a `diff` of 0.00.
7. To undo, paste `undo-balance-repair.sql`, put the same rows between the same markers (same ids, same diffs), and click Run. Then run the check again. The diffs return to their original values and `initial_balance` is back to what it was.


# Backup role

User-run SQL for the read-only database login used by the nightly production backup (see the Backups section of the main README). Nothing here is run by an agent or by the app. You run it by hand in the Supabase SQL editor.

- `create-backup-role.sql` (writes, one time): creates the login `moneymap_readonly`. It can read every table in `public` and can do nothing else. It touches no table rows.
- `verify-backup-role.sql` (read only): one SELECT that returns one row. `ok = true` means the role exists, has no extra power, and can read every table. The nightly workflow runs this same query as the backup login before every dump, so a widened grant fails the backup loudly.
- `drop-backup-role.sql` (writes): undo. Removes the grants and drops the role.

## Steps

1. Generate a password with at least 40 letters and digits and no symbols (the Bitwarden generator with symbols turned off). Keep it in Bitwarden, because you need it again for the connection string in step 4.
2. Open Supabase, then SQL editor. Paste `create-backup-role.sql`. Replace `REPLACE_WITH_GENERATED_PASSWORD` with the password (keep the quotes) and click Run.
   - An error means nothing changed. Read the message. The usual causes are an unreplaced placeholder, a password that is too short or has symbols, or the role already existing.
3. Paste `verify-backup-role.sql` and click Run. Expect one row with `ok = true` and empty `write_grants`, `create_on_schemas` and `missing_select`.
4. Build the connection string for the GitHub secret. Use the Session pooler, port 5432, and the username `moneymap_readonly.<project-ref>` (the role name, a dot, then your project ref). Copy the host from Supabase, Connect, Session pooler. Do not paste the string anywhere except the hidden prompt of `gh secret set BACKUP_DATABASE_URL`.
5. To undo, paste `drop-backup-role.sql` and click Run. Then delete the `BACKUP_DATABASE_URL` secret.

Notes:

- Tables created later by `postgres` (for example by a Prisma migration) are readable by the role automatically, through default privileges. Tables owned by another role are not, and the nightly verify step fails until you grant SELECT on them.
- The role is limited to 2 connections and is set to open read-only transactions. Those are conveniences. The privileges are the boundary, and `verify-backup-role.sql` checks them.
