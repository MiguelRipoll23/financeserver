ALTER TABLE "subscription_prices" RENAME COLUMN "start_date" TO "effective_from";--> statement-breakpoint
ALTER TABLE "subscription_prices" RENAME COLUMN "end_date" TO "effective_until";