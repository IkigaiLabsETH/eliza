import { BaseTradingService } from "./base";
import { OrderResponse, BaseOrderParams } from "../types/common";
import { IAgentRuntime } from "@elizaos/core";

export interface ExecuteOrderItem {
    token: string;
    quantity?: number;
    fillType?: "rest" | "partial";
    price?: number;
    orderIds?: string[];
    rawOrder?: {
        kind: string;
        data: Record<string, any>;
    };
}

export interface ExecuteListingItem {
    token: string;
    quantity?: number;
    weiPrice: string;
    orderKind?: string;
    orderbook?: string;
    orderSource?: string;
    options?: {
        [key: string]: any;
    };
}

export interface ExecuteOrderParams extends BaseOrderParams {
    items: ExecuteOrderItem[];
    taker: string;
    skipBalanceCheck?: boolean;
    currency?: string;
    onlyPath?: boolean;
    excludeEOA?: boolean;
    normalizeRoyalties?: boolean;
    allowInactiveOrderIds?: boolean;
    partial?: boolean;
    maxFeeBp?: number;
    maxPricePerToken?: number;
    source?: string;
    referrer?: string;
    referrerFeeBp?: number;
    preferredOrderSource?: string;
    forceRouter?: boolean;
    displayCurrency?: string;
}

export interface ExecuteListingParams extends BaseOrderParams {
    maker: string;
    items: ExecuteListingItem[];
    orderKind?: "seaport" | "looks-rare" | "x2y2" | "blur";
    orderbook?: "reservoir" | "opensea" | "looks-rare" | "x2y2" | "blur";
    automatedRoyalties?: boolean;
    currency?: string;
    fees?: Array<{
        recipient: string;
        amount: number;
    }>;
    listingTime?: string;
    expirationTime?: string;
    salt?: string;
    nonce?: string;
}

export interface ExecuteCancelParams extends BaseOrderParams {
    orderIds: string[];
    maker: string;
    onlyPath?: boolean;
}

export interface ExecuteMintParams extends BaseOrderParams {
    collection: string;
    minter: string;
    quantity?: number;
    token?: string;
    tokenId?: string;
    price?: string;
    preSignature?: string;
    merkleProof?: string[];
    merkleRoot?: string;
    contract?: string;
    mintArgs?: any[];
    mintFunction?: string;
    onlyPath?: boolean;
}

export interface CrossPostingOrderResponse {
    orders: Array<{
        id: string;
        status: "pending" | "success" | "failed";
        errors?: Array<{
            message: string;
            orderbook: string;
        }>;
    }>;
}

export interface TransactionSyncedResponse {
    synced: boolean;
}

export interface SignedOrderParams {
    orders: Array<{
        kind: string;
        data: Record<string, any>;
    }>;
    source?: string;
    orderbook?: "reservoir" | "opensea" | "looks-rare" | "x2y2" | "blur";
    isBundle?: boolean;
    normalizeRoyalties?: boolean;
    replaceOrderId?: string;
}

export interface SignedOrderResponse {
    orders: Array<{
        orderId: string;
        status: "success" | "failed";
        crossPostingOrderId?: string;
        errors?: Array<{
            message: string;
            orderbook?: string;
        }>;
    }>;
}

/**
 * Service for executing NFT orders
 * @see https://docs.reservoir.tools/reference/creating-and-filling-orders
 */
export class ExecuteService extends BaseTradingService {
    /**
     * Execute a buy order for NFTs
     * @see https://docs.reservoir.tools/reference/postexecutebuyv7
     *
     * @example
     * ```typescript
     * // Buy a single NFT
     * const response = await executeService.executeBuy({
     *   items: [{
     *     token: "0x8d04a8c79ceb0889bdd12acdf3fa9d207ed3ff63:123", // contract:tokenId
     *     quantity: 1
     *   }],
     *   taker: "0x...", // buyer wallet address
     *   source: "ikigai",
     *   excludeEOA: true // exclude Blur orders
     * }, runtime);
     *
     * // Buy multiple NFTs
     * const response = await executeService.executeBuy({
     *   items: [
     *     { token: "0x8d04a8c79ceb0889bdd12acdf3fa9d207ed3ff63:123", quantity: 1 },
     *     { token: "0x8d04a8c79ceb0889bdd12acdf3fa9d207ed3ff63:124", quantity: 1 }
     *   ],
     *   taker: "0x...",
     *   source: "ikigai",
     *   excludeEOA: true
     * }, runtime);
     *
     * // Buy with specific order IDs
     * const response = await executeService.executeBuy({
     *   items: [{
     *     token: "0x8d04a8c79ceb0889bdd12acdf3fa9d207ed3ff63:123",
     *     orderIds: ["0x..."]
     *   }],
     *   taker: "0x...",
     *   source: "ikigai"
     * }, runtime);
     * ```
     */
    async executeBuy(
        params: ExecuteOrderParams,
        runtime: IAgentRuntime
    ): Promise<OrderResponse> {
        // Validate required parameters
        if (!params.items?.length) {
            throw new Error("At least one item is required");
        }
        if (!params.taker) {
            throw new Error("Taker address is required");
        }

        // Set recommended defaults
        const enhancedParams = {
            ...params,
            excludeEOA: params.excludeEOA ?? true, // Exclude Blur orders by default
            source: params.source ?? "ikigai",
            partial: params.partial ?? false,
        };

        return this.executeOrder(
            "/execute/buy/v7",
            enhancedParams,
            "executeBuy",
            runtime
        );
    }

