DROP ROLE "authenticated_user";--> statement-breakpoint
CREATE INDEX "bills_category_id_idx" ON "bills" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "bills_total_amount_idx" ON "bills" USING btree ("total_amount");--> statement-breakpoint
CREATE INDEX "bills_bill_date_category_id_idx" ON "bills" USING btree ("bill_date","category_id");--> statement-breakpoint
CREATE INDEX "item_prices_unit_price_idx" ON "item_prices" USING btree ("unit_price");--> statement-breakpoint
CREATE INDEX "item_prices_price_date_idx" ON "item_prices" USING btree ("price_date");--> statement-breakpoint
CREATE INDEX "item_prices_item_id_price_date_desc_idx" ON "item_prices" USING btree ("item_id","price_date" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "receipt_items_receipt_id_idx" ON "receipt_items" USING btree ("receipt_id");--> statement-breakpoint
CREATE INDEX "receipt_items_item_id_idx" ON "receipt_items" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX "receipts_receipt_date_idx" ON "receipts" USING btree ("receipt_date");--> statement-breakpoint
CREATE INDEX "receipts_total_amount_idx" ON "receipts" USING btree ("total_amount");--> statement-breakpoint
CREATE INDEX "subscription_prices_subscription_id_idx" ON "subscription_prices" USING btree ("subscription_id");--> statement-breakpoint
CREATE INDEX "subscription_prices_recurrence_idx" ON "subscription_prices" USING btree ("recurrence");--> statement-breakpoint
CREATE INDEX "subscription_prices_amount_idx" ON "subscription_prices" USING btree ("amount");--> statement-breakpoint
CREATE INDEX "subscription_prices_currency_code_idx" ON "subscription_prices" USING btree ("currency_code");--> statement-breakpoint
CREATE INDEX "subscription_prices_effective_from_idx" ON "subscription_prices" USING btree ("effective_from");--> statement-breakpoint
CREATE INDEX "subscription_prices_effective_until_idx" ON "subscription_prices" USING btree ("effective_until");--> statement-breakpoint
CREATE INDEX "subscription_prices_subscription_id_effective_from_desc_idx" ON "subscription_prices" USING btree ("subscription_id","effective_from" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "subscription_prices_effective_dates_idx" ON "subscription_prices" USING btree ("effective_from","effective_until");