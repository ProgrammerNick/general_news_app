import "dotenv/config";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { auth } from "../lib/auth";
import { db } from "../db";
import { userProfile, dailyBriefs } from "../db/schema";
import { eq, desc } from "drizzle-orm";
import { briefService } from "../services/BriefService";

const frontendOrigin = process.env.BETTER_AUTH_URL || "http://localhost:3001";

const authRoute = new Hono({ strict: false });

authRoute.post("/sign-up/email", async (c) => {
  try {
    const body = await c.req.json<{ name: string; email: string; password: string }>();
    const res = await auth.api.signUpEmail({
      body: { name: body.name, email: body.email, password: body.password },
      headers: c.req.raw.headers,
      asResponse: true,
    });
    return res;
  } catch (err: unknown) {
    const status = err && typeof err === "object" && "status" in err ? (err as { status: number }).status : 500;
    const message = err && typeof err === "object" && "message" in err ? (err as { message: string }).message : "Sign up failed";
    const code = (typeof status === "number" && status >= 400 && status < 600 ? status : 500) as 400 | 401 | 500;
    return c.json({ message: String(message) }, { status: code });
  }
});

authRoute.post("/sign-in/email", async (c) => {
  try {
    const body = await c.req.json<{ email: string; password: string }>();
    const res = await auth.api.signInEmail({
      body: { email: body.email, password: body.password },
      headers: c.req.raw.headers,
      asResponse: true,
    });
    return res;
  } catch (err: unknown) {
    const status = err && typeof err === "object" && "status" in err ? (err as { status: number }).status : 401;
    const message = err && typeof err === "object" && "message" in err ? (err as { message: string }).message : "Sign in failed";
    const code = (typeof status === "number" && status >= 400 && status < 600 ? status : 401) as 400 | 401 | 500;
    return c.json({ message: String(message) }, { status: code });
  }
});

authRoute.on(["POST", "GET"], "/*", (c) => auth.handler(c.req.raw));

// Profile API (requires session)
const profileRoute = new Hono({ strict: false });

profileRoute.get("/", async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session?.user) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  const profile = await db.query.userProfile.findFirst({
    where: eq(userProfile.userId, session.user.id),
  });
  if (!profile) {
    return c.json({
      userId: session.user.id,
      interests: [],
      onboardingComplete: false,
    });
  }
  return c.json({
    userId: profile.userId,
    interests: profile.interests ?? [],
    onboardingComplete: profile.onboardingComplete ?? false,
  });
});

profileRoute.post("/", async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session?.user) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  const body = await c.req.json<{ interests?: { categoryId: string; subcategoryIds: string[] }[] }>();
  const interests = body.interests ?? [];
  const existing = await db.query.userProfile.findFirst({
    where: eq(userProfile.userId, session.user.id),
  });
  if (existing) {
    await db
      .update(userProfile)
      .set({ interests, onboardingComplete: true, email: session.user.email ?? undefined, name: session.user.name ?? undefined })
      .where(eq(userProfile.userId, session.user.id));
  } else {
    await db.insert(userProfile).values({
      userId: session.user.id,
      email: session.user.email ?? undefined,
      name: session.user.name ?? undefined,
      interests,
      onboardingComplete: true,
    });
  }
  return c.json({ success: true });
});

// Brief API (requires session) – user sees only their own briefs
const briefRoute = new Hono({ strict: false });

async function getSessionOr401(c: { req: { raw: { headers: Headers } } }) {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session?.user) {
    return { session: null as null, user: null as null };
  }
  return { session, user: session.user };
}

/** List current user's briefs, newest first */
briefRoute.get("/", async (c) => {
  const { user } = await getSessionOr401(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const list = await db
    .select({
      id: dailyBriefs.id,
      date: dailyBriefs.date,
      status: dailyBriefs.status,
      audioUrl: dailyBriefs.audioUrl,
      createdAt: dailyBriefs.createdAt,
    })
    .from(dailyBriefs)
    .where(eq(dailyBriefs.userId, user.id))
    .orderBy(desc(dailyBriefs.date), desc(dailyBriefs.createdAt))
    .limit(50);
  return c.json({ briefs: list });
});

/** Get one brief by id (only if it belongs to current user) */
briefRoute.get("/:id", async (c) => {
  const { user } = await getSessionOr401(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const id = parseInt(c.req.param("id"), 10);
  if (Number.isNaN(id)) return c.json({ error: "Invalid id" }, 400);
  const brief = await db.query.dailyBriefs.findFirst({
    where: eq(dailyBriefs.id, id),
    columns: { id: true, userId: true, date: true, status: true, audioUrl: true, transcript: true, createdAt: true },
  });
  if (!brief || brief.userId !== user.id) return c.json({ error: "Not found" }, 404);
  return c.json(brief);
});

briefRoute.post("/generate", async (c) => {
  const { user } = await getSessionOr401(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  try {
    const result = await briefService.generateDailyBrief(user.id);
    return c.json({
      success: true,
      text: result.text,
      audioUrl: result.audioUrl,
      emailSent: result.emailSent,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to generate brief";
    return c.json({ error: message }, 400);
  }
});

const app = new Hono({ strict: false });
app.use(
  "/api/*",
  cors({
    origin: [frontendOrigin, "http://localhost:4000"],
    credentials: true,
  })
);
app.basePath("/api").route("/auth", authRoute).route("/profile", profileRoute).route("/brief", briefRoute);

console.log("Server is running on port 4000");

serve({
  fetch: app.fetch,
  port: 4000,
});
