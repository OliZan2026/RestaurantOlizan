ALTER TABLE "orders" ADD COLUMN "board_status" text DEFAULT 'noua' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "board_moved_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "board_hidden" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX "orders_board_idx" ON "orders" ("board_status","board_moved_at");--> statement-breakpoint
-- Comenzile inregistrate inainte de tabla de comenzi pleaca direct in istoric:
-- tabla porneste goala, fara zeci de fise vechi marcate „intarziat".
UPDATE "orders" SET "board_status" = 'finalizata', "board_moved_at" = "created_at";