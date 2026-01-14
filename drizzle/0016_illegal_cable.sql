DROP INDEX "crypto_exchanges_name_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "crypto_exchanges_name_unique" ON "crypto_exchanges" USING btree (lower("name"));