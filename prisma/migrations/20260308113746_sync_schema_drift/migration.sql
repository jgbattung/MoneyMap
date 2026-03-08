-- AlterTable
ALTER TABLE "expense_transactions" ALTER COLUMN "date" SET DATA TYPE TIMESTAMP(6),
ALTER COLUMN "installment_start_date" SET DATA TYPE TIMESTAMP(6),
ALTER COLUMN "last_processed_date" SET DATA TYPE TIMESTAMP(6);

-- AlterTable
ALTER TABLE "financial_accounts" ADD COLUMN     "card_group" TEXT,
ADD COLUMN     "last_statement_calculation_date" TIMESTAMP(6),
ADD COLUMN     "previous_statement_balance" DECIMAL(15,2),
ADD COLUMN     "statement_balance" DECIMAL(15,2);

-- AlterTable
ALTER TABLE "income_transactions" ALTER COLUMN "date" SET DATA TYPE TIMESTAMP(6);

-- AlterTable
ALTER TABLE "transfer_transactions" ALTER COLUMN "date" SET DATA TYPE TIMESTAMP(6);

-- AlterTable
ALTER TABLE "user" ALTER COLUMN "netWorthTargetDate" SET DATA TYPE TIMESTAMP(6);
