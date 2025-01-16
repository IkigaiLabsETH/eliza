import { Price } from "./common";

/**
 * Parameters for fetching aggregate stats
 * @see https://docs.reservoir.tools/reference/getstatsv2
 */
export interface StatsParams {
    collection?: string;
    token?: string;
    attributes?: Record<string, string>;
    includeRawStats?: boolean;
}

/**
 * Response data for aggregate stats
 */
export interface StatsData {
    stats: {
        marketCap: number;
        count: number;
        avgPrice24h?: number;
        volume24h: number;
        volumeChange24h: number;
        floorAsk: {
            id: string;
            price: Price;
            maker: string;
            validFrom: number;
            validUntil?: number;
            source?: {
                id: string;
                domain: string;
                name: string;
                icon: string;
                url: string;
            };
        };
        topBid?: {
            id: string;
            price: Price;
            maker: string;
            validFrom: number;
            validUntil?: number;
            source?: {
                id: string;
                domain: string;
                name: string;
                icon: string;
                url: string;
            };
        };
    };
    rawStats?: {
        [key: string]: any;
    };
}

/**
 * Parameters for fetching daily collection volumes
 * @see https://docs.reservoir.tools/reference/getcollectionsdailyvolumesv1
 */
export interface DailyVolumesParams {
    startTimestamp?: number;
    endTimestamp?: number;
    limit?: number;
    continuation?: string;
    sortBy?: "volume" | "rank" | "date";
    sortDirection?: "asc" | "desc";
}

/**
 * Response data for daily collection volumes
 */
export interface DailyVolumeData {
    collections: Array<{
        id: string;
        name: string;
        image: string;
        date: string;
        volume: number;
        rank: number;
        salesCount: number;
    }>;
    continuation?: string;
}

/**
 * Response data for chain-wide mint and sales statistics
 * @see https://docs.reservoir.tools/reference/getchainstatsv1
 */
export interface ChainStatsData {
    /** Stats for the last 24 hours */
    "1day": {
        /** Total number of mints */
        mintCount: number;
        /** Total mint volume in native currency */
        mintVolume: number;
        /** Total number of sales */
        saleCount: number;
        /** Total sales volume in native currency */
        saleVolume: number;
    };
    /** Stats for the last 7 days */
    "7day": {
        /** Total number of mints */
        mintCount: number;
        /** Total mint volume in native currency */
        mintVolume: number;
        /** Total number of sales */
        saleCount: number;
        /** Total sales volume in native currency */
        saleVolume: number;
    };
}
