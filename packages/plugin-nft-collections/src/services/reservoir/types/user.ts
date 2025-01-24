import {
    Collection,
    Price,
    Source,
    ContinuationParams,
    SortParams,
    ActivityType,
} from "./common";
import {
    TokenBase,
    TokenCollection,
    TokenMarket,
    TokenAttribute,
} from "./token";

export interface UserToken {
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
        collection?: Collection;
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
        };
        acquiredAt?: string;
    };
}

export interface UserCollection {
    collection: Collection;
    ownership: {
        tokenCount: number;
        onSaleCount: number;
        floorAsk?: {
            id: string;
            price: number;
            maker: string;
            validFrom: number;
            validUntil: number;
        };
        acquiredAt?: string;
    };
}

export interface UserTokensParams extends ContinuationParams, SortParams {
    user: string;
    collection?: string;
    includeTopBid?: boolean;
    includeDynamicPricing?: boolean;
    includeAttributes?: boolean;
    includeLastSale?: boolean;
    includeRawData?: boolean;
}

export interface UserCollectionsParams extends ContinuationParams, SortParams {
    user: string;
    includeTopBid?: boolean;
    includeDynamicPricing?: boolean;
    includeAttributes?: boolean;
}

export interface UserActivityParams extends ContinuationParams, SortParams {
    users: string[];
    collection?: string;
    types?: ActivityType[];
    includeMetadata?: boolean;
}

export interface UserActivityData {
    id: string;
    type: ActivityType;
    fromAddress: string;
    toAddress?: string;
    price?: Price;
    amount?: number;
    timestamp: number;
    token: {
        contract: string;
        tokenId: string;
        name?: string;
        image?: string;
        collection: Collection;
    };
    order?: {
        id: string;
        side: "ask" | "bid";
        source?: Source;
    };
    metadata?: Record<string, any>;
}

export interface UserTokensData extends ContinuationParams {
    tokens: Array<{
        token: TokenBase & {
            collection?: TokenCollection;
            attributes?: TokenAttribute[];
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
                source?: Source;
            };
            acquiredAt?: string;
        };
        market?: TokenMarket;
    }>;
}

export interface UserAsksParams {
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

export interface UserAsksData extends ContinuationParams {
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
                token: {
                    tokenId: string;
                    name?: string;
                    image?: string;
                };
                collection: TokenCollection & {
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
    }>;
}

export interface UserBidsParams {
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

export interface UserBidsData extends ContinuationParams {
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
    }>;
}

export interface UserTopBidsParams {
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

export interface UserTopBidsData extends UserBidsData {}
