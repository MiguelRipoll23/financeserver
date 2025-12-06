ALTER TABLE "bills" ALTER COLUMN "currency_code" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "item_prices" ALTER COLUMN "currency_code" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "subscription_prices" ALTER COLUMN "currency_code" DROP DEFAULT;