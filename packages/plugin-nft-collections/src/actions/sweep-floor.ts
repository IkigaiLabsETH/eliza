import { Action, IAgentRuntime, Memory, State } from "@elizaos/core";
import { ReservoirService } from "../services/reservoir";
import { HandlerCallback } from "@elizaos/core";
import { z } from "zod";

// Recreate the WatchlistEntrySchema from get-collections.ts
const WatchlistEntrySchema = z.object({
    address: z.string(),
    name: z.string().optional(),
    maxThinnessThreshold: z.number().optional().default(15),
    category: z.string().optional(),
});

type WatchlistEntry = z.infer<typeof WatchlistEntrySchema>;

// Define types for marketplace interactions
interface ListingDetails {
    tokenId: string;
    price: number;
    seller?: string;
    marketplace?: string;
}

interface BuyResult {
    path: string;
    steps: Array<{ action: string; status: string }>;
    status?: string;
}

interface ListResult {
    status: string;
    marketplaceUrl?: string;
    transactionHash?: string;
}

interface ArbitrageOpportunity {
    collection: string;
    lowestPrice: number;
    secondLowestPrice: number;
    thinnessPercentage: number;
    tokenIds: string[];
}

export const sweepFloorArbitrageAction = (
    reservoirService: ReservoirService,
    nftService: ReservoirService
): Action => {
    // Mock watchlist for demonstration
    const mockWatchlist: WatchlistEntry[] = [
        {
            address: "0x...", // QQL Collection Address
            name: "QQL by Tyler Hobbs",
            category: "Art",
            maxThinnessThreshold: 50,
        },
    ];

    const detectThinFloorOpportunities = async (
        runtime: IAgentRuntime
    ): Promise<ArbitrageOpportunity[]> => {
        const watchlistCollections = mockWatchlist.filter(
            (collection) => collection.category === "Art"
        );

        const opportunities: ArbitrageOpportunity[] = [];

        for (const collection of watchlistCollections) {
            try {
                const listings = await reservoirService.market.getOrdersAsks(
                    {
                        collection: collection.address,
                        sortBy: "price",
                        sortDirection: "asc",
                        limit: 10,
                    },
                    runtime
                );

                if (listings.asks.length >= 2) {
                    const lowestListing = listings.asks[0];
                    const secondLowestListing = listings.asks[1];

                    if (lowestListing && secondLowestListing) {
                        const priceDifference =
                            secondLowestListing.price.amount.native -
                            lowestListing.price.amount.native;
                        const thinnessPercentage =
                            (priceDifference /
                                lowestListing.price.amount.native) *
                            100;

                        // Use collection's custom thinness threshold or default to 50%
                        const thinnessThreshold =
                            collection.maxThinnessThreshold || 50;

                        if (thinnessPercentage > thinnessThreshold) {
                            const tokenId =
                                lowestListing.criteria?.data.token?.tokenId;
                            if (tokenId) {
                                opportunities.push({
                                    collection: collection.address,
                                    lowestPrice:
                                        lowestListing.price.amount.native,
                                    secondLowestPrice:
                                        secondLowestListing.price.amount.native,
                                    thinnessPercentage,
                                    tokenIds: [tokenId],
                                });
                            }
                        }
                    }
                }
            } catch (error) {
                console.error(
                    `Thin floor detection error for ${collection.address}:`,
                    error
                );
            }
        }

        return opportunities.sort(
            (a, b) => b.thinnessPercentage - a.thinnessPercentage
        );
    };

    return {
        name: "SWEEP_FLOOR_ARBITRAGE",
        similes: ["AUTO_BUY_FLOOR_NFT", "QUICK_FLIP_NFT"],
        description:
            "Automatically detect and execute thin floor arbitrage opportunities in art collections",

        validate: async (runtime: IAgentRuntime, message: Memory) => {
            const content = message.content.text.toLowerCase();
            return (
                (content.includes("arbitrage") ||
                    content.includes("auto buy")) &&
                content.includes("art") &&
                content.includes("nft")
            );
        },

        handler: async (
            runtime: IAgentRuntime,
            message: Memory,
            state: State | undefined,
            options: any,
            callback: HandlerCallback
        ): Promise<boolean> => {
            if (!callback) {
                throw new Error("Callback is required");
            }

            try {
                // Detect thin floor opportunities
                const opportunities =
                    await detectThinFloorOpportunities(runtime);

                if (opportunities.length === 0) {
                    callback({
                        text: "No thin floor arbitrage opportunities found.",
                    });
                    return false;
                }

                const results = [];

                // Process top 3 opportunities
                for (const opportunity of opportunities.slice(0, 3)) {
                    // Buy floor NFT
                    const buyResult: BuyResult =
                        await nftService.market.executeBuy({
                            listings: [
                                {
                                    tokenId: opportunity.tokenIds[0],
                                    price: opportunity.lowestPrice,
                                    seller: "marketplace",
                                    marketplace: "ikigailabs",
                                },
                            ],
                            taker: message.userId,
                        });

                    // Relist at 2x price
                    const relistPrice = opportunity.secondLowestPrice * 2;
                    const listResult: ListResult =
                        await nftService.market.createOrder({
                            tokenId: opportunity.tokenIds[0],
                            collectionAddress: opportunity.collection,
                            price: relistPrice,
                            marketplace: "ikigailabs",
                            expirationTime:
                                Math.floor(Date.now() / 1000) +
                                30 * 24 * 60 * 60, // 30 days
                        });

                    results.push({
                        collection: opportunity.collection,
                        buyPrice: opportunity.lowestPrice,
                        relistPrice,
                        thinnessPercentage: opportunity.thinnessPercentage,
                        buyStatus: buyResult.steps[0]?.status || "Unknown",
                        listStatus: listResult.status,
                    });
                }

                const response = results
                    .map(
                        (result) =>
                            `🔥 Arbitrage Opportunity 🔥\n` +
                            `Collection: ${result.collection}\n` +
                            `Buy Price: ${result.buyPrice.toFixed(3)} ETH\n` +
                            `Relist Price: ${result.relistPrice.toFixed(3)} ETH\n` +
                            `Thinness: ${result.thinnessPercentage.toFixed(2)}%\n` +
                            `Buy Status: ${result.buyStatus}\n` +
                            `List Status: ${result.listStatus}`
                    )
                    .join("\n\n");

                callback({ text: response });
                return true;
            } catch (error) {
                const errorMessage =
                    error instanceof Error
                        ? error.message
                        : "Unknown error occurred";
                console.error("Arbitrage workflow failed:", errorMessage);
                callback({
                    text: `Arbitrage workflow failed: ${errorMessage}`,
                });
                return false;
            }
        },

        examples: [
            [
                {
                    user: "{{user1}}",
                    content: { text: "Run art NFT arbitrage workflow" },
                },
                {
                    user: "{{user2}}",
                    content: {
                        text: "Executing automated thin floor arbitrage for art collections...",
                        action: "SWEEP_FLOOR_ARBITRAGE",
                    },
                },
            ],
        ],
    };
};
