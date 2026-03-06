ALTER TABLE "bills" DROP CONSTRAINT "bills_email_id_bill_email_id_fk";
--> statement-breakpoint
ALTER TABLE "bills" ADD COLUMN "name" varchar(255);--> statement-breakpoint
ALTER TABLE "bills" DROP COLUMN "email_id";