ALTER TABLE "bills" ADD COLUMN "name" varchar(128);
UPDATE "bills" SET "name" = 'Unnamed' WHERE "name" IS NULL;
ALTER TABLE "bills" ALTER COLUMN "name" SET NOT NULL;