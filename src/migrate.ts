import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";

const connectionString =
  process.env.DATABASE_URL || process.env.DATABASE_URL_POOLER;
if (!connectionString) {
  console.error("Missing DATABASE_URL or DATABASE_URL_POOLER in .env");
  process.exit(1);
}

const sql = neon(connectionString);
const db = drizzle(sql);

async function main() {
  try {
    await migrate(db, { migrationsFolder: "drizzle" });
    console.log("Migration completed.");
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
}

main();
