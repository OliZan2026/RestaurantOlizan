ALTER TABLE "order_items" ADD COLUMN "packaging_unit" numeric(10,2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "packaging" numeric(10,2) DEFAULT '0' NOT NULL;