    /**
     * Execute a sell order for NFTs (accept bids)
     * @see https://docs.reservoir.tools/reference/postexecutesellv7
     *
     * @example
     * ```typescript
     * // Accept a single bid
     * const response = await executeService.executeSell({
     *   items: [{
     *     token: "0x8d04a8c79ceb0889bdd12acdf3fa9d207ed3ff63:123", // contract:tokenId
     *     quantity: 1
     *   }],
     *   taker: "0x...", // seller wallet address
     *   source: "ikigai",
     *   excludeEOA: true // exclude Blur orders
     * }, runtime);
     *
     * // Accept multiple bids
     * const response = await executeService.executeSell({
     *   items: [
     *     { token: "0x8d04a8c79ceb0889bdd12acdf3fa9d207ed3ff63:123", quantity: 1 },
     *     { token: "0x8d04a8c79ceb0889bdd12acdf3fa9d207ed3ff63:124", quantity: 1 }
     *   ],
     *   taker: "0x...",
     *   source: "ikigai",
     *   excludeEOA: true
     * }, runtime);
     *
     * // Accept specific bids by order ID
     * const response = await executeService.executeSell({
     *   items: [{
     *     token: "0x8d04a8c79ceb0889bdd12acdf3fa9d207ed3ff63:123",
     *     orderIds: ["0x..."] // specific bid order IDs to accept
     *   }],
     *   taker: "0x...",
     *   source: "ikigai"
     * }, runtime);
     * ```
     */
    async executeSell(
        params: ExecuteOrderParams,
        runtime: IAgentRuntime
    ): Promise<OrderResponse> {
        // Validate required parameters
        if (!params.items?.length) {
            throw new Error("At least one item is required");
        }
        if (!params.taker) {
            throw new Error("Taker address is required");
        }

        // Validate each item has required fields
        params.items.forEach((item, index) => {
            if (!item.token) {
                throw new Error(`Token is required for item at index ${index}`);
            }
            if (item.quantity !== undefined && item.quantity < 1) {
                throw new Error(`Invalid quantity for item at index ${index}`);
            }
        });

        // Set recommended defaults
        const enhancedParams = {
            ...params,
            source: params.source ?? "ikigai",
            partial: params.partial ?? false,
            excludeEOA: params.excludeEOA ?? true, // Exclude Blur orders by default
        };

        return this.executeOrder(
            "/execute/sell/v7",
            enhancedParams,
            "executeSell",
            runtime
        );
    }

    /**
     * Execute a bid (offer) for NFTs
     * @see https://docs.reservoir.tools/reference/postexecutebidv7
     */
    async executeBid(
        params: ExecuteOrderParams,
        runtime: IAgentRuntime
    ): Promise<OrderResponse> {
        // Validate required parameters
        if (!params.items?.length) {
            throw new Error("At least one item is required");
        }
        if (!params.taker) {
            throw new Error("Taker address is required");
        }

        // Set recommended defaults
        const enhancedParams = {
            ...params,
            source: params.source ?? "ikigai",
            partial: params.partial ?? false,
        };

        return this.executeOrder(
            "/execute/bid/v7",
            enhancedParams,
            "executeBid",
            runtime
        );
    }

