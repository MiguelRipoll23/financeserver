-- Migration: Update items unique constraint to composite key
-- Date: 2025-12-11
-- Description: Replaces the unique constraint on 'name' with a composite unique
--              constraint on (name, parent_item_id) to allow same-named items
--              under different parents

-- Drop the existing unique index on name only
DROP INDEX IF EXISTS "items_name_key";--> statement-breakpoint

-- Create new composite unique index on (name, parent_item_id)
CREATE UNIQUE INDEX "items_name_parent_item_id_key" ON "items" ("name", "parent_item_id");--> statement-breakpoint

-- Add comment for documentation
COMMENT ON INDEX "items_name_parent_item_id_key" IS 'Ensures item names are unique within the same parent context. Allows same-named items under different parents.';
