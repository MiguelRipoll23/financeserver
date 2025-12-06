ALTER TABLE "oauth_authorization_codes" DROP CONSTRAINT "oauth_authorization_codes_client_id_oauth_clients_client_id_fk";
--> statement-breakpoint
ALTER TABLE "oauth_connections" DROP CONSTRAINT "oauth_connections_client_id_oauth_clients_client_id_fk";
--> statement-breakpoint
ALTER TABLE "oauth_authorization_codes" ADD CONSTRAINT "oauth_authorization_codes_client_id_oauth_clients_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."oauth_clients"("client_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_connections" ADD CONSTRAINT "oauth_connections_client_id_oauth_clients_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."oauth_clients"("client_id") ON DELETE cascade ON UPDATE no action;