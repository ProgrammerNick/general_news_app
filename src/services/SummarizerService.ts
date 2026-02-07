
import { google } from "@ai-sdk/google";
import { generateText } from "ai";
import { v4 as uuidv4 } from "uuid";

interface Article {
    title: string;
    description: string;
    source: string;
    url: string;
}

const APP_NAME = "Personalized Morning Brief";

export class SummarizerService {
    private model = google(process.env.MODEL_NAME || "gemini-1.5-flash");

    private formatArticles(articles: Article[]): string {
        return articles
            .map(
                (a) =>
                    `- ${a.title} — ${a.description} (via ${a.source}) [${a.url}]`
            )
            .join("\n");
    }

    async generateBrief(
        articles: Article[],
        interests: string[],
        ragContext: string | null,
        targetWords: number = 1000
    ): Promise<{ text: string; summaryId: string }> {
        const articlesStr = this.formatArticles(articles);
        const interestsStr = interests.join(", ");

        const prompt = `You are the host of a concise, engaging audio morning brief called "${APP_NAME}".
Audience: busy professionals on their morning commute.
Goal: a 5–10 minute spoken brief (~${targetWords} words), focused, upbeat, and neutral in tone.

Guidelines:
- Start with a short highlights opener (10–20 seconds) summarizing key themes.
- Organize into clear SECTIONS with headers: "SECTION: <title>"
- For each section, cover 1–3 of the most relevant stories (titles/descriptions provided).
- Incorporate listener interests and the provided "RAG CONTEXT" to avoid repetition and emphasize preferences.
- Mention sources briefly ("via <Source>"); do not fabricate facts; stay within provided article titles/descriptions.
- Avoid stock tickers unless present; be careful with numbers.
- End with a brief outro suggesting what they might watch for today.

Output format:
- Uppercase "SECTION: <title>" lines for each section header.
- No markdown, no bullet characters. Natural spoken prose.

LISTENER INTERESTS:
${interestsStr}

RAG CONTEXT (prior summaries and feedback, most relevant first):
${ragContext || "No prior context."}

ARTICLES (last 24–48h):
${articlesStr}

Please write ~${targetWords} words total. Remember to produce 'SECTION: ' headers.
`;

        const { text } = await generateText({
            model: this.model,
            prompt: prompt,
        });

        return {
            text: text,
            summaryId: uuidv4(),
        };
    }

    extractSectionTitles(summaryText: string): string[] {
        const titles: string[] = [];
        const lines = summaryText.split("\n");
        for (const line of lines) {
            const stripped = line.trim();
            if (stripped.toUpperCase().startsWith("SECTION:")) {
                const title = stripped.split(":", 2)[1]?.trim();
                if (title) titles.push(title);
            }
        }
        return titles;
    }
}

export const summarizerService = new SummarizerService();
