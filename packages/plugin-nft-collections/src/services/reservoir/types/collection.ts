import { Price, Source, Continuation } from "./common";

export interface CollectionBase {
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
}

export interface CollectionStats {
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
}

export interface CollectionMarket {
    floorAsk?: {
        id: string;
        price: Price;
        maker: string;
        validFrom: number;
        validUntil: number;
    };
    topBid?: {
        id: string;
        price: Price;
        maker: string;
        validFrom: number;
        validUntil: number;
    };
}

export interface CollectionMetadata {
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
}

export interface CollectionSearchParams {
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

export interface CollectionSearchData {
    collection: CollectionBase &
        CollectionStats &
        CollectionMarket &
        CollectionMetadata & {
            chain: string;
        };
}

export interface TrendingCollectionsParams
    extends Omit<CollectionSearchParams, "name"> {
    period?: "1h" | "6h" | "24h" | "7d" | "30d";
    sortBy?: "volume" | "sales" | "floorAskPrice" | "floorSaleChange";
}

export interface TrendingCollectionData extends CollectionSearchData {
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

// Explore attributes interfaces
export interface ExploreAttributesParams {
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

export interface AttributeData {
    key: string;
    value: string;
    tokenCount: number;
    onSaleCount: number;
    sampleImages: string[];
    floorAskPrices?: Price[];
    topBidPrices?: Price[];
    lastSale?: {
        timestamp: number;
        price: Price;
    };
    salesCount?: {
        "1day": number;
        "7day": number;
        "30day": number;
        allTime: number;
    };
}
