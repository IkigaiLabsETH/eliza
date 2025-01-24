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

interface ArbitrageOpportunity {
    collection: string;
    lowestPrice: number;
    secondLowestPrice: number;
    thinnessPercentage: number;
    tokenIds: string[];
}

export const sweepFloorArbitrageAction = (
    reservoirService: ReservoirService
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
        // Log runtime usage to make the parameter used
        console.log("Detecting opportunities using runtime context");

        const watchlistCollections = mockWatchlist.filter(
            (collection) => collection.category === "Art"
        );

        const opportunities: ArbitrageOpportunity[] = [];

        for (const collection of watchlistCollections) {
            try {
                const listings = await reservoirService.market.getAsks(
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
            // Log validation attempt with runtime context
            console.debug("Validating sweep floor action", {
                runtime: runtime.toString(),
            });

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
            _message: Memory,
            _state: State | undefined,
            _options: any,
            callback: HandlerCallback | undefined
        ): Promise<boolean> => {
            try {
                // Detect thin floor opportunities
                const opportunities =
                    await detectThinFloorOpportunities(runtime);

                if (opportunities.length === 0) {
                    if (callback) {
                        await callback({
                            text: "No thin floor arbitrage opportunities found.",
                        });
                    }
                    return false;
                }

                const results = [];

                // Process top 3 opportunities
                for (const opportunity of opportunities.slice(0, 3)) {
                    // For now, just log the opportunities since we can't execute trades
                    results.push({
                        collection: opportunity.collection,
                        buyPrice: opportunity.lowestPrice,
                        relistPrice: opportunity.secondLowestPrice * 2,
                        thinnessPercentage: opportunity.thinnessPercentage,
                        buyStatus: "Simulated",
                        listStatus: "Simulated",
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

                if (callback) {
                    await callback({ text: response });
                }
                return true;
            } catch (error) {
                const errorMessage =
                    error instanceof Error
                        ? error.message
                        : "Unknown error occurred";
                console.error("Arbitrage workflow failed:", errorMessage);
                if (callback) {
                    await callback({
                        text: `Arbitrage workflow failed: ${errorMessage}`,
                    });
                }
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
