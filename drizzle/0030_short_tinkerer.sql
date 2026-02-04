ALTER TABLE "bank_account_interest_rate_calculations" RENAME TO "bank_account_calculations";--> statement-breakpoint
ALTER TABLE "bank_account_calculations" RENAME COLUMN "monthly_profit_after_tax" TO "monthly_profit";--> statement-breakpoint
ALTER TABLE "bank_account_calculations" RENAME COLUMN "annual_profit_after_tax" TO "annual_profit";--> statement-breakpoint
ALTER TABLE "bank_account_calculations" DROP CONSTRAINT "bank_account_interest_rate_calculations_bank_account_id_bank_accounts_id_fk";
--> statement-breakpoint
DROP INDEX "idx_interest_rate_calcs_account_created";--> statement-breakpoint
ALTER TABLE "bank_account_calculations" ADD COLUMN "currency_code" varchar(3) NOT NULL;--> statement-breakpoint
ALTER TABLE "bank_accounts" ADD COLUMN "tax_percentage" numeric(8, 6);--> statement-breakpoint
ALTER TABLE "bank_account_calculations" ADD CONSTRAINT "bank_account_calculations_bank_account_id_bank_accounts_id_fk" FOREIGN KEY ("bank_account_id") REFERENCES "public"."bank_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_bank_account_calculations_account_created" ON "bank_account_calculations" USING btree ("bank_account_id","created_at" DESC NULLS LAST);--> statement-breakpoint
ALTER TABLE "bank_account_interest_rates" DROP COLUMN "tax_percentage";