ALTER ROLE "authenticated_user" WITH NOCREATEDB NOCREATEROLE INHERIT;--> statement-breakpoint
DROP INDEX "passkeys_credential_id_unique";--> statement-breakpoint
ALTER TABLE "passkeys" ALTER COLUMN "id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "passkeys" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "passkeys" DROP COLUMN "credential_id";