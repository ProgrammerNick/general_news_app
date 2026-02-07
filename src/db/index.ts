import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const sql = neon(process.env.DATABASE_URL || process.env.DATABASE_URL_POOLER!);
export const db = drizzle(sql, { schema });
