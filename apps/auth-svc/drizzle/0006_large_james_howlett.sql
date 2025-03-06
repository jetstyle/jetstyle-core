CREATE TABLE IF NOT EXISTS "auth_codes" (
	"id" serial PRIMARY KEY NOT NULL,
	"uuid" varchar(256) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"user_id" varchar(256) NOT NULL,
	"code" varchar(512) NOT NULL,
	"bond_time" integer NOT NULL,
	"live_time" integer NOT NULL
);
