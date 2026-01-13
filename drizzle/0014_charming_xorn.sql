CREATE TABLE "bank_account_balances" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"bank_account_id" bigint NOT NULL,
	"balance" numeric(15, 2) NOT NULL,
	"currency_code" varchar(3) NOT NULL,
	"interest_rate" numeric(5, 2),
	"interest_rate_start_date" date,
	"interest_rate_end_date" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bank_accounts" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bank_account_balances" ADD CONSTRAINT "bank_account_balances_bank_account_id_bank_accounts_id_fk" FOREIGN KEY ("bank_account_id") REFERENCES "public"."bank_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bank_account_balances_bank_account_id_idx" ON "bank_account_balances" USING btree ("bank_account_id");--> statement-breakpoint
CREATE INDEX "bank_account_balances_created_at_idx" ON "bank_account_balances" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "bank_accounts_name_idx" ON "bank_accounts" USING btree ("name");--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_parent_item_id_items_id_fk" FOREIGN KEY ("parent_item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;