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
export interface NFTCollectionsConfig extends BaseConfig {
    reservoirApiKey: string;
    openSeaApiKey?: string | undefined;
    twitterApiKey?: string | undefined;
    cacheManager?: any;
    rateLimiter?: any;
}

// Default configuration
export const defaultConfig: NFTCollectionsConfig = {
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
