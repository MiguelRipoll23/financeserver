ALTER TABLE "salary_change" DROP CONSTRAINT "salary_change_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "salary_change" ALTER COLUMN "net_amount" SET DATA TYPE numeric(12, 2);--> statement-breakpoint
ALTER TABLE "salary_change" DROP COLUMN "user_id";