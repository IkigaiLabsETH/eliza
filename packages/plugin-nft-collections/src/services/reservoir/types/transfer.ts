import { Price } from "./common";

/**
 * Parameters for fetching bulk historical transfers
 * @see https://docs.reservoir.tools/reference/gettransfersbulkv2
 */
export interface BulkTransfersParams {
    contract?: string;
    collection?: string;
    tokens?: string[];
    fromAddress?: string;
    toAddress?: string;
    limit?: number;
    continuation?: string;
    sortDirection?: "asc" | "desc";
}

/**
 * Response data for a bulk transfer
 */
export interface BulkTransferData {
    token: {
        contract: string;
        tokenId: string;
        name?: string;
        image?: string;
        collection?: {
            id: string;
            name: string;
        };
    };
    from: string;
    to: string;
    amount: number;
    timestamp: number;
    txHash: string;
    logIndex: number;
    batchIndex: number;
    price?: Price;
}
