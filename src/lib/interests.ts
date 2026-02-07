// Hierarchical interest categories for the onboarding funnel
export interface SubCategory {
    id: string;
    label: string;
    keywords: string[]; // Keywords used for news search
}

export interface Category {
    id: string;
    label: string;
    emoji: string;
    description: string;
    subcategories: SubCategory[];
}

export const INTEREST_CATEGORIES: Category[] = [
    {
        id: "finance",
        label: "Finance",
        emoji: "💰",
        description: "Markets, investing, and financial services",
        subcategories: [
            { id: "ma", label: "M&A / Investment Banking", keywords: ["mergers acquisitions", "investment banking", "IPO", "dealmaking"] },
            { id: "vc", label: "Venture Capital / PE", keywords: ["venture capital", "private equity", "startup funding", "series A"] },
            { id: "equity", label: "Equity Research", keywords: ["stock analysis", "equity research", "stock market", "earnings"] },
            { id: "fixed-income", label: "Fixed Income / Credit", keywords: ["bonds", "fixed income", "credit markets", "interest rates"] },
            { id: "consulting", label: "Consulting", keywords: ["management consulting", "McKinsey", "BCG", "Bain", "strategy"] },
            { id: "personal-finance", label: "Personal Finance", keywords: ["personal finance", "investing tips", "retirement", "budgeting"] },
            { id: "crypto", label: "Cryptocurrency", keywords: ["bitcoin", "ethereum", "crypto", "blockchain", "DeFi"] },
        ],
    },
    {
        id: "tech",
        label: "Technology",
        emoji: "🚀",
        description: "Software, AI, and innovation",
        subcategories: [
            { id: "ai", label: "AI / Machine Learning", keywords: ["artificial intelligence", "machine learning", "GPT", "LLM", "deep learning"] },
            { id: "software", label: "Software Engineering", keywords: ["software development", "programming", "developer tools", "open source"] },
            { id: "startups", label: "Startups / Entrepreneurship", keywords: ["startups", "entrepreneurs", "founder", "Y Combinator"] },
            { id: "cybersecurity", label: "Cybersecurity", keywords: ["cybersecurity", "hacking", "data breach", "security"] },
            { id: "cloud", label: "Cloud / Infrastructure", keywords: ["cloud computing", "AWS", "Azure", "infrastructure", "DevOps"] },
            { id: "consumer-tech", label: "Consumer Tech", keywords: ["Apple", "Google", "smartphones", "gadgets", "consumer electronics"] },
        ],
    },
    {
        id: "politics",
        label: "Politics",
        emoji: "🏛️",
        description: "Government, policy, and global affairs",
        subcategories: [
            { id: "us-politics", label: "US Politics", keywords: ["US politics", "Congress", "White House", "federal government"] },
            { id: "international", label: "International Relations", keywords: ["geopolitics", "foreign policy", "diplomacy", "international"] },
            { id: "policy", label: "Policy / Regulation", keywords: ["regulation", "policy", "legislation", "antitrust"] },
            { id: "elections", label: "Elections", keywords: ["elections", "voting", "campaigns", "polls"] },
        ],
    },
    {
        id: "pop-culture",
        label: "Pop Culture",
        emoji: "🎬",
        description: "Entertainment, sports, and trends",
        subcategories: [
            { id: "entertainment", label: "Entertainment / Movies", keywords: ["movies", "TV shows", "streaming", "Hollywood", "Netflix"] },
            { id: "music", label: "Music", keywords: ["music industry", "albums", "concerts", "artists"] },
            { id: "sports", label: "Sports", keywords: ["NFL", "NBA", "sports", "football", "basketball"] },
            { id: "social-media", label: "Social Media", keywords: ["social media", "influencers", "TikTok", "Instagram", "viral"] },
        ],
    },
    {
        id: "science",
        label: "Science",
        emoji: "🔬",
        description: "Research, space, and discoveries",
        subcategories: [
            { id: "space", label: "Space / Aerospace", keywords: ["SpaceX", "NASA", "space exploration", "rockets", "satellites"] },
            { id: "climate", label: "Climate / Environment", keywords: ["climate change", "sustainability", "renewable energy", "environment"] },
            { id: "health", label: "Health / Medicine", keywords: ["healthcare", "medicine", "biotech", "pharmaceuticals", "FDA"] },
            { id: "research", label: "Research / Academia", keywords: ["scientific research", "studies", "academia", "breakthrough"] },
        ],
    },
];

// Helper to get all selected keywords from user's interests
export function getKeywordsFromInterests(interests: { categoryId: string; subcategoryIds: string[] }[]): string[] {
    const keywords: string[] = [];

    for (const interest of interests) {
        const category = INTEREST_CATEGORIES.find(c => c.id === interest.categoryId);
        if (!category) continue;

        for (const subId of interest.subcategoryIds) {
            const sub = category.subcategories.find(s => s.id === subId);
            if (sub) {
                keywords.push(...sub.keywords);
            }
        }
    }

    return [...new Set(keywords)]; // Remove duplicates
}
