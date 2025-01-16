import { Price } from "./common";

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
        source?: {
            id: string;
            domain: string;
            name: string;
            icon: string;
            url: string;
        };
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
