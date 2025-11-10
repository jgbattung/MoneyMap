-- AlterTable
ALTER TABLE "expense_transactions" ADD COLUMN     "is_system_generated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "parent_installment_id" TEXT;
