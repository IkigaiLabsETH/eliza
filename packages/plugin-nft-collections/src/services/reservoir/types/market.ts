import { Price, Source, Continuation } from "./common";
import { TokenCollection } from "./token";

export interface MarketStats {
    totalVolume: number;
    totalSales: number;
    totalListings: number;
    averagePrice: number;
    floorPrice: number;
    volumeChange: {
        "1h": number;
        "24h": number;
        "7d": number;
        "30d": number;
    };
}

export interface TopTraderStats {
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
}

export interface TopTradersParams {
    collection: string;
    period?: "1h" | "6h" | "24h" | "7d" | "30d";
    sortBy?: "purchases" | "sales" | "profit" | "volume";
    limit?: number;
    offset?: number;
    includeMetadata?: boolean;
    excludeZeroVolume?: boolean;
}

export interface TopTraderData {
    user: {
        address: string;
        name?: string;
        avatar?: string;
    };
    stats: TopTraderStats;
    period: string;
}

export interface CollectionBidsParams {
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

export interface CollectionBidData {
    id: string;
    price: Price;
    maker: string;
    validFrom: number;
    validUntil: number;
    source: Source;
    criteria?: {
        kind: string;
        data: {
            token: {
                tokenId: string;
                name?: string;
                image?: string;
            };
            collection: TokenCollection & {
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
    dynamicPricing?: {
        kind: string;
        data: Record<string, any>;
    };
}

export interface FloorListingParams {
    collection: string;
    limit: number;
    sortBy: "price" | "rarity";
    currencies?: string[];
    maxPrice?: number;
    minPrice?: number;
}

export interface FloorListing {
    tokenId: string;
    price: number;
    priceUsd?: number;
    seller: string;
    marketplace: string;
    validFrom: string;
    validUntil: string;
    source?: Source;
    token?: {
        rarity?: number;
        rarityRank?: number;
        attributes?: Record<string, string>;
        image?: string;
        name?: string;
    };
}

export interface BuyOptions {
    listings: Array<{
        tokenId: string;
        price: number;
        seller: string;
        marketplace: string;
    }>;
    taker: string;
}

export interface BuyResponse {
    path: string;
    steps: Array<{
        action: string;
        status: string;
    }>;
}

/**
 * Parameters for fetching asks (listings)
 * @see https://docs.reservoir.tools/reference/getordersasksv5
 */
export interface OrdersAsksParams {
    token?: string;
    tokenSetId?: string;
    maker?: string;
    community?: string;
    collection?: string;
    status?: "active" | "inactive" | "expired" | "cancelled" | "filled";
    sortBy?: "price" | "createdAt";
    sortDirection?: "asc" | "desc";
    continuation?: string;
    limit?: number;
    includeMetadata?: boolean;
    includeRawData?: boolean;
    includeDynamicPricing?: boolean;
    normalizeRoyalties?: boolean;
    currencies?: string[];
}

/**
 * Response data for an ask (listing)
 */
export interface OrderAskData {
    id: string;
    kind: string;
    side: "sell";
    status: "active" | "inactive" | "expired" | "cancelled" | "filled";
    tokenSetId: string;
    tokenSetSchemaHash: string;
    contract: string;
    maker: string;
    taker?: string;
    price: Price & {
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
            collection?: TokenCollection & {
                royalties?: Array<{
                    bps: number;
                    recipient: string;
                }>;
            };
        };
    };
    source?: Source;
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
}

/**
 * Parameters for fetching bids (offers)
 * @see https://docs.reservoir.tools/reference/getordersbidsv6
 */
export interface OrdersBidsParams {
    token?: string;
    tokenSetId?: string;
    maker?: string;
    community?: string;
    collection?: string;
    attributes?: Record<string, string>;
    status?: "active" | "inactive" | "expired" | "cancelled" | "filled";
    sortBy?: "price" | "createdAt" | "updatedAt";
    sortDirection?: "asc" | "desc";
    continuation?: string;
    limit?: number;
    includeMetadata?: boolean;
    includeRawData?: boolean;
    includeDynamicPricing?: boolean;
    normalizeRoyalties?: boolean;
    currencies?: string[];
    excludeEOA?: boolean;
}

/**
 * Response data for a bid (offer)
 */
export interface OrderBidData {
    id: string;
    kind: string;
    side: "buy";
    status: "active" | "inactive" | "expired" | "cancelled" | "filled";
    tokenSetId: string;
    tokenSetSchemaHash: string;
    contract: string;
    maker: string;
    taker?: string;
    price: Price & {
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
            collection?: TokenCollection & {
                royalties?: Array<{
                    bps: number;
                    recipient: string;
                }>;
            };
        };
    };
    source?: Source;
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
}

/**
 * Parameters for fetching orders depth
 * @see https://docs.reservoir.tools/reference/getordersdepthv1
 */
export interface OrdersDepthParams {
    collection?: string;
    token?: string;
    side: "buy" | "sell";
    includeMetadata?: boolean;
    normalizeRoyalties?: boolean;
    currencies?: string[];
}

/**
 * Response data for orders depth
 */
export interface OrdersDepthData {
    price: Price;
    quantity: number;
    depth: number;
}
