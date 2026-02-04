ALTER TABLE "bank_account_interest_rates" ALTER COLUMN "interest_rate" SET DATA TYPE numeric(8, 6);--> statement-breakpoint
ALTER TABLE "bank_account_interest_rates" ALTER COLUMN "tax_percentage" SET DATA TYPE numeric(8, 6);--> statement-breakpoint
ALTER TABLE "bank_account_roboadvisor_funds" ALTER COLUMN "weight" SET DATA TYPE numeric(8, 6);--> statement-breakpoint
ALTER TABLE "bank_account_roboadvisors" ALTER COLUMN "management_fee_percentage" SET DATA TYPE numeric(8, 6);--> statement-breakpoint
ALTER TABLE "bank_account_roboadvisors" ALTER COLUMN "custody_fee_percentage" SET DATA TYPE numeric(8, 6);--> statement-breakpoint
ALTER TABLE "bank_account_roboadvisors" ALTER COLUMN "fund_ter_percentage" SET DATA TYPE numeric(8, 6);--> statement-breakpoint
ALTER TABLE "bank_account_roboadvisors" ALTER COLUMN "total_fee_percentage" SET DATA TYPE numeric(8, 6);--> statement-breakpoint
ALTER TABLE "bank_account_roboadvisors" ALTER COLUMN "capital_gains_tax_percentage" SET DATA TYPE numeric(8, 6);--> statement-breakpoint
ALTER TABLE "crypto_exchanges" ALTER COLUMN "capital_gains_tax_percentage" SET DATA TYPE numeric(8, 6);