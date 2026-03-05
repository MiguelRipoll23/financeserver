ALTER TABLE "bills" ADD COLUMN "name" varchar(255) NOT NULL DEFAULT '';--> statement-breakpoint
ALTER TABLE "bills" DROP CONSTRAINT IF EXISTS "bills_email_id_bill_email_id_fk";--> statement-breakpoint
ALTER TABLE "bills" DROP COLUMN IF EXISTS "email_id";--> statement-breakpoint
ALTER TABLE "bills" ALTER COLUMN "name" DROP DEFAULT;
