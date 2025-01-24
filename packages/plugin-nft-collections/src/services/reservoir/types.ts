import type { Collection, Price, Source } from "./types/common";

export interface TokenAttribute {
    key: string;
    value: string;
    tokenCount?: number;
    onSaleCount?: number;
    floorAskPrice?: number;
    topBidValue?: number;
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

export interface CollectionActivityData {
    id: string;
    type:
        | "sale"
        | "ask"
        | "transfer"
        | "mint"
        | "bid"
        | "bid_cancel"
        | "ask_cancel";
    fromAddress: string;
    toAddress?: string;
    price?: {
        currency: {
            contract: string;
            name: string;
            symbol: string;
            decimals: number;
        };
        amount: {
            raw: string;
            decimal: number;
            usd: number;
            native: number;
        };
    };
    timestamp: number;
    token: {
        contract: string;
        tokenId: string;
        name?: string;
        image?: string;
        collection: {
            id: string;
            name: string;
            image?: string;
            slug?: string;
        };
    };
    order?: {
        id: string;
        side: "ask" | "bid";
        source?: {
            domain: string;
            name: string;
            icon: string;
        };
    };
}

export interface TokensParams {
    collection?: string;
    tokens?: string[];
    attributes?: Record<string, string>;
    limit?: number;
    continuation?: string;
    sortBy?: "floorAskPrice" | "tokenId" | "rarity" | "lastSalePrice";
    sortDirection?: "asc" | "desc";
    includeAttributes?: boolean;
    includeTopBid?: boolean;
    includeDynamicPricing?: boolean;
    includeLastSale?: boolean;
    includeRawData?: boolean;
}

export interface TokensResponse {
    tokens: Array<{
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
            lastFlagChange?: string;
            supply?: string;
            remainingSupply?: string;
            rarity?: number;
            rarityRank?: number;
            collection?: {
                id: string;
                name?: string;
                image?: string;
                slug?: string;
            };
            attributes?: Array<{
                key: string;
                value: string;
                tokenCount?: number;
                onSaleCount?: number;
                floorAskPrice?: string;
                topBidValue?: string;
                createdAt?: string;
            }>;
        };
        market?: {
            floorAsk?: {
                id: string;
                price?: {
                    currency: string;
                    amount: string;
                };
                maker?: string;
                validFrom?: number;
                validUntil?: number;
                source?: {
                    id: string;
                    name?: string;
                    icon?: string;
                    url?: string;
                };
            };
            topBid?: {
                id: string;
                price: {
                    currency: string;
                    amount: string;
                };
                maker?: string;
                validFrom?: number;
                validUntil?: number;
                source?: {
                    id: string;
                    name?: string;
                    icon?: string;
                    url?: string;
                };
            };
        };
        lastSale?: {
            timestamp: number;
            price: {
                currency: string;
                amount: string;
            };
            marketplace?: string;
            orderSource?: string;
            fillSource?: string;
            txHash?: string;
        };
    }>;
    continuation?: string;
}
