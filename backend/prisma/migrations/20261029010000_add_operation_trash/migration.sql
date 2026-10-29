-- A deleted operation now goes to the trash: it is kept with the moment it was deleted, out of the budget, until it is restored.

-- AlterTable
ALTER TABLE "budget_operations" ADD COLUMN "deleted_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "budget_operations_deleted_at_idx" ON "budget_operations"("deleted_at");
