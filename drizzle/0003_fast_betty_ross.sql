DROP INDEX "bills_bill_date_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "bills_bill_date_category_unique" ON "bills" USING btree ("bill_date","category_id");