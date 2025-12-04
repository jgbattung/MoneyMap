-- CreateIndex
CREATE INDEX "expense_transactions_account_id_date_idx" ON "expense_transactions"("account_id", "date");

-- CreateIndex
CREATE INDEX "expense_transactions_user_id_date_idx" ON "expense_transactions"("user_id", "date");

-- CreateIndex
CREATE INDEX "income_transactions_account_id_date_idx" ON "income_transactions"("account_id", "date");

-- CreateIndex
CREATE INDEX "income_transactions_user_id_date_idx" ON "income_transactions"("user_id", "date");

-- CreateIndex
CREATE INDEX "transfer_transactions_from_account_id_date_idx" ON "transfer_transactions"("from_account_id", "date");

-- CreateIndex
CREATE INDEX "transfer_transactions_to_account_id_date_idx" ON "transfer_transactions"("to_account_id", "date");

-- CreateIndex
CREATE INDEX "transfer_transactions_user_id_date_idx" ON "transfer_transactions"("user_id", "date");
