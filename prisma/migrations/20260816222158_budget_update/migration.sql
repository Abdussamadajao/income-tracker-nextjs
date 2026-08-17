/*
  Warnings:

  - A unique constraint covering the columns `[user_id,category_id,income_id,period]` on the table `budgets` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "budgets_user_id_category_id_period_key";

-- AlterTable
ALTER TABLE "budgets" ADD COLUMN     "income_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "budgets_user_id_category_id_income_id_period_key" ON "budgets"("user_id", "category_id", "income_id", "period");

-- AddForeignKey
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_income_id_fkey" FOREIGN KEY ("income_id") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
