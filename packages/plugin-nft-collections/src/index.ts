import { Plugin } from "@elizaos/core";
import { createNftCollectionProvider } from "./providers/nft-collections";
import {
    getCollectionsAction,
    getThinFloorNFTsAction,
    manageWatchlistAction,
} from "./actions/get-collections";
import { listNFTAction } from "./actions/list-nft";
import { sweepFloorArbitrageAction } from "./actions/sweep-floor";

import {
    BaseReservoirService,
    ReservoirServiceConfig,
} from "./services/reservoir/base";
import { MemoryCacheManager } from "./services/cache-manager";
import { RateLimiter } from "./services/rate-limiter";
import { MarketIntelligenceService } from "./services/market-intelligence";
import { SocialAnalyticsService } from "./services/social-analytics";
import { validateEnvironmentVariables } from "./utils/validation";
import { IAgentRuntime } from "@elizaos/core";

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

// Default configuration
const defaultConfig: NFTCollectionsConfig = {
    caching: {
        enabled: process.env.CACHE_ENABLED === "true" || true,
        ttl: Number(process.env.CACHE_TTL) || 3600000, // 1 hour
        maxSize: Number(process.env.CACHE_MAX_SIZE) || 1000,
    },
    security: {
        rateLimit: {
            enabled: process.env.RATE_LIMIT_ENABLED === "true" || true,
            maxRequests: Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
            windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
        },
    },
    maxConcurrent: Number(process.env.MAX_CONCURRENT) || 5,
    maxRetries: Number(process.env.MAX_RETRIES) || 3,
    batchSize: Number(process.env.BATCH_SIZE) || 20,
    reservoirApiKey: process.env.RESERVOIR_API_KEY ?? "",
    openSeaApiKey: process.env.OPENSEA_API_KEY,
    twitterApiKey: process.env.TWITTER_API_KEY,
    cacheManager: undefined,
    rateLimiter: undefined,
};

// Collection response types
interface CollectionResponse {
    collections: Array<{
        name: string;
        id: string;
        floorPrice: number;
        volume24h: number;
        marketCap: number;
        holders: number;
    }>;
}

interface Collection {
    name: string;
    address: string;
    floorPrice: number;
    volume24h: number;
    marketCap: number;
    holders: number;
}

interface NFT {
    collectionAddress: string;
    tokenId: string;
    name?: string;
    image?: string;
}

interface FloorListing {
    price: number;
    tokenId: string;
    collectionAddress: string;
}

interface Listing {
    status: string;
    marketplaceUrl: string;
    transactionHash?: string;
}

// Extended ReservoirService class
class ExtendedReservoirService extends BaseReservoirService {
    private runtime: IAgentRuntime | undefined;

    constructor(config: ReservoirServiceConfig) {
        super(config);
    }

    setRuntime(runtime: IAgentRuntime) {
        this.runtime = runtime;
    }

    async getTopCollections(
        runtime: IAgentRuntime,
        limit: number = 10
    ): Promise<Collection[]> {
        const endpoint = `/collections/v6`;
        const params = {
            limit,
            sortBy: "1DayVolume",
            sortDirection: "desc",
        };

        const response = await this.makeRequest<CollectionResponse>(
            endpoint,
            params,
            0,
            runtime
        );
        return response.collections.map((collection) => ({
            name: collection.name,
            address: collection.id,
            floorPrice: collection.floorPrice,
            volume24h: collection.volume24h,
            marketCap: collection.marketCap,
            holders: collection.holders,
        }));
    }

    async getOwnedNFTs(userId: string): Promise<NFT[]> {
        if (!this.runtime) throw new Error("Runtime not set");
        const endpoint = `/users/${userId}/tokens/v7`;
        const response = await this.makeRequest<{ tokens: NFT[] }>(
            endpoint,
            {},
            0,
            this.runtime
        );
        return response.tokens;
    }

    async getLastSalePrice(params: {
        collectionAddress: string;
        tokenId: string;
    }): Promise<number | undefined> {
        if (!this.runtime) throw new Error("Runtime not set");
        const endpoint = `/sales/v4`;
        const queryParams = {
            collection: params.collectionAddress,
            tokenId: params.tokenId,
            limit: 1,
            sortBy: "timestamp",
            sortDirection: "desc",
        };

        const response = await this.makeRequest<{
            sales: Array<{ price: number }>;
        }>(endpoint, queryParams, 0, this.runtime);
        return response.sales[0]?.price;
    }

