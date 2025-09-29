CREATE TABLE "tour_packages" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(255) NOT NULL,
	"title" varchar(255) NOT NULL,
	"short_description" text,
	"long_description" text,
	"location" varchar(255),
	"duration_days" integer DEFAULT 1,
	"price_aed" numeric(10, 2) NOT NULL,
	"hero_image" varchar(500),
	"is_featured" boolean DEFAULT false,
	"card_type" varchar(20) DEFAULT 'vertical',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "tour_packages_slug_unique" UNIQUE("slug")
);
