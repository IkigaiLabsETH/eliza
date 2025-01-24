import { Provider, type IAgentRuntime, type Memory } from "@elizaos/core";
import { ReservoirService } from "../services/reservoir";
import { MarketIntelligenceService } from "../services/market-intelligence";
import { SocialAnalyticsService } from "../services/social-analytics";
import type { Collection } from "../services/reservoir/types/common";

interface BaseMarketData {
    floorPrice: number;
    volume24h: number;
    holders: number;
    sales24h: number;
}

interface EnhancedMarketData extends BaseMarketData {
    marketCap: number;
    lastUpdate: string;
    bestOffer: number | null;
    volume7d: number | null;
    volume30d: number | null;
    sales7d: number | null;
    sales30d: number | null;
    uniqueHolders: number | null;
    totalSupply: number | null;
    listedCount: number | null;
    priceHistory: PriceHistoryEntry[] | null;
}

interface PriceHistoryEntry {
    timestamp: number;
    price: number;
    volume: number | null;
    trades: number | null;
}

interface DetailedSocialMetrics {
    sentiment: number; // -100 to 100
    engagement: number; // 0 to 100
    mentions: {
        total: number;
        positive: number;
        negative: number;
        neutral: number;
    };
    influencerActivity: {
        count: number;
        reach: number;
        engagement: number;
    };
    communityGrowth: {
        twitter: number;
        discord: number;
    };
    timestamp: string;
}

export interface ExtendedCollection extends Collection {
    address: string;
    floorPrice: number;
    volume24h: number;
    marketCap: number;
    holders: number;
}

export const createNftCollectionProvider = (
    nftService: ReservoirService,
    marketIntelligenceService: MarketIntelligenceService,
    socialAnalyticsService: SocialAnalyticsService
): Provider => {
    return {
        get: async (
            runtime: IAgentRuntime,
            message: Memory
        ): Promise<string> => {
            if (!nftService) {
                throw new Error("NFT service not found");
            }

            const collections = await nftService.collections.getCollections(
                {
                    limit: 10,
                    sortBy: "1DayVolume",
                    sortDirection: "desc",
                },
                runtime
            );

            let response = "Here are the top NFT collections:\n\n";

            for (const collection of collections.collections) {
                const extendedCollection =
                    collection as unknown as ExtendedCollection;
                response += `${extendedCollection.name}:\n`;
                response += `• Floor Price: ${extendedCollection.floorPrice} ETH\n`;
                response += `• 24h Volume: ${extendedCollection.volume24h} ETH\n`;
                response += `• Market Cap: ${extendedCollection.marketCap} ETH\n`;
                response += `• Holders: ${extendedCollection.holders}\n\n`;
            }

            // If a specific collection is mentioned in the message, get detailed information
            const collection = collections.collections.find((c: Collection) => {
                const extendedCollection = c as unknown as ExtendedCollection;
                return (
                    message.content.text
                        .toLowerCase()
                        .includes(extendedCollection.name.toLowerCase()) ||
                    message.content.text
                        .toLowerCase()
                        .includes(extendedCollection.address.toLowerCase())
                );
            });

            if (collection) {
                const extendedCollection =
                    collection as unknown as ExtendedCollection;
                response += `\nDetailed information for ${extendedCollection.name}:\n\n`;

                // Market intelligence data (optional)
                if (marketIntelligenceService) {
                    try {
                        const marketIntelligence =
                            await marketIntelligenceService.getMarketIntelligence(
                                extendedCollection.address
                            );
                        response += "Market Intelligence:\n";
                        response += `• Floor Price: ${marketIntelligence.floorPrice} ETH\n`;
                        response += `• 24h Volume: ${marketIntelligence.volume24h} ETH\n`;
                        response += `• 7d Volume: ${marketIntelligence.volume7d || "N/A"} ETH\n`;
                        response += `• 30d Volume: ${marketIntelligence.volume30d || "N/A"} ETH\n`;
                        response += `• Market Cap: ${marketIntelligence.marketCap} ETH\n`;
                        response += `• Best Offer: ${marketIntelligence.bestOffer || "N/A"} ETH\n`;
                        response += `• Total Supply: ${marketIntelligence.totalSupply || "N/A"}\n`;
                        response += `• Unique Holders: ${marketIntelligence.uniqueHolders || "N/A"}\n`;
                        response += `• Listed Count: ${marketIntelligence.listedCount || "N/A"}\n`;
                        response += `• 24h Sales: ${marketIntelligence.sales24h}\n`;
                        response += `• 7d Sales: ${marketIntelligence.sales7d || "N/A"}\n`;
                        response += `• 30d Sales: ${marketIntelligence.sales30d || "N/A"}\n\n`;
                    } catch (error) {
                        console.error(
                            "Failed to fetch market intelligence:",
                            error
                        );
                    }
                }

                // Social analytics data (optional)
                if (socialAnalyticsService) {
                    try {
                        const socialMetrics =
                            await socialAnalyticsService.getSocialMetrics(
                                extendedCollection.address
                            );

                        response += "Social Metrics:\n";
                        response += `• Sentiment: ${socialMetrics.sentiment}\n`;
                        response += `• Engagement: ${socialMetrics.engagement}\n`;
                        response += `• Total Mentions: ${socialMetrics.mentions.total}\n`;
                        response += `• Positive Mentions: ${socialMetrics.mentions.positive}\n`;
                        response += `• Negative Mentions: ${socialMetrics.mentions.negative}\n`;
                        response += `• Neutral Mentions: ${socialMetrics.mentions.neutral}\n`;
                        response += `• Influencer Count: ${socialMetrics.influencerActivity.count}\n`;
                        response += `• Influencer Reach: ${socialMetrics.influencerActivity.reach}\n`;
                        response += `• Influencer Engagement: ${socialMetrics.influencerActivity.engagement}\n`;
                        response += `• Twitter Growth: ${socialMetrics.communityGrowth.twitter}\n`;
                        response += `• Discord Growth: ${socialMetrics.communityGrowth.discord}\n\n`;
                    } catch (error) {
                        console.error(
                            "Failed to fetch social analytics:",
                            error
                        );
                    }
                }
            }

            return response;
        },
    };
};
