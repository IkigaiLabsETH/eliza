import { BaseReservoirService, ReservoirServiceConfig } from "./base";
import { IAgentRuntime } from "@elizaos/core";
import { NFTCollection } from "../../types";
import {
    CollectionData,
    CollectionActivityData,
    CollectionActivityParams,
    CollectionBidsParams,
    CollectionBidData,
    CollectionV7Params,
    CollectionV7Response,
} from "./types/collection";
import { ReservoirError, ReservoirErrorCode } from "./errors";

export class CollectionService extends BaseReservoirService {
    constructor(config: ReservoirServiceConfig = {}) {
        super(config);
    }

    /**
     * Get collections with various filters and sorting options
     * @see https://docs.reservoir.tools/reference/getcollectionsv7
     */
    async getCollections(
        params: CollectionV7Params,
        runtime: IAgentRuntime
    ): Promise<CollectionV7Response> {
        const endOperation = this.performanceMonitor.startOperation(
            "getCollections",
            { params }
        );

        try {
            const response = await this.cachedRequest<CollectionV7Response>(
                "/collections/v7",
                params,
                runtime,
                {
                    ttl: 300, // 5 minutes cache
                    context: "collections",
                }
            );

            endOperation();
            return response;
        } catch (error) {
            console.error("Error fetching collections:", error);
            this.performanceMonitor.recordMetric({
                operation: "getCollections",
                duration: 0,
                success: false,
                metadata: {
                    error:
                        error instanceof Error ? error.message : String(error),
                    params,
                },
            });
            if (error instanceof ReservoirError) {
                throw error;
            }
            if (error instanceof Error) {
                const mockError = error as any;
                if (mockError.response?.status === 401) {
                    throw new ReservoirError({
                        message: "Invalid API key",
                        code: ReservoirErrorCode.API_KEY_INVALID,
                    });
                }
                if (mockError.response?.status === 429) {
                    throw new ReservoirError({
                        message: "Rate limit exceeded",
                        code: ReservoirErrorCode.RATE_LIMIT,
                    });
                }
                if (mockError.response?.status === 404) {
                    throw new ReservoirError({
                        message: "Collection not found",
                        code: ReservoirErrorCode.COLLECTION_NOT_FOUND,
                    });
                }
                throw new ReservoirError({
                    message: "API Error: " + mockError.message,
                    code: ReservoirErrorCode.HttpError,
                });
            }
            throw new ReservoirError({
                message: "Unknown error fetching collections",
                code: ReservoirErrorCode.UnknownError,
            });
        }
    }

    /**
     * Get collection activity (sales, listings, etc.)
     * @see https://docs.reservoir.tools/reference/getcollectionsactivityv6
     */
    async getCollectionActivity(
        params: CollectionActivityParams,
        runtime: IAgentRuntime
    ): Promise<CollectionActivityData[]> {
        const endOperation = this.performanceMonitor.startOperation(
            "getCollectionActivity",
            { params }
        );

        try {
            const response = await this.cachedRequest<{
                activities: CollectionActivityData[];
                continuation?: string;
            }>("/collections/activity/v6", params, runtime, {
                ttl: 60, // 1 minute cache for activity
                context: "collections_activity",
            });

            endOperation();
            return response.activities;
        } catch (error) {
            console.error("Error fetching collection activity:", error);
            this.performanceMonitor.recordMetric({
                operation: "getCollectionActivity",
                duration: 0,
                success: false,
                metadata: {
                    error:
                        error instanceof Error ? error.message : String(error),
                    params,
                },
            });
            if (error instanceof Error) {
                throw new ReservoirError({
                    message: error.message,
                    code: ReservoirErrorCode.HttpError,
                });
            }
            throw new ReservoirError({
                message: "Unknown error fetching collection activity",
                code: ReservoirErrorCode.UnknownError,
            });
        }
    }

    /**
     * Get collection bids
     * @see https://docs.reservoir.tools/reference/getcollectionsbidsv6
     */
    async getCollectionBids(
        params: CollectionBidsParams,
        runtime: IAgentRuntime
    ): Promise<CollectionBidData[]> {
        const endOperation = this.performanceMonitor.startOperation(
            "getCollectionBids",
            { params }
        );

        try {
            const response = await this.cachedRequest<{
                bids: CollectionBidData[];
            }>("/collections/bids/v6", params, runtime, {
                ttl: 60,
                context: "collections_bids",
            });

            endOperation();
            return response.bids;
        } catch (error) {
            console.error("Error fetching collection bids:", error);
            this.performanceMonitor.recordMetric({
                operation: "getCollectionBids",
                duration: 0,
                success: false,
                metadata: {
                    error:
                        error instanceof Error ? error.message : String(error),
                    params,
                },
            });
            if (error instanceof Error) {
                throw new ReservoirError({
                    message: error.message,
                    code: ReservoirErrorCode.HttpError,
                });
            }
            throw new ReservoirError({
                message: "Unknown error fetching collection bids",
                code: ReservoirErrorCode.UnknownError,
            });
        }
    }

    /**
     * Get top collections by volume, sales, etc.
     * @see https://docs.reservoir.tools/reference/getcollectionsv7
     */
    async getTopCollections(
        runtime: IAgentRuntime,
        limit: number = 10
    ): Promise<NFTCollection[]> {
        const endOperation = this.performanceMonitor.startOperation(
            "getTopCollections",
            { limit }
        );

        try {
            const response = await this.getCollections(
                {
                    sortBy: "1DayVolume",
                    sortDirection: "desc",
                    limit,
                    includeTopBid: true,
                    includeSalesCount: true,
                    includeLastSale: true,
                    includeCreatorFees: true,
                    includeAttributes: true,
                    includeOwnerCount: true,
                    includeMarketplaces: true,
                },
                runtime
            );

            const mappedCollections = response.collections.map(
                (collection: CollectionData) =>
                    ({
                        address: collection.id,
                        name: collection.name,
                        symbol: collection.symbol || "",
                        description: collection.description || "",
                        imageUrl: collection.image || "",
                        externalUrl: collection.externalUrl || "",
                        twitterUsername: collection.twitterUsername || "",
                        discordUrl: collection.discordUrl || "",
                        verified:
                            collection.openseaVerificationStatus === "verified",
                        floorPrice: collection.stats?.floorAsk?.price || 0,
                        topBid: collection.stats?.topBid?.price || 0,
                        volume24h: collection.stats?.volume24h || 0,
                        volume7d: collection.stats?.volume7d || 0,
                        volume30d: collection.stats?.volume30d || 0,
                        volumeAll: collection.stats?.volumeAll || 0,
                        marketCap: collection.stats?.marketCap || 0,
                        totalSupply: collection.tokenCount || 0,
                        holders: collection.stats?.numOwners || 0,
                        lastUpdate: new Date().toISOString(),
                    }) as NFTCollection
            );

            endOperation();
            return mappedCollections;
        } catch (error) {
            console.error("Error fetching top collections:", error);
            this.performanceMonitor.recordMetric({
                operation: "getTopCollections",
                duration: 0,
                success: false,
                metadata: {
                    error:
                        error instanceof Error ? error.message : String(error),
                    limit,
                },
            });
            if (error instanceof Error) {
                throw new ReservoirError({
                    message: error.message,
                    code: ReservoirErrorCode.HttpError,
                });
            }
            throw new ReservoirError({
                message: "Unknown error fetching top collections",
                code: ReservoirErrorCode.UnknownError,
            });
        }
    }
}
