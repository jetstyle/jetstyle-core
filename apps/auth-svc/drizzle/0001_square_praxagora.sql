ALTER TABLE "users" ALTER COLUMN "tenant" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email" varchar(256);