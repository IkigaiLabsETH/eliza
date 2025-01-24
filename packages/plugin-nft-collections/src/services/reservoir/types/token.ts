import {
    Collection,
    Price,
    Source,
    ContinuationParams,
    SortParams,
    ActivityType,
} from "./common";

export interface TokenAttribute {
    key: string;
    value: string;
    tokenCount?: number;
    onSaleCount?: number;
    floorAskPrice?: number;
    topBidValue?: number;
}

export interface TokenBase {
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
}

export interface TokenCollection {
    id: string;
    name: string;
    image?: string;
    slug?: string;
}

export interface TokenMarket {
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
}

export interface TokenOwnership {
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
}

export interface TokenMetadataParams {
    collection?: string;
    tokens?: string[];
    includeAttributes?: boolean;
    includeTopBid?: boolean;
    includeDynamicPricing?: boolean;
    includeLastSale?: boolean;
    includeRawData?: boolean;
}

export interface TokenMetadata {
    token: TokenBase & {
        collection?: TokenCollection;
        attributes?: TokenAttribute[];
        lastSale?: {
            price: number;
            timestamp: string;
        };
        owner?: string;
        lastAppraisalValue?: number;
    };
    market?: TokenMarket;
}

export interface TokenData {
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
        attributes?: TokenAttribute[];
        lastSale?: {
            price: Price;
            timestamp: string;
        };
        owner?: string;
        lastAppraisalValue?: number;
    };
    market?: {
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
    };
}

export interface TokenBootstrapParams extends ContinuationParams {
    collection?: string;
    tokens?: string[];
    includeAttributes?: boolean;
    includeTopBid?: boolean;
    includeDynamicPricing?: boolean;
    includeLastSale?: boolean;
    includeRawData?: boolean;
}

export interface TokenFloorParams {
    tokens?: string[];
    collection?: string;
    normalizeRoyalties?: boolean;
    includeDynamicPricing?: boolean;
    currencies?: string[];
}

export interface TokenFloorData {
    id: string;
    collection: Collection;
    contract: string;
    tokenId: string;
    floorAsk: {
        id: string;
        price: Price;
        maker: string;
        validFrom: number;
        validUntil: number;
        source: Source;
    };
}

export interface TokenAsksParams extends ContinuationParams, SortParams {
    token: string;
    normalizeRoyalties?: boolean;
    includeCriteriaMetadata?: boolean;
    includeRawData?: boolean;
    includeDynamicPricing?: boolean;
    currencies?: string[];
}

export interface TokenAskData {
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
            collection: Collection;
        };
    };
    dynamicPricing?: {
        kind: string;
        data: Record<string, any>;
    };
}

export interface TokenBidsParams extends ContinuationParams, SortParams {
    token: string;
    normalizeRoyalties?: boolean;
    includeCriteriaMetadata?: boolean;
    includeRawData?: boolean;
    includeDynamicPricing?: boolean;
    currencies?: string[];
}

export interface TokenBidData {
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
            collection: Collection;
        };
    };
    dynamicPricing?: {
        kind: string;
        data: Record<string, any>;
    };
}

export interface TokenActivityParams extends ContinuationParams, SortParams {
    token: string;
    types?: ActivityType[];
    includeMetadata?: boolean;
}

export interface TokenActivityData {
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
        collection?: Collection;
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
