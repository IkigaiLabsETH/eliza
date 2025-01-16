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
