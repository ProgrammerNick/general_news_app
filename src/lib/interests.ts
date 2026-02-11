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
        label: "Finance & Markets",
        emoji: "📈",
        description: "Deep dives into markets, economy, and assets",
        subcategories: [
            { id: "ma", label: "M&A / Dealmaking", keywords: ["mergers and acquisitions", "M&A", "investment banking", "deal flow", "private equity"] },
            { id: "vc", label: "Venture Capital", keywords: ["venture capital", "seed funding", "series A", "startup valuation", "term sheets"] },
            { id: "macro", label: "Global Macro", keywords: ["inflation", "federal reserve", "interest rates", "gdp", "central banks", "forex"] },
            { id: "crypto", label: "Crypto / DeFi", keywords: ["bitcoin", "ethereum", "DeFi", "web3", "stablecoins", "crypto regulation"] },
            { id: "equities", label: "Equities / Stocks", keywords: ["stock market", "earnings reports", "S&P 500", "nasdaq", "stock buybacks"] },
            { id: "commodities", label: "Commodities", keywords: ["oil prices", "gold", "natural gas", "agriculture commodities", "energy markets"] },
            { id: "fintech", label: "Fintech", keywords: ["fintech", "payments", "neobanks", "stripe", "plaid", "digital wallets"] },
        ],
    },
    {
        id: "tech",
        label: "Technology",
        emoji: "⚡",
        description: "Frontier tech, software, and hardware",
        subcategories: [
            { id: "ai", label: "Artificial Intelligence", keywords: ["LLMs", "generative AI", "OpenAI", "Anthropic", "GPU compute", "machine learning"] },
            { id: "saas", label: "B2B SaaS", keywords: ["enterprise software", "SaaS", "cloud computing", "API economy", "software earnings"] },
            { id: "consumer", label: "Consumer Tech", keywords: ["Apple", "smartphones", "wearables", "AR/VR", "consumer electronics"] },
            { id: "cyber", label: "Cybersecurity", keywords: ["cybersecurity", "ransomware", "zero trust", "infosec", "network security"] },
            { id: "chips", label: "Semiconductors", keywords: ["NVIDIA", "TSMC", "semiconductors", "chip manufacturing", "Moore's law"] },
            { id: "robotics", label: "Robotics & Automation", keywords: ["robotics", "industrial automation", "autonomous vehicles", "drones"] },
        ],
    },
    {
        id: "science",
        label: "Science & Future",
        emoji: "🧬",
        description: "Breakthroughs in health, space, and energy",
        subcategories: [
            { id: "biotech", label: "Biotech / Pharma", keywords: ["biotech", "clinical trials", "CRISPR", "pharmaceuticals", "drug discovery"] },
            { id: "space", label: "Space Economy", keywords: ["SpaceX", "commercial space", "satellite constellations", "orbital launch", "NASA"] },
            { id: "energy", label: "Clean Energy", keywords: ["nuclear fusion", "solar energy", "batteries", "EVs", "climate tech", "hydrogen"] },
            { id: "physics", label: "Quantum / Physics", keywords: ["quantum computing", "physics research", "material science", "superconductors"] },
        ],
    },
    {
        id: "politics",
        label: "Geopolitics",
        emoji: "🌍",
        description: "Global power dynamics and policy",
        subcategories: [
            { id: "us-pol", label: "US Policy", keywords: ["US congress", "white house", "federal regulation", "supreme court", "elections"] },
            { id: "china", label: "China / Asia", keywords: ["China economy", "geopolitics asia", "US-China relations", "semiconductor war"] },
            { id: "eu", label: "Europe", keywords: ["EU regulation", "European economy", "Brexit implications", "Eurozone"] },
            { id: "defense", label: "Defense / Security", keywords: ["defense spending", "military tech", "NATO", "conflict zones", "geopolitical risk"] },
        ],
    },
    {
        id: "business",
        label: "Business Strategy",
        emoji: "💼",
        description: "Corporate strategy, leadership, and media",
        subcategories: [
            { id: "strategy", label: "Corp Strategy", keywords: ["corporate strategy", "business models", "competitive moat", "disruption"] },
            { id: "media", label: "Media & Streaming", keywords: ["streaming wars", "digital media", "advertising trends", "social media platforms"] },
            { id: "retail", label: "Retail / E-comm", keywords: ["e-commerce", "retail trends", "supply chain", "consumer spending", "DTC brands"] },
            { id: "transport", label: "Transport / Logistics", keywords: ["supply chain", "logistics", "shipping", "automotive industry", "airlines"] },
        ],
    },
    {
        id: "lifestyle",
        label: "Lifestyle",
        emoji: "🎨",
        description: "Culture, travel, and design",
        subcategories: [
            { id: "travel", label: "Travel & Hospitality", keywords: ["travel trends", "airlines", "hospitality industry", "tourism"] },
            { id: "design", label: "Design & Architecture", keywords: ["architecture", "urban planning", "product design", "interior design"] },
            { id: "fashion", label: "Fashion & Luxury", keywords: ["luxury market", "fashion trends", "retail apparel", "sneaker culture"] },
        ]
    }
];

// Helper to get all selected keywords from user's interests
export function getKeywordsFromInterests(interests: { categoryId: string; subcategoryIds: string[] }[]): string[] {
    const keywords: string[] = [];

    for (const interest of interests) {
        // Handle custom feeds where keywords are passed directly as subcategoryIds
        if (interest.categoryId === "custom") {
            keywords.push(...interest.subcategoryIds);
            continue;
        }

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
