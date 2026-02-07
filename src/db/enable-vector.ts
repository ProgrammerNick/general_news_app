import "dotenv/config";
import { db } from "./index";
import { sql } from "drizzle-orm";

async function main() {
    console.log("Enabling vector extension...");
    await db.execute(sql`CREATE EXTENSION IF NOT EXISTS vector;`);
    console.log("Vector extension enabled!");
    process.exit(0);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
