import {
    Collection,
    Price,
    Source,
    ContinuationParams,
    SortParams,
    ActivityType,
} from "./common";

/**
 * Parameters for fetching collection floor ask events
 * @see https://docs.reservoir.tools/reference/geteventscollectionsflooraskv2
 */
export interface CollectionFloorAskEventParams {
    collection?: string;
    contract?: string;
    startTimestamp?: number;
    endTimestamp?: number;
    sortDirection?: "asc" | "desc";
    continuation?: string;
    limit?: number;
}

/**
 * Response data for a collection floor ask event
 */
export interface CollectionFloorAskEvent {
    collection: {
        id: string;
        name?: string;
        image?: string;
    };
    floorAsk: {
        id: string;
        price: Price;
        maker: string;
        validFrom: number;
        validUntil?: number;
        source?: Source;
    };
    event: {
        id: string;
        kind:
            | "new-order"
            | "expiry"
            | "sale"
            | "cancel"
            | "balance-change"
            | "approval-change"
            | "revalidation"
            | "reprice"
            | "bootstrap";
        previousPrice?: Price;
        newPrice: Price;
        createdAt: string;
    };
}

/**
 * Parameters for fetching collection top bid events
 * @see https://docs.reservoir.tools/reference/geteventscollectionstopbidv2
 */
export interface CollectionTopBidEventParams {
    collection?: string;
    contract?: string;
    startTimestamp?: number;
    endTimestamp?: number;
    sortDirection?: "asc" | "desc";
    continuation?: string;
    limit?: number;
}

/**
 * Response data for a collection top bid event
 */
export interface CollectionTopBidEvent {
    collection: {
        id: string;
        name?: string;
        image?: string;
    };
    topBid: {
        id: string;
        price: Price;
        maker: string;
        validFrom: number;
        validUntil?: number;
        source?: Source;
    };
    event: {
        id: string;
        kind:
            | "new-order"
            | "expiry"
            | "sale"
            | "cancel"
            | "balance-change"
            | "approval-change"
            | "revalidation"
            | "reprice"
            | "bootstrap";
        previousPrice?: Price;
        newPrice: Price;
        createdAt: string;
    };
}

/**
 * Parameters for fetching token floor ask events
 * @see https://docs.reservoir.tools/reference/geteventstokensflooraskv4
 */
export interface TokenFloorAskEventParams {
    contract?: string;
    token?: string;
    collection?: string;
    startTimestamp?: number;
    endTimestamp?: number;
    sortDirection?: "asc" | "desc";
    continuation?: string;
    limit?: number;
}

/**
 * Response data for a token floor ask event
 */
export interface TokenFloorAskEvent {
    token: {
        contract: string;
        tokenId: string;
        name?: string;
        image?: string;
        collection: {
            id: string;
            name?: string;
        };
    };
    floorAsk: {
        id: string;
        price: Price;
        maker: string;
        validFrom: number;
        validUntil?: number;
        source?: Source;
    };
    event: {
        id: string;
        kind:
            | "new-order"
            | "expiry"
            | "sale"
            | "cancel"
            | "balance-change"
            | "approval-change"
            | "revalidation"
            | "reprice"
            | "bootstrap";
        previousPrice?: Price;
        newPrice: Price;
        createdAt: string;
    };
}

export interface EventsParams extends ContinuationParams, SortParams {
    collection?: string;
    contract?: string;
    token?: string;
    types?: ActivityType[];
    includeMetadata?: boolean;
    startTimestamp?: number;
    endTimestamp?: number;
}

export interface EventData {
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

export interface EventsStatusParams {
    type: "sale" | "mint" | "transfer" | "bid" | "ask";
    txHash: string;
    fromBlock?: number;
    toBlock?: number;
}

export interface EventStatusData {
    status: "pending" | "success" | "failed";
    message?: string;
    error?: string;
    timestamp?: number;
    blockHash?: string;
    blockNumber?: number;
    from?: string;
    to?: string;
    transactionHash?: string;
}

export interface EventsTransfersParams extends ContinuationParams, SortParams {
    contract?: string;
    token?: string;
    collection?: string;
    fromAddress?: string;
    toAddress?: string;
    startTimestamp?: number;
    endTimestamp?: number;
}

export interface EventTransferData {
    id: string;
    type: "transfer" | "mint" | "burn";
    fromAddress: string;
    toAddress: string;
    amount: number;
    timestamp: number;
    token: {
        contract: string;
        tokenId: string;
        name?: string;
        image?: string;
        collection?: Collection;
    };
    event?: {
        id: string;
        kind: string;
    };
}
