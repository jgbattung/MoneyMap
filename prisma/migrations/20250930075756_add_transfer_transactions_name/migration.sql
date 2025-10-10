/*
  Warnings:

  - Added the required column `name` to the `transfer_transactions` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "transfer_transactions" ADD COLUMN     "name" VARCHAR(100) NOT NULL;
