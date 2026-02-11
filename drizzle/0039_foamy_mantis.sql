ALTER TABLE "oauth_authorization_codes" DROP CONSTRAINT "oauth_authorization_codes_code_hash_unique";--> statement-breakpoint
ALTER TABLE "oauth_authorization_codes" ADD PRIMARY KEY ("code_hash");--> statement-breakpoint
ALTER TABLE "oauth_connections" ADD COLUMN "refresh_token_expires_at" timestamp with time zone NOT NULL;--> statement-breakpoint
ALTER TABLE "oauth_authorization_codes" DROP COLUMN "code";