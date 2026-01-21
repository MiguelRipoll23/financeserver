CREATE TABLE "bank_account_interest_rates" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"bank_account_id" bigint NOT NULL,
	"interest_rate" numeric(5, 2) NOT NULL,
	"interest_rate_start_date" date NOT NULL,
	"interest_rate_end_date" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "interest_rate_end_date_check" CHECK ("bank_account_interest_rates"."interest_rate_end_date" IS NULL OR "bank_account_interest_rates"."interest_rate_end_date" >= "bank_account_interest_rates"."interest_rate_start_date")
);
--> statement-breakpoint
CREATE TABLE "cash_balances" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"cash_id" bigint NOT NULL,
	"balance" numeric(15, 2) NOT NULL,
	"currency_code" varchar(3) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cash" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bank_account_interest_rates" ADD CONSTRAINT "bank_account_interest_rates_bank_account_id_bank_accounts_id_fk" FOREIGN KEY ("bank_account_id") REFERENCES "public"."bank_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_balances" ADD CONSTRAINT "cash_balances_cash_id_cash_id_fk" FOREIGN KEY ("cash_id") REFERENCES "public"."cash"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bank_account_interest_rates_bank_account_id_idx" ON "bank_account_interest_rates" USING btree ("bank_account_id");--> statement-breakpoint
CREATE INDEX "bank_account_interest_rates_created_at_idx" ON "bank_account_interest_rates" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "bank_account_interest_rates_period_idx" ON "bank_account_interest_rates" USING btree ("bank_account_id","interest_rate_start_date","interest_rate_end_date");--> statement-breakpoint
CREATE INDEX "cash_balances_cash_id_idx" ON "cash_balances" USING btree ("cash_id");--> statement-breakpoint
CREATE INDEX "cash_balances_created_at_idx" ON "cash_balances" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "cash_label_idx" ON "cash" USING btree ("label");--> statement-breakpoint
ALTER TABLE "bank_account_balances" DROP COLUMN "interest_rate";--> statement-breakpoint
ALTER TABLE "bank_account_balances" DROP COLUMN "interest_rate_start_date";--> statement-breakpoint
ALTER TABLE "bank_account_balances" DROP COLUMN "interest_rate_end_date";