import {
    Collection,
    Price,
    Source,
    ContinuationParams,
    SortParams,
    ActivityType,
} from "./common";

export interface CollectionAttribute {
    key: string;
    kind: string;
    count: number;
}

export interface CollectionStats {
    marketCap?: number;
    numOwners?: number;
    tokenCount?: number;
    onSaleCount?: number;
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
    };
    volume24h?: number;
    volumeChange24h?: number;
    volume7d?: number;
    volumeChange7d?: number;
    volume30d?: number;
    volumeChange30d?: number;
    volumeAll?: number;
}

export interface CollectionData extends Collection {
    id: string;
    name: string;
    description?: string;
    image?: string;
    symbol?: string;
    externalUrl?: string;
    twitterUsername?: string;
    discordUrl?: string;
    openseaVerificationStatus?: string;
    metadata?: {
        imageUrl?: string;
        bannerImageUrl?: string;
        description?: string;
        externalUrl?: string;
        discordUrl?: string;
        twitterUsername?: string;
    };
    stats?: CollectionStats;
    attributes?: CollectionAttribute[];
    contractKind?: string;
    tokenCount?: number;
    primaryContract?: string;
    tokenSetId?: string;
}

export interface CollectionV7Params extends ContinuationParams {
    id?: string;
    slug?: string;
    contract?: string;
    includeTopBid?: boolean;
    includeDynamicPricing?: boolean;
    includeAttributes?: boolean;
    includeStats?: boolean;
    includeSalesCount?: boolean;
    includeLastSale?: boolean;
    includeCreatorFees?: boolean;
    includeOwnerCount?: boolean;
    includeMarketplaces?: boolean;
    sortBy?: string;
    sortDirection?: "asc" | "desc";
    limit?: number;
}

export interface CollectionV7Response {
    collections: CollectionData[];
    continuation?: string;
}

export interface CollectionBidData {
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

export interface CollectionActivityData {
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
        side: "buy" | "sell";
        source?: Source;
    };
    event?: {
        id: string;
        kind: string;
    };
}

export interface CollectionActivityParams
    extends ContinuationParams,
        SortParams {
    collection: string;
    types?: ActivityType[];
    includeMetadata?: boolean;
}

export interface CollectionBidsParams extends ContinuationParams, SortParams {
    collection: string;
    normalizeRoyalties?: boolean;
    includeCriteriaMetadata?: boolean;
    includeRawData?: boolean;
    includeDynamicPricing?: boolean;
    currencies?: string[];
}
