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
