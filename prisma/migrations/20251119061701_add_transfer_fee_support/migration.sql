/*
  Warnings:

  - A unique constraint covering the columns `[fee_expense_id]` on the table `transfer_transactions` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "expense_types" ADD COLUMN     "is_system" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "transfer_transactions" ADD COLUMN     "fee_amount" DECIMAL(15,2),
ADD COLUMN     "fee_expense_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "transfer_transactions_fee_expense_id_key" ON "transfer_transactions"("fee_expense_id");

-- AddForeignKey
ALTER TABLE "transfer_transactions" ADD CONSTRAINT "transfer_transactions_fee_expense_id_fkey" FOREIGN KEY ("fee_expense_id") REFERENCES "expense_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
