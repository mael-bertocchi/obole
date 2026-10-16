-- The health category becomes selfcare. Its row, the operations filed under it and the limits frozen in each month's
-- history move to the new id, and the revision moves on so every client reads the renamed budget back.

-- RenameCategory
DELETE FROM "budget_categories" WHERE "id" = 'health' AND EXISTS (SELECT 1 FROM "budget_categories" WHERE "id" = 'selfcare');
UPDATE "budget_categories" SET "id" = 'selfcare', "name" = 'Selfcare' WHERE "id" = 'health';

-- MoveOperations
UPDATE "budget_operations" SET "category_id" = 'selfcare' WHERE "category_id" = 'health';

-- MoveHistory
UPDATE "budget_history"
SET "category_limits" = ("category_limits" - 'health') || jsonb_build_object('selfcare', COALESCE("category_limits" -> 'selfcare', "category_limits" -> 'health'))
WHERE "category_limits" ? 'health';

-- MoveRevision
UPDATE "budget_state" SET "revision" = "revision" + 1;
