import "dotenv/config";
import { db } from "./index";
import { sql } from "drizzle-orm";

async function main() {
    console.log("Adding new columns for auth...");

    try {
        // Add userId columns to existing tables (nullable)
        await db.execute(sql`
      ALTER TABLE user_profile ADD COLUMN IF NOT EXISTS user_id TEXT UNIQUE;
      ALTER TABLE user_profile ADD COLUMN IF NOT EXISTS name TEXT;
      ALTER TABLE user_profile ADD COLUMN IF NOT EXISTS onboarding_complete BOOLEAN DEFAULT false;
    `);
        console.log("Updated user_profile table");

        await db.execute(sql`
      ALTER TABLE daily_briefs ADD COLUMN IF NOT EXISTS user_id TEXT;
    `);
        console.log("Updated daily_briefs table");

        await db.execute(sql`
      ALTER TABLE feedback ADD COLUMN IF NOT EXISTS user_id TEXT;
    `);
        console.log("Updated feedback table");

        await db.execute(sql`
      ALTER TABLE news_embeddings ADD COLUMN IF NOT EXISTS user_id TEXT;
    `);
        console.log("Updated news_embeddings table");

        console.log("All columns added successfully!");
    } catch (err) {
        console.error("Migration error:", err);
    }

    process.exit(0);
}

main();
