ALTER TABLE "bank_account_roboadvisor_funds" RENAME TO "roboadvisor_funds";--> statement-breakpoint
ALTER TABLE "bank_account_roboadvisor_balances" RENAME TO "roboadvisor_balances";--> statement-breakpoint
ALTER TABLE "bank_account_roboadvisors" RENAME TO "roboadvisors";--> statement-breakpoint
ALTER TABLE "roboadvisor_balances" RENAME COLUMN "bank_account_roboadvisor_id" TO "roboadvisor_id";--> statement-breakpoint
ALTER TABLE "roboadvisor_funds" RENAME COLUMN "bank_account_roboadvisor_id" TO "roboadvisor_id";--> statement-breakpoint
ALTER TABLE "bank_account_roboadvisor_fund_calculations" RENAME COLUMN "bank_account_roboadvisor_id" TO "roboadvisor_id";
