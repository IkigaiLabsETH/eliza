import { Price, Source, Continuation } from "./common";
import {
    TokenBase,
    TokenCollection,
    TokenMarket,
    TokenAttribute,
} from "./token";

export interface UserTokensParams {
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

export interface UserTokensData extends Continuation {
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

export interface UserAsksData extends Continuation {
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

export interface UserBidsData extends Continuation {
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
