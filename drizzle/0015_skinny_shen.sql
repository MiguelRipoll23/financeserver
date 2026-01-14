CREATE TABLE "crypto_exchange_balances" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"crypto_exchange_id" bigint NOT NULL,
	"balance" numeric(20, 8) NOT NULL,
	"symbol_code" varchar(10) NOT NULL,
	"invested_amount" numeric(15, 2),
	"invested_currency_code" varchar(3),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crypto_exchanges" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "crypto_exchange_balances" ADD CONSTRAINT "crypto_exchange_balances_crypto_exchange_id_crypto_exchanges_id_fk" FOREIGN KEY ("crypto_exchange_id") REFERENCES "public"."crypto_exchanges"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "crypto_exchange_balances_crypto_exchange_id_idx" ON "crypto_exchange_balances" USING btree ("crypto_exchange_id");--> statement-breakpoint
CREATE INDEX "crypto_exchange_balances_symbol_code_idx" ON "crypto_exchange_balances" USING btree ("symbol_code");--> statement-breakpoint
CREATE INDEX "crypto_exchanges_name_idx" ON "crypto_exchanges" USING btree ("name");