ALTER TABLE "daily_briefs" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "feedback" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "user_profile" ALTER COLUMN "user_id" DROP NOT NULL;