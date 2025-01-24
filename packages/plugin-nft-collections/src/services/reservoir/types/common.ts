import { z } from "zod";
import { MemoryCacheManager } from "../../cache-manager";
import { RateLimiter } from "../../rate-limiter";

// Enhanced error codes specific to Reservoir service
export enum ReservoirErrorCode {
    RATE_LIMIT = "RESERVOIR_RATE_LIMIT",
    API_KEY_INVALID = "RESERVOIR_API_KEY_INVALID",
    INSUFFICIENT_FUNDS = "RESERVOIR_INSUFFICIENT_FUNDS",
    COLLECTION_NOT_FOUND = "RESERVOIR_COLLECTION_NOT_FOUND",
}

// Comprehensive configuration interface
export interface ReservoirServiceConfig {
    cacheManager?: MemoryCacheManager;
    rateLimiter?: RateLimiter;
    maxConcurrent?: number;
    maxRetries?: number;
    batchSize?: number;
    apiKey?: string;
    baseUrl?: string;
    timeout?: number;
    retryStrategy?: {
        maxRetries?: number;
        baseDelay?: number;
        jitter?: boolean;
    };
    cacheConfig?: {
        enabled?: boolean;
        defaultTTL?: number;
    };
    telemetry?: {
        enabled?: boolean;
        serviceName?: string;
    };
}

// Validation schema for configuration
export const ReservoirConfigSchema = z.object({
    apiKey: z.string().optional(),
    baseUrl: z.string().url().optional().default("https://api.reservoir.tools"),
    timeout: z.number().positive().optional().default(10000),
    maxRetries: z.number().min(0).optional().default(3),
});

// Common interfaces used across multiple services
export interface PaginationParams {
    limit?: number;
    offset?: number;
}

export interface ContinuationParams {
    limit?: number;
    continuation?: string;
}

export interface SortParams {
    sortBy?: string;
    sortDirection?: "asc" | "desc";
}

export interface Currency {
    contract: string;
    name: string;
    symbol: string;
    decimals: number;
}

export interface Amount {
    raw: string;
    decimal: number;
    usd: number;
    native: number;
}

export interface Price {
    currency: Currency;
    amount: Amount;
}

export interface Source {
    id: string;
    name: string;
    icon: string;
    url: string;
    domain: string;
}

export interface Royalty {
    bps: number;
    recipient: string;
}

export interface Collection {
    id: string;
    name: string;
    image?: string;
    slug?: string;
    description?: string;
    royalties?: Array<{
        bps: number;
        recipient: string;
    }>;
    floorAsk?: {
        id: string;
        price: number;
        maker: string;
        validFrom: number;
        validUntil: number;
    };
    topBid?: {
        id: string;
        price: number;
        maker: string;
        validFrom: number;
        validUntil: number;
    };
}

export interface Token {
    contract: string;
    tokenId: string;
    name?: string;
    image?: string;
}

export type ActivityType =
    | "sale"
    | "ask"
    | "transfer"
    | "mint"
    | "bid"
    | "bid_cancel"
    | "ask_cancel"
    | "burn"
    | "cancel"
    | "bulkCancel";

export interface PaginationResponse<T> {
    continuation?: string;
    data: T[];
}
