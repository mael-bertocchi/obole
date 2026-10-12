-- Obole now hosts several apps on one database, so every table starts with the app it belongs to (identity for the
-- portal's own). The tables are renamed in place, with their keys and indexes, so no row is lost.

-- RenameTable
ALTER TABLE "refresh_sessions" RENAME TO "identity_refresh_sessions";
ALTER TABLE "identity_refresh_sessions" RENAME CONSTRAINT "refresh_sessions_pkey" TO "identity_refresh_sessions_pkey";
ALTER INDEX "refresh_sessions_user_id_idx" RENAME TO "identity_refresh_sessions_user_id_idx";

-- RenameTable
ALTER TABLE "categories" RENAME TO "budget_categories";
ALTER TABLE "budget_categories" RENAME CONSTRAINT "categories_pkey" TO "budget_categories_pkey";

-- RenameTable
ALTER TABLE "operations" RENAME TO "budget_operations";
ALTER TABLE "budget_operations" RENAME CONSTRAINT "operations_pkey" TO "budget_operations_pkey";
ALTER INDEX "operations_date_idx" RENAME TO "budget_operations_date_idx";
ALTER INDEX "operations_category_id_idx" RENAME TO "budget_operations_category_id_idx";

-- RenameTable
ALTER TABLE "exchange_rate_snapshots" RENAME TO "budget_exchange_rate_snapshots";
ALTER TABLE "budget_exchange_rate_snapshots" RENAME CONSTRAINT "exchange_rate_snapshots_pkey" TO "budget_exchange_rate_snapshots_pkey";
