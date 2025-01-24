import {
    Action,
    IAgentRuntime,
    Memory,
    Provider,
    State,
    Handler,
    HandlerCallback,
    elizaLogger,
} from "@elizaos/core";
import { CURATED_COLLECTIONS } from "../constants/curated-collections";

// Simple interfaces for our data types
interface Sale {
    price: number;
}

interface FloorListing {
    price: number;
}

interface CuratedCollection {
    address: string;
    name: string;
    description?: string;
    creator?: string;
}

interface ReservoirService {
    getFloorListings(params: {
        collection: string;
        limit: number;
    }): Promise<FloorListing[]>;
    getSalesHistory(params: {
        collection: string;
        limit: number;
    }): Promise<Sale[]>;
}

interface TwitterClient extends Provider {
    tweet(content: string): Promise<{ data: { id: string } }>;
}

export const publishDailyNFTOpportunitiesTweetAction = (
    reservoirService: ReservoirService,
    twitterClient: TwitterClient
): Action => {
    const validateCollection = (
        collection: unknown
    ): collection is CuratedCollection => {
        return Boolean(
            collection &&
                typeof collection === "object" &&
                "address" in collection &&
                "name" in collection &&
                typeof (collection as CuratedCollection).address === "string" &&
                typeof (collection as CuratedCollection).name === "string"
        );
    };

    const handler: Handler = async (
        _runtime: IAgentRuntime,
        _message: Memory,
        _state: State | undefined,
        _options?: { [key: string]: unknown },
        callback?: HandlerCallback
    ): Promise<boolean> => {
        try {
            // Find and validate collection
            const collection = CURATED_COLLECTIONS.find(validateCollection);
            if (!collection) {
                callback?.({
                    text: "No valid collection found for curation",
                    content: { error: "Invalid collection" },
                });
                return false;
            }

            // Fetch collection data
            const [floorListings, salesHistory] = await Promise.all([
                reservoirService.getFloorListings({
                    collection: collection.address,
                    limit: 5,
                }),
                reservoirService.getSalesHistory({
                    collection: collection.address,
                    limit: 20,
                }),
            ]);

            // Calculate stats with null safety
            const floorPrice = floorListings[0]?.price ?? 0;
            const totalVolume = salesHistory.reduce(
                (sum, sale) => sum + (sale?.price ?? 0),
                0
            );

            // Prepare tweet content with null safety
            const creator = collection.creator ?? "Anonymous";
            const description =
                collection.description ?? "A unique digital art experience";

            const tweetContent = `🎨 Curated Collection Spotlight: ${collection.name} 💎

Dive into the story behind today's digital masterpiece:

🖌️ Artist: ${creator}
🌟 Collection Essence: ${description}
📊 Floor Price: ${floorPrice.toFixed(3)} ETH
💸 Total Volume: ${totalVolume.toFixed(3)} ETH
🔢 Total Sales: ${salesHistory.length}

Explore the art: https://ikigailabs.xyz/collection/${collection.address}

Powered by Ikigai Labs 🔥`;

            const tweetResponse = await twitterClient.tweet(tweetContent);

            callback?.({
                text: `Daily curated collection tweet published for ${collection.name}. Tweet ID: ${tweetResponse.data.id}`,
            });

            elizaLogger.info("Daily Curated Collection Tweet:", {
                tweetId: tweetResponse.data.id,
                collection: collection.name,
                collectionAddress: collection.address,
            });

            return true;
        } catch (error) {
            elizaLogger.error(
                "Error publishing curated collection tweet:",
                error
            );
            callback?.({
                text: "Failed to publish curated collection tweet",
                content: { error: String(error) },
            });
            return false;
        }
    };

    return {
        name: "publish-daily-nft-opportunities-tweet",
        description: "Publishes a daily tweet about NFT opportunities",
        similes: ["NFT_DAILY_INSIGHTS", "TWEET_FLOOR_GEMS"],
        validate: async (_runtime: IAgentRuntime, message: Memory) => {
            const lowercaseText = message.content.text.toLowerCase();
            return (
                lowercaseText.includes("publish daily tweet") ||
                lowercaseText.includes("tweet nft opportunities")
            );
        },
        examples: [
            [
                {
                    user: "{{user1}}",
                    content: {
                        text: "Publish daily tweet about NFT opportunities",
                    },
                },
                {
                    user: "{{user2}}",
                    content: {
                        text: "Daily NFT opportunities tweet published successfully.",
                    },
                },
            ],
        ],
        handler,
    };
};
