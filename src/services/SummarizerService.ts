
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";
import { v4 as uuidv4 } from "uuid";

interface Article {
    title: string;
    description: string;
    source: string;
    url: string;
}

const APP_NAME = "Personalized Morning Brief";

// Use GEMINI_API_KEY (or GOOGLE_GENERATIVE_AI_API_KEY) so one key works for news + summarizer
const google = createGoogleGenerativeAI({
    apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

const GEMINI_MODEL = process.env.MODEL_NAME || "gemini-2.0-flash";

export class SummarizerService {
    private model = google(GEMINI_MODEL);

    /**
     * Single-step: Gemini creates the morning brief from interests using web search.
     * Use this for the main flow: Gemini creates news → then turn into audio.
     */
    async generateBriefFromInterests(
        keywords: string[],
        timeframe: string = "24h",
        userContext?: string | null
    ): Promise<{ text: string; summaryId: string }> {
        const interestsStr = keywords.join(", ");
        const today = new Date().toISOString().split("T")[0];

        let timeQuery = "";
        switch (timeframe) {
            case "24h": timeQuery = "last 24 hours"; break;
            case "48h": timeQuery = "last 48 hours"; break;
            case "7d": timeQuery = "last week"; break;
            case "30d": timeQuery = "last month"; break;
            default: timeQuery = "recent";
        }

        // Context Construction
        let contextInstruction = "";
        if (userContext) {
            contextInstruction = `
            CRITICAL USER OVERRIDE:
            The user has provided specific instructions for this brief: "${userContext}"
            
            YOU MUST PRIORITIZE THIS CONTEXT ABOVE ALL ELSE.
            - If this context narrows the scope (e.g. "Focus on VC fundraising"), ONLY report on that, even if it ignores other selected topics.
            - If this context sets a tone or specific angle, ADOPT IT.
            - Filter all search results through this lens.
            `;
        }

        const prompt = `
        You are an elite news anchor and financial analyst. Your goal is to deliver a spoken-word style briefing.
        
        Selected Topics: ${interestsStr}.
        User's selected timeframe: ${timeframe} (${timeQuery}).
        Current Date: ${today}.
        ${contextInstruction}

        INSTRUCTIONS:
        1. Search for the most significant news related to the context/topics.
        2. STYLE: You are a "News Anchor". Do NOT read off headers like "Headline: ...".
           - Speak naturally, as if you are live on air.
           - Use transitions between stories (e.g., "Turning to the markets...", "In tech news...", "Meanwhile in Washington...").
           - Keep it punchy, professional, and dense with facts, but flow like a conversation.
        3. CONTENT:
           - Focus on the FACTS.
           - Explain WHY it matters (implications).
           - Mention sources naturally (e.g., "Bloomberg reports that...").
        4. STRUCTURE:
           - Start with a strong hook/summary of the biggest story.
           - Move through 2-3 other key stories.
           - End with a quick forward-looking thought or market check.
        
        REQUIREMENTS:
        - NO markdown headers (like ## or ###) that would be read aloud awkwardly.
        - NO listicles if possible, or make them sound natural ("There are three key factors here: first...").
        - Absolute priority on the USER CONTEXT provided above.
        `;

        const { text } = await generateText({
            model: this.model,
            tools: {
                google_search: google.tools.googleSearch({}),
            },
            prompt,
        });

        return {
            text: text.trim(),
            summaryId: uuidv4(),
        };
    }

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
- Organize into clear logical sections but DO NOT use explicit headers that would be read aloud.
- Use natural transitions.
- Incorporate listener interests and the provided "RAG CONTEXT" to avoid repetition and emphasize preferences.
- Mention sources briefly ("via <Source>"); do not fabricate facts; stay within provided article titles/descriptions.
- Avoid stock tickers unless present; be careful with numbers.
- End with a brief outro suggesting what they might watch for today.

Output format:
- Natural spoken prose. 
- No markdown headers.

LISTENER INTERESTS:
${interestsStr}

RAG CONTEXT (prior summaries and feedback, most relevant first):
${ragContext || "No prior context."}

ARTICLES (last 24–48h):
${articlesStr}

Please write ~${targetWords} words total.
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
        // Updated to basically return nothing or try to infer from first sentences if needed, 
        // but since we removed explicit headers, this might be less relevant for now.
        return [];
    }
}

export const summarizerService = new SummarizerService();
