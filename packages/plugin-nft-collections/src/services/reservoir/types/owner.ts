import { Price } from "./common";

/**
 * Parameters for fetching owners
 * @see https://docs.reservoir.tools/reference/getownersv2
 */
export interface OwnersParams {
    collection?: string;
    contract?: string;
    token?: string;
    attributes?: Record<string, string>;
    offset?: number;
    limit?: number;
    sortBy?: "ownership" | "created";
    sortDirection?: "asc" | "desc";
}

/**
 * Response data for an owner
 */
export interface OwnerData {
    address: string;
    ownership: {
        tokenCount: number;
        onSaleCount: number;
        floorAskPrice?: Price;
        topBidValue?: number;
        totalBidValue?: number;
        lastBuyTimestamp?: number;
        lastSellTimestamp?: number;
    };
}

/**
 * Parameters for fetching common collections among owners
 * @see https://docs.reservoir.tools/reference/getownerscommoncollectionsv1
 */
export interface CommonCollectionsParams {
    owners: string[];
    limit?: number;
    offset?: number;
    includeTopBid?: boolean;
    includeAttributes?: boolean;
    includeDynamicPricing?: boolean;
    normalizeRoyalties?: boolean;
}

/**
 * Response data for common collections among owners
 */
export interface CommonCollectionData {
    collection: {
        id: string;
        name: string;
        image?: string;
        slug?: string;
        symbol?: string;
        contract: string;
        tokenCount: number;
        onSaleCount: number;
        primaryContract: string;
        tokenSetId: string;
        description?: string;
        sampleImages?: string[];
        royalties?: {
            recipient: string;
            breakdown: Array<{
                bps: number;
                recipient: string;
            }>;
            bps: number;
        };
        floorAsk?: {
            id: string;
            price: number;
            maker: string;
            validFrom: number;
            validUntil?: number;
        };
        topBid?: {
            id: string;
            price: number;
            maker: string;
            validFrom: number;
            validUntil?: number;
        };
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
        floorSale?: {
            "1day": number;
            "7day": number;
            "30day": number;
        };
        floorSaleChange?: {
            "1day": number;
            "7day": number;
            "30day": number;
        };
        ownerCount?: number;
        attributes?: Array<{
            key: string;
            kind: string;
            count: number;
        }>;
    };
    ownership: {
        tokenCount: number;
        onSaleCount: number;
        ownerCount: number;
        percentage: number;
    };
}

/**
 * Parameters for fetching owners intersection across collections
 * @see https://docs.reservoir.tools/reference/getownerscrosscollectionsv1
 */
export interface OwnersIntersectionParams {
    collections: string[];
    limit?: number;
    offset?: number;
    sortBy?: "ownershipScore" | "created";
    sortDirection?: "asc" | "desc";
}

/**
 * Response data for owners intersection
 */
export interface OwnersIntersectionData {
    address: string;
    ownership: {
        tokenCount: number;
        collections: Array<{
            id: string;
            name: string;
            image?: string;
            tokenCount: number;
            ownershipScore: number;
        }>;
        ownershipScore: number;
    };
}

/**
 * Response data for owners distribution
 * @see https://docs.reservoir.tools/reference/getcollectionscollectionownersdistributionv1
 */
export interface OwnersDistributionData {
    ownership: {
        tokenCount: number;
        ownerCount: number;
        ownerDistribution: Array<{
            tokenCount: number;
            ownerCount: number;
            percentage: number;
        }>;
    };
}
