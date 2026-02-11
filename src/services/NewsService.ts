import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";

export interface Article {
    title: string;
    description: string;
    url: string;
    publishedAt: string;
    source: string;
}

const GEMINI_MODEL = process.env.GEMINI_NEWS_MODEL || "gemini-2.0-flash";

/**
 * News fetching via Gemini with Google Search grounding.
 * Uses GEMINI_API_KEY (or GOOGLE_GENERATIVE_AI_API_KEY) — no separate NewsAPI key.
 */
export class NewsService {
    private apiKey: string;

    constructor() {
        this.apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || "";
        if (!this.apiKey) {
            console.warn(
                "GEMINI_API_KEY is not set — news fetching will be skipped. Add it to .env for briefs. Login still works."
            );
        }
    }

    async fetchNews(interests: string[], _hours: number = 36, maxArticles: number = 30): Promise<Article[]> {
        if (!this.apiKey || interests.length === 0) return [];

        const google = createGoogleGenerativeAI({
            apiKey: this.apiKey,
        });

        const keywords = interests.slice(0, 10).join(", ");
        const prompt = `Using web search, find the most relevant recent news (last 24–48 hours) about these topics: ${keywords}.

Return ONLY a valid JSON array of objects. No other text, no markdown, no code fence.
Each object must have exactly: "title" (string), "description" (string), "source" (string, e.g. site name), "url" (string, article URL), "publishedAt" (string, ISO date if possible or approximate).
Return between 5 and ${Math.min(maxArticles, 20)} items.`;

        try {
            const { text, providerMetadata } = await generateText({
                model: google(GEMINI_MODEL),
                tools: {
                    google_search: google.tools.googleSearch({}),
                },
                prompt,
            });

            const articles = this.parseArticlesFromResponse(text, providerMetadata);
            return articles.slice(0, maxArticles);
        } catch (error) {
            console.error("Gemini news fetch failed:", error);
            return [];
        }
    }

    private parseArticlesFromResponse(text: string, providerMetadata: unknown): Article[] {
        const articles: Article[] = [];
        const nowIso = new Date().toISOString();

        // Try to extract JSON array from response (may be wrapped in markdown or extra text)
        let jsonStr = text.trim();
        const arrayMatch = jsonStr.match(/\[[\s\S]*\]/);
        if (arrayMatch) {
            jsonStr = arrayMatch[0];
        }

        try {
            const parsed = JSON.parse(jsonStr) as unknown;
            if (!Array.isArray(parsed)) return articles;

            for (const item of parsed) {
                if (item && typeof item === "object" && "title" in item) {
                    articles.push({
                        title: String((item as any).title ?? "").trim() || "Untitled",
                        description: String((item as any).description ?? "").trim(),
                        url: String((item as any).url ?? "").trim() || "#",
                        publishedAt: String((item as any).publishedAt ?? nowIso).trim(),
                        source: String((item as any).source ?? "").trim() || "Web",
                    });
                }
            }
        } catch {
            // Fallback: use grounding metadata URLs if response wasn't valid JSON
            const meta = providerMetadata as { google?: { groundingMetadata?: { groundingChunks?: Array<{ web?: { uri?: string; title?: string } }> } } } | undefined;
            const chunks = meta?.google?.groundingMetadata?.groundingChunks;
            if (chunks?.length) {
                for (const ch of chunks.slice(0, 15)) {
                    const uri = ch.web?.uri;
                    if (uri) {
                        articles.push({
                            title: ch.web?.title ?? "Article",
                            description: "",
                            url: uri,
                            publishedAt: nowIso,
                            source: new URL(uri).hostname.replace(/^www\./, ""),
                        });
                    }
                }
            }
        }

        return articles;
    }
}

export const newsService = new NewsService();