    /**
     * Generate listings and submit them to multiple marketplaces
     * @see https://docs.reservoir.tools/reference/postexecutelistv5
     *
     * @example
     * ```typescript
     * // List a single NFT
     * const response = await executeService.executeListing({
     *   maker: "0x...", // seller wallet address
     *   items: [{
     *     token: "0x8d04a8c79ceb0889bdd12acdf3fa9d207ed3ff63:123", // contract:tokenId
     *     weiPrice: "1000000000000000000", // 1 ETH in wei
     *     quantity: 1
     *   }],
     *   orderKind: "seaport", // optional: specific marketplace
     *   orderbook: "reservoir", // optional: specific orderbook
     *   automatedRoyalties: true,
     *   source: "ikigai"
     * }, runtime);
     *
     * // List multiple NFTs
     * const response = await executeService.executeListing({
     *   maker: "0x...",
     *   items: [
     *     {
     *       token: "0x8d04a8c79ceb0889bdd12acdf3fa9d207ed3ff63:123",
     *       weiPrice: "1000000000000000000",
     *       quantity: 1
     *     },
     *     {
     *       token: "0x8d04a8c79ceb0889bdd12acdf3fa9d207ed3ff63:124",
     *       weiPrice: "2000000000000000000",
     *       quantity: 1
     *     }
     *   ],
     *   automatedRoyalties: true,
     *   source: "ikigai"
     * }, runtime);
     * ```
     */
    async executeListing(
        params: ExecuteListingParams,
        runtime: IAgentRuntime
    ): Promise<OrderResponse> {
        // Validate required parameters
        if (!params.items?.length) {
            throw new Error("At least one item is required");
        }
        if (!params.maker) {
            throw new Error("Maker address is required");
        }

        // Validate weiPrice for each item
        params.items.forEach((item, index) => {
            if (!item.weiPrice) {
                throw new Error(`Price is required for item at index ${index}`);
            }
            if (!item.token) {
                throw new Error(`Token is required for item at index ${index}`);
            }
        });

        // Set recommended defaults
        const enhancedParams = {
            ...params,
            source: params.source ?? "ikigai",
            automatedRoyalties: params.automatedRoyalties ?? true,
        };

        return this.executeOrder(
            "/execute/list/v5",
            enhancedParams,
            "executeListing",
            runtime
        );
    }

    /**
     * Cancel existing orders on any marketplace
     * @see https://docs.reservoir.tools/reference/postexecutecancelv3
     *
     * @example
     * ```typescript
     * // Cancel specific orders
     * const response = await executeService.executeCancel({
     *   orderIds: ["0x...", "0x..."],
     *   maker: "0x...", // wallet address that created the orders
     *   source: "ikigai"
     * }, runtime);
     * ```
     */
    async executeCancel(
        params: ExecuteCancelParams,
        runtime: IAgentRuntime
    ): Promise<OrderResponse> {
        // Validate required parameters
        if (!params.orderIds?.length) {
            throw new Error("At least one order ID is required");
        }
        if (!params.maker) {
            throw new Error("Maker address is required");
        }

        // Set recommended defaults
        const enhancedParams = {
            ...params,
            source: params.source ?? "ikigai",
        };

        return this.executeOrder(
            "/execute/cancel/v3",
            enhancedParams,
            "executeCancel",
            runtime
        );
    }

    /**
     * Execute a mint for NFTs
     * @see https://docs.reservoir.tools/reference/postexecutemintv1
     *
     * @example
     * ```typescript
     * // Basic mint
     * const response = await executeService.executeMint({
     *   collection: "0x8d04a8c79ceb0889bdd12acdf3fa9d207ed3ff63",
     *   minter: "0x...", // minter wallet address
     *   quantity: 1,
     *   source: "ikigai"
     * }, runtime);
     *
     * // Mint with merkle proof
     * const response = await executeService.executeMint({
     *   collection: "0x8d04a8c79ceb0889bdd12acdf3fa9d207ed3ff63",
     *   minter: "0x...",
     *   quantity: 1,
     *   merkleProof: ["0x...", "0x..."],
     *   source: "ikigai"
     * }, runtime);
     *
     * // Mint specific token ID
     * const response = await executeService.executeMint({
     *   collection: "0x8d04a8c79ceb0889bdd12acdf3fa9d207ed3ff63",
     *   minter: "0x...",
     *   tokenId: "123",
     *   source: "ikigai"
     * }, runtime);
     * ```
     */
    async executeMint(
        params: ExecuteMintParams,
        runtime: IAgentRuntime
    ): Promise<OrderResponse> {
        // Validate required parameters
        if (!params.collection) {
            throw new Error("Collection address is required");
        }
        if (!params.minter) {
            throw new Error("Minter address is required");
        }

        // Set recommended defaults
        const enhancedParams = {
            ...params,
            source: params.source ?? "ikigai",
            quantity: params.quantity ?? 1,
        };

        return this.executeOrder(
            "/execute/mint/v1",
            enhancedParams,
            "executeMint",
            runtime
        );
    }

