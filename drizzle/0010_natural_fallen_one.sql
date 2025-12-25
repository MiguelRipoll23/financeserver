CREATE TABLE "merchants" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP INDEX "items_name_key";--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "parent_item_id" bigint;--> statement-breakpoint
ALTER TABLE "oauth_authorization_codes" ADD COLUMN "resource" text;--> statement-breakpoint
ALTER TABLE "oauth_connections" ADD COLUMN "resource" text;--> statement-breakpoint
ALTER TABLE "receipts" ADD COLUMN "merchant_id" bigint;--> statement-breakpoint
CREATE UNIQUE INDEX "merchants_name_unique" ON "merchants" USING btree ("name");--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_parent_item_id_items_id_fk" FOREIGN KEY ("parent_item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "items_root_name_key" ON "items" USING btree ("name") WHERE "items"."parent_item_id" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "items_name_parent_item_id_key" ON "items" USING btree ("name","parent_item_id") WHERE "items"."parent_item_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "items_parent_item_id_idx" ON "items" USING btree ("parent_item_id");--> statement-breakpoint
CREATE INDEX "receipts_merchant_id_idx" ON "receipts" USING btree ("merchant_id");