    async getFloorListings(params: {
        collection: string;
        limit: number;
        sortBy: string;
    }): Promise<FloorListing[]> {
        if (!this.runtime) throw new Error("Runtime not set");
        const endpoint = `/tokens/floor/v1`;
        const response = await this.makeRequest<{ tokens: FloorListing[] }>(
            endpoint,
            params,
            0,
            this.runtime
        );
        return response.tokens;
    }

    async createListing(params: {
        tokenId: string;
        collectionAddress: string;
        price: number;
        marketplace: string;
        expirationTime: number;
    }): Promise<Listing> {
        if (!this.runtime) throw new Error("Runtime not set");
        const endpoint = `/order/v3`;
        const response = await this.makeRequest<Listing>(
            endpoint,
            {
                ...params,
                side: "sell",
                orderKind: "seaport",
            },
            0,
            this.runtime
        );
        return response;
    }
}

export class NFTCollectionsPlugin {
    private marketIntelligence: MarketIntelligenceService | undefined;
    private socialAnalytics: SocialAnalyticsService | undefined;
    private reservoirService: ExtendedReservoirService | undefined;

    async initialize(runtime: IAgentRuntime): Promise<void> {
        try {
            // Initialize CacheManager and RateLimiter
            const cacheManager = defaultConfig.caching.enabled
                ? new MemoryCacheManager({
                      ttl: defaultConfig.caching.ttl,
                      maxSize: defaultConfig.caching.maxSize,
                  })
                : undefined;

            const rateLimiter = defaultConfig.security.rateLimit.enabled
                ? new RateLimiter({
                      maxRequests: defaultConfig.security.rateLimit.maxRequests,
                      windowMs: defaultConfig.security.rateLimit.windowMs,
                  })
                : undefined;

            // Initialize Reservoir service
            const reservoirConfig = {
                apiKey: defaultConfig.reservoirApiKey,
                ...(cacheManager && { cacheManager }),
                ...(rateLimiter && { rateLimiter }),
                maxConcurrent: defaultConfig.maxConcurrent ?? 5,
                maxRetries: defaultConfig.maxRetries ?? 3,
                batchSize: defaultConfig.batchSize ?? 20,
                baseUrl: "https://api.reservoir.tools",
                timeout: 30000,
                retryStrategy: {
                    maxRetries: 3,
                    baseDelay: 1000,
                    jitter: true,
                },
                cacheConfig: {
                    enabled: true,
                    defaultTTL: 300,
                },
                telemetry: {
                    enabled: true,
                    serviceName: "ikigai-nft-reservoir",
                },
            };

            this.reservoirService = new ExtendedReservoirService(
                reservoirConfig
            );
            this.reservoirService.setRuntime(runtime);

            // Initialize other services
            this.marketIntelligence = new MarketIntelligenceService({
                openSeaApiKey: defaultConfig.openSeaApiKey,
                reservoirApiKey: defaultConfig.reservoirApiKey,
                cacheManager,
                rateLimiter,
                maxRetries: defaultConfig.maxRetries,
                retryDelay: 1000,
                circuitBreakerOptions: {
                    failureThreshold: 5,
                    resetTimeout: 60000,
                },
            });

            this.socialAnalytics = new SocialAnalyticsService({
                twitterApiKey: defaultConfig.twitterApiKey,
                cacheManager,
                rateLimiter,
                maxRetries: defaultConfig.maxRetries,
                retryDelay: 1000,
                circuitBreakerOptions: {
                    failureThreshold: 5,
                    resetTimeout: 60000,
                },
            });

            // Initialize API keys with runtime context
            await this.marketIntelligence.initialize({
                openSeaApiKey:
                    runtime.getSetting("OPENSEA_API_KEY") ??
                    defaultConfig.openSeaApiKey,
                reservoirApiKey:
                    runtime.getSetting("RESERVOIR_API_KEY") ??
                    defaultConfig.reservoirApiKey,
            });

            await this.socialAnalytics.initialize({
                twitterApiKey:
                    runtime.getSetting("TWITTER_API_KEY") ??
                    defaultConfig.twitterApiKey,
            });
        } catch (error) {
            const errorMessage =
                error instanceof Error
                    ? error.message
                    : "Unknown error occurred";
            console.error(
                "Failed to initialize NFT Collections Plugin:",
                errorMessage
            );
            throw error;
        }
    }

    async cleanup(): Promise<void> {
        if (this.marketIntelligence) {
            // Cleanup market intelligence service
        }
        if (this.socialAnalytics) {
            // Cleanup social analytics service
        }
    }

    public async createPlugin(runtime: IAgentRuntime): Promise<Plugin> {
        // Validate environment variables
        try {
            validateEnvironmentVariables({
                TWITTER_API_KEY: process.env.TWITTER_API_KEY,
                OPENSEA_API_KEY: process.env.OPENSEA_API_KEY,
                RESERVOIR_API_KEY: process.env.RESERVOIR_API_KEY,
            });
        } catch (error) {
            const errorMessage =
                error instanceof Error
                    ? error.message
                    : "Unknown error occurred";
            console.error(
                "Environment Variable Validation Error:",
                errorMessage
            );
            throw new Error(`Validation failed: ${errorMessage}`);
        }

        // Initialize reusable CacheManager and RateLimiter
        const defaultCacheManager = new MemoryCacheManager({
            ttl: defaultConfig.caching?.ttl ?? 3600,
            maxSize: defaultConfig.caching?.maxSize ?? 1000,
        });

        const defaultRateLimiter = new RateLimiter({
            maxRequests: defaultConfig.security?.rateLimit?.maxRequests ?? 100,
            windowMs: defaultConfig.security?.rateLimit?.windowMs ?? 60000,
        });

        // Determine if services should be enabled based on config
        const cacheManager =
            (defaultConfig.caching?.enabled ?? true)
                ? defaultCacheManager
                : undefined;
        const rateLimiter =
            (defaultConfig.security?.rateLimit?.enabled ?? true)
                ? defaultRateLimiter
                : undefined;

        // Initialize services with proper config handling
        const reservoirConfig = {
            apiKey: defaultConfig.reservoirApiKey,
            ...(cacheManager && { cacheManager }),
            ...(rateLimiter && { rateLimiter }),
            maxConcurrent: defaultConfig.maxConcurrent ?? 5,
            maxRetries: defaultConfig.maxRetries ?? 3,
            batchSize: defaultConfig.batchSize ?? 20,
            baseUrl: "https://api.reservoir.tools",
            timeout: 30000,
            retryStrategy: {
                maxRetries: 3,
                baseDelay: 1000,
                jitter: true,
            },
            cacheConfig: {
                enabled: true,
                defaultTTL: 300,
            },
            telemetry: {
                enabled: true,
                serviceName: "ikigai-nft-reservoir",
            },
        };

        const reservoirService = new ExtendedReservoirService(reservoirConfig);
        reservoirService.setRuntime(runtime);

        const marketIntelligenceService = new MarketIntelligenceService({
            cacheManager,
            rateLimiter,
            openSeaApiKey: defaultConfig.openSeaApiKey,
            reservoirApiKey: defaultConfig.reservoirApiKey,
        });

        const socialAnalyticsService = new SocialAnalyticsService({
            cacheManager,
            rateLimiter,
            twitterApiKey: defaultConfig.twitterApiKey,
        });

        const nftCollectionProvider = createNftCollectionProvider(
            reservoirService,
            marketIntelligenceService,
            socialAnalyticsService
        );

        return {
            name: "nft-collections",
            description:
                "Provides NFT collection information and market intelligence",
            providers: [nftCollectionProvider],
            actions: [
                getCollectionsAction(nftCollectionProvider),
                getThinFloorNFTsAction(nftCollectionProvider, reservoirService),
                manageWatchlistAction(reservoirService),
                listNFTAction(reservoirService),
                sweepFloorArbitrageAction(
                    nftCollectionProvider,
                    reservoirService
                ),
            ],
            evaluators: [],
        };
    }
}

export default NFTCollectionsPlugin;
