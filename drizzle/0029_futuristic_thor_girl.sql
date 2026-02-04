ALTER TABLE "bank_account_roboadvisor_fund_calculations" RENAME TO "roboadvisor_fund_calculations";--> statement-breakpoint
ALTER TABLE "roboadvisor_fund_calculations" DROP CONSTRAINT "bank_account_roboadvisor_fund_calculations_roboadvisor_id_roboadvisors_id_fk";
--> statement-breakpoint
ALTER TABLE "roboadvisor_fund_calculations" ADD CONSTRAINT "roboadvisor_fund_calculations_roboadvisor_id_roboadvisors_id_fk" FOREIGN KEY ("roboadvisor_id") REFERENCES "public"."roboadvisors"("id") ON DELETE cascade ON UPDATE no action;