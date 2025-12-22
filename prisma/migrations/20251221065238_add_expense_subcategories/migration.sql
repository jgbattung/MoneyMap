-- AlterTable
ALTER TABLE "expense_transactions" ADD COLUMN     "expense_subcategory_id" TEXT;

-- CreateTable
CREATE TABLE "expense_subcategories" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expense_type_id" TEXT NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expense_subcategories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "expense_subcategories_expense_type_id_name_key" ON "expense_subcategories"("expense_type_id", "name");

-- AddForeignKey
ALTER TABLE "expense_subcategories" ADD CONSTRAINT "expense_subcategories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_subcategories" ADD CONSTRAINT "expense_subcategories_expense_type_id_fkey" FOREIGN KEY ("expense_type_id") REFERENCES "expense_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_transactions" ADD CONSTRAINT "expense_transactions_expense_subcategory_id_fkey" FOREIGN KEY ("expense_subcategory_id") REFERENCES "expense_subcategories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
