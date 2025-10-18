CREATE TABLE "documentations" (
	"id" serial PRIMARY KEY NOT NULL,
	"url" text NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"user_id" text,
	"subdomain" text,
	"generated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "documentations_subdomain_unique" UNIQUE("subdomain")
);
