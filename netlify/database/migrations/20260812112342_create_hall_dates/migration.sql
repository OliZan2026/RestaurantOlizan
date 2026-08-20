CREATE TABLE "hall_dates" (
	"day" date PRIMARY KEY,
	"note" text DEFAULT '' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
