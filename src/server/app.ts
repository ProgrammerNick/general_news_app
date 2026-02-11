import { Hono } from "hono";
import { cors } from "hono/cors";
import { auth } from "../lib/auth";
import { db } from "../db";
import { userProfile, dailyBriefs, feeds } from "../db/schema";
import { eq, desc, and } from "drizzle-orm";
import { briefService } from "../services/BriefService";

const frontendOrigin = process.env.BETTER_AUTH_URL || "http://localhost:3001";
const vercelOrigin = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "";
const corsOrigins = [frontendOrigin, "http://localhost:4000", vercelOrigin].filter(Boolean);

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

// Feeds API
profileRoute.get("/feeds", async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session?.user) return c.json({ error: "Unauthorized" }, 401);

  const userFeeds = await db.query.feeds.findMany({
    where: eq(feeds.userId, session.user.id),
    orderBy: desc(feeds.createdAt),
  });
  return c.json({ feeds: userFeeds });
});

profileRoute.post("/feeds", async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session?.user) return c.json({ error: "Unauthorized" }, 401);

  const body = await c.req.json<{ name: string; interests: any[]; context?: string; timeframe?: string }>();
  if (!body.name || !body.interests) {
    return c.json({ error: "Name and interests are required" }, 400);
  }

  const [newFeed] = await db.insert(feeds).values({
    userId: session.user.id,
    name: body.name,
    interests: body.interests,
    context: body.context || null,
    timeframe: body.timeframe || "24h",
  }).returning();

  return c.json({ feed: newFeed });
});

profileRoute.delete("/feeds/:id", async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session?.user) return c.json({ error: "Unauthorized" }, 401);

  const id = parseInt(c.req.param("id"), 10);
  if (Number.isNaN(id)) return c.json({ error: "Invalid id" }, 400);

  await db.delete(feeds).where(and(eq(feeds.id, id), eq(feeds.userId, session.user.id)));
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

briefRoute.get("/", async (c) => {
  const { user } = await getSessionOr401(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const list = await db
    .select({
      id: dailyBriefs.id,
      date: dailyBriefs.date,
      status: dailyBriefs.status,
      feedId: dailyBriefs.feedId,
      audioUrl: dailyBriefs.audioUrl,
      transcript: dailyBriefs.transcript,
      createdAt: dailyBriefs.createdAt,
    })
    .from(dailyBriefs)
    .where(eq(dailyBriefs.userId, user.id))
    .orderBy(desc(dailyBriefs.date), desc(dailyBriefs.createdAt))
    .limit(50);
  return c.json({ briefs: list });
});

briefRoute.get("/:id", async (c) => {
  const { user } = await getSessionOr401(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const id = parseInt(c.req.param("id"), 10);
  if (Number.isNaN(id)) return c.json({ error: "Invalid id" }, 400);
  const brief = await db.query.dailyBriefs.findFirst({
    where: eq(dailyBriefs.id, id),
  });
  if (!brief || brief.userId !== user.id) return c.json({ error: "Not found" }, 404);
  return c.json(brief);
});

briefRoute.post("/generate", async (c) => {
  const { user } = await getSessionOr401(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  try {
    const body = await c.req.json<{ feedId?: number; timeframe?: string }>();
    const result = await briefService.generateDailyBrief(user.id, body.feedId, body.timeframe);
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
    origin: corsOrigins,
    credentials: true,
  })
);
app.basePath("/api").route("/auth", authRoute).route("/profile", profileRoute).route("/brief", briefRoute);

export default app;
