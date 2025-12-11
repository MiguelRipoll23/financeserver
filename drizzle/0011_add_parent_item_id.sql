-- Migration: Add parent_item_id column for subitems
-- Date: 2025-12-11
-- Description: Adds optional 'parent_item_id' column to items table
--              to support hierarchical item relationships (subitems)

-- Add parent_item_id column to items
ALTER TABLE "items" ADD COLUMN "parent_item_id" bigint;--> statement-breakpoint

-- Add foreign key constraint
ALTER TABLE "items" ADD CONSTRAINT "items_parent_item_id_items_id_fk" FOREIGN KEY ("parent_item_id") REFERENCES "items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

-- Add index for parent_item_id lookups
CREATE INDEX "items_parent_item_id_idx" ON "items" USING btree ("parent_item_id");--> statement-breakpoint

-- Add comments for documentation
COMMENT ON COLUMN "items"."parent_item_id" IS 'Optional reference to parent item for creating subitems. Null for top-level items.';
