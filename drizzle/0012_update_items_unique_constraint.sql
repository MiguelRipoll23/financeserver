-- Migration: Update items unique constraint to partial indexes
-- Date: 2025-12-11
-- Description: Replaces the unique constraint on 'name' with two partial unique
--              indexes to enforce uniqueness at root level and per-parent for subitems

-- Drop the existing unique index on name only
DROP INDEX IF EXISTS "items_name_key";--> statement-breakpoint

-- Root-level items: unique name when there is no parent
CREATE UNIQUE INDEX "items_root_name_key"
  ON "items" ("name")
  WHERE "parent_item_id" IS NULL;--> statement-breakpoint

-- Subitems: unique per (parent, name) when there is a parent
CREATE UNIQUE INDEX "items_name_parent_item_id_key"
  ON "items" ("name", "parent_item_id")
  WHERE "parent_item_id" IS NOT NULL;--> statement-breakpoint

-- Add comments for documentation
COMMENT ON INDEX "items_root_name_key" IS 'Ensures root-level item names are unique when there is no parent.';--> statement-breakpoint
COMMENT ON INDEX "items_name_parent_item_id_key" IS 'Ensures subitem names are unique within the same parent context.';
