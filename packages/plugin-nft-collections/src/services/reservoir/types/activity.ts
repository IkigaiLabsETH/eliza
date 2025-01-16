import { Price, Source, Continuation } from "./common";

export type ActivityType =
    | "sale"
    | "ask"
    | "transfer"
    | "mint"
    | "bid"
    | "bid_cancel"
    | "ask_cancel";

export interface ActivityBase {
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
    metadata?: Record<string, any>;
}

export interface ActivityParams {
    limit?: number;
    continuation?: string;
    types?: ActivityType[];
    includeMetadata?: boolean;
    sortBy?: "timestamp";
    sortDirection?: "asc" | "desc";
}

export interface UserActivityParams extends ActivityParams {
    users: string[];
    collection?: string;
    community?: string;
    includeTokenMetadata?: boolean;
}

export interface TokenActivityParams extends ActivityParams {
    token: string;
}

export interface CollectionActivityParams extends ActivityParams {
    collection: string;
    includeTokenMetadata?: boolean;
}

export type UserActivityData = ActivityBase;
export type TokenActivityData = ActivityBase;
export type CollectionActivityData = ActivityBase;
