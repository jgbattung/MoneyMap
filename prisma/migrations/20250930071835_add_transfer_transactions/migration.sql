-- CreateTable
CREATE TABLE "transfer_transactions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "from_account_id" TEXT NOT NULL,
    "to_account_id" TEXT NOT NULL,
    "transfer_type_id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transfer_transactions_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "transfer_transactions" ADD CONSTRAINT "transfer_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_transactions" ADD CONSTRAINT "transfer_transactions_from_account_id_fkey" FOREIGN KEY ("from_account_id") REFERENCES "account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_transactions" ADD CONSTRAINT "transfer_transactions_to_account_id_fkey" FOREIGN KEY ("to_account_id") REFERENCES "account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_transactions" ADD CONSTRAINT "transfer_transactions_transfer_type_id_fkey" FOREIGN KEY ("transfer_type_id") REFERENCES "transfer_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
