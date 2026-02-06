ALTER TABLE "passkeys" ALTER COLUMN "counter" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "passkeys" ADD COLUMN "display_name" text NOT NULL;