export * from "./common";
export * from "./activity";
export * from "./collection";
export * from "./token";
export * from "./user";
export * from "./market";

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

export interface TokenBootstrapParams {
    collection?: string;
    tokens?: string[];
    includeAttributes?: boolean;
    includeTopBid?: boolean;
    includeDynamicPricing?: boolean;
    includeLastSale?: boolean;
    includeRawData?: boolean;
}

export interface TokenBootstrapResponse {
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
}

export interface TokenFloorParams {
    collection?: string;
    token?: string;
    normalizeRoyalties?: boolean;
    displayCurrency?: string;
}

export interface TokenFloorResponse {
    tokens: Array<{
        token: {
            contract: string;
            tokenId: string;
            name?: string;
            image?: string;
            collection: {
                id: string;
                name?: string;
                image?: string;
            };
        };
        market: {
            floorAsk: {
                id: string;
                price: {
                    currency: {
                        contract: string;
                        name: string;
                        symbol: string;
                        decimals: number;
                    };
                    amount: {
                        raw: string;
                        decimal: number;
                        usd?: number;
                        native: number;
                    };
                };
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
    }>;
}

export interface TokenAsksParams {
    token: string;
    sortBy?: "price" | "createdAt";
    sortDirection?: "asc" | "desc";
    normalizeRoyalties?: boolean;
    continuation?: string;
    limit?: number;
}

export interface TokenAsksResponse {
    asks: Array<{
        id: string;
        price: {
            currency: {
                contract: string;
                name: string;
                symbol: string;
                decimals: number;
            };
            amount: {
                raw: string;
                decimal: number;
                usd?: number;
                native: number;
            };
        };
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
        isDynamic?: boolean;
        criteria?: {
            kind: string;
            data: {
                token: {
                    tokenId: string;
                    name?: string;
                };
                collection: {
                    id: string;
                    name?: string;
                    image?: string;
                };
            };
        };
    }>;
    continuation?: string;
}

export interface TokenBidsParams {
    token: string;
    sortBy?: "price" | "createdAt";
    sortDirection?: "asc" | "desc";
    normalizeRoyalties?: boolean;
    continuation?: string;
    limit?: number;
}

export interface TokenBidsResponse {
    bids: Array<{
        id: string;
        price: {
            currency: {
                contract: string;
                name: string;
                symbol: string;
                decimals: number;
            };
            amount: {
                raw: string;
                decimal: number;
                usd?: number;
                native: number;
            };
        };
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
        isDynamic?: boolean;
        criteria?: {
            kind: string;
            data: {
                token: {
                    tokenId: string;
                    name?: string;
                };
                collection: {
                    id: string;
                    name?: string;
                    image?: string;
                };
            };
        };
    }>;
    continuation?: string;
}
