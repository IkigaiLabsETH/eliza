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

export interface CollectionV7Params extends CollectionSearchParams {
    id?: string;
    contract?: string;
    slug?: string;
    sortBy?:
        | "1DayVolume"
        | "7DayVolume"
        | "30DayVolume"
        | "allTimeVolume"
        | "createdAt"
        | "floorAskPrice";
    sortDirection?: "asc" | "desc";
    continuation?: string;
    displayCurrency?: string;
    includeTopBid?: boolean;
    includeLowQuantityAsk?: boolean;
    includeLastSale?: boolean;
    includeSalesCount?: boolean;
    includeCreatorFees?: boolean;
    includeMintStages?: boolean;
    includeAttributes?: boolean;
    includeOwnerCount?: boolean;
    includeMarketplaces?: boolean;
}

export interface CollectionV7Response {
    collections: Array<{
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
        onSaleCount?: number;
        primaryContract: string;
        tokenSetId?: string;
        contractKind?: string;
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
        floorAsk?: {
            id: string;
            price: Price;
            maker: string;
            validFrom: number;
            validUntil: number;
            source?: Source;
        };
        topBid?: {
            id: string;
            price: Price;
            maker: string;
            validFrom: number;
            validUntil: number;
            source?: Source;
        };
        lastSale?: {
            timestamp: number;
            price: Price;
            token?: {
                tokenId: string;
                image?: string;
                name?: string;
            };
        };
        salesCount?: {
            "1day": number;
            "7day": number;
            "30day": number;
            allTime: number;
        };
        creatorFees?: {
            recipient: string;
            bps: number;
        }[];
        attributes?: Array<{
            key: string;
            kind: string;
            count: number;
        }>;
        ownerCount?: number;
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
    }>;
    continuation?: string;
}
