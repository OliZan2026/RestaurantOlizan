CREATE TABLE "order_counters" (
	"day" date PRIMARY KEY,
	"last_number" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "order_day" date;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "daily_number" integer;--> statement-breakpoint
CREATE UNIQUE INDEX "orders_day_number_idx" ON "orders" ("order_day","daily_number");