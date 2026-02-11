import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db";
import * as schema from "../db/schema";

// For local dev we always use http://localhost:3001 so cookies work (frontend origin).
// For production, set BETTER_AUTH_URL in .env to your app URL (e.g. https://yourapp.vercel.app).
const isLocalDev = !process.env.VERCEL;
if (!process.env.BETTER_AUTH_SECRET && isLocalDev) {
    console.warn("[better-auth] BETTER_AUTH_SECRET is not set; sessions may not work. Add it to .env.");
}
const appOrigin = isLocalDev
    ? "http://localhost:3001"
    : (process.env.BETTER_AUTH_URL || "http://localhost:3001");
const backendOrigin = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:4000";

export const auth = betterAuth({
    baseURL: appOrigin,
    secret: process.env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(db, {
        provider: "pg",
        schema: {
            user: schema.user,
            session: schema.session,
            account: schema.account,
            verification: schema.verification,
        },
    }),
    emailAndPassword: {
        enabled: true,
    },
    session: {
        expiresIn: 60 * 60 * 24 * 7, // 7 days
        updateAge: 60 * 60 * 24, // 1 day
    },
    trustedOrigins: [appOrigin, backendOrigin, "http://localhost:3001", "http://localhost:4000"],
    advanced: {
        defaultCookieAttributes: {
            sameSite: "lax",
        },
    },
    onAPIError: {
        onError: (error, ctx) => {
            console.error("[better-auth] API error:", error.message, ctx.path);
            console.error("[better-auth] Stack:", error.stack);
        },
    },
});

export type Session = typeof auth.$Infer.Session;

