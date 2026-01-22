ALTER TYPE "public"."recurrence" ADD VALUE 'bi-weekly' BEFORE 'monthly';--> statement-breakpoint
ALTER TABLE "salary_change" RENAME TO "salary_changes";--> statement-breakpoint
ALTER TABLE "salary_changes" ADD COLUMN "recurrence" text NOT NULL;--> statement-breakpoint
ALTER TABLE "salary_changes" DROP COLUMN "description";