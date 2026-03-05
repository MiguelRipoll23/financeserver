ALTER TABLE "bill_category" RENAME TO "bill_categories";--> statement-breakpoint
ALTER TABLE "bills" DROP CONSTRAINT "bills_category_id_bill_category_id_fk";
--> statement-breakpoint
DROP INDEX "bill_category_normalized_name_key";--> statement-breakpoint
DROP INDEX "bill_category_name_idx";--> statement-breakpoint
ALTER TABLE "bills" ADD CONSTRAINT "bills_category_id_bill_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."bill_categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "bill_categories_normalized_name_key" ON "bill_categories" USING btree ("normalized_name");--> statement-breakpoint
CREATE INDEX "bill_categories_name_idx" ON "bill_categories" USING btree ("name");