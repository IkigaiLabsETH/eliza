import type { IAgentRuntime } from "@elizaos/core";
import { createNftCollectionProvider } from "./providers/nft-collections";
import { listNFTAction, acceptNFTOfferAction } from "./actions/list-nft";
import { sweepFloorArbitrageAction } from "./actions/sweep-floor";

import { ReservoirService } from "./services/reservoir";
import type { ReservoirServiceConfig } from "./services/reservoir/types/common";
import { MemoryCacheManager } from "./services/cache-manager";
import { RateLimiter } from "./services/rate-limiter";
import { MarketIntelligenceService } from "./services/market-intelligence";
import { SocialAnalyticsService } from "./services/social-analytics";
import { validateEnvironmentVariables } from "./utils/validation";
import type { TokenData, TokenMarket } from "./services/reservoir/types/token";
import type { Collection } from "./services/reservoir/types/common";
import type { OrderData } from "./services/reservoir/types/order";

// Define configuration interfaces
interface CachingConfig {
    enabled: boolean;
    ttl: number;
    maxSize: number;
}

interface RateLimitConfig {
    enabled: boolean;
    maxRequests: number;
    windowMs: number;
}

interface SecurityConfig {
    rateLimit: RateLimitConfig;
}

interface BaseConfig {
    caching: CachingConfig;
    security: SecurityConfig;
    maxConcurrent: number;
    maxRetries: number;
    batchSize: number;
}

// Plugin configuration interface
interface NFTCollectionsConfig extends BaseConfig {
    reservoirApiKey: string;
    openSeaApiKey?: string | undefined;
    twitterApiKey?: string | undefined;
    cacheManager?: MemoryCacheManager | undefined;
    rateLimiter?: RateLimiter | undefined;
}

interface NFT {
    collectionAddress: string;
    tokenId: string;
    name: string | undefined;
    description: string | undefined;
    image: string | undefined;
    attributes: Array<{
        key: string;
        value: string;
    }>;
    lastSale?:
        | {
              price: number;
              timestamp: string;
          }
        | undefined;
    market?: TokenMarket | undefined;
}

interface FloorListing {
    collectionAddress: string;
    tokenId: string;
    price: number;
    seller: string;
    marketplace: string;
    validFrom: string;
    validUntil: string;
}

interface Listing {
    status: string;
    marketplaceUrl: string;
    transactionHash: string | undefined;
}

// Extended ReservoirService class
class ExtendedReservoirService extends ReservoirService {
    private runtime: IAgentRuntime;

    constructor(config: ReservoirServiceConfig, runtime: IAgentRuntime) {
        super(config);
        this.runtime = runtime;
    }

    async getTopCollections(limit: number = 10): Promise<Collection[]> {
        try {
            const response = await this.collections.getCollections(
                {
                    limit,
                    sortBy: "1DayVolume",
                    sortDirection: "desc",
                },
                this.runtime
            );

            return response.collections;
        } catch (error) {
            throw error;
        }
    }

    async getOwnedNFTs(address: string): Promise<NFT[]> {
        try {
            const response = await this.tokens.getTokens(
                {
                    tokens: [],
                    collection: address,
                    includeAttributes: true,
                    includeTopBid: true,
                    includeLastSale: true,
                },
                this.runtime
            );

            return response.map(
                (tokenData: TokenData): NFT => ({
                    collectionAddress: tokenData.token.contract,
                    tokenId: tokenData.token.tokenId,
                    name: tokenData.token.name,
                    description: tokenData.token.description,
                    image: tokenData.token.image,
                    attributes:
                        tokenData.token.attributes?.map((attr) => ({
                            key: attr.key,
                            value: attr.value,
                        })) || [],
                    lastSale: tokenData.token.lastSale
                        ? {
                              price: Number(tokenData.token.lastSale.price),
                              timestamp: tokenData.token.lastSale.timestamp,
                          }
                        : undefined,
                    market: tokenData.market,
                })
            );
        } catch (error) {
            throw error;
        }
    }

    async getLastSalePrice(params: {
        collectionAddress: string;
        tokenId: string;
    }): Promise<number | undefined> {
        try {
            const response = await this.tokens.getTokens(
                {
                    tokens: [`${params.collectionAddress}:${params.tokenId}`],
                    includeLastSale: true,
                },
                this.runtime
            );

            const token = response[0];
            if (token?.token.lastSale) {
                return Number(token.token.lastSale.price);
            }
            return undefined;
        } catch (error) {
            throw error;
        }
    }

    async getOrders(params: {
        collection: string;
        side: "buy" | "sell";
    }): Promise<OrderData[]> {
        try {
            if (params.side === "sell") {
                const response = await this.market.getAsks(
                    {
                        collection: params.collection,
                    },
                    this.runtime
                );
                return response.asks;
            } else {
                const response = await this.market.getBids(
                    {
                        collection: params.collection,
                    },
                    this.runtime
                );
                return response.bids;
            }
        } catch (error) {
            throw error;
        }
    }
}

export const initialize = (
    runtime: IAgentRuntime,
    config: NFTCollectionsConfig
) => {
    // Initialize services
    const reservoirService = new ExtendedReservoirService(
        {
            apiKey: config.reservoirApiKey,
            maxConcurrent: config.maxConcurrent,
            maxRetries: config.maxRetries,
            timeout: 30000,
        },
        runtime
    );

    const marketIntelligenceService = new MarketIntelligenceService({
        cacheManager: config.cacheManager,
        rateLimiter: config.rateLimiter,
        openSeaApiKey: config.openSeaApiKey,
        reservoirApiKey: config.reservoirApiKey,
    });

    const socialAnalyticsService = new SocialAnalyticsService({
        cacheManager: config.cacheManager,
        rateLimiter: config.rateLimiter,
        twitterApiKey: config.twitterApiKey,
    });

    // Create provider
    const nftCollectionProvider = createNftCollectionProvider(
        reservoirService,
        marketIntelligenceService,
        socialAnalyticsService
    );

    const plugin = {
        name: "nft-collections",
        version: "1.0.0",
        description: "NFT collections plugin for market analysis and trading",
        validateEnvironmentVariables: (
            env: Record<string, string | undefined>
        ) => validateEnvironmentVariables(env),
        actions: [
            listNFTAction(reservoirService),
            sweepFloorArbitrageAction(reservoirService, reservoirService),
            acceptNFTOfferAction(nftCollectionProvider, reservoirService),
        ],
        provider: nftCollectionProvider,
        services: {
            reservoirService,
            marketIntelligenceService,
            socialAnalyticsService,
        },
    };

    return plugin;
};

export { ExtendedReservoirService };
export type { NFTCollectionsConfig, NFT, FloorListing, Listing };
