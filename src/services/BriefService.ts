import { db } from "../db";
import { dailyBriefs, userProfile } from "../db/schema";
import { newsService } from "./NewsService";
import { vectorService } from "./VectorService";
import { summarizerService } from "./SummarizerService";
import { audioService } from "./AudioService";
import { emailService } from "./EmailService";
import { getKeywordsFromInterests } from "../lib/interests";
import { eq } from "drizzle-orm";

export class BriefService {
    async generateDailyBrief(userId: string) {
        // 1. Get User Profile and Interests
        const profile = await db.query.userProfile.findFirst({
            where: eq(userProfile.userId, userId),
        });

        if (!profile) {
            throw new Error("User profile not found. Please complete onboarding.");
        }

        const interests = profile.interests || [];
        if (interests.length === 0) {
            throw new Error("No interests configured. Please set up your profile.");
        }

        // 2. Convert structured interests to keywords for news search
        const keywords = getKeywordsFromInterests(interests);
        if (keywords.length === 0) {
            throw new Error("No search keywords found. Please select specific topics.");
        }

        // 3. Fetch News using keywords
        console.log("Fetching news for keywords:", keywords.slice(0, 5));
        const articles = await newsService.fetchNews(keywords.slice(0, 10)); // Limit to avoid API overload
        if (articles.length === 0) {
            throw new Error("No articles found for your interests.");
        }

        // 4. RAG Context - search user's past briefs for context
        const ragContext = "";

        // 5. Summarize
        console.log("Generating summary...");
        const { text, summaryId } = await summarizerService.generateBrief(
            articles,
            keywords,
            ragContext
        );

        // 6. Generate Audio
        console.log("Generating audio...");
        const audioUrl = await audioService.generateAudio(text);

        // 7. Save to DB with userId
        console.log("Saving brief...");
        const today = new Date().toISOString().split("T")[0];
        await db.insert(dailyBriefs).values({
            userId,
            date: today,
            transcript: text,
            audioUrl: audioUrl,
            status: "completed",
        });

        // 8. Store embeddings for future RAG (with userId)
        await vectorService.storeEmbeddings(
            articles.map((a) => ({
                content: `${a.title} - ${a.description}`,
                metadata: { url: a.url, source: a.source, publishedAt: a.publishedAt, userId },
            }))
        );

        // 9. Send email if user has email
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
