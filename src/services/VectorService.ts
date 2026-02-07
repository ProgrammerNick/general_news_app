import { google } from "@ai-sdk/google";
import { embed, embedMany } from "ai";
import { db } from "../db";
import { newsEmbeddings } from "../db/schema";
import { cosineDistance, desc, gt, sql } from "drizzle-orm";

export class VectorService {
    private model = google.textEmbeddingModel("text-embedding-004");

    async embedText(text: string): Promise<number[]> {
        const { embedding } = await embed({
            model: this.model,
            value: text,
        });
        return embedding;
    }

    async embedTexts(texts: string[]): Promise<number[][]> {
        const { embeddings } = await embedMany({
            model: this.model,
            values: texts,
        });
        return embeddings;
    }

    async storeEmbedding(content: string, metadata: Record<string, any> = {}) {
        const embedding = await this.embedText(content);
        await db.insert(newsEmbeddings).values({
            content,
            embedding,
            metadata,
        });
    }

    async storeEmbeddings(items: { content: string; metadata?: Record<string, any> }[]) {
        if (items.length === 0) return;

        const texts = items.map((i) => i.content);
        const embeddings = await this.embedTexts(texts);

        await db.insert(newsEmbeddings).values(
            items.map((item, index) => ({
                content: item.content,
                embedding: embeddings[index],
                metadata: item.metadata || {},
            }))
        );
    }

    async searchSimilar(query: string, limit: number = 5, threshold: number = 0.5) {
        const queryEmbedding = await this.embedText(query);
        const similarity = sql<number>`1 - (${cosineDistance(
            newsEmbeddings.embedding,
            queryEmbedding
        )})`;

        return await db
            .select({
                content: newsEmbeddings.content,
                metadata: newsEmbeddings.metadata,
                similarity,
            })
            .from(newsEmbeddings)
            .where(gt(similarity, threshold))
            .orderBy(desc(similarity))
            .limit(limit);
    }
}

export const vectorService = new VectorService();
