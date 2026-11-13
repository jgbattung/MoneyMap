-- CreateEnum
CREATE TYPE "PayDivisionItemKind" AS ENUM ('TRANSFER', 'EARMARK');

-- CreateTable
CREATE TABLE "pay_plans" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "save_percent" DECIMAL(5,2) NOT NULL,
    "source_account_id" TEXT,
    "save_account_id" TEXT,
    "spend_account_id" TEXT,
    "transfer_type_id" TEXT,
    "lines" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pay_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pay_divisions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "plan_id" TEXT,
    "plan_name" VARCHAR(50) NOT NULL,
    "save_percent" DECIMAL(5,2) NOT NULL,
    "pay_amount" DECIMAL(15,2) NOT NULL,
    "save_amount" DECIMAL(15,2) NOT NULL,
    "spend_amount" DECIMAL(15,2) NOT NULL,
    "pay_date" TIMESTAMP(6) NOT NULL,
    "income_transaction_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pay_divisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pay_division_items" (
    "id" TEXT NOT NULL,
    "division_id" TEXT NOT NULL,
    "kind" "PayDivisionItemKind" NOT NULL,
    "label" VARCHAR(100) NOT NULL,
    "detail" VARCHAR(50),
    "amount" DECIMAL(15,2) NOT NULL,
    "sort_order" INTEGER NOT NULL,
    "parent_item_id" TEXT,
    "from_account_id" TEXT,
    "to_account_id" TEXT,
    "transfer_type_id" TEXT,
    "transfer_transaction_id" TEXT,
    "completed_at" TIMESTAMP(6),

    CONSTRAINT "pay_division_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pay_plans_user_id_name_key" ON "pay_plans"("user_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "pay_divisions_income_transaction_id_key" ON "pay_divisions"("income_transaction_id");

-- CreateIndex
CREATE INDEX "pay_divisions_user_id_pay_date_idx" ON "pay_divisions"("user_id", "pay_date");

-- CreateIndex
CREATE UNIQUE INDEX "pay_division_items_transfer_transaction_id_key" ON "pay_division_items"("transfer_transaction_id");

-- CreateIndex
CREATE INDEX "pay_division_items_division_id_idx" ON "pay_division_items"("division_id");

-- AddForeignKey
ALTER TABLE "pay_plans" ADD CONSTRAINT "pay_plans_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pay_plans" ADD CONSTRAINT "pay_plans_source_account_id_fkey" FOREIGN KEY ("source_account_id") REFERENCES "financial_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pay_plans" ADD CONSTRAINT "pay_plans_save_account_id_fkey" FOREIGN KEY ("save_account_id") REFERENCES "financial_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pay_plans" ADD CONSTRAINT "pay_plans_spend_account_id_fkey" FOREIGN KEY ("spend_account_id") REFERENCES "financial_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pay_plans" ADD CONSTRAINT "pay_plans_transfer_type_id_fkey" FOREIGN KEY ("transfer_type_id") REFERENCES "transfer_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pay_divisions" ADD CONSTRAINT "pay_divisions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pay_divisions" ADD CONSTRAINT "pay_divisions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "pay_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pay_divisions" ADD CONSTRAINT "pay_divisions_income_transaction_id_fkey" FOREIGN KEY ("income_transaction_id") REFERENCES "income_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pay_division_items" ADD CONSTRAINT "pay_division_items_division_id_fkey" FOREIGN KEY ("division_id") REFERENCES "pay_divisions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pay_division_items" ADD CONSTRAINT "pay_division_items_parent_item_id_fkey" FOREIGN KEY ("parent_item_id") REFERENCES "pay_division_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pay_division_items" ADD CONSTRAINT "pay_division_items_from_account_id_fkey" FOREIGN KEY ("from_account_id") REFERENCES "financial_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pay_division_items" ADD CONSTRAINT "pay_division_items_to_account_id_fkey" FOREIGN KEY ("to_account_id") REFERENCES "financial_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pay_division_items" ADD CONSTRAINT "pay_division_items_transfer_type_id_fkey" FOREIGN KEY ("transfer_type_id") REFERENCES "transfer_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pay_division_items" ADD CONSTRAINT "pay_division_items_transfer_transaction_id_fkey" FOREIGN KEY ("transfer_transaction_id") REFERENCES "transfer_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

