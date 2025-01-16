import { BaseReservoirService, ReservoirServiceConfig } from "./base";
import { IAgentRuntime } from "@elizaos/core";
import {
    MarketStats,
    TopTradersParams,
    TopTraderData,
    FloorListingParams,
    FloorListing,
    BuyOptions,
    BuyResponse,
    OrdersAsksParams,
    OrderAskData,
    OrdersBidsParams,
    OrderBidData,
} from "./types";

export class MarketService extends BaseReservoirService {
    constructor(config: ReservoirServiceConfig = {}) {
        super(config);
    }

    /**
     * Get market-wide statistics
     * @see https://docs.reservoir.tools/reference/getstatsv1
     */
    async getMarketStats(runtime: IAgentRuntime): Promise<MarketStats> {
        const endOperation =
            this.performanceMonitor.startOperation("getMarketStats");

        try {
            const response = await this.cachedRequest<MarketStats>(
                "/stats/v1",
                {},
                runtime,
                {
                    ttl: 300, // 5 minutes cache
                    context: "market_stats",
                }
            );

            endOperation();
            return response;
        } catch (error) {
            console.error("Error fetching market stats:", error);
            this.performanceMonitor.recordMetric({
                operation: "getMarketStats",
                duration: 0,
                success: false,
                metadata: {
                    error: error.message,
                },
            });
            throw error;
        }
    }

    /**
     * Get top traders for a collection
     * @see https://docs.reservoir.tools/reference/getuserstopv2
     */
    async getTopTraders(
        params: TopTradersParams,
        runtime: IAgentRuntime
    ): Promise<TopTraderData[]> {
        const endOperation = this.performanceMonitor.startOperation(
            "getTopTraders",
            { params }
        );

        try {
            const response = await this.cachedRequest<{
                users: TopTraderData[];
            }>("/users/top/v2", params, runtime, {
                ttl: 300, // 5 minutes cache
                context: "top_traders",
            });

            endOperation();
            return response.users;
        } catch (error) {
            console.error("Error fetching top traders:", error);
            this.performanceMonitor.recordMetric({
                operation: "getTopTraders",
                duration: 0,
                success: false,
                metadata: {
                    error: error.message,
                    params,
                },
            });
            throw error;
        }
    }

    /**
     * Get floor listings for a collection
     * @param options Options for fetching floor listings
     * @returns Array of floor listings with token and marketplace details
     */
    async getFloorListings(options: {
        collection: string;
        limit: number;
        sortBy: "price" | "rarity";
        currencies?: string[];
        maxPrice?: number;
        minPrice?: number;
    }): Promise<
        Array<{
            tokenId: string;
            price: number;
            priceUsd?: number;
            seller: string;
            marketplace: string;
            validFrom: string;
            validUntil: string;
            source?: {
                id: string;
                domain: string;
                name: string;
                icon: string;
                url: string;
            };
            token?: {
                rarity?: number;
                rarityRank?: number;
                attributes?: Record<string, string>;
                image?: string;
                name?: string;
            };
        }>
    > {
        const endOperation = this.performanceMonitor.startOperation(
            "getFloorListings",
            { options }
        );

        try {
            if (!options.collection) {
                throw new Error("Collection address is required");
            }

            const queryParams = {
                collection: options.collection,
                limit: options.limit?.toString() || "10",
                sortBy: options.sortBy === "price" ? "floorAskPrice" : "rarity",
                sortDirection: "asc",
                includeAttributes: "true",
                includeRawData: "true",
                includeDynamicPricing: "true",
                includeRoyalties: "true",
                normalizeRoyalties: "true",
                currencies: options.currencies?.join(","),
                maxPrice: options.maxPrice?.toString(),
                minPrice: options.minPrice?.toString(),
            };

            const response = await this.makeRequest<{
                asks: Array<{
                    id: string;
                    token: {
                        tokenId: string;
                        collection: { id: string };
                        attributes?: Array<{ key: string; value: string }>;
                        image?: string;
                        name?: string;
                        rarityScore?: number;
                        rarityRank?: number;
                    };
                    price: {
                        amount: {
                            native: number;
                            usd?: number;
                        };
                        currency?: {
                            contract: string;
                            name: string;
                            symbol: string;
                            decimals: number;
                        };
                    };
                    maker: string;
                    validFrom: number;
                    validUntil: number;
                    source: {
                        id: string;
                        domain: string;
                        name: string;
                        icon: string;
                        url: string;
                    };
                }>;
            }>("/orders/asks/v4", queryParams, 1, {} as IAgentRuntime);

            console.log(
                "Raw floor listings response:",
                JSON.stringify(response.asks[0], null, 2)
            );

            const floorListings = response.asks.map((ask) => ({
                tokenId: ask.token.tokenId,
                price: ask.price.amount.native,
                priceUsd: ask.price.amount.usd,
                seller: ask.maker,
                marketplace: ask.source?.name || "Reservoir",
                validFrom: new Date(ask.validFrom * 1000).toISOString(),
                validUntil: new Date(ask.validUntil * 1000).toISOString(),
                source: ask.source
                    ? {
                          id: ask.source.id,
                          domain: ask.source.domain,
                          name: ask.source.name,
                          icon: ask.source.icon,
                          url: ask.source.url,
                      }
                    : undefined,
                token: {
                    rarity: ask.token.rarityScore,
                    rarityRank: ask.token.rarityRank,
                    attributes: ask.token.attributes
                        ? Object.fromEntries(
                              ask.token.attributes.map((attr) => [
                                  attr.key,
                                  attr.value,
                              ])
                          )
                        : undefined,
                    image: ask.token.image,
                    name: ask.token.name,
                },
            }));

            endOperation();
            return floorListings;
        } catch (error) {
            console.error("Error fetching floor listings:", error);
            this.performanceMonitor.recordMetric({
                operation: "getFloorListings",
                duration: 0,
                success: false,
                metadata: {
                    error: error.message,
                    collection: options.collection,
                },
            });
            throw error;
        }
    }

