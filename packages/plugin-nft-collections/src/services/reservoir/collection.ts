import { BaseReservoirService, ReservoirServiceConfig } from "./base";
import { IAgentRuntime } from "@elizaos/core";
import { NFTCollection } from "../../types";
import {
    CollectionSearchParams,
    CollectionSearchData,
    TrendingCollectionsParams,
    TrendingCollectionData,
    CollectionActivityParams,
    CollectionActivityData,
    CollectionBidsParams,
    CollectionBidData,
    TokenMetadata,
} from "./types";

export class CollectionService extends BaseReservoirService {
    constructor(config: ReservoirServiceConfig = {}) {
        super(config);
    }

    /**
     * Search for collections by name or other criteria
     * @see https://docs.reservoir.tools/reference/getcollectionsv6
     */
    async searchCollections(
        params: CollectionSearchParams,
        runtime: IAgentRuntime
    ): Promise<CollectionSearchData[]> {
        const endOperation = this.performanceMonitor.startOperation(
            "searchCollections",
            { params }
        );

        try {
            const response = await this.cachedRequest<{
                collections: CollectionSearchData[];
            }>("/collections/v6", params, runtime, {
                ttl: 300, // 5 minutes cache
                context: "collections_search",
            });

            endOperation();
            return response.collections;
        } catch (error) {
            console.error("Error searching collections:", error);
            this.performanceMonitor.recordMetric({
                operation: "searchCollections",
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
     * Get trending collections based on volume, sales, etc.
     * @see https://docs.reservoir.tools/reference/getcollectionstrendingv1
     */
    async getTrendingCollections(
        params: TrendingCollectionsParams,
        runtime: IAgentRuntime
    ): Promise<TrendingCollectionData[]> {
        const endOperation = this.performanceMonitor.startOperation(
            "getTrendingCollections",
            { params }
        );

        try {
            const response = await this.cachedRequest<{
                collections: TrendingCollectionData[];
            }>("/collections/trending/v1", params, runtime, {
                ttl: 300,
                context: "collections_trending",
            });

            endOperation();
            return response.collections;
        } catch (error) {
            console.error("Error fetching trending collections:", error);
            this.performanceMonitor.recordMetric({
                operation: "getTrendingCollections",
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
                    error: error.message,
                    params,
                },
            });
            throw error;
        }
    }

    /**
     * Get collection activity feed with default parameters
     * @see https://docs.reservoir.tools/reference/getcollectionsactivityv6
     */
    async getCollectionActivityFeed(
        collection: string,
        runtime: IAgentRuntime
    ): Promise<CollectionActivityData[]> {
        return this.getCollectionActivity(
            {
                collection,
                limit: 20,
                sortBy: "timestamp",
                sortDirection: "desc",
                includeMetadata: true,
                includeTokenMetadata: true,
            },
            runtime
        );
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
                    error: error.message,
                    params,
                },
            });
            throw error;
        }
    }

    /**
     * Get top collections by volume, sales, etc.
     * @see https://docs.reservoir.tools/reference/getcollectionsv6
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
            const promises = [
                this.cachedRequest<{ collections: any[] }>(
                    "/collections/v6",
                    {
                        sortBy: "1DayVolume",
                        limit: limit * 2,
                        includeTopBid: true,
                    },
                    runtime,
                    {
                        ttl: 300,
                        context: "top_collections",
                    }
                ),
                this.cachedRequest<{ collections: any[] }>(
                    "/collections/v6",
                    {
                        sortBy: "allTimeVolume",
                        limit: limit * 2,
                        includeTopBid: true,
                    },
                    runtime,
                    {
                        ttl: 300,
                        context: "top_collections",
                    }
                ),
            ];

            const results = await Promise.all(promises);
            const collections = results.flatMap((data) => data.collections);

            console.log(
                "Raw Reservoir API response:",
                JSON.stringify(collections[0], null, 2)
            );

            const mappedCollections = collections
                .slice(0, limit)
                .map((collection: any) => {
                    const floorPrice =
                        collection.floorAsk?.price?.amount?.native ||
                        collection.floorPrice ||
                        collection.floorAskPrice ||
                        0;

                    console.log(
                        `Collection ${collection.name} floor price data:`,
                        {
                            collectionId: collection.id,
                            floorAskPrice:
                                collection.floorAsk?.price?.amount?.native,
                            floorPrice: collection.floorPrice,
                            rawFloorAsk: collection.floorAsk,
                            finalFloorPrice: floorPrice,
                        }
                    );

                    return {
                        address: collection.id,
                        name: collection.name,
                        symbol: collection.symbol,
                        description: collection.description,
                        imageUrl: collection.image,
                        externalUrl: collection.externalUrl,
                        twitterUsername: collection.twitterUsername,
                        discordUrl: collection.discordUrl,
                        verified:
                            collection.openseaVerificationStatus === "verified",
                        floorPrice,
                        topBid: collection.topBid?.price?.amount?.native || 0,
                        volume24h: collection.volume?.["1day"] || 0,
                        volume7d: collection.volume?.["7day"] || 0,
                        volume30d: collection.volume?.["30day"] || 0,
                        volumeAll: collection.volume?.allTime || 0,
                        marketCap: collection.marketCap || 0,
                        totalSupply: collection.tokenCount || 0,
                        holders: collection.ownerCount || 0,
                        sales24h: collection.salesCount?.["1day"] || 0,
                        sales7d: collection.salesCount?.["7day"] || 0,
                        sales30d: collection.salesCount?.["30day"] || 0,
                        salesAll: collection.salesCount?.allTime || 0,
                        lastSale: collection.lastSale
                            ? {
                                  price:
                                      collection.lastSale.price?.amount
                                          ?.native || 0,
                                  timestamp: collection.lastSale.timestamp,
                                  tokenId: collection.lastSale.token?.tokenId,
                              }
                            : undefined,
                        royalties: collection.royalties
                            ? {
                                  bps: collection.royalties.bps,
                                  recipient: collection.royalties.recipient,
                              }
                            : undefined,
                        attributes: collection.attributes,
                        marketplaces: collection.marketplaces?.map(
                            (m: any) => ({
                                name: m.name,
                                url: m.url,
                                icon: m.icon,
                            })
                        ),
                        lastUpdate: new Date().toISOString(),
                    };
                });

            endOperation();
            return mappedCollections;
        } catch (error) {
            console.error("Error fetching collections:", error);
            this.performanceMonitor.recordMetric({
                operation: "getTopCollections",
                duration: 0,
                success: false,
                metadata: {
                    error: error.message,
                    limit,
                },
            });
            throw error;
        }
    }

    /**
     * Get collection tokens
     * @see https://docs.reservoir.tools/reference/getcollectionstokensv6
     */
    async getCollectionTokens(
        collection: string,
        runtime: IAgentRuntime
    ): Promise<TokenMetadata[]> {
        const endOperation = this.performanceMonitor.startOperation(
            "getCollectionTokens",
            { collection }
        );

        try {
            const response = await this.cachedRequest<{
                tokens: TokenMetadata[];
                continuation?: string;
            }>(
                "/collections/tokens/v6",
                {
                    collection,
                    limit: 20,
                    includeAttributes: true,
                    includeTopBid: true,
                    includeLastSale: true,
                },
                runtime,
                {
                    ttl: 300, // 5 minutes cache
                    context: "collection_tokens",
                }
            );

            endOperation();
            return response.tokens;
        } catch (error) {
            console.error("Error fetching collection tokens:", error);
            this.performanceMonitor.recordMetric({
                operation: "getCollectionTokens",
                duration: 0,
                success: false,
                metadata: {
                    error: error.message,
                    collection,
                },
            });
            throw error;
        }
    }

    /**
     * Get collection attributes
     * @see https://docs.reservoir.tools/reference/getcollectionsattributesv2
     */
    async getCollectionAttributes(
        collection: string,
        runtime: IAgentRuntime
    ): Promise<
        Array<{
            key: string;
            kind: string;
            count: number;
            values: Array<{
                value: string;
                count: number;
                floorAskPrice?: number;
                topBidValue?: number;
            }>;
        }>
    > {
        const endOperation = this.performanceMonitor.startOperation(
            "getCollectionAttributes",
            { collection }
        );

        try {
            const response = await this.cachedRequest<{
                attributes: Array<{
                    key: string;
                    kind: string;
                    count: number;
                    values: Array<{
                        value: string;
                        count: number;
                        floorAskPrice?: number;
                        topBidValue?: number;
                    }>;
                }>;
            }>(
                "/collections/attributes/v2",
                {
                    collection,
                    includeTopBid: true,
                    includeFloorAsk: true,
                },
                runtime,
                {
                    ttl: 300, // 5 minutes cache
                    context: "collection_attributes",
                }
            );

            endOperation();
            return response.attributes;
        } catch (error) {
            console.error("Error fetching collection attributes:", error);
            this.performanceMonitor.recordMetric({
                operation: "getCollectionAttributes",
                duration: 0,
                success: false,
                metadata: {
                    error: error.message,
                    collection,
                },
            });
            throw error;
        }
    }

    /**
     * Search for collections with default parameters optimized for discovery
     * @param query Search query string
     * @param runtime Agent runtime
     */
    async quickSearchCollections(
        query: string,
        runtime: IAgentRuntime,
        options: {
            chain?: string;
            limit?: number;
            includeMetadata?: boolean;
        } = {}
    ): Promise<CollectionSearchData[]> {
        return this.searchCollections(
            {
                name: query,
                chain: options.chain,
                limit: options.limit || 20,
                includeMetadata: options.includeMetadata ?? true,
                includeTopBid: true,
                includeAttributes: true,
                includeOwnerCount: true,
                includeMintStages: true,
                includeMarketplaces: true,
            },
            runtime
        );
    }
}
