ALTER TABLE "bank_account_roboadvisors" RENAME COLUMN "management_fee_pct" TO "management_fee_percentage";--> statement-breakpoint
ALTER TABLE "bank_account_roboadvisors" RENAME COLUMN "custody_fee_pct" TO "custody_fee_percentage";--> statement-breakpoint
ALTER TABLE "bank_account_roboadvisors" RENAME COLUMN "fund_ter_pct" TO "fund_total_expense_ratio_percentage";--> statement-breakpoint
ALTER TABLE "bank_account_roboadvisors" RENAME COLUMN "total_fee_pct" TO "total_fee_percentage";--> statement-breakpoint
ALTER TABLE "bank_account_roboadvisors" RENAME COLUMN "ter_priced_in_nav" TO "total_expense_ratio_priced_in_nav";