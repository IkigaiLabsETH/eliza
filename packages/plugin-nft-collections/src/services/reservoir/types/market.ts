import {
    Collection,
    Price,
    Source,
    ContinuationParams,
    SortParams,
} from "./common";

export interface MarketStats {
    totalVolume: number;
    totalSales: number;
    totalListings: number;
    floorPrice: number;
    averagePrice: number;
    volumeChange24h: number;
    volumeChange7d: number;
    volumeChange30d: number;
}

export interface TopTradersParams extends ContinuationParams, SortParams {
    collection?: string;
    includeMetadata?: boolean;
    timeframe?: "1h" | "6h" | "24h" | "7d" | "30d";
}

export interface TopTraderData {
    address: string;
    totalVolume: number;
    totalSales: number;
    totalBuys: number;
    totalSells: number;
    profit: number;
    profitUsd: number;
    rank: number;
}

export interface FloorListingParams extends ContinuationParams {
    collection: string;
    tokens?: string[];
    normalizeRoyalties?: boolean;
    includeCriteriaMetadata?: boolean;
    includeRawData?: boolean;
    includeDynamicPricing?: boolean;
    currencies?: string[];
}

export interface FloorListing {
    id: string;
    price: Price;
    maker: string;
    validFrom: number;
    validUntil: number;
    source?: Source;
    criteria?: {
        kind: string;
        data: {
            token?: {
                tokenId: string;
                name?: string;
                image?: string;
            };
            collection?: Collection;
        };
    };
}

export interface BuyOptions {
    tokens: string[];
    quantity?: number;
    referrer?: string;
    onlyPath?: boolean;
    skipBalanceCheck?: boolean;
    partial?: boolean;
    currency?: string;
    normalizeRoyalties?: boolean;
}

export interface BuyResponse {
    path: Array<{
        orderId: string;
        contract: string;
        tokenId: string;
        quantity: number;
        source: Source;
        currency: {
            contract: string;
            name: string;
            symbol: string;
            decimals: number;
        };
        quote: {
            gross: {
                amount: string;
                nativeAmount: string;
                usdAmount: string;
            };
            net: {
                amount: string;
                nativeAmount: string;
                usdAmount: string;
            };
            fees: Array<{
                amount: string;
                nativeAmount: string;
                usdAmount: string;
                recipient: string;
                bps: number;
            }>;
        };
    }>;
    price: Price;
    message?: string;
}

export interface OrdersAsksParams extends ContinuationParams, SortParams {
    token?: string;
    collection?: string;
    maker?: string;
    status?: "active" | "inactive" | "expired" | "cancelled" | "filled";
    normalizeRoyalties?: boolean;
    includeCriteriaMetadata?: boolean;
    includeRawData?: boolean;
    includeDynamicPricing?: boolean;
    currencies?: string[];
}

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
    price: Price;
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
            collection?: Collection;
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

export interface OrdersBidsParams extends ContinuationParams, SortParams {
    token?: string;
    collection?: string;
    maker?: string;
    status?: "active" | "inactive" | "expired" | "cancelled" | "filled";
    normalizeRoyalties?: boolean;
    includeCriteriaMetadata?: boolean;
    includeRawData?: boolean;
    includeDynamicPricing?: boolean;
    currencies?: string[];
}

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
    price: Price;
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
            collection?: Collection;
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

export interface OrdersDepthParams {
    collection: string;
    side: "buy" | "sell";
    normalizeRoyalties?: boolean;
    excludeEOA?: boolean;
    excludeSpam?: boolean;
}

export interface OrdersDepthData {
    price: Price;
    quantity: number;
    depth: number;
}