    /**
     * Execute a buy order for tokens
     * @see https://docs.reservoir.tools/reference/postexecutebuyv7
     */
    async executeBuy(options: {
        listings: Array<{
            tokenId: string;
            price: number;
            seller: string;
            marketplace: string;
        }>;
        taker: string;
    }): Promise<{
        path: string;
        steps: Array<{
            action: string;
            status: string;
        }>;
    }> {
        const endOperation = this.performanceMonitor.startOperation(
            "executeBuy",
            {
                options,
            }
        );

        try {
            if (!options.listings?.length) {
                throw new Error("At least one listing is required");
            }

            if (!options.taker) {
                throw new Error("Taker address is required");
            }

            const response = await this.makeRequest<{
                path: string;
                steps: Array<{
                    action: string;
                    status: string;
                }>;
            }>(
                "/execute/buy/v7",
                {
                    items: options.listings.map((listing) => ({
                        token: `${listing.marketplace}:${listing.tokenId}`,
                        quantity: 1,
                        taker: options.taker,
                    })),
                },
                1,
                {} as IAgentRuntime
            );

            endOperation();
            return response;
        } catch (error) {
            console.error("Error executing buy:", error);
            this.performanceMonitor.recordMetric({
                operation: "executeBuy",
                duration: 0,
                success: false,
                metadata: {
                    error: error.message,
                    options,
                },
            });
            throw error;
        }
    }

    /**
     * Get asks (listings) with various filter options
     * @see https://docs.reservoir.tools/reference/getordersasksv5
     */
    async getOrdersAsks(
        params: OrdersAsksParams,
        runtime: IAgentRuntime
    ): Promise<{
        asks: OrderAskData[];
        continuation?: string;
    }> {
        const endOperation = this.performanceMonitor.startOperation(
            "getOrdersAsks",
            { params }
        );

        try {
            const response = await this.cachedRequest<{
                orders: OrderAskData[];
                continuation?: string;
            }>("/orders/asks/v5", params, runtime, {
                ttl: 60, // 1 minute cache for asks
                context: "orders_asks",
            });

            console.log(
                "Raw orders asks response:",
                JSON.stringify(response.orders[0], null, 2)
            );

            endOperation();
            return {
                asks: response.orders,
                continuation: response.continuation,
            };
        } catch (error) {
            console.error("Error fetching orders asks:", error);
            this.performanceMonitor.recordMetric({
                operation: "getOrdersAsks",
                duration: 0,
                success: false,
                metadata: {
                    error: error.message,
                    params,
                },
            });
            throw error;
        }
    }

    /**
     * Get bids (offers) with various filter options
     * @see https://docs.reservoir.tools/reference/getordersbidsv6
     */
    async getOrdersBids(
        params: OrdersBidsParams,
        runtime: IAgentRuntime
    ): Promise<{
        bids: OrderBidData[];
        continuation?: string;
    }> {
        const endOperation = this.performanceMonitor.startOperation(
            "getOrdersBids",
            { params }
        );

        try {
            const response = await this.cachedRequest<{
                orders: OrderBidData[];
                continuation?: string;
            }>("/orders/bids/v6", params, runtime, {
                ttl: 60, // 1 minute cache for bids
                context: "orders_bids",
            });

            console.log(
                "Raw orders bids response:",
                JSON.stringify(response.orders[0], null, 2)
            );

            endOperation();
            return {
                bids: response.orders,
                continuation: response.continuation,
            };
        } catch (error) {
            console.error("Error fetching orders bids:", error);
            this.performanceMonitor.recordMetric({
                operation: "getOrdersBids",
                duration: 0,
                success: false,
                metadata: {
                    error: error.message,
                    params,
                },
            });
            throw error;
        }
    }
}
