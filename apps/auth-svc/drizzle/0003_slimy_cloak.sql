CREATE TABLE IF NOT EXISTS "tenants" (
	"id" serial PRIMARY KEY NOT NULL,
	"uuid" varchar(256) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"name" varchar(256) NOT NULL,
	"display_name" varchar(256) NOT NULL,
	"owner_user_id" varchar(256) NOT NULL,
	"tenant_type" varchar(256) NOT NULL,
	"logo_asset_id" varchar(256),
	"logo_url" varchar(512),
	"parent_tenant_name" varchar(256)
);
