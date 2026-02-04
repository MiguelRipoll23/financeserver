ALTER TABLE "bank_account_roboadvisor_balances" RENAME TO "roboadvisor_balances";--> statement-breakpoint
ALTER TABLE "bank_account_roboadvisor_funds" RENAME TO "roboadvisor_funds";--> statement-breakpoint
ALTER TABLE "bank_account_roboadvisors" RENAME TO "roboadvisors";--> statement-breakpoint
ALTER TABLE "roboadvisor_balances" RENAME COLUMN "bank_account_roboadvisor_id" TO "roboadvisor_id";--> statement-breakpoint
ALTER TABLE "bank_account_roboadvisor_fund_calculations" RENAME COLUMN "bank_account_roboadvisor_id" TO "roboadvisor_id";--> statement-breakpoint
ALTER TABLE "roboadvisor_funds" RENAME COLUMN "bank_account_roboadvisor_id" TO "roboadvisor_id";--> statement-breakpoint
ALTER TABLE "roboadvisor_balances" DROP CONSTRAINT "bank_account_roboadvisor_balances_bank_account_roboadvisor_id_bank_account_roboadvisors_id_fk";
--> statement-breakpoint
ALTER TABLE "bank_account_roboadvisor_fund_calculations" DROP CONSTRAINT "bank_account_roboadvisor_fund_calculations_bank_account_roboadvisor_id_bank_account_roboadvisors_id_fk";
--> statement-breakpoint
ALTER TABLE "roboadvisor_funds" DROP CONSTRAINT "bank_account_roboadvisor_funds_bank_account_roboadvisor_id_bank_account_roboadvisors_id_fk";
--> statement-breakpoint
ALTER TABLE "roboadvisors" DROP CONSTRAINT "bank_account_roboadvisors_bank_account_id_bank_accounts_id_fk";
--> statement-breakpoint
DROP INDEX "idx_roboadvisor_fund_calcs_roboadvisor_created";--> statement-breakpoint
ALTER TABLE "roboadvisor_balances" ADD CONSTRAINT "roboadvisor_balances_roboadvisor_id_roboadvisors_id_fk" FOREIGN KEY ("roboadvisor_id") REFERENCES "public"."roboadvisors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_account_roboadvisor_fund_calculations" ADD CONSTRAINT "bank_account_roboadvisor_fund_calculations_roboadvisor_id_roboadvisors_id_fk" FOREIGN KEY ("roboadvisor_id") REFERENCES "public"."roboadvisors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roboadvisor_funds" ADD CONSTRAINT "roboadvisor_funds_roboadvisor_id_roboadvisors_id_fk" FOREIGN KEY ("roboadvisor_id") REFERENCES "public"."roboadvisors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roboadvisors" ADD CONSTRAINT "roboadvisors_bank_account_id_bank_accounts_id_fk" FOREIGN KEY ("bank_account_id") REFERENCES "public"."bank_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_roboadvisor_fund_calcs_roboadvisor_created" ON "bank_account_roboadvisor_fund_calculations" USING btree ("roboadvisor_id","created_at" DESC NULLS LAST);