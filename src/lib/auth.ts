import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db";
import * as schema from "../db/schema";

const appOrigin = process.env.BETTER_AUTH_URL || "http://localhost:3001";
const backendOrigin = "http://localhost:4000";

export const auth = betterAuth({
    baseURL: appOrigin,
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
    trustedOrigins: [appOrigin, backendOrigin],
    onAPIError: {
        onError: (error, ctx) => {
            console.error("[better-auth] API error:", error.message, ctx.path);
            console.error("[better-auth] Stack:", error.stack);
        },
    },
});

export type Session = typeof auth.$Infer.Session;

