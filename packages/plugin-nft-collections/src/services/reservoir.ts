import pRetry from "p-retry";
import { PerformanceMonitor } from "../utils/performance";
import {
    ErrorHandler,
    NFTErrorFactory,
    ErrorType,
    ErrorCode,
    NFTError,
} from "../utils/error-handler";
import { MemoryCacheManager } from "./cache-manager";
import { RateLimiter } from "./rate-limiter";
import { MarketStats, NFTCollection } from "../types";
import { IAgentRuntime } from "@elizaos/core";
import { z } from "zod";

// Enhanced error codes specific to Reservoir service
export enum ReservoirErrorCode {
    RATE_LIMIT = "RESERVOIR_RATE_LIMIT",
    API_KEY_INVALID = "RESERVOIR_API_KEY_INVALID",
    INSUFFICIENT_FUNDS = "RESERVOIR_INSUFFICIENT_FUNDS",
    COLLECTION_NOT_FOUND = "RESERVOIR_COLLECTION_NOT_FOUND",
}

// Comprehensive configuration interface
interface ReservoirServiceConfig {
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

// Explore attributes interfaces
interface ExploreAttributesParams {
    collection: string;
    attribute?: string;
    sortBy?: "tokenCount" | "floorAskPrice" | "topBidPrice";
    sortDirection?: "asc" | "desc";
    offset?: number;
    limit?: number;
    includeTopBid?: boolean;
    includeSalesCount?: boolean;
    includeLastSale?: boolean;
}

interface AttributeData {
    key: string;
    value: string;
    tokenCount: number;
    onSaleCount: number;
    sampleImages: string[];
    floorAskPrices?: {
        currency: {
            contract: string;
            name: string;
            symbol: string;
            decimals: number;
        };
        amount: {
            raw: string;
            decimal: number;
            usd: number;
            native: number;
        };
    }[];
    topBidPrices?: {
        currency: {
            contract: string;
            name: string;
            symbol: string;
            decimals: number;
        };
        amount: {
            raw: string;
            decimal: number;
            usd: number;
            native: number;
        };
    }[];
    lastSale?: {
        timestamp: number;
        price: {
            currency: {
                contract: string;
                name: string;
                symbol: string;
                decimals: number;
            };
            amount: {
                raw: string;
                decimal: number;
                usd: number;
                native: number;
            };
        };
    };
    salesCount?: {
        "1day": number;
        "7day": number;
        "30day": number;
        allTime: number;
    };
}

// Validation schema for configuration
const ReservoirConfigSchema = z.object({
    apiKey: z.string().optional(),
    baseUrl: z.string().url().optional().default("https://api.reservoir.tools"),
    timeout: z.number().positive().optional().default(10000),
    maxRetries: z.number().min(0).optional().default(3),
});

// Token-related interfaces
interface TokenBootstrapParams {
    collection?: string;
    tokens?: string[];
    includeAttributes?: boolean;
    includeTopBid?: boolean;
    includeDynamicPricing?: boolean;
    includeLastSale?: boolean;
    includeRawData?: boolean;
}

interface TokenAttribute {
    key: string;
    value: string;
    tokenCount?: number;
    onSaleCount?: number;
    floorAskPrice?: number;
    topBidValue?: number;
}

interface TokenData {
    token: {
        contract: string;
        tokenId: string;
        name?: string;
        description?: string;
        image?: string;
        media?: string;
        kind?: string;
        isFlagged?: boolean;
        lastFlagUpdate?: string;
        rarity?: number;
        rarityRank?: number;
        collection?: {
            id: string;
            name: string;
            image?: string;
            slug?: string;
        };
        attributes?: TokenAttribute[];
        lastSale?: {
            price: number;
            timestamp: string;
        };
        owner?: string;
        lastAppraisalValue?: number;
    };
    market?: {
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
    };
}

interface TokenFloorParams {
    tokens?: string[];
    collection?: string;
    normalizeRoyalties?: boolean;
    includeDynamicPricing?: boolean;
    currencies?: string[];
}

interface TokenFloorData {
    id: string;
    collection: {
        id: string;
        name: string;
    };
    contract: string;
    tokenId: string;
    floorAsk: {
        id: string;
        price: {
            currency: {
                contract: string;
                name: string;
                symbol: string;
                decimals: number;
            };
            amount: {
                raw: string;
                decimal: number;
                usd: number;
                native: number;
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
    };
}

interface TokenAsksParams {
    token: string;
    sortBy?: "price" | "createdAt";
    sortDirection?: "asc" | "desc";
    normalizeRoyalties?: boolean;
    includeCriteriaMetadata?: boolean;
    includeRawData?: boolean;
    includeDynamicPricing?: boolean;
    currencies?: string[];
}

interface TokenAskData {
    id: string;
    price: {
        currency: {
            contract: string;
            name: string;
            symbol: string;
            decimals: number;
        };
        amount: {
            raw: string;
            decimal: number;
            usd: number;
            native: number;
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
    criteria?: {
        kind: string;
        data: {
            token: {
                tokenId: string;
                name?: string;
                image?: string;
            };
            collection: {
                id: string;
                name: string;
                image?: string;
            };
        };
    };
    dynamicPricing?: {
        kind: string;
        data: Record<string, any>;
    };
}

interface TokenBidsParams {
    token: string;
    sortBy?: "price" | "createdAt";
    sortDirection?: "asc" | "desc";
    normalizeRoyalties?: boolean;
    includeCriteriaMetadata?: boolean;
    includeRawData?: boolean;
    includeDynamicPricing?: boolean;
    currencies?: string[];
}

interface TokenBidData {
    id: string;
    price: {
        currency: {
            contract: string;
            name: string;
            symbol: string;
            decimals: number;
        };
        amount: {
            raw: string;
            decimal: number;
            usd: number;
            native: number;
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
    criteria?: {
        kind: string;
        data: {
            token: {
                tokenId: string;
                name?: string;
                image?: string;
            };
            collection: {
                id: string;
                name: string;
                image?: string;
            };
        };
    };
    dynamicPricing?: {
        kind: string;
        data: Record<string, any>;
    };
}

// Collection search interfaces
interface CollectionSearchParams {
    name?: string;
    community?: string;
    chain?: string;
    includeMetadata?: boolean;
    includeTopBid?: boolean;
    includeAttributes?: boolean;
    includeOwnerCount?: boolean;
    includeMintStages?: boolean;
    includeMarketplaces?: boolean;
    limit?: number;
    offset?: number;
}

interface CollectionSearchData {
    collection: {
        id: string;
        name: string;
        slug: string;
        symbol?: string;
        description?: string;
        image?: string;
        banner?: string;
        discordUrl?: string;
        externalUrl?: string;
        twitterUsername?: string;
        openseaVerificationStatus?: string;
        tokenCount?: number;
        ownerCount?: number;
        primaryContract: string;
        tokenSetId?: string;
        contractKind?: string;
        rank?: {
            "1day": number;
            "7day": number;
            "30day": number;
            allTime: number;
        };
        volume?: {
            "1day": number;
            "7day": number;
            "30day": number;
            allTime: number;
        };
        volumeChange?: {
            "1day": number;
            "7day": number;
            "30day": number;
        };
        floorAsk?: {
            id: string;
            price: {
                currency: {
                    contract: string;
                    name: string;
                    symbol: string;
                    decimals: number;
                };
                amount: {
                    raw: string;
                    decimal: number;
                    usd: number;
                    native: number;
                };
            };
            maker: string;
            validFrom: number;
            validUntil: number;
        };
        topBid?: {
            id: string;
            price: {
                currency: {
                    contract: string;
                    name: string;
                    symbol: string;
                    decimals: number;
                };
                amount: {
                    raw: string;
                    decimal: number;
                    usd: number;
                    native: number;
                };
            };
            maker: string;
            validFrom: number;
            validUntil: number;
        };
        attributes?: Array<{
            key: string;
            kind: string;
            count: number;
        }>;
        mintStages?: Array<{
            stage: string;
            tokenId?: string;
            kind: string;
            status: string;
            price?: number;
            maxMintsPerWallet?: number;
            startTime: string;
            endTime: string;
            allowlist?: {
                merkleRoot: string;
                proof?: string[];
            };
        }>;
        marketplaces?: Array<{
            name: string;
            url: string;
            icon: string;
        }>;
        chain: string;
    };
}

// Trending collections interfaces
interface TrendingCollectionsParams {
    period?: "1h" | "6h" | "24h" | "7d" | "30d";
    sortBy?: "volume" | "sales" | "floorAskPrice" | "floorSaleChange";
    limit?: number;
    offset?: number;
    chain?: string;
    includeMetadata?: boolean;
    includeTopBid?: boolean;
    includeAttributes?: boolean;
    includeOwnerCount?: boolean;
    includeMintStages?: boolean;
    includeMarketplaces?: boolean;
}

interface TrendingCollectionData extends CollectionSearchData {
    collection: CollectionSearchData["collection"] & {
        volumeChange?: {
            "1h"?: number;
            "6h"?: number;
            "24h"?: number;
            "7d"?: number;
            "30d"?: number;
        };
        floorSaleChange?: {
            "1h"?: number;
            "6h"?: number;
            "24h"?: number;
            "7d"?: number;
            "30d"?: number;
        };
        salesCount?: {
            "1h"?: number;
            "6h"?: number;
            "24h"?: number;
            "7d"?: number;
            "30d"?: number;
            allTime?: number;
        };
    };
}

// Trending mints interfaces
interface TrendingMintsParams {
    period?: "1h" | "6h" | "24h" | "7d" | "30d";
    limit?: number;
    offset?: number;
    chain?: string;
    includeMetadata?: boolean;
    includeAttributes?: boolean;
    includeOwnerCount?: boolean;
    includeMintStages?: boolean;
    includeMarketplaces?: boolean;
}

interface TrendingMintData extends CollectionSearchData {
    collection: CollectionSearchData["collection"] & {
        mintStats?: {
            "1h"?: {
                count: number;
                value: number;
            };
            "6h"?: {
                count: number;
                value: number;
            };
            "24h"?: {
                count: number;
                value: number;
            };
            "7d"?: {
                count: number;
                value: number;
            };
            "30d"?: {
                count: number;
                value: number;
            };
        };
        mintPrice?: {
            amount: {
                raw: string;
                decimal: number;
                usd: number;
                native: number;
            };
            currency: {
                contract: string;
                name: string;
                symbol: string;
                decimals: number;
            };
        };
    };
}

// Collection bids interfaces
interface CollectionBidsParams {
    collection: string;
    sortBy?: "price" | "createdAt";
    sortDirection?: "asc" | "desc";
    normalizeRoyalties?: boolean;
    includeCriteriaMetadata?: boolean;
    includeRawData?: boolean;
    includeDynamicPricing?: boolean;
    startTimestamp?: number;
    endTimestamp?: number;
    currencies?: string[];
    limit?: number;
    offset?: number;
}

interface CollectionBidData extends TokenBidData {
    criteria?: TokenBidData["criteria"] & {
        data: {
            collection: {
                id: string;
                name: string;
                image?: string;
                slug?: string;
                royalties?: {
                    bps: number;
                    recipient: string;
                };
            };
            attributes?: Array<{
                key: string;
                value: string;
            }>;
        };
    };
}

// Top traders interfaces
interface TopTradersParams {
    collection: string;
    period?: "1h" | "6h" | "24h" | "7d" | "30d";
    sortBy?: "purchases" | "sales" | "profit" | "volume";
    limit?: number;
    offset?: number;
    includeMetadata?: boolean;
    excludeZeroVolume?: boolean;
}

interface TopTraderData {
    user: {
        address: string;
        name?: string;
        avatar?: string;
    };
    stats: {
        purchases: {
            count: number;
            volume: number;
        };
        sales: {
            count: number;
            volume: number;
        };
        profit: number;
        totalVolume: number;
        rank?: number;
    };
    period: string;
}

// User activity interfaces
interface UserActivityParams {
    users: string[];
    collection?: string;
    community?: string;
    limit?: number;
    continuation?: string;
    types?: Array<
        | "sale"
        | "ask"
        | "transfer"
        | "mint"
        | "bid"
        | "bid_cancel"
        | "ask_cancel"
    >;
    includeMetadata?: boolean;
    includeTokenMetadata?: boolean;
    sortBy?: "timestamp";
    sortDirection?: "asc" | "desc";
}

interface UserActivityData {
    id: string;
    type:
        | "sale"
        | "ask"
        | "transfer"
        | "mint"
        | "bid"
        | "bid_cancel"
        | "ask_cancel";
    fromAddress: string;
    toAddress?: string;
    price?: {
        currency: {
            contract: string;
            name: string;
            symbol: string;
            decimals: number;
        };
        amount: {
            raw: string;
            decimal: number;
            usd: number;
            native: number;
        };
    };
    amount?: number;
    timestamp: number;
    token: {
        contract: string;
        tokenId: string;
        name?: string;
        image?: string;
        collection: {
            id: string;
            name: string;
            image?: string;
            slug?: string;
        };
    };
    collection?: {
        id: string;
        name: string;
        image?: string;
        slug?: string;
    };
    order?: {
        id: string;
        side: "ask" | "bid";
        source?: {
            domain: string;
            name: string;
            icon: string;
        };
    };
    metadata?: Record<string, any>;
}

// Token activity interfaces
interface TokenActivityParams {
    token: string;
    limit?: number;
    continuation?: string;
    types?: Array<
        | "sale"
        | "ask"
        | "transfer"
        | "mint"
        | "bid"
        | "bid_cancel"
        | "ask_cancel"
    >;
    includeMetadata?: boolean;
    sortBy?: "timestamp";
    sortDirection?: "asc" | "desc";
}

interface TokenActivityData {
    id: string;
    type:
        | "sale"
        | "ask"
        | "transfer"
        | "mint"
        | "bid"
        | "bid_cancel"
        | "ask_cancel";
    fromAddress: string;
    toAddress?: string;
    price?: {
        currency: {
            contract: string;
            name: string;
            symbol: string;
            decimals: number;
        };
        amount: {
            raw: string;
            decimal: number;
            usd: number;
            native: number;
        };
    };
    amount?: number;
    timestamp: number;
    token: {
        contract: string;
        tokenId: string;
        name?: string;
        image?: string;
        collection: {
            id: string;
            name: string;
            image?: string;
            slug?: string;
        };
    };
    order?: {
        id: string;
        side: "ask" | "bid";
        source?: {
            domain: string;
            name: string;
            icon: string;
        };
    };
    metadata?: Record<string, any>;
}

// Collection activity interfaces
interface CollectionActivityParams {
    collection: string;
    limit?: number;
    continuation?: string;
    types?: Array<
        | "sale"
        | "ask"
        | "transfer"
        | "mint"
        | "bid"
        | "bid_cancel"
        | "ask_cancel"
    >;
    includeMetadata?: boolean;
    includeTokenMetadata?: boolean;
    sortBy?: "timestamp";
    sortDirection?: "asc" | "desc";
}

interface CollectionActivityData {
    id: string;
    type:
        | "sale"
        | "ask"
        | "transfer"
        | "mint"
        | "bid"
        | "bid_cancel"
        | "ask_cancel";
    fromAddress: string;
    toAddress?: string;
    price?: {
        currency: {
            contract: string;
            name: string;
            symbol: string;
            decimals: number;
        };
        amount: {
            raw: string;
            decimal: number;
            usd: number;
            native: number;
        };
    };
    amount?: number;
    timestamp: number;
    token: {
        contract: string;
        tokenId: string;
        name?: string;
        image?: string;
        collection: {
            id: string;
            name: string;
            image?: string;
            slug?: string;
        };
    };
    order?: {
        id: string;
        side: "ask" | "bid";
        source?: {
            domain: string;
            name: string;
            icon: string;
        };
    };
    metadata?: Record<string, any>;
}

// User tokens interfaces
interface UserTokensParams {
    user: string;
    collection?: string;
    community?: string;
    limit?: number;
    continuation?: string;
    includeTopBid?: boolean;
    includeAttributes?: boolean;
    includeLastSale?: boolean;
    includeRawData?: boolean;
    sortBy?: "acquiredAt" | "lastAppraisalValue" | "tokenId";
    sortDirection?: "asc" | "desc";
}

// User asks interfaces
interface UserAsksParams {
    user: string;
    collection?: string;
    community?: string;
    limit?: number;
    continuation?: string;
    includeMetadata?: boolean;
    includeRawData?: boolean;
    includeDynamicPricing?: boolean;
    normalizeRoyalties?: boolean;
    sortBy?: "price" | "createdAt";
    sortDirection?: "asc" | "desc";
}

interface UserAsksData {
    asks: Array<{
        id: string;
        kind: string;
        side: "sell";
        status: "active" | "inactive" | "expired" | "cancelled" | "filled";
        tokenSetId: string;
        tokenSetSchemaHash: string;
        contract: string;
        maker: string;
        taker?: string;
        price: {
            currency: {
                contract: string;
                name: string;
                symbol: string;
                decimals: number;
            };
            amount: {
                raw: string;
                decimal: number;
                usd: number;
                native: number;
            };
            netAmount: {
                raw: string;
                decimal: number;
                usd: number;
                native: number;
            };
        };
        validFrom: number;
        validUntil: number;
        quantityFilled: number;
        quantityRemaining: number;
        criteria?: {
            kind: string;
            data: {
                token: {
                    tokenId: string;
                    name?: string;
                    image?: string;
                };
                collection: {
                    id: string;
                    name: string;
                    image?: string;
                    slug?: string;
                    royalties?: Array<{
                        bps: number;
                        recipient: string;
                    }>;
                };
            };
        };
        source?: {
            id: string;
            name: string;
            icon: string;
            url: string;
            domain: string;
        };
        feeBps?: number;
        feeBreakdown?: Array<{
            bps: number;
            kind: string;
            recipient: string;
        }>;
        expiration: number;
        isReservoir?: boolean;
        createdAt: string;
        updatedAt: string;
        rawData?: Record<string, any>;
    }>;
    continuation?: string;
}

interface UserTokensData {
    tokens: Array<{
        token: {
            contract: string;
            tokenId: string;
            name?: string;
            description?: string;
            image?: string;
            media?: string;
            kind?: string;
            isFlagged?: boolean;
            lastFlagUpdate?: string;
            rarity?: number;
            rarityRank?: number;
            collection?: {
                id: string;
                name: string;
                image?: string;
                slug?: string;
            };
            attributes?: Array<{
                key: string;
                value: string;
                tokenCount?: number;
                onSaleCount?: number;
                floorAskPrice?: number;
                topBidValue?: number;
            }>;
            lastSale?: {
                price: number;
                timestamp: string;
            };
        };
        ownership: {
            tokenCount: number;
            onSaleCount: number;
            floorAsk?: {
                id: string;
                price: number;
                maker: string;
                validFrom: number;
                validUntil: number;
                source?: {
                    id: string;
                    name: string;
                    icon: string;
                    url: string;
                };
            };
            acquiredAt?: string;
        };
        market?: {
            floorAsk?: {
                id: string;
                price: {
                    currency: {
                        contract: string;
                        name: string;
                        symbol: string;
                        decimals: number;
                    };
                    amount: {
                        raw: string;
                        decimal: number;
                        usd: number;
                        native: number;
                    };
                };
                maker: string;
                validFrom: number;
                validUntil: number;
                source?: {
                    id: string;
                    name: string;
                    icon: string;
                    url: string;
                };
            };
            topBid?: {
                id: string;
                price: {
                    currency: {
                        contract: string;
                        name: string;
                        symbol: string;
                        decimals: number;
                    };
                    amount: {
                        raw: string;
                        decimal: number;
                        usd: number;
                        native: number;
                    };
                };
                maker: string;
                validFrom: number;
                validUntil: number;
            };
        };
    }>;
    continuation?: string;
}

// User collections interfaces
interface UserCollectionsParams {
    user: string;
    community?: string;
    includeTopBid?: boolean;
    includeLiquidCount?: boolean;
    includeAttributes?: boolean;
    includeLastSale?: boolean;
    includeOwnerCount?: boolean;
    includeFlaggedTokens?: boolean;
    sortBy?:
        | "totalValue"
        | "floorAskPrice"
        | "tokenCount"
        | "lastBuy"
        | "lastSell";
    sortDirection?: "asc" | "desc";
    offset?: number;
    limit?: number;
}

interface UserCollectionsData {
    collections: Array<{
        collection: {
            id: string;
            name: string;
            image?: string;
            banner?: string;
            description?: string;
            slug?: string;
            creator?: string;
            tokenCount?: number;
            ownerCount?: number;
            floorAsk?: {
                id: string;
                price: {
                    currency: {
                        contract: string;
                        name: string;
                        symbol: string;
                        decimals: number;
                    };
                    amount: {
                        raw: string;
                        decimal: number;
                        usd: number;
                        native: number;
                    };
                };
            };
            topBid?: {
                id: string;
                price: {
                    currency: {
                        contract: string;
                        name: string;
                        symbol: string;
                        decimals: number;
                    };
                    amount: {
                        raw: string;
                        decimal: number;
                        usd: number;
                        native: number;
                    };
                };
            };
        };
        ownership: {
            tokenCount: number;
            onSaleCount: number;
            liquidCount?: number;
            totalValue?: number;
        };
        lastBuy?: {
            value: number;
            timestamp: number;
        };
        lastSell?: {
            value: number;
            timestamp: number;
        };
        acquiredAt?: string;
        flaggedTokens?: number;
    }>;
    continuation?: string;
}

// User bids interfaces
interface UserBidsParams {
    user: string;
    collection?: string;
    community?: string;
    limit?: number;
    continuation?: string;
    includeMetadata?: boolean;
    includeRawData?: boolean;
    includeDynamicPricing?: boolean;
    normalizeRoyalties?: boolean;
    sortBy?: "price" | "createdAt";
    sortDirection?: "asc" | "desc";
}

interface UserBidsData {
    bids: Array<{
        id: string;
        kind: string;
        side: "buy";
        status: "active" | "inactive" | "expired" | "cancelled" | "filled";
        tokenSetId: string;
        tokenSetSchemaHash: string;
        contract: string;
        maker: string;
        taker?: string;
        price: {
            currency: {
                contract: string;
                name: string;
                symbol: string;
                decimals: number;
            };
            amount: {
                raw: string;
                decimal: number;
                usd: number;
                native: number;
            };
            netAmount: {
                raw: string;
                decimal: number;
                usd: number;
                native: number;
            };
        };
        validFrom: number;
        validUntil: number;
        quantityFilled: number;
        quantityRemaining: number;
        criteria?: {
            kind: string;
            data: {
                token?: {
                    tokenId: string;
                    name?: string;
                    image?: string;
                };
                collection?: {
                    id: string;
                    name: string;
                    image?: string;
                    slug?: string;
                    royalties?: Array<{
                        bps: number;
                        recipient: string;
                    }>;
                };
            };
        };
        source?: {
            id: string;
            name: string;
            icon: string;
            url: string;
            domain: string;
        };
        feeBps?: number;
        feeBreakdown?: Array<{
            bps: number;
            kind: string;
            recipient: string;
        }>;
        expiration: number;
        isReservoir?: boolean;
        createdAt: string;
        updatedAt: string;
        rawData?: Record<string, any>;
    }>;
    continuation?: string;
}

// User top bids interfaces
interface UserTopBidsParams {
    user: string;
    excludeEOA?: boolean;
    normalizeRoyalties?: boolean;
    includeCriteriaMetadata?: boolean;
    includeRawData?: boolean;
    includeDynamicPricing?: boolean;
    sortBy?: "price" | "createdAt";
    sortDirection?: "asc" | "desc";
    limit?: number;
    continuation?: string;
}

interface UserTopBidsData {
    topBids: Array<{
        id: string;
        kind: string;
        side: "buy";
        status: "active" | "inactive" | "expired" | "cancelled" | "filled";
        tokenSetId: string;
        tokenSetSchemaHash: string;
        contract: string;
        maker: string;
        taker?: string;
        price: {
            currency: {
                contract: string;
                name: string;
                symbol: string;
                decimals: number;
            };
            amount: {
                raw: string;
                decimal: number;
                usd: number;
                native: number;
            };
            netAmount: {
                raw: string;
                decimal: number;
                usd: number;
                native: number;
            };
        };
        validFrom: number;
        validUntil: number;
        quantityFilled: number;
        quantityRemaining: number;
        criteria?: {
            kind: string;
            data: {
                token?: {
                    tokenId: string;
                    name?: string;
                    image?: string;
                };
                collection?: {
                    id: string;
                    name: string;
                    image?: string;
                    slug?: string;
                    royalties?: Array<{
                        bps: number;
                        recipient: string;
                    }>;
                };
            };
        };
        source?: {
            id: string;
            name: string;
            icon: string;
            url: string;
            domain: string;
        };
        feeBps?: number;
        feeBreakdown?: Array<{
            bps: number;
            kind: string;
            recipient: string;
        }>;
        expiration: number;
        isReservoir?: boolean;
        createdAt: string;
        updatedAt: string;
        rawData?: Record<string, any>;
    }>;
    continuation?: string;
}

export class ReservoirService {
    private cacheManager?: MemoryCacheManager;
    private rateLimiter?: RateLimiter;
    private maxRetries: number;
    private batchSize: number;
    private performanceMonitor: PerformanceMonitor;
    private errorHandler: ErrorHandler;
    private config: Required<ReservoirServiceConfig>;

    constructor(config: ReservoirServiceConfig = {}) {
        // Validate and merge configuration
        const validatedConfig = ReservoirConfigSchema.parse(config);

        this.config = {
            cacheManager: config.cacheManager,
            rateLimiter: config.rateLimiter,
            maxConcurrent: config.maxConcurrent || 5,
            maxRetries: validatedConfig.maxRetries,
            batchSize: config.batchSize || 20,
            apiKey: validatedConfig.apiKey || process.env.RESERVOIR_API_KEY,
            baseUrl: validatedConfig.baseUrl,
            timeout: validatedConfig.timeout,
            retryStrategy: {
                maxRetries: 3,
                baseDelay: 1000,
                jitter: true,
                ...config.retryStrategy,
            },
            cacheConfig: {
                enabled: true,
                defaultTTL: 300,
                ...config.cacheConfig,
            },
            telemetry: {
                enabled: true,
                serviceName: "ikigai-nft-reservoir",
                ...config.telemetry,
            },
        };

        this.cacheManager = this.config.cacheManager;
        this.rateLimiter = this.config.rateLimiter;
        this.maxRetries = this.config.maxRetries;
        this.batchSize = this.config.batchSize;
        this.performanceMonitor = PerformanceMonitor.getInstance();
        this.errorHandler = ErrorHandler.getInstance();

        // Setup telemetry and monitoring
        this.setupTelemetry();
    }

    // Advanced caching with context-aware invalidation
    private async cachedRequest<T>(
        endpoint: string,
        params: Record<string, any>,
        runtime: IAgentRuntime,
        cacheOptions?: {
            ttl?: number;
            context?: string;
        }
    ): Promise<T> {
        if (!this.config.cacheConfig.enabled) {
            return this.makeRequest<T>(endpoint, params, 0, runtime);
        }

        const cacheKey = this.generateCacheKey(endpoint, params);

        const cachedResponse = await this.cacheManager?.get<T>(cacheKey);
        if (cachedResponse) {
            if (this.isCacheFresh(cachedResponse, cacheOptions?.ttl)) {
                return cachedResponse;
            }
        }

        const freshData = await this.makeRequest<T>(
            endpoint,
            params,
            0,
            runtime
        );

        // Only pass ttl to set method
        await this.cacheManager?.set(
            cacheKey,
            freshData,
            cacheOptions?.ttl ?? this.config.cacheConfig.defaultTTL
        );

        return freshData;
    }

    // Generate deterministic cache key
    private generateCacheKey(
        endpoint: string,
        params: Record<string, any>
    ): string {
        const sortedParams = Object.keys(params)
            .sort()
            .map((key) => `${key}:${params[key]}`)
            .join("|");
        return `reservoir:${endpoint}:${sortedParams}`;
    }

    // Check cache freshness
    private isCacheFresh(cachedResponse: any, ttl?: number): boolean {
        const MAX_CACHE_AGE = ttl || this.config.cacheConfig.defaultTTL * 1000;
        return Date.now() - cachedResponse.timestamp < MAX_CACHE_AGE;
    }

    // Enhanced error handling method
    private handleReservoirError(
        error: Error,
        context: Record<string, any>
    ): NFTError {
        if (error.message.includes("rate limit")) {
            return NFTErrorFactory.create(
                ErrorType.RATE_LIMIT,
                ErrorCode.RATE_LIMIT_EXCEEDED,
                "Reservoir API rate limit exceeded",
                {
                    details: {
                        ...context,
                        retryAfter: this.extractRetryAfter(error),
                    },
                    retryable: true,
                    severity: "HIGH",
                }
            );
        }

        if (error.message.includes("API key")) {
            return NFTErrorFactory.create(
                ErrorType.AUTHENTICATION,
                ErrorCode.API_KEY_INVALID,
                "Invalid Reservoir API key",
                {
                    details: context,
                    retryable: false,
                    severity: "CRITICAL",
                }
            );
        }

        // Fallback to generic error handling
        return NFTErrorFactory.fromError(error);
    }

    // Extract retry-after timestamp
    private extractRetryAfter(error: Error): number {
        // In a real implementation, extract from headers or use exponential backoff
        return Date.now() + 60000; // Default 1 minute
    }

    // Intelligent retry mechanism
    private async retryRequest<T>(
        requestFn: () => Promise<T>,
        options: {
            maxRetries?: number;
            baseDelay?: number;
            jitter?: boolean;
        } = {}
    ): Promise<T> {
        const {
            maxRetries = this.config.retryStrategy.maxRetries,
            baseDelay = this.config.retryStrategy.baseDelay,
            jitter = this.config.retryStrategy.jitter,
        } = options;

        let lastError: Error | null = null;

        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                return await requestFn();
            } catch (error) {
                lastError = error;

                // Exponential backoff with optional jitter
                const delay = jitter
                    ? baseDelay * Math.pow(2, attempt) * (1 + Math.random())
                    : baseDelay * Math.pow(2, attempt);

                // Log retry attempt
                this.performanceMonitor.recordMetric({
                    operation: "retryRequest",
                    duration: delay,
                    success: false,
                    metadata: {
                        attempt,
                        error: error.message,
                    },
                });

                // Optional: Circuit breaker for critical errors
                if (this.isCircuitBreakerTripped(error)) {
                    break;
                }

                await new Promise((resolve) => setTimeout(resolve, delay));
            }
        }

        // Final error handling
        throw lastError || new Error("Max retries exceeded");
    }

    // Circuit breaker logic
    private isCircuitBreakerTripped(error: Error): boolean {
        const criticalErrors = ["API_KEY_INVALID", "UNAUTHORIZED", "FORBIDDEN"];
        return criticalErrors.some((code) => error.message.includes(code));
    }

    // Telemetry and monitoring setup
    private setupTelemetry() {
        if (!this.config.telemetry.enabled) return;

        // Track API usage metrics
        const usageTracker = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            endpoints: {} as Record<string, number>,
        };

        // Performance monitoring hook
        this.performanceMonitor.on("alert", (alert) => {
            console.log(`Reservoir Service Alert: ${JSON.stringify(alert)}`);
            // In a real implementation, send to monitoring service
        });
    }

    // Existing makeRequest method with enhanced error handling
    async makeRequest<T>(
        endpoint: string,
        params: Record<string, any> = {},
        priority: number = 0,
        runtime: IAgentRuntime
    ): Promise<T> {
        const endOperation = this.performanceMonitor.startOperation(
            "makeRequest",
            { endpoint, params, priority }
        );

        try {
            // Check rate limit
            if (this.rateLimiter) {
                await this.rateLimiter.consume("reservoir", 1);
            }

            const reservoirApiKey =
                runtime.getSetting("RESERVOIR_API_KEY") || this.config.apiKey;

            // Make the request with retries
            const result = await this.retryRequest(async () => {
                const response = await fetch(
                    `${this.config.baseUrl}${endpoint}?${new URLSearchParams(params).toString()}`,
                    {
                        headers: {
                            "x-api-key": reservoirApiKey,
                            "Content-Type": "application/json",
                        },
                        signal: AbortSignal.timeout(this.config.timeout),
                    }
                );

                if (!response.ok) {
                    throw new Error(
                        `Reservoir API error: ${response.status} ${await response.text()}`
                    );
                }

                return response.json();
            });

            endOperation();
            return result;
        } catch (error) {
            this.performanceMonitor.recordMetric({
                operation: "makeRequest",
                duration: 0,
                success: false,
                metadata: {
                    error: error.message,
                    endpoint,
                    params,
                },
            });

            const nftError = this.handleReservoirError(error, {
                endpoint,
                params,
            });
            this.errorHandler.handleError(nftError);
            throw error;
        }
    }

    // Modify getTopCollections to use the updated cachedRequest
    async getTopCollections(
        runtime: IAgentRuntime,
        limit: number = 10
    ): Promise<NFTCollection[]> {
        const endOperation = this.performanceMonitor.startOperation(
            "getTopCollections",
            { limit }
        );

        try {
            const batchSize = 20;
            const batches = Math.ceil(limit / batchSize);
            const promises = [];

            for (let i = 0; i < batches; i++) {
                const offset = i * batchSize;
                const currentLimit = Math.min(batchSize, limit - offset);

                promises.push(
                    this.cachedRequest<any>(
                        "/collections/v7",
                        {
                            limit: currentLimit,
                            offset,
                            sortBy: "1DayVolume",
                            includeTopBid: "true",
                            normalizeRoyalties: "true",
                            includeSalesCount: "true",
                            includeAttributes: "true",
                            includeLastSale: "true",
                            includeOwnerCount: "true",
                            includeMarketplaces: "true",
                            includeDynamicPricing: "true",
                            includeRoyalties: "true",
                            includeCollectionMetadata: "true",
                        },
                        runtime,
                        {
                            ttl: 300,
                            context: "top_collections",
                        }
                    )
                );
            }

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
                        marketplaces: collection.marketplaces?.map((m) => ({
                            name: m.name,
                            url: m.url,
                            icon: m.icon,
                        })),
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

    // Add missing methods
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

    async createListing(options: {
        tokenId: string;
        collectionAddress: string;
        price: number;
        expirationTime?: number;
        marketplace: "ikigailabs";
        currency?: string;
        quantity?: number;
    }): Promise<{
        listingId: string;
        status: string;
        transactionHash?: string;
        marketplaceUrl: string;
    }> {
        const endOperation = this.performanceMonitor.startOperation(
            "createListing",
            { options }
        );

        try {
            if (
                !options.tokenId ||
                !options.collectionAddress ||
                !options.price
            ) {
                throw new Error("Missing required listing parameters");
            }

            const listingParams = {
                maker: "",
                token: `${options.collectionAddress}:${options.tokenId}`,
                quantity: (options.quantity || 1).toString(),
                price: options.price.toString(),
                currency: options.currency || "ETH",
                expirationTime: (
                    options.expirationTime ||
                    Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60
                ).toString(),
            };

            const response = await this.makeRequest<{
                listing: {
                    id: string;
                    status: string;
                    transactionHash?: string;
                };
            }>("/listings/v5/create", listingParams, 1, {} as IAgentRuntime);

            const result = {
                listingId: response.listing.id,
                status: response.listing.status,
                transactionHash: response.listing.transactionHash,
                marketplaceUrl: `https://reservoir.market/collections/${options.collectionAddress}/tokens/${options.tokenId}`,
            };

            endOperation();
            return result;
        } catch (error) {
            this.performanceMonitor.recordMetric({
                operation: "createListing",
                duration: 0,
                success: false,
                metadata: { error: error.message, options },
            });

            throw error;
        }
    }

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
            { options }
        );

        try {
            const buyParams = {
                taker: options.taker,
                listings: options.listings.map((listing) => ({
                    token: listing.tokenId,
                    price: listing.price.toString(),
                    seller: listing.seller,
                    source: listing.marketplace,
                })),
            };

            const response = await this.makeRequest<{
                path: string;
                steps: Array<{
                    action: string;
                    status: string;
                }>;
            }>("/execute/buy/v2", buyParams, 1, {} as IAgentRuntime);

            endOperation();
            return response;
        } catch (error) {
            this.performanceMonitor.recordMetric({
                operation: "executeBuy",
                duration: 0,
                success: false,
                metadata: { error: error.message, options },
            });

            throw error;
        }
    }

    async getOwnedNFTs(owner: string): Promise<
        Array<{
            tokenId: string;
            collectionAddress: string;
            name: string;
            imageUrl?: string;
            attributes?: Record<string, string>;
        }>
    > {
        const endOperation = this.performanceMonitor.startOperation(
            "getOwnedNFTs",
            { owner }
        );

        try {
            const params = {
                users: owner,
                limit: "100",
                includeAttributes: "true",
            };

            const response = await this.makeRequest<{
                tokens: Array<{
                    token: {
                        tokenId: string;
                        collection: {
                            id: string;
                            name: string;
                        };
                        image: string;
                        attributes?: Array<{
                            key: string;
                            value: string;
                        }>;
                    };
                }>;
            }>("/users/tokens/v1", params, 1, {} as IAgentRuntime);

            const nfts = response.tokens.map((token) => ({
                tokenId: token.token.tokenId,
                collectionAddress: token.token.collection.id,
                name: token.token.collection.name,
                imageUrl: token.token.image,
                attributes: token.token.attributes
                    ? Object.fromEntries(
                          token.token.attributes.map((attr) => [
                              attr.key,
                              attr.value,
                          ])
                      )
                    : undefined,
            }));

            endOperation();
            return nfts;
        } catch (error) {
            this.performanceMonitor.recordMetric({
                operation: "getOwnedNFTs",
                duration: 0,
                success: false,
                metadata: { error: error.message, owner },
            });

            throw error;
        }
    }

    /**
     * Token-related Methods
     */

    /**
     * Get comprehensive token data including market data, attributes, and more.
     * @see https://docs.reservoir.tools/reference/gettokensbootstrapv1
     *
     * @param params Configuration options for the token bootstrap request
     * @param runtime Agent runtime for API key management
     * @returns Array of token data with market information
     */
    async getTokensBootstrap(
        params: TokenBootstrapParams,
        runtime: IAgentRuntime
    ): Promise<TokenData[]> {
        const endOperation = this.performanceMonitor.startOperation(
            "getTokensBootstrap",
            { params }
        );

        try {
            if (!params.collection && !params.tokens?.length) {
                throw new Error(
                    "Either collection or tokens parameter must be provided"
                );
            }

            const queryParams = {
                collection: params.collection,
                tokens: params.tokens?.join(","),
                includeAttributes: params.includeAttributes
                    ? "true"
                    : undefined,
                includeTopBid: params.includeTopBid ? "true" : undefined,
                includeDynamicPricing: params.includeDynamicPricing
                    ? "true"
                    : undefined,
                includeLastSale: params.includeLastSale ? "true" : undefined,
                includeRawData: params.includeRawData ? "true" : undefined,
            };

            const response = await this.cachedRequest<{ tokens: TokenData[] }>(
                "/tokens/bootstrap/v1",
                queryParams,
                runtime,
                {
                    ttl: 300, // 5 minutes cache
                    context: "tokens_bootstrap",
                }
            );

            console.log(
                "Raw tokens bootstrap response:",
                JSON.stringify(response.tokens[0], null, 2)
            );

            endOperation();
            return response.tokens;
        } catch (error) {
            console.error("Error fetching token bootstrap data:", error);
            this.performanceMonitor.recordMetric({
                operation: "getTokensBootstrap",
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
     * Get detailed information about a specific token
     * @param collection Collection address
     * @param tokenId Token ID
     * @param runtime Agent runtime
     */
    async getTokenDetails(
        collection: string,
        tokenId: string,
        runtime: IAgentRuntime
    ): Promise<TokenData> {
        const tokens = await this.getTokensBootstrap(
            {
                tokens: [`${collection}:${tokenId}`],
                includeAttributes: true,
                includeTopBid: true,
                includeDynamicPricing: true,
                includeLastSale: true,
                includeRawData: true,
            },
            runtime
        );

        if (!tokens.length) {
            throw new Error(`Token ${collection}:${tokenId} not found`);
        }

        return tokens[0];
    }

    /**
     * Get floor prices for multiple tokens
     * @see https://docs.reservoir.tools/reference/gettokensfloorv1
     *
     * @param params Configuration options for the token floor request
     * @param runtime Agent runtime for API key management
     * @returns Array of token floor data with pricing information
     */
    async getTokensFloor(
        params: TokenFloorParams,
        runtime: IAgentRuntime
    ): Promise<TokenFloorData[]> {
        const endOperation = this.performanceMonitor.startOperation(
            "getTokensFloor",
            { params }
        );

        try {
            if (!params.collection && !params.tokens?.length) {
                throw new Error(
                    "Either collection or tokens parameter must be provided"
                );
            }

            const queryParams = {
                tokens: params.tokens?.join(","),
                collection: params.collection,
                normalizeRoyalties: params.normalizeRoyalties
                    ? "true"
                    : undefined,
                includeDynamicPricing: params.includeDynamicPricing
                    ? "true"
                    : undefined,
                currencies: params.currencies?.join(","),
            };

            const response = await this.cachedRequest<{
                tokens: TokenFloorData[];
            }>("/tokens/floor/v1", queryParams, runtime, {
                ttl: 300, // 5 minutes cache
                context: "tokens_floor",
            });

            console.log(
                "Raw tokens floor response:",
                JSON.stringify(response.tokens[0], null, 2)
            );

            endOperation();
            return response.tokens;
        } catch (error) {
            console.error("Error fetching token floor data:", error);
            this.performanceMonitor.recordMetric({
                operation: "getTokensFloor",
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
     * Get floor price for a specific token
     * @param collection Collection address
     * @param tokenId Token ID
     * @param runtime Agent runtime
     */
    async getTokenFloor(
        collection: string,
        tokenId: string,
        runtime: IAgentRuntime,
        options: {
            normalizeRoyalties?: boolean;
            includeDynamicPricing?: boolean;
            currencies?: string[];
        } = {}
    ): Promise<TokenFloorData> {
        const tokens = await this.getTokensFloor(
            {
                tokens: [`${collection}:${tokenId}`],
                normalizeRoyalties: options.normalizeRoyalties,
                includeDynamicPricing: options.includeDynamicPricing,
                currencies: options.currencies,
            },
            runtime
        );

        if (!tokens.length) {
            throw new Error(`Token ${collection}:${tokenId} not found`);
        }

        return tokens[0];
    }

    /**
     * Get a list of asks (listings) for a specific token
     * @see https://docs.reservoir.tools/reference/gettokenstokenasksv1
     *
     * @param params Configuration options for the token asks request
     * @param runtime Agent runtime for API key management
     * @returns Array of token ask data with pricing information
     */
    async getTokenAsks(
        params: TokenAsksParams,
        runtime: IAgentRuntime
    ): Promise<TokenAskData[]> {
        const endOperation = this.performanceMonitor.startOperation(
            "getTokenAsks",
            { params }
        );

        try {
            if (!params.token) {
                throw new Error("Token parameter is required");
            }

            const queryParams = {
                sortBy: params.sortBy || "price",
                sortDirection: params.sortDirection || "asc",
                normalizeRoyalties: params.normalizeRoyalties
                    ? "true"
                    : undefined,
                includeCriteriaMetadata: params.includeCriteriaMetadata
                    ? "true"
                    : undefined,
                includeRawData: params.includeRawData ? "true" : undefined,
                includeDynamicPricing: params.includeDynamicPricing
                    ? "true"
                    : undefined,
                currencies: params.currencies?.join(","),
            };

            const response = await this.cachedRequest<{ asks: TokenAskData[] }>(
                `/tokens/${params.token}/asks/v1`,
                queryParams,
                runtime,
                {
                    ttl: 300, // 5 minutes cache
                    context: "token_asks",
                }
            );

            console.log(
                "Raw token asks response:",
                JSON.stringify(response.asks[0], null, 2)
            );

            endOperation();
            return response.asks;
        } catch (error) {
            console.error("Error fetching token asks:", error);
            this.performanceMonitor.recordMetric({
                operation: "getTokenAsks",
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
     * Get asks (listings) for a specific token with collection context
     * @param collection Collection address
     * @param tokenId Token ID
     * @param runtime Agent runtime
     */
    async getTokenListings(
        collection: string,
        tokenId: string,
        runtime: IAgentRuntime,
        options: {
            sortBy?: "price" | "createdAt";
            sortDirection?: "asc" | "desc";
            normalizeRoyalties?: boolean;
            currencies?: string[];
        } = {}
    ): Promise<TokenAskData[]> {
        return this.getTokenAsks(
            {
                token: `${collection}:${tokenId}`,
                sortBy: options.sortBy,
                sortDirection: options.sortDirection,
                normalizeRoyalties: options.normalizeRoyalties,
                includeCriteriaMetadata: true,
                includeRawData: true,
                includeDynamicPricing: true,
                currencies: options.currencies,
            },
            runtime
        );
    }

    /**
     * Get a list of bids (offers) for a specific token
     * @see https://docs.reservoir.tools/reference/gettokenstokenbidsv1
     *
     * @param params Configuration options for the token bids request
     * @param runtime Agent runtime for API key management
     * @returns Array of token bid data with pricing information
     */
    async getTokenBids(
        params: TokenBidsParams,
        runtime: IAgentRuntime
    ): Promise<TokenBidData[]> {
        const endOperation = this.performanceMonitor.startOperation(
            "getTokenBids",
            { params }
        );

        try {
            if (!params.token) {
                throw new Error("Token parameter is required");
            }

            const queryParams = {
                sortBy: params.sortBy || "price",
                sortDirection: params.sortDirection || "desc",
                normalizeRoyalties: params.normalizeRoyalties
                    ? "true"
                    : undefined,
                includeCriteriaMetadata: params.includeCriteriaMetadata
                    ? "true"
                    : undefined,
                includeRawData: params.includeRawData ? "true" : undefined,
                includeDynamicPricing: params.includeDynamicPricing
                    ? "true"
                    : undefined,
                currencies: params.currencies?.join(","),
            };

            const response = await this.cachedRequest<{ bids: TokenBidData[] }>(
                `/tokens/${params.token}/bids/v1`,
                queryParams,
                runtime,
                {
                    ttl: 300, // 5 minutes cache
                    context: "token_bids",
                }
            );

            console.log(
                "Raw token bids response:",
                JSON.stringify(response.bids[0], null, 2)
            );

            endOperation();
            return response.bids;
        } catch (error) {
            console.error("Error fetching token bids:", error);
            this.performanceMonitor.recordMetric({
                operation: "getTokenBids",
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
     * Get bids (offers) for a specific token with collection context
     * @param collection Collection address
     * @param tokenId Token ID
     * @param runtime Agent runtime
     */
    async getTokenOffers(
        collection: string,
        tokenId: string,
        runtime: IAgentRuntime,
        options: {
            sortBy?: "price" | "createdAt";
            sortDirection?: "asc" | "desc";
            normalizeRoyalties?: boolean;
            currencies?: string[];
        } = {}
    ): Promise<TokenBidData[]> {
        return this.getTokenBids(
            {
                token: `${collection}:${tokenId}`,
                sortBy: options.sortBy,
                sortDirection: options.sortDirection,
                normalizeRoyalties: options.normalizeRoyalties,
                includeCriteriaMetadata: true,
                includeRawData: true,
                includeDynamicPricing: true,
                currencies: options.currencies,
            },
            runtime
        );
    }

    /**
     * Search for collections across multiple chains
     * @see https://docs.reservoir.tools/reference/getcollectionssearchv1
     *
     * @param params Search configuration options
     * @param runtime Agent runtime for API key management
     * @returns Array of collection data matching the search criteria
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
            const queryParams = {
                name: params.name,
                community: params.community,
                chain: params.chain,
                includeMetadata: params.includeMetadata ? "true" : undefined,
                includeTopBid: params.includeTopBid ? "true" : undefined,
                includeAttributes: params.includeAttributes
                    ? "true"
                    : undefined,
                includeOwnerCount: params.includeOwnerCount
                    ? "true"
                    : undefined,
                includeMintStages: params.includeMintStages
                    ? "true"
                    : undefined,
                includeMarketplaces: params.includeMarketplaces
                    ? "true"
                    : undefined,
                limit: params.limit?.toString(),
                offset: params.offset?.toString(),
            };

            const response = await this.cachedRequest<{
                collections: CollectionSearchData[];
            }>("/collections/search/v1", queryParams, runtime, {
                ttl: 300, // 5 minutes cache
                context: "collections_search",
            });

            console.log(
                "Raw collections search response:",
                JSON.stringify(response.collections[0], null, 2)
            );

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

    /**
     * Get trending collections across multiple chains
     * @see https://docs.reservoir.tools/reference/getcollectionstrendingv1
     *
     * @param params Configuration options for the trending collections request
     * @param runtime Agent runtime for API key management
     * @returns Array of trending collection data with market metrics
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
            const queryParams = {
                period: params.period || "24h",
                sortBy: params.sortBy || "volume",
                limit: params.limit?.toString(),
                offset: params.offset?.toString(),
                chain: params.chain,
                includeMetadata: params.includeMetadata ? "true" : undefined,
                includeTopBid: params.includeTopBid ? "true" : undefined,
                includeAttributes: params.includeAttributes
                    ? "true"
                    : undefined,
                includeOwnerCount: params.includeOwnerCount
                    ? "true"
                    : undefined,
                includeMintStages: params.includeMintStages
                    ? "true"
                    : undefined,
                includeMarketplaces: params.includeMarketplaces
                    ? "true"
                    : undefined,
            };

            const response = await this.cachedRequest<{
                collections: TrendingCollectionData[];
            }>("/collections/trending/v1", queryParams, runtime, {
                ttl: 300, // 5 minutes cache
                context: "trending_collections",
            });

            console.log(
                "Raw trending collections response:",
                JSON.stringify(response.collections[0], null, 2)
            );

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
     * Get trending collections with default parameters optimized for discovery
     * @param runtime Agent runtime
     */
    async getHotCollections(
        runtime: IAgentRuntime,
        options: {
            chain?: string;
            period?: "1h" | "6h" | "24h" | "7d" | "30d";
            limit?: number;
        } = {}
    ): Promise<TrendingCollectionData[]> {
        return this.getTrendingCollections(
            {
                period: options.period || "24h",
                sortBy: "volume",
                limit: options.limit || 20,
                chain: options.chain,
                includeMetadata: true,
                includeTopBid: true,
                includeAttributes: true,
                includeOwnerCount: true,
                includeMintStages: true,
                includeMarketplaces: true,
            },
            runtime
        );
    }

    /**
     * Get trending mints across multiple chains
     * @see https://docs.reservoir.tools/reference/getcollectionstrendingmintsv2
     *
     * @param params Configuration options for the trending mints request
     * @param runtime Agent runtime for API key management
     * @returns Array of trending mint data with mint metrics
     */
    async getTrendingMints(
        params: TrendingMintsParams,
        runtime: IAgentRuntime
    ): Promise<TrendingMintData[]> {
        const endOperation = this.performanceMonitor.startOperation(
            "getTrendingMints",
            { params }
        );

        try {
            const queryParams = {
                period: params.period || "24h",
                limit: params.limit?.toString(),
                offset: params.offset?.toString(),
                chain: params.chain,
                includeMetadata: params.includeMetadata ? "true" : undefined,
                includeAttributes: params.includeAttributes
                    ? "true"
                    : undefined,
                includeOwnerCount: params.includeOwnerCount
                    ? "true"
                    : undefined,
                includeMintStages: params.includeMintStages
                    ? "true"
                    : undefined,
                includeMarketplaces: params.includeMarketplaces
                    ? "true"
                    : undefined,
            };

            const response = await this.cachedRequest<{
                collections: TrendingMintData[];
            }>("/collections/trending-mints/v2", queryParams, runtime, {
                ttl: 300, // 5 minutes cache
                context: "trending_mints",
            });

            console.log(
                "Raw trending mints response:",
                JSON.stringify(response.collections[0], null, 2)
            );

            endOperation();
            return response.collections;
        } catch (error) {
            console.error("Error fetching trending mints:", error);
            this.performanceMonitor.recordMetric({
                operation: "getTrendingMints",
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
     * Get hot mints with default parameters optimized for discovery
     * @param runtime Agent runtime
     */
    async getHotMints(
        runtime: IAgentRuntime,
        options: {
            chain?: string;
            period?: "1h" | "6h" | "24h" | "7d" | "30d";
            limit?: number;
        } = {}
    ): Promise<TrendingMintData[]> {
        return this.getTrendingMints(
            {
                period: options.period || "24h",
                limit: options.limit || 20,
                chain: options.chain,
                includeMetadata: true,
                includeAttributes: true,
                includeOwnerCount: true,
                includeMintStages: true,
                includeMarketplaces: true,
            },
            runtime
        );
    }

    /**
     * Get a list of bids (offers) for a specific collection
     * @see https://docs.reservoir.tools/reference/getcollectionscollectionidbidsv1
     *
     * @param params Configuration options for the collection bids request
     * @param runtime Agent runtime for API key management
     * @returns Array of collection bid data with pricing information
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
            if (!params.collection) {
                throw new Error("Collection parameter is required");
            }

            const queryParams = {
                sortBy: params.sortBy || "price",
                sortDirection: params.sortDirection || "desc",
                normalizeRoyalties: params.normalizeRoyalties
                    ? "true"
                    : undefined,
                includeCriteriaMetadata: params.includeCriteriaMetadata
                    ? "true"
                    : undefined,
                includeRawData: params.includeRawData ? "true" : undefined,
                includeDynamicPricing: params.includeDynamicPricing
                    ? "true"
                    : undefined,
                startTimestamp: params.startTimestamp?.toString(),
                endTimestamp: params.endTimestamp?.toString(),
                currencies: params.currencies?.join(","),
                limit: params.limit?.toString(),
                offset: params.offset?.toString(),
            };

            const response = await this.cachedRequest<{
                bids: CollectionBidData[];
            }>(
                `/collections/${params.collection}/bids/v1`,
                queryParams,
                runtime,
                {
                    ttl: 300, // 5 minutes cache
                    context: "collection_bids",
                }
            );

            console.log(
                "Raw collection bids response:",
                JSON.stringify(response.bids[0], null, 2)
            );

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
     * Get collection offers with default parameters optimized for discovery
     * @param collection Collection ID/address
     * @param runtime Agent runtime
     */
    async getCollectionOffers(
        collection: string,
        runtime: IAgentRuntime,
        options: {
            sortBy?: "price" | "createdAt";
            sortDirection?: "asc" | "desc";
            normalizeRoyalties?: boolean;
            currencies?: string[];
            limit?: number;
        } = {}
    ): Promise<CollectionBidData[]> {
        return this.getCollectionBids(
            {
                collection,
                sortBy: options.sortBy || "price",
                sortDirection: options.sortDirection || "desc",
                normalizeRoyalties: options.normalizeRoyalties,
                includeCriteriaMetadata: true,
                includeRawData: true,
                includeDynamicPricing: true,
                currencies: options.currencies,
                limit: options.limit || 20,
            },
            runtime
        );
    }

    /**
     * Get top traders for a specific collection
     * @see https://docs.reservoir.tools/reference/getcollectionstoptradersv1
     *
     * @param params Configuration options for the top traders request
     * @param runtime Agent runtime for API key management
     * @returns Array of top trader data with trading metrics
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
            const queryParams = {
                collection: params.collection,
                period: params.period || "24h",
                sortBy: params.sortBy || "purchases",
                limit: params.limit?.toString(),
                offset: params.offset?.toString(),
                includeMetadata: params.includeMetadata ? "true" : undefined,
                excludeZeroVolume: params.excludeZeroVolume
                    ? "true"
                    : undefined,
            };

            const response = await this.cachedRequest<{
                traders: TopTraderData[];
            }>("/collections/top-traders/v1", queryParams, runtime, {
                ttl: 300, // 5 minutes cache
                context: "top_traders",
            });

            console.log(
                "Raw top traders response:",
                JSON.stringify(response.traders[0], null, 2)
            );

            endOperation();
            return response.traders;
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
     * Get top traders with default parameters optimized for discovery
     * @param collection Collection ID/address
     * @param runtime Agent runtime
     */
    async getCollectionTopTraders(
        collection: string,
        runtime: IAgentRuntime,
        options: {
            period?: "1h" | "6h" | "24h" | "7d" | "30d";
            sortBy?: "purchases" | "sales" | "profit" | "volume";
            limit?: number;
        } = {}
    ): Promise<TopTraderData[]> {
        return this.getTopTraders(
            {
                collection,
                period: options.period || "24h",
                sortBy: options.sortBy || "volume",
                limit: options.limit || 20,
                includeMetadata: true,
                excludeZeroVolume: true,
            },
            runtime
        );
    }

    /**
     * Get attribute exploration data for a collection
     * @see https://docs.reservoir.tools/reference/getcollectionscollectionattributesexplorev6
     *
     * @param params Configuration options for the attributes exploration request
     * @param runtime Agent runtime for API key management
     * @returns Array of attribute data with market metrics
     */
    async exploreAttributes(
        params: ExploreAttributesParams,
        runtime: IAgentRuntime
    ): Promise<AttributeData[]> {
        const endOperation = this.performanceMonitor.startOperation(
            "exploreAttributes",
            { params }
        );

        try {
            if (!params.collection) {
                throw new Error("Collection parameter is required");
            }

            const queryParams = {
                attribute: params.attribute,
                sortBy: params.sortBy || "tokenCount",
                sortDirection: params.sortDirection || "desc",
                offset: params.offset?.toString(),
                limit: params.limit?.toString(),
                includeTopBid: params.includeTopBid ? "true" : undefined,
                includeSalesCount: params.includeSalesCount
                    ? "true"
                    : undefined,
                includeLastSale: params.includeLastSale ? "true" : undefined,
            };

            const response = await this.cachedRequest<{
                attributes: AttributeData[];
            }>(
                `/collections/${params.collection}/attributes/explore/v6`,
                queryParams,
                runtime,
                {
                    ttl: 300, // 5 minutes cache
                    context: "explore_attributes",
                }
            );

            console.log(
                "Raw explore attributes response:",
                JSON.stringify(response.attributes[0], null, 2)
            );

            endOperation();
            return response.attributes;
        } catch (error) {
            console.error("Error exploring attributes:", error);
            this.performanceMonitor.recordMetric({
                operation: "exploreAttributes",
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
     * Get collection attributes with default parameters optimized for discovery
     * @param collection Collection ID/address
     * @param runtime Agent runtime
     */
    async getCollectionAttributes(
        collection: string,
        runtime: IAgentRuntime,
        options: {
            attribute?: string;
            sortBy?: "tokenCount" | "floorAskPrice" | "topBidPrice";
            limit?: number;
        } = {}
    ): Promise<AttributeData[]> {
        return this.exploreAttributes(
            {
                collection,
                attribute: options.attribute,
                sortBy: options.sortBy || "tokenCount",
                limit: options.limit || 100,
                includeTopBid: true,
                includeSalesCount: true,
                includeLastSale: true,
            },
            runtime
        );
    }

    /**
     * Get user activity feed including sales, asks, transfers, mints, bids, and cancellations
     * @see https://docs.reservoir.tools/reference/getusersactivityv6
     *
     * @param params Configuration options for the user activity request
     * @param runtime Agent runtime for API key management
     * @returns Array of user activity data with continuation token for pagination
     */
    async getUserActivity(
        params: UserActivityParams,
        runtime: IAgentRuntime
    ): Promise<{ activities: UserActivityData[]; continuation?: string }> {
        const endOperation = this.performanceMonitor.startOperation(
            "getUserActivity",
            { params }
        );

        try {
            if (!params.users?.length) {
                throw new Error("At least one user address is required");
            }

            const queryParams = {
                users: params.users.join(","),
                collection: params.collection,
                community: params.community,
                limit: params.limit?.toString(),
                continuation: params.continuation,
                types: params.types?.join(","),
                includeMetadata: params.includeMetadata ? "true" : undefined,
                includeTokenMetadata: params.includeTokenMetadata
                    ? "true"
                    : undefined,
                sortBy: params.sortBy || "timestamp",
                sortDirection: params.sortDirection || "desc",
            };

            const response = await this.cachedRequest<{
                activities: UserActivityData[];
                continuation?: string;
            }>("/users/activity/v6", queryParams, runtime, {
                ttl: 300, // 5 minutes cache
                context: "user_activity",
            });

            console.log(
                "Raw user activity response:",
                JSON.stringify(response.activities[0], null, 2)
            );

            endOperation();
            return response;
        } catch (error) {
            console.error("Error fetching user activity:", error);
            this.performanceMonitor.recordMetric({
                operation: "getUserActivity",
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
     * Get user activity with default parameters optimized for discovery
     * @param userAddress User's wallet address
     * @param runtime Agent runtime
     */
    async getUserActivityFeed(
        userAddress: string,
        runtime: IAgentRuntime,
        options: {
            collection?: string;
            types?: Array<
                | "sale"
                | "ask"
                | "transfer"
                | "mint"
                | "bid"
                | "bid_cancel"
                | "ask_cancel"
            >;
            limit?: number;
            continuation?: string;
        } = {}
    ): Promise<{ activities: UserActivityData[]; continuation?: string }> {
        return this.getUserActivity(
            {
                users: [userAddress],
                collection: options.collection,
                types: options.types,
                limit: options.limit || 20,
                continuation: options.continuation,
                includeMetadata: true,
                includeTokenMetadata: true,
                sortBy: "timestamp",
                sortDirection: "desc",
            },
            runtime
        );
    }

    /**
     * Get token activity feed including sales, asks, transfers, mints, bids, and cancellations
     * @see https://docs.reservoir.tools/reference/gettokenstokenactivityv5
     *
     * @param params Configuration options for the token activity request
     * @param runtime Agent runtime for API key management
     * @returns Array of token activity data with continuation token for pagination
     */
    async getTokenActivity(
        params: TokenActivityParams,
        runtime: IAgentRuntime
    ): Promise<{ activities: TokenActivityData[]; continuation?: string }> {
        const endOperation = this.performanceMonitor.startOperation(
            "getTokenActivity",
            { params }
        );

        try {
            if (!params.token) {
                throw new Error("Token parameter is required");
            }

            const queryParams = {
                limit: params.limit?.toString(),
                continuation: params.continuation,
                types: params.types?.join(","),
                includeMetadata: params.includeMetadata ? "true" : undefined,
                sortBy: params.sortBy || "timestamp",
                sortDirection: params.sortDirection || "desc",
            };

            const response = await this.cachedRequest<{
                activities: TokenActivityData[];
                continuation?: string;
            }>(`/tokens/${params.token}/activity/v5`, queryParams, runtime, {
                ttl: 300, // 5 minutes cache
                context: "token_activity",
            });

            console.log(
                "Raw token activity response:",
                JSON.stringify(response.activities[0], null, 2)
            );

            endOperation();
            return response;
        } catch (error) {
            console.error("Error fetching token activity:", error);
            this.performanceMonitor.recordMetric({
                operation: "getTokenActivity",
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
     * Get token activity with default parameters optimized for discovery
     * @param collection Collection address
     * @param tokenId Token ID
     * @param runtime Agent runtime
     */
    async getTokenActivityFeed(
        collection: string,
        tokenId: string,
        runtime: IAgentRuntime,
        options: {
            types?: Array<
                | "sale"
                | "ask"
                | "transfer"
                | "mint"
                | "bid"
                | "bid_cancel"
                | "ask_cancel"
            >;
            limit?: number;
            continuation?: string;
        } = {}
    ): Promise<{ activities: TokenActivityData[]; continuation?: string }> {
        return this.getTokenActivity(
            {
                token: `${collection}:${tokenId}`,
                types: options.types,
                limit: options.limit || 20,
                continuation: options.continuation,
                includeMetadata: true,
                sortBy: "timestamp",
                sortDirection: "desc",
            },
            runtime
        );
    }

    /**
     * Get collection activity feed including sales, asks, transfers, mints, bids, and cancellations
     * @see https://docs.reservoir.tools/reference/getcollectionsactivityv6
     *
     * @param params Configuration options for the collection activity request
     * @param runtime Agent runtime for API key management
     * @returns Array of collection activity data with continuation token for pagination
     */
    async getCollectionActivity(
        params: CollectionActivityParams,
        runtime: IAgentRuntime
    ): Promise<{
        activities: CollectionActivityData[];
        continuation?: string;
    }> {
        const endOperation = this.performanceMonitor.startOperation(
            "getCollectionActivity",
            { params }
        );

        try {
            if (!params.collection) {
                throw new Error("Collection parameter is required");
            }

            const queryParams = {
                collection: params.collection,
                limit: params.limit?.toString(),
                continuation: params.continuation,
                types: params.types?.join(","),
                includeMetadata: params.includeMetadata ? "true" : undefined,
                includeTokenMetadata: params.includeTokenMetadata
                    ? "true"
                    : undefined,
                sortBy: params.sortBy || "timestamp",
                sortDirection: params.sortDirection || "desc",
            };

            const response = await this.cachedRequest<{
                activities: CollectionActivityData[];
                continuation?: string;
            }>("/collections/activity/v6", queryParams, runtime, {
                ttl: 300, // 5 minutes cache
                context: "collection_activity",
            });

            console.log(
                "Raw collection activity response:",
                JSON.stringify(response.activities[0], null, 2)
            );

            endOperation();
            return response;
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
     * Get collection activity with default parameters optimized for discovery
     * @param collection Collection ID/address
     * @param runtime Agent runtime
     */
    async getCollectionActivityFeed(
        collection: string,
        runtime: IAgentRuntime,
        options: {
            types?: Array<
                | "sale"
                | "ask"
                | "transfer"
                | "mint"
                | "bid"
                | "bid_cancel"
                | "ask_cancel"
            >;
            limit?: number;
            continuation?: string;
        } = {}
    ): Promise<{
        activities: CollectionActivityData[];
        continuation?: string;
    }> {
        return this.getCollectionActivity(
            {
                collection,
                types: options.types,
                limit: options.limit || 20,
                continuation: options.continuation,
                includeMetadata: true,
                includeTokenMetadata: true,
                sortBy: "timestamp",
                sortDirection: "desc",
            },
            runtime
        );
    }

    /**
     * Get tokens held by a user along with ownership information
     * @see https://docs.reservoir.tools/reference/getusersusertokensv10
     *
     * @param params Configuration options for the user tokens request
     * @param runtime Agent runtime for API key management
     * @returns Array of user token data with continuation token for pagination
     */
    async getUserTokens(
        params: UserTokensParams,
        runtime: IAgentRuntime
    ): Promise<UserTokensData> {
        const endOperation = this.performanceMonitor.startOperation(
            "getUserTokens",
            { params }
        );

        try {
            if (!params.user) {
                throw new Error("User address is required");
            }

            const queryParams = {
                collection: params.collection,
                community: params.community,
                limit: params.limit?.toString(),
                continuation: params.continuation,
                includeTopBid: params.includeTopBid ? "true" : undefined,
                includeAttributes: params.includeAttributes
                    ? "true"
                    : undefined,
                includeLastSale: params.includeLastSale ? "true" : undefined,
                includeRawData: params.includeRawData ? "true" : undefined,
                sortBy: params.sortBy || "acquiredAt",
                sortDirection: params.sortDirection || "desc",
            };

            const response = await this.cachedRequest<UserTokensData>(
                `/users/${params.user}/tokens/v10`,
                queryParams,
                runtime,
                {
                    ttl: 300, // 5 minutes cache
                    context: "user_tokens",
                }
            );

            console.log(
                "Raw user tokens response:",
                JSON.stringify(response.tokens[0], null, 2)
            );

            endOperation();
            return response;
        } catch (error) {
            console.error("Error fetching user tokens:", error);
            this.performanceMonitor.recordMetric({
                operation: "getUserTokens",
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
     * Get user tokens with default parameters optimized for discovery
     * @param userAddress User's wallet address
     * @param runtime Agent runtime
     */
    async getUserTokensFeed(
        userAddress: string,
        runtime: IAgentRuntime,
        options: {
            collection?: string;
            limit?: number;
            continuation?: string;
            sortBy?: "acquiredAt" | "lastAppraisalValue" | "tokenId";
        } = {}
    ): Promise<UserTokensData> {
        return this.getUserTokens(
            {
                user: userAddress,
                collection: options.collection,
                limit: options.limit || 20,
                continuation: options.continuation,
                includeTopBid: true,
                includeAttributes: true,
                includeLastSale: true,
                sortBy: options.sortBy || "acquiredAt",
                sortDirection: "desc",
            },
            runtime
        );
    }

    /**
     * Get a list of asks (listings) filtered by maker
     * @see https://docs.reservoir.tools/reference/getusersuserasksv1
     *
     * @param params Configuration options for the user asks request
     * @param runtime Agent runtime for API key management
     * @returns Array of user asks data with continuation token for pagination
     */
    async getUserAsks(
        params: UserAsksParams,
        runtime: IAgentRuntime
    ): Promise<UserAsksData> {
        const endOperation = this.performanceMonitor.startOperation(
            "getUserAsks",
            { params }
        );

        try {
            if (!params.user) {
                throw new Error("User address is required");
            }

            const queryParams = {
                collection: params.collection,
                community: params.community,
                limit: params.limit?.toString(),
                continuation: params.continuation,
                includeMetadata: params.includeMetadata ? "true" : undefined,
                includeRawData: params.includeRawData ? "true" : undefined,
                includeDynamicPricing: params.includeDynamicPricing
                    ? "true"
                    : undefined,
                normalizeRoyalties: params.normalizeRoyalties
                    ? "true"
                    : undefined,
                sortBy: params.sortBy || "createdAt",
                sortDirection: params.sortDirection || "desc",
            };

            const response = await this.cachedRequest<UserAsksData>(
                `/users/${params.user}/asks/v1`,
                queryParams,
                runtime,
                {
                    ttl: 300, // 5 minutes cache
                    context: "user_asks",
                }
            );

            console.log(
                "Raw user asks response:",
                JSON.stringify(response.asks[0], null, 2)
            );

            endOperation();
            return response;
        } catch (error) {
            console.error("Error fetching user asks:", error);
            this.performanceMonitor.recordMetric({
                operation: "getUserAsks",
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
     * Get user asks (listings) with default parameters optimized for discovery
     * @param userAddress User's wallet address
     * @param runtime Agent runtime
     */
    async getUserAsksFeed(
        userAddress: string,
        runtime: IAgentRuntime,
        options: {
            collection?: string;
            limit?: number;
            continuation?: string;
            sortBy?: "price" | "createdAt";
        } = {}
    ): Promise<UserAsksData> {
        return this.getUserAsks(
            {
                user: userAddress,
                collection: options.collection,
                limit: options.limit || 20,
                continuation: options.continuation,
                includeMetadata: true,
                includeRawData: true,
                includeDynamicPricing: true,
                normalizeRoyalties: true,
                sortBy: options.sortBy || "createdAt",
                sortDirection: "desc",
            },
            runtime
        );
    }

    /**
     * Get aggregate stats for a user, grouped by collection
     * @see https://docs.reservoir.tools/reference/getusersusercollectionsv4
     *
     * @param params Configuration options for the user collections request
     * @param runtime Agent runtime for API key management
     * @returns Array of user collection data with portfolio information
     */
    async getUserCollections(
        params: UserCollectionsParams,
        runtime: IAgentRuntime
    ): Promise<UserCollectionsData> {
        const endOperation = this.performanceMonitor.startOperation(
            "getUserCollections",
            { params }
        );

        try {
            if (!params.user) {
                throw new Error("User address is required");
            }

            const queryParams = {
                community: params.community,
                includeTopBid: params.includeTopBid ? "true" : undefined,
                includeLiquidCount: params.includeLiquidCount
                    ? "true"
                    : undefined,
                includeAttributes: params.includeAttributes
                    ? "true"
                    : undefined,
                includeLastSale: params.includeLastSale ? "true" : undefined,
                includeOwnerCount: params.includeOwnerCount
                    ? "true"
                    : undefined,
                includeFlaggedTokens: params.includeFlaggedTokens
                    ? "true"
                    : undefined,
                sortBy: params.sortBy || "totalValue",
                sortDirection: params.sortDirection || "desc",
                offset: params.offset?.toString(),
                limit: params.limit?.toString(),
            };

            const response = await this.cachedRequest<UserCollectionsData>(
                `/users/${params.user}/collections/v4`,
                queryParams,
                runtime,
                {
                    ttl: 300, // 5 minutes cache
                    context: "user_collections",
                }
            );

            console.log(
                "Raw user collections response:",
                JSON.stringify(response.collections[0], null, 2)
            );

            endOperation();
            return response;
        } catch (error) {
            console.error("Error fetching user collections:", error);
            this.performanceMonitor.recordMetric({
                operation: "getUserCollections",
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
     * Get user collections with default parameters optimized for portfolio view
     * @param userAddress User's wallet address
     * @param runtime Agent runtime
     */
    async getUserCollectionsFeed(
        userAddress: string,
        runtime: IAgentRuntime,
        options: {
            sortBy?:
                | "totalValue"
                | "floorAskPrice"
                | "tokenCount"
                | "lastBuy"
                | "lastSell";
            limit?: number;
            offset?: number;
        } = {}
    ): Promise<UserCollectionsData> {
        return this.getUserCollections(
            {
                user: userAddress,
                includeTopBid: true,
                includeLiquidCount: true,
                includeAttributes: true,
                includeLastSale: true,
                includeOwnerCount: true,
                includeFlaggedTokens: true,
                sortBy: options.sortBy || "totalValue",
                sortDirection: "desc",
                limit: options.limit || 20,
                offset: options.offset,
            },
            runtime
        );
    }

    /**
     * Get a list of bids (offers) filtered by maker
     * @see https://docs.reservoir.tools/reference/getusersuserbidsv1
     *
     * @param params Configuration options for the user bids request
     * @param runtime Agent runtime for API key management
     * @returns Array of user bids data with continuation token for pagination
     */
    async getUserBids(
        params: UserBidsParams,
        runtime: IAgentRuntime
    ): Promise<UserBidsData> {
        const endOperation = this.performanceMonitor.startOperation(
            "getUserBids",
            { params }
        );

        try {
            if (!params.user) {
                throw new Error("User address is required");
            }

            const queryParams = {
                collection: params.collection,
                community: params.community,
                limit: params.limit?.toString(),
                continuation: params.continuation,
                includeMetadata: params.includeMetadata ? "true" : undefined,
                includeRawData: params.includeRawData ? "true" : undefined,
                includeDynamicPricing: params.includeDynamicPricing
                    ? "true"
                    : undefined,
                normalizeRoyalties: params.normalizeRoyalties
                    ? "true"
                    : undefined,
                sortBy: params.sortBy || "createdAt",
                sortDirection: params.sortDirection || "desc",
            };

            const response = await this.cachedRequest<UserBidsData>(
                `/users/${params.user}/bids/v1`,
                queryParams,
                runtime,
                {
                    ttl: 300, // 5 minutes cache
                    context: "user_bids",
                }
            );

            console.log(
                "Raw user bids response:",
                JSON.stringify(response.bids[0], null, 2)
            );

            endOperation();
            return response;
        } catch (error) {
            console.error("Error fetching user bids:", error);
            this.performanceMonitor.recordMetric({
                operation: "getUserBids",
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
     * Get user bids (offers) with default parameters optimized for discovery
     * @param userAddress User's wallet address
     * @param runtime Agent runtime
     */
    async getUserBidsFeed(
        userAddress: string,
        runtime: IAgentRuntime,
        options: {
            collection?: string;
            limit?: number;
            continuation?: string;
            sortBy?: "price" | "createdAt";
        } = {}
    ): Promise<UserBidsData> {
        return this.getUserBids(
            {
                user: userAddress,
                collection: options.collection,
                limit: options.limit || 20,
                continuation: options.continuation,
                includeMetadata: true,
                includeRawData: true,
                includeDynamicPricing: true,
                normalizeRoyalties: true,
                sortBy: options.sortBy || "createdAt",
                sortDirection: "desc",
            },
            runtime
        );
    }

    /**
     * Get top bids for the given user tokens
     * @see https://docs.reservoir.tools/reference/getordersusersusertopbidsv4
     *
     * @param params Configuration options for the user top bids request
     * @param runtime Agent runtime for API key management
     * @returns Array of user top bids data with continuation token for pagination
     */
    async getUserTopBids(
        params: UserTopBidsParams,
        runtime: IAgentRuntime
    ): Promise<UserTopBidsData> {
        const endOperation = this.performanceMonitor.startOperation(
            "getUserTopBids",
            { params }
        );

        try {
            if (!params.user) {
                throw new Error("User address is required");
            }

            const queryParams = {
                excludeEOA: params.excludeEOA ? "true" : undefined,
                normalizeRoyalties: params.normalizeRoyalties
                    ? "true"
                    : undefined,
                includeCriteriaMetadata: params.includeCriteriaMetadata
                    ? "true"
                    : undefined,
                includeRawData: params.includeRawData ? "true" : undefined,
                includeDynamicPricing: params.includeDynamicPricing
                    ? "true"
                    : undefined,
                sortBy: params.sortBy || "price",
                sortDirection: params.sortDirection || "desc",
                limit: params.limit?.toString(),
                continuation: params.continuation,
            };

            const response = await this.cachedRequest<UserTopBidsData>(
                `/orders/users/${params.user}/top-bids/v4`,
                queryParams,
                runtime,
                {
                    ttl: 300, // 5 minutes cache
                    context: "user_top_bids",
                }
            );

            console.log(
                "Raw user top bids response:",
                JSON.stringify(response.topBids[0], null, 2)
            );

            endOperation();
            return response;
        } catch (error) {
            console.error("Error fetching user top bids:", error);
            this.performanceMonitor.recordMetric({
                operation: "getUserTopBids",
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
     * Get user top bids with default parameters optimized for discovery
     * @param userAddress User's wallet address
     * @param runtime Agent runtime
     */
    async getUserTopBidsFeed(
        userAddress: string,
        runtime: IAgentRuntime,
        options: {
            excludeEOA?: boolean;
            sortBy?: "price" | "createdAt";
            limit?: number;
            continuation?: string;
        } = {}
    ): Promise<UserTopBidsData> {
        return this.getUserTopBids(
            {
                user: userAddress,
                excludeEOA: options.excludeEOA ?? true,
                normalizeRoyalties: true,
                includeCriteriaMetadata: true,
                includeRawData: true,
                includeDynamicPricing: true,
                sortBy: options.sortBy || "price",
                sortDirection: "desc",
                limit: options.limit || 20,
                continuation: options.continuation,
            },
            runtime
        );
    }

    /**
     * Get the image URL for a collection
     * @see https://docs.reservoir.tools/reference/getredirectcollectionscollectionimagev1
     *
     * @param collection Collection ID/address
     * @returns The direct URL to the collection's image
     */
    getCollectionImageUrl(collection: string): string {
        if (!collection) {
            throw new Error("Collection parameter is required");
        }

        return `${this.config.baseUrl}/redirect/collections/${collection}/image/v1`;
    }

    /**
     * Get the image URL for a specific token
     * @see https://docs.reservoir.tools/reference/getredirecttokenstokenimagev1
     *
     * @param collection Collection address
     * @param tokenId Token ID
     * @returns The direct URL to the token's image
     */
    getTokenImageUrl(collection: string, tokenId: string): string {
        if (!collection || !tokenId) {
            throw new Error("Collection and tokenId parameters are required");
        }

        return `${this.config.baseUrl}/redirect/tokens/${collection}:${tokenId}/image/v1`;
    }

    /**
     * Get the icon URL for a currency address
     * @see https://docs.reservoir.tools/reference/getredirectcurrencyaddressiconv1
     *
     * @param currencyAddress Currency contract address
     * @returns The direct URL to the currency's icon
     */
    getCurrencyIconUrl(currencyAddress: string): string {
        if (!currencyAddress) {
            throw new Error("Currency address parameter is required");
        }

        return `${this.config.baseUrl}/redirect/currency/${currencyAddress}/icon/v1`;
    }
}
