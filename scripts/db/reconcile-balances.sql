/*
  reconcile-balances.sql

  READ ONLY. This file is one SELECT statement and changes nothing.
  Run it by hand in the Supabase SQL editor (see scripts/db/README.md).

  For every row in financial_accounts it returns the stored current balance,
  the balance the history says it should be, and the difference (diff).
  A diff of 0.00 means the account agrees with its history.

  Rule: expected = initial_balance
                   - expenses that are not installment parents
                   + income
                   - transfers out
                   + transfers in
  Transfer amounts are Float, so each row is rounded to 2 decimals before
  summing, matching how each change landed in the Decimal(15,2) balance.
*/
WITH expense AS (
  SELECT account_id, SUM(amount) AS total
  FROM expense_transactions
  WHERE is_installment = false
  GROUP BY account_id
), income AS (
  SELECT account_id, SUM(amount) AS total
  FROM income_transactions
  GROUP BY account_id
), transfer_out AS (
  SELECT from_account_id AS account_id, SUM(ROUND(amount::numeric, 2)) AS total
  FROM transfer_transactions
  GROUP BY from_account_id
), transfer_in AS (
  SELECT to_account_id AS account_id, SUM(ROUND(amount::numeric, 2)) AS total
  FROM transfer_transactions
  GROUP BY to_account_id
), balances AS (
  SELECT fa.id,
         fa.user_id,
         fa.name,
         fa.account_type,
         fa.initial_balance,
         fa.current_balance AS stored_balance,
         fa.initial_balance
           - COALESCE(e.total, 0)
           + COALESCE(i.total, 0)
           - COALESCE(o.total, 0)
           + COALESCE(t.total, 0) AS expected_balance
  FROM financial_accounts fa
  LEFT JOIN expense e ON e.account_id = fa.id
  LEFT JOIN income i ON i.account_id = fa.id
  LEFT JOIN transfer_out o ON o.account_id = fa.id
  LEFT JOIN transfer_in t ON t.account_id = fa.id
)
SELECT *, stored_balance - expected_balance AS diff
FROM balances
ORDER BY ABS(stored_balance - expected_balance) DESC, name;
