/*
  undo-balance-repair.sql

  WRITES. Run it by hand in the Supabase SQL editor to reverse
  repair-balances.sql. Use the SAME list of (account id, diff) rows you used
  for the repair, with the same diff values.

  What it does: for each listed account it subtracts the diff from
  initial_balance, which restores the value it had before the repair.
  It NEVER changes current_balance.

  The whole block is one statement, so it is atomic. For every listed account
  it checks that:
    1. the account exists,
    2. the diff you copied is not 0,
    3. the live diff right now is 0 (the repair is still in place),
    4. exactly one row was updated,
    5. the diff afterwards equals the diff you copied (the original state)
       and current_balance did not move.
  If any check fails the block stops with an error and nothing is changed.

  How to use: replace the placeholder row between the markers with the same
  rows you used for the repair. Run unedited, the placeholder id does not
  exist, so it fails safely.
*/
DO $$
DECLARE
  rec RECORD;
  v_initial numeric;
  v_current numeric;
  v_live_diff numeric;
  v_new_initial numeric;
  v_new_current numeric;
  v_new_diff numeric;
  v_rows integer;
BEGIN
  FOR rec IN
    SELECT account_id, copied_diff FROM (VALUES
      /* ACCOUNTS START */
      ('PASTE-ACCOUNT-ID-HERE', 0.00)
      /* ACCOUNTS END */
    ) AS t(account_id, copied_diff)
  LOOP
    SELECT fa.initial_balance,
           fa.current_balance,
           fa.current_balance - (
             fa.initial_balance
             - COALESCE((SELECT SUM(x.amount) FROM expense_transactions x
                         WHERE x.account_id = fa.id AND x.is_installment = false), 0)
             + COALESCE((SELECT SUM(n.amount) FROM income_transactions n
                         WHERE n.account_id = fa.id), 0)
             - COALESCE((SELECT SUM(ROUND(o.amount::numeric, 2)) FROM transfer_transactions o
                         WHERE o.from_account_id = fa.id), 0)
             + COALESCE((SELECT SUM(ROUND(i.amount::numeric, 2)) FROM transfer_transactions i
                         WHERE i.to_account_id = fa.id), 0)
           )
    INTO v_initial, v_current, v_live_diff
    FROM financial_accounts fa
    WHERE fa.id = rec.account_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Account % was not found. Nothing was changed.', rec.account_id;
    END IF;

    IF rec.copied_diff = 0 THEN
      RAISE EXCEPTION 'Copied diff for account % is 0, so there is nothing to undo. Nothing was changed.', rec.account_id;
    END IF;

    IF v_live_diff <> 0 THEN
      RAISE EXCEPTION 'Account %: live diff is % but the repair left it at 0. Something changed since the repair. Nothing was changed.',
        rec.account_id, v_live_diff;
    END IF;

    UPDATE financial_accounts
    SET initial_balance = initial_balance - rec.copied_diff
    WHERE id = rec.account_id;

    GET DIAGNOSTICS v_rows = ROW_COUNT;
    IF v_rows <> 1 THEN
      RAISE EXCEPTION 'Account %: expected to update 1 row but updated %. Nothing was changed.', rec.account_id, v_rows;
    END IF;

    SELECT fa.initial_balance,
           fa.current_balance,
           fa.current_balance - (
             fa.initial_balance
             - COALESCE((SELECT SUM(x.amount) FROM expense_transactions x
                         WHERE x.account_id = fa.id AND x.is_installment = false), 0)
             + COALESCE((SELECT SUM(n.amount) FROM income_transactions n
                         WHERE n.account_id = fa.id), 0)
             - COALESCE((SELECT SUM(ROUND(o.amount::numeric, 2)) FROM transfer_transactions o
                         WHERE o.from_account_id = fa.id), 0)
             + COALESCE((SELECT SUM(ROUND(i.amount::numeric, 2)) FROM transfer_transactions i
                         WHERE i.to_account_id = fa.id), 0)
           )
    INTO v_new_initial, v_new_current, v_new_diff
    FROM financial_accounts fa
    WHERE fa.id = rec.account_id;

    IF v_new_diff <> rec.copied_diff THEN
      RAISE EXCEPTION 'Account %: diff is % after the undo instead of %. Nothing was changed.', rec.account_id, v_new_diff, rec.copied_diff;
    END IF;

    IF v_new_current <> v_current THEN
      RAISE EXCEPTION 'Account %: current_balance moved from % to %. Nothing was changed.', rec.account_id, v_current, v_new_current;
    END IF;

    RAISE NOTICE 'Account %: initial_balance % -> %', rec.account_id, v_initial, v_new_initial;
  END LOOP;
END
$$;
