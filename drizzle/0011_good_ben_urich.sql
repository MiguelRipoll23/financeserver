DROP INDEX "merchants_name_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "merchants_name_unique" ON "merchants" USING btree (lower("name"));