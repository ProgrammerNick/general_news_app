import { db } from "../db";
import { dailyBriefs, userProfile, feeds } from "../db/schema";
import { vectorService } from "./VectorService";
import { summarizerService } from "./SummarizerService";
import { audioService } from "./AudioService";
import { emailService } from "./EmailService";
import { getKeywordsFromInterests } from "../lib/interests";
import { eq } from "drizzle-orm";

/**
 * Flow: Gemini creates the news brief (with web search) → that text is turned into audio.
 * One API key (GEMINI_API_KEY) for content; Google Cloud TTS for audio.
 */
export class BriefService {
    async generateDailyBrief(userId: string, feedId?: number, timeframe: string = "24h") {
        // 1. Get user profile first (needed for email)
        const profile = await db.query.userProfile.findFirst({
            where: eq(userProfile.userId, userId),
        });

        if (!profile) {
            throw new Error("User profile not found. Please complete onboarding.");
        }

        let interests: { categoryId: string; subcategoryIds: string[] }[] = [];

        // 2. Determine source of interests (Feed or Profile)
        if (feedId) {
            const feed = await db.query.feeds.findFirst({
                where: eq(feeds.id, feedId),
            });
            if (!feed || feed.userId !== userId) {
                throw new Error("Feed not found or unauthorized.");
            }
            interests = feed.interests || [];
            if (feed.context) {
                console.log("Applying user context:", feed.context);
            }
        } else {
            interests = profile.interests || [];
        }

        if (interests.length === 0) {
            throw new Error("No interests configured for this feed. Please add topics.");
        }

        const keywords = getKeywordsFromInterests(interests);
        if (keywords.length === 0) {
            throw new Error("No search keywords found. Please select specific topics.");
        }

        // 2. Gemini creates the brief (uses web search for recent news)
        console.log(`Creating brief with Gemini (Timeframe: ${timeframe})...`);
        const { text, summaryId } = await summarizerService.generateBriefFromInterests(keywords, timeframe, feedId ? (await db.query.feeds.findFirst({ where: eq(feeds.id, feedId) }))?.context : undefined);

        if (!text?.trim()) {
            throw new Error("Gemini did not return a brief. Please try again.");
        }

        // 3. Turn the text into audio
        console.log("Generating audio...");
        const audioUrl = await audioService.generateAudio(text);
        // const audioUrl = "";

        // 4. Save to DB
        console.log("Saving brief...");
        const today = new Date().toISOString().split("T")[0];
        await db.insert(dailyBriefs).values({
            userId,
            feedId: feedId || null,
            date: today,
            transcript: text,
            audioUrl,
            status: "completed",
        });

        // 5. Store transcript for future RAG (optional)
        try {
            await vectorService.storeEmbeddings([
                {
                    content: text,
                    metadata: { summaryId, userId, date: today },
                },
            ]);
        } catch (err) {
            console.error("Vector store failed (non-blocking):", err);
        }

        // 6. Email if configured
        if (profile.email) {
            console.log("Sending brief to email:", profile.email);
            try {
                await emailService.sendBriefEmail(profile.email, text, today);
            } catch (err) {
                console.error("Email send failed (non-blocking):", err);
            }
        }

        return {
            text,
            audioUrl,
            emailSent: !!profile.email,
        };
    }
}

export const briefService = new BriefService();
