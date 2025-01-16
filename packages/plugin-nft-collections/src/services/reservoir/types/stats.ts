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
