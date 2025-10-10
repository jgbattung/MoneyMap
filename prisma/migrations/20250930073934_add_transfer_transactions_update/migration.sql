-- DropForeignKey
ALTER TABLE "transfer_transactions" DROP CONSTRAINT "transfer_transactions_from_account_id_fkey";

-- DropForeignKey
ALTER TABLE "transfer_transactions" DROP CONSTRAINT "transfer_transactions_to_account_id_fkey";

-- AddForeignKey
ALTER TABLE "transfer_transactions" ADD CONSTRAINT "transfer_transactions_from_account_id_fkey" FOREIGN KEY ("from_account_id") REFERENCES "financial_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_transactions" ADD CONSTRAINT "transfer_transactions_to_account_id_fkey" FOREIGN KEY ("to_account_id") REFERENCES "financial_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