    /**
     * Check the status of cross-posted orders
     * @see https://docs.reservoir.tools/reference/getcrosspostingordersv1
     *
     * @example
     * ```typescript
     * // Check status of a single order
     * const response = await executeService.checkCrossPostingStatus({
     *   orderIds: ["0x..."] // crossPostingOrderId from execute response
     * }, runtime);
     *
     * // Check status of multiple orders
     * const response = await executeService.checkCrossPostingStatus({
     *   orderIds: ["0x...", "0x..."]
     * }, runtime);
     * ```
     */
    async checkCrossPostingStatus(
        params: { orderIds: string[] },
        runtime: IAgentRuntime
    ): Promise<CrossPostingOrderResponse> {
        if (!params.orderIds?.length) {
            throw new Error("At least one order ID is required");
        }

        const queryParams = new URLSearchParams();
        params.orderIds.forEach((id) => queryParams.append("ids", id));

        return this.get(
            `/cross-posting-orders/v1?${queryParams.toString()}`,
            runtime
        );
    }

    /**
     * Check if a transaction has been synced
     * @see https://docs.reservoir.tools/reference/gettransactionssyncedv2
     *
     * @example
     * ```typescript
     * // Check if a transaction is synced
     * const response = await executeService.checkTransactionSynced({
     *   txHash: "0x...", // transaction hash
     * }, runtime);
     * ```
     */
    async checkTransactionSynced(
        params: { txHash: string },
        runtime: IAgentRuntime
    ): Promise<TransactionSyncedResponse> {
        if (!params.txHash) {
            throw new Error("Transaction hash is required");
        }

        return this.get(
            `/transactions/synced/v2?txHash=${params.txHash}`,
            runtime
        );
    }

    /**
     * Check if a specific transaction has been synced (alternative endpoint)
     * @see https://docs.reservoir.tools/reference/gettransactionstxhashsyncedv1
     *
     * @example
     * ```typescript
     * // Check if a transaction is synced using alternative endpoint
     * const response = await executeService.checkTransactionSyncedV1({
     *   txHash: "0x...", // transaction hash
     * }, runtime);
     * ```
     */
    async checkTransactionSyncedV1(
        params: { txHash: string },
        runtime: IAgentRuntime
    ): Promise<TransactionSyncedResponse> {
        if (!params.txHash) {
            throw new Error("Transaction hash is required");
        }

        return this.get(`/transactions/${params.txHash}/synced/v1`, runtime);
    }

    /**
     * Submit pre-signed orders to Reservoir
     * @see https://docs.reservoir.tools/reference/postorderv4
     *
     * @example
     * ```typescript
     * // Submit a single signed order
     * const response = await executeService.submitSignedOrders({
     *   orders: [{
     *     kind: "seaport",
     *     data: {
     *       // Seaport order data
     *       parameters: {},
     *       signature: "0x..."
     *     }
     *   }],
     *   source: "ikigai",
     *   orderbook: "reservoir"
     * }, runtime);
     *
     * // Submit multiple signed orders
     * const response = await executeService.submitSignedOrders({
     *   orders: [
     *     {
     *       kind: "seaport",
     *       data: {
     *         parameters: {},
     *         signature: "0x..."
     *       }
     *     },
     *     {
     *       kind: "looks-rare",
     *       data: {
     *         parameters: {},
     *         signature: "0x..."
     *       }
     *     }
     *   ],
     *   source: "ikigai",
     *   normalizeRoyalties: true
     * }, runtime);
     * ```
     */
    async submitSignedOrders(
        params: SignedOrderParams,
        runtime: IAgentRuntime
    ): Promise<SignedOrderResponse> {
        // Validate required parameters
        if (!params.orders?.length) {
            throw new Error("At least one order is required");
        }

        // Validate each order has required fields
        params.orders.forEach((order, index) => {
            if (!order.kind) {
                throw new Error(
                    `Order kind is required for order at index ${index}`
                );
            }
            if (!order.data || Object.keys(order.data).length === 0) {
                throw new Error(
                    `Order data is required for order at index ${index}`
                );
            }
        });

        // Set recommended defaults
        const enhancedParams = {
            ...params,
            source: params.source ?? "ikigai",
        };

        return this.executeOrder(
            "/order/v4",
            enhancedParams,
            "submitSignedOrders",
            runtime
        );
    }
}
