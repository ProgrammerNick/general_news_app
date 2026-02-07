CREATE TABLE "daily_briefs" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" text NOT NULL,
	"audio_url" text,
	"transcript" text,
	"status" text DEFAULT 'pending',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "feedback" (
	"id" serial PRIMARY KEY NOT NULL,
	"rating" integer,
	"likes" text,
	"dislikes" text,
	"summary_id" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "news_embeddings" (
	"id" serial PRIMARY KEY NOT NULL,
	"content" text NOT NULL,
	"embedding" vector(768),
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_profile" (
	"id" serial PRIMARY KEY NOT NULL,
	"interests" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now()
);
