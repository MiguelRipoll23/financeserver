ALTER TABLE "oauth_authorization_codes" RENAME COLUMN "access_token" TO "access_token_hash";--> statement-breakpoint
ALTER TABLE "oauth_connections" RENAME COLUMN "refresh_token" TO "refresh_token_hash";--> statement-breakpoint
ALTER TABLE "oauth_connections" RENAME COLUMN "access_token" TO "access_token_hash";--> statement-breakpoint
ALTER TABLE "oauth_authorization_codes" ADD COLUMN "code_hash" text NOT NULL;--> statement-breakpoint
ALTER TABLE "oauth_authorization_codes" ADD CONSTRAINT "oauth_authorization_codes_code_hash_unique" UNIQUE("code_hash");--> statement-breakpoint
ALTER TABLE "oauth_connections" ADD CONSTRAINT "oauth_connections_refresh_token_hash_unique" UNIQUE("refresh_token_hash");--> statement-breakpoint
ALTER TABLE "oauth_connections" ADD CONSTRAINT "oauth_connections_access_token_hash_unique" UNIQUE("access_token_hash");