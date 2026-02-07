
interface Article {
    title: string;
    description: string;
    url: string;
    publishedAt: string;
    source: string;
}

interface NewsApiResponse {
    status: string;
    totalResults: number;
    articles: Array<{
        source: { id: string | null; name: string };
        author: string | null;
        title: string;
        description: string | null;
        url: string;
        urlToImage: string | null;
        publishedAt: string;
        content: string | null;
    }>;
}

const NEWSAPI_BASE = "https://newsapi.org/v2/everything";

export class NewsService {
    private apiKey: string;

    constructor() {
        this.apiKey = process.env.NEWSAPI_KEY || "";
        if (!this.apiKey) {
            console.warn("NEWSAPI_KEY is not set");
        }
    }

    async fetchNews(interests: string[], hours: number = 36, maxArticles: number = 30): Promise<Article[]> {
        if (!this.apiKey) return [];

        const now = new Date();
        const startTime = new Date(now.getTime() - hours * 60 * 60 * 1000);
        const fromIso = startTime.toISOString();

        const articlesByUrl = new Map<string, Article>();

        for (const interest of interests) {
            const q = interest.trim();
            if (!q) continue;

            const params = new URLSearchParams({
                q,
                from: fromIso,
                sortBy: "publishedAt",
                language: "en",
                pageSize: "100",
                apiKey: this.apiKey,
            });

            try {
                const response = await fetch(`${NEWSAPI_BASE}?${params.toString()}`);

                if (response.status === 429) {
                    // Simple backoff
                    await new Promise((resolve) => setTimeout(resolve, 2000));
                    // Retry once? Or just skip for now to avoid complexity in this loop
                    continue;
                }

                if (!response.ok) {
                    console.error(`NewsAPI error for interest "${q}": ${response.statusText}`);
                    continue;
                }

                const data = (await response.json()) as NewsApiResponse;

                for (const art of data.articles || []) {
                    if (!art.url || articlesByUrl.has(art.url)) continue;

                    articlesByUrl.set(art.url, {
                        title: art.title?.trim() || "",
                        description: (art.description || "").trim(),
                        url: art.url,
                        publishedAt: art.publishedAt,
                        source: art.source?.name || "",
                    });
                }
            } catch (error) {
                console.error(`Failed to fetch news for interest "${q}":`, error);
            }
        }

        const allArticles = Array.from(articlesByUrl.values());

        // Sort by publishedAt descending
        allArticles.sort((a, b) => {
            return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
        });

        return allArticles.slice(0, maxArticles);
    }
}

export const newsService = new NewsService();
