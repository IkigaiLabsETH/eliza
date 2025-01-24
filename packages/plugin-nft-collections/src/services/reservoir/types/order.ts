import {
    Collection,
    Price,
    Source,
    ContinuationParams,
    SortParams,
} from "./common";

export interface OrderCriteria {
    kind: string;
    data: {
        token?: {
            tokenId: string;
            name?: string;
            image?: string;
        };
        collection?: Collection;
        attribute?: {
            key: string;
            value: string;
        };
    };
}

export interface OrderData {
    id: string;
    kind: string;
    side: "buy" | "sell";
    status: "active" | "inactive" | "expired" | "cancelled" | "filled";
    tokenSetId: string;
    tokenSetSchemaHash?: string;
    contract: string;
    maker: string;
    taker?: string;
    price: Price;
    validFrom: number;
    validUntil: number;
    quantityFilled: number;
    quantityRemaining: number;
    criteria?: OrderCriteria;
    source?: Source;
    feeBps?: number;
    feeBreakdown?: Array<{
        bps: number;
        kind: string;
        recipient: string;
    }>;
    expiration?: number;
    isReservoir?: boolean;
    createdAt?: string;
    updatedAt?: string;
}

export interface OrderParams extends ContinuationParams, SortParams {
    id?: string;
    status?: "active" | "inactive" | "expired" | "cancelled" | "filled";
    tokenSetId?: string;
    maker?: string;
    taker?: string;
    contract?: string;
    token?: string;
    collection?: string;
    includeCriteriaMetadata?: boolean;
    includeRawData?: boolean;
    includeDynamicPricing?: boolean;
    normalizeRoyalties?: boolean;
    currencies?: string[];
}

export interface OrderQuoteParams {
    token: string;
    side: "buy" | "sell";
    quantity?: number;
    currency?: string;
    normalizeRoyalties?: boolean;
    onlyPath?: boolean;
}

export interface OrderQuoteData {
    quote: {
        currencyPrice: Price;
        netAmount: Price;
        grossAmount: Price;
    };
    path?: Array<{
        orderId: string;
        contract: string;
        tokenId: string;
        quantity: number;
        source: Source;
        currency: string;
        currencyPrice: number;
        netAmount: number;
        grossAmount: number;
    }>;
}

export interface OrderExecuteParams {
    id: string;
    taker: string;
    quantity?: number;
    referrer?: string;
    onlyPath?: boolean;
    partial?: boolean;
    maxFeePerGas?: string;
    maxPriorityFeePerGas?: string;
}

export interface OrderExecuteData {
    steps: Array<{
        id: string;
        action: string;
        description: string;
        kind: string;
        items: Array<{
            status: string;
            data?: Record<string, any>;
            orderIds?: string[];
        }>;
    }>;
    path?: Array<{
        orderId: string;
        contract: string;
        tokenId: string;
        quantity: number;
        source: Source;
        currency: string;
        currencyPrice: number;
        netAmount: number;
        grossAmount: number;
    }>;
}
