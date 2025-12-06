CREATE TYPE "public"."recurrence" AS ENUM('weekly', 'monthly', 'yearly');--> statement-breakpoint
CREATE ROLE "authenticated_user" WITH NOINHERIT;--> statement-breakpoint
CREATE TABLE "bill_category" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"normalized_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bill_email" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bill_email_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "bills" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"bill_date" date NOT NULL,
	"category_id" bigint NOT NULL,
	"total_amount" numeric(12, 2) NOT NULL,
	"currency_code" varchar(3) DEFAULT 'EUR' NOT NULL,
	"email_id" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "item_prices" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"item_id" bigint NOT NULL,
	"price_date" date NOT NULL,
	"unit_price" numeric(12, 2) NOT NULL,
	"currency_code" varchar(3) DEFAULT 'EUR' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "items" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "oauth_authorization_codes" (
	"code" text PRIMARY KEY NOT NULL,
	"client_id" text NOT NULL,
	"redirect_uri" text NOT NULL,
	"code_challenge" text NOT NULL,
	"code_challenge_method" text NOT NULL,
	"scope" text NOT NULL,
	"access_token" text NOT NULL,
	"token_type" text NOT NULL,
	"user" jsonb NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "oauth_authorization_codes_code_challenge_method_valid" CHECK (code_challenge_method = 'S256')
);
--> statement-breakpoint
CREATE TABLE "oauth_clients" (
	"client_id" text PRIMARY KEY NOT NULL,
	"redirect_uris" text[] NOT NULL,
	"client_id_issued_at" timestamp with time zone NOT NULL,
	"client_secret" text,
	"client_secret_expires_at" bigint,
	"grant_types" text[] NOT NULL,
	"response_types" text[] NOT NULL,
	"token_endpoint_auth_method" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "oauth_clients_redirect_uris_not_empty" CHECK (cardinality("oauth_clients"."redirect_uris") > 0),
	CONSTRAINT "oauth_clients_grant_types_supported" CHECK ("oauth_clients"."grant_types" <@ ARRAY['authorization_code', 'refresh_token']::text[]),
	CONSTRAINT "oauth_clients_grant_types_not_empty" CHECK (cardinality("oauth_clients"."grant_types") > 0),
	CONSTRAINT "oauth_clients_response_types_supported" CHECK ("oauth_clients"."response_types" <@ ARRAY['code']::text[]),
	CONSTRAINT "oauth_clients_response_types_not_empty" CHECK (cardinality("oauth_clients"."response_types") > 0),
	CONSTRAINT "oauth_clients_token_endpoint_auth_method_supported" CHECK ("oauth_clients"."token_endpoint_auth_method" IN ('none', 'client_secret_basic', 'client_secret_post'))
);
--> statement-breakpoint
CREATE TABLE "oauth_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"refresh_token" text NOT NULL,
	"access_token" text NOT NULL,
	"client_id" text NOT NULL,
	"scope" text NOT NULL,
	"token_type" text NOT NULL,
	"user" jsonb NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "oauth_connections_token_type_valid" CHECK (token_type IN ('Bearer', 'bearer'))
);
--> statement-breakpoint
CREATE TABLE "receipt_items" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"receipt_id" bigint NOT NULL,
	"item_id" bigint NOT NULL,
	"quantity" integer NOT NULL,
	"total_amount" numeric(12, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "receipts" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"receipt_date" date NOT NULL,
	"total_amount" numeric(12, 2) NOT NULL,
	"currency_code" varchar(3) DEFAULT 'USD' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscription_prices" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"subscription_id" bigint NOT NULL,
	"recurrence" "recurrence" NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"currency_code" text DEFAULT 'EUR' NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date,
	"plan" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"github_handle" text NOT NULL,
	"github_handle_normalized" text NOT NULL,
	"display_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bills" ADD CONSTRAINT "bills_category_id_bill_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."bill_category"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bills" ADD CONSTRAINT "bills_email_id_bill_email_id_fk" FOREIGN KEY ("email_id") REFERENCES "public"."bill_email"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_prices" ADD CONSTRAINT "item_prices_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipt_items" ADD CONSTRAINT "receipt_items_receipt_id_receipts_id_fk" FOREIGN KEY ("receipt_id") REFERENCES "public"."receipts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipt_items" ADD CONSTRAINT "receipt_items_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_prices" ADD CONSTRAINT "subscription_prices_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "bill_category_normalized_name_key" ON "bill_category" USING btree ("normalized_name");--> statement-breakpoint
CREATE UNIQUE INDEX "bills_bill_date_unique" ON "bills" USING btree ("bill_date");--> statement-breakpoint
CREATE UNIQUE INDEX "item_prices_item_id_price_date_key" ON "item_prices" USING btree ("item_id","price_date");--> statement-breakpoint
CREATE UNIQUE INDEX "items_name_key" ON "items" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "users_github_handle_normalized_unique" ON "users" USING btree ("github_handle_normalized");