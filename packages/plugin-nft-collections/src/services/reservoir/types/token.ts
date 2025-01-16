import { Price, Source } from "./common";

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

export interface TokenFloorParams {
    tokens?: string[];
    collection?: string;
    normalizeRoyalties?: boolean;
    includeDynamicPricing?: boolean;
    currencies?: string[];
}

export interface TokenFloorData {
    id: string;
    collection: {
        id: string;
        name: string;
    };
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

export interface TokenAsksParams {
    token: string;
    sortBy?: "price" | "createdAt";
    sortDirection?: "asc" | "desc";
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
            collection?: TokenCollection & {
                royalties?: Array<{
                    bps: number;
                    recipient: string;
                }>;
            };
        };
    };
    dynamicPricing?: {
        kind: string;
        data: Record<string, any>;
    };
}

/**
 * Parameters for bootstrapping token data
 */
export interface TokenBootstrapParams {
    collection?: string;
    tokens?: string[];
    includeAttributes?: boolean;
    includeTopBid?: boolean;
    includeDynamicPricing?: boolean;
    includeLastSale?: boolean;
    includeRawData?: boolean;
}

/**
 * Comprehensive token data structure
 */
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
        collection?: {
            id: string;
            name: string;
            image?: string;
            slug?: string;
        };
        attributes?: TokenAttribute[];
        lastSale?: {
            price: number;
            timestamp: string;
        };
        owner?: string;
        lastAppraisalValue?: number;
    };
    market?: {
        floorAsk?: {
            id: string;
            price: number;
            maker: string;
            validFrom: number;
            validUntil: number;
        };
        topBid?: {
            id: string;
            price: number;
            maker: string;
            validFrom: number;
            validUntil: number;
        };
    };
}
