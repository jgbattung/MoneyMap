-- AlterTable
ALTER TABLE "expense_transactions" ALTER COLUMN "date" SET DATA TYPE TEXT,
ALTER COLUMN "installment_start_date" SET DATA TYPE TEXT,
ALTER COLUMN "last_processed_date" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "income_transactions" ALTER COLUMN "date" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "transfer_transactions" ALTER COLUMN "date" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "user" ALTER COLUMN "netWorthTargetDate" SET DATA TYPE TEXT;
