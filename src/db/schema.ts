import { pgTable, serial, text, integer, timestamp, jsonb, vector, boolean } from "drizzle-orm/pg-core";

// ===== Better Auth Schema Tables =====
export const user = pgTable("user", {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: boolean("emailVerified").notNull(),
    image: text("image"),
    createdAt: timestamp("createdAt").notNull(),
    updatedAt: timestamp("updatedAt").notNull(),
});

export const session = pgTable("session", {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expiresAt").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("createdAt").notNull(),
    updatedAt: timestamp("updatedAt").notNull(),
    ipAddress: text("ipAddress"),
    userAgent: text("userAgent"),
    userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
    id: text("id").primaryKey(),
    accountId: text("accountId").notNull(),
    providerId: text("providerId").notNull(),
    userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("accessToken"),
    refreshToken: text("refreshToken"),
    idToken: text("idToken"),
    accessTokenExpiresAt: timestamp("accessTokenExpiresAt"),
    refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("createdAt").notNull(),
    updatedAt: timestamp("updatedAt").notNull(),
});

export const verification = pgTable("verification", {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expiresAt").notNull(),
    createdAt: timestamp("createdAt"),
    updatedAt: timestamp("updatedAt"),
});

// ===== App-Specific Tables =====

// User profile for app preferences (linked to Better Auth user)
export const userProfile = pgTable("user_profile", {
    id: serial("id").primaryKey(),
    userId: text("user_id").unique().references(() => user.id, { onDelete: "cascade" }),
    email: text("email"),
    name: text("name"),
    // Structured interests: [{ categoryId: "finance", subcategoryIds: ["ma", "vc"] }]
    interests: jsonb("interests").$type<{ categoryId: string; subcategoryIds: string[] }[]>().default([]),
    onboardingComplete: boolean("onboarding_complete").default(false),
    createdAt: timestamp("created_at").defaultNow(),
});

export const feedback = pgTable("feedback", {
    id: serial("id").primaryKey(),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    rating: integer("rating"),
    likes: text("likes"),
    dislikes: text("dislikes"),
    summaryId: text("summary_id"),
    createdAt: timestamp("created_at").defaultNow(),
});

export const newsEmbeddings = pgTable("news_embeddings", {
    id: serial("id").primaryKey(),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    content: text("content").notNull(),
    embedding: vector("embedding", { dimensions: 768 }),
    metadata: jsonb("metadata").$type<Record<string, any>>().default({}),
    createdAt: timestamp("created_at").defaultNow(),
});

export const feeds = pgTable("feeds", {
    id: serial("id").primaryKey(),
    userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    // Structured interests: [{ categoryId: "finance", subcategoryIds: ["ma", "vc"] }]
    interests: jsonb("interests").$type<{ categoryId: string; subcategoryIds: string[] }[]>().default([]),
    context: text("context"), // specific user instructions (e.g., "Focus on VC fundraising")
    timeframe: text("timeframe").default("24h"), // 24h, 48h, 7d, 30d
    createdAt: timestamp("created_at").defaultNow(),
});

export const dailyBriefs = pgTable("daily_briefs", {
    id: serial("id").primaryKey(),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    feedId: integer("feed_id").references(() => feeds.id, { onDelete: "set null" }),
    date: text("date").notNull(), // YYYY-MM-DD
    audioUrl: text("audio_url"),
    transcript: text("transcript"),
    status: text("status").default("pending"), // pending, generating, completed, failed
    createdAt: timestamp("created_at").defaultNow(),
});

// Type exports for use in services
export type UserProfile = typeof userProfile.$inferSelect;
export type DailyBrief = typeof dailyBriefs.$inferSelect;
export type Feed = typeof feeds.$inferSelect;
export type NewsEmbedding = typeof newsEmbeddings.$inferSelect;
