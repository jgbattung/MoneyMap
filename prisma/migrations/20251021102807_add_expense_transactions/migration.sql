-- CreateTable
CREATE TABLE "expense_transactions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "expense_type_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "is_installment" BOOLEAN NOT NULL DEFAULT false,
    "installment_duration" INTEGER,
    "remaining_installments" INTEGER,
    "installment_start_date" TIMESTAMP(3),
    "monthly_amount" DECIMAL(15,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expense_transactions_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "expense_transactions" ADD CONSTRAINT "expense_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_transactions" ADD CONSTRAINT "expense_transactions_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "financial_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_transactions" ADD CONSTRAINT "expense_transactions_expense_type_id_fkey" FOREIGN KEY ("expense_type_id") REFERENCES "expense_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
