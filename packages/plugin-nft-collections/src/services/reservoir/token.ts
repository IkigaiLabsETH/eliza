import { BaseReservoirService, ReservoirServiceConfig } from "./base";
import { IAgentRuntime } from "@elizaos/core";
import {
    TokenMetadataParams,
    TokenMetadata,
    TokenActivityParams,
    TokenActivityData,
    TokensParams,
    TokensResponse,
    TokenBootstrapParams,
    TokenBootstrapResponse,
    TokenFloorParams,
    TokenFloorResponse,
    TokenAsksParams,
    TokenAsksResponse,
    TokenBidsParams,
    TokenBidsResponse,
} from "./types";

export class TokenService extends BaseReservoirService {
    constructor(config: ReservoirServiceConfig = {}) {
        super(config);
    }

    /**
     * Get tokens with optional filtering, sorting, and pagination
     * @see https://docs.reservoir.tools/reference/gettokensv7
     *
     * @example
     * ```typescript
     * // Get tokens from a specific collection
     * const response = await tokenService.getTokens({
     *   collection: "0x8d04a8c79ceb0889bdd12acdf3fa9d207ed3ff63",
     *   limit: 20,
     *   sortBy: "floorAskPrice",
     *   includeAttributes: true,
     * }, runtime);
     *
     * // Get tokens with specific token IDs
     * const response = await tokenService.getTokens({
     *   tokens: [
     *     "0x8d04a8c79ceb0889bdd12acdf3fa9d207ed3ff63:1",
     *     "0x8d04a8c79ceb0889bdd12acdf3fa9d207ed3ff63:2"
     *   ],
     *   includeTopBid: true,
     * }, runtime);
     * ```
     */
    async getTokens(
        params: TokensParams,
        runtime: IAgentRuntime
    ): Promise<TokensResponse> {
        const endOperation = this.performanceMonitor.startOperation(
            "getTokens",
            { params }
        );

        try {
            if (!params.collection && !params.tokens?.length) {
                throw new Error(
                    "Either collection or tokens parameter must be provided"
                );
            }

            const queryParams = new URLSearchParams();

            // Add required parameters
            if (params.collection) {
                queryParams.append("collection", params.collection);
            }
            if (params.tokens?.length) {
                params.tokens.forEach((token) =>
                    queryParams.append("tokens", token)
                );
            }

            // Add optional parameters
            if (params.attributes) {
                Object.entries(params.attributes).forEach(([key, value]) => {
                    queryParams.append("attributes", `${key}:${value}`);
                });
            }
            if (params.limit) {
                queryParams.append("limit", params.limit.toString());
            }
            if (params.continuation) {
                queryParams.append("continuation", params.continuation);
            }
            if (params.sortBy) {
                queryParams.append("sortBy", params.sortBy);
            }
            if (params.sortDirection) {
                queryParams.append("sortDirection", params.sortDirection);
            }

            // Add boolean flags
            const booleanFlags = [
                "includeAttributes",
                "includeTopBid",
                "includeDynamicPricing",
                "includeLastSale",
                "includeRawData",
            ] as const;

            booleanFlags.forEach((flag) => {
                if (params[flag]) {
                    queryParams.append(flag, "true");
                }
            });

            return this.cachedRequest<TokensResponse>(
                `/tokens/v7?${queryParams.toString()}`,
                {
                    method: "GET",
                },
                runtime,
                {
                    ttl: 60, // Cache for 1 minute
                    context: "tokens",
                }
            );
        } catch (error) {
            console.error("Error in getTokens:", error);
            throw error;
        } finally {
            endOperation();
        }
    }

    /**
     * Get comprehensive token data including market data, attributes, and more.
     * @see https://docs.reservoir.tools/reference/gettokensbootstrapv1
     *
     * @example
     * ```typescript
     * // Get bootstrap data for a collection
     * const response = await tokenService.getTokensBootstrap({
     *   collection: "0x8d04a8c79ceb0889bdd12acdf3fa9d207ed3ff63",
     *   includeAttributes: true,
     *   includeTopBid: true,
     * }, runtime);
     *
     * // Get bootstrap data for specific tokens
     * const response = await tokenService.getTokensBootstrap({
     *   tokens: [
     *     "0x8d04a8c79ceb0889bdd12acdf3fa9d207ed3ff63:1",
     *     "0x8d04a8c79ceb0889bdd12acdf3fa9d207ed3ff63:2"
     *   ],
     *   includeLastSale: true,
     * }, runtime);
     * ```
     */
    async getTokensBootstrap(
        params: TokenBootstrapParams,
        runtime: IAgentRuntime
    ): Promise<TokenBootstrapResponse> {
        const endOperation = this.performanceMonitor.startOperation(
            "getTokensBootstrap",
            { params }
        );

        try {
            if (!params.collection && !params.tokens?.length) {
                throw new Error(
                    "Either collection or tokens parameter must be provided"
                );
            }

            const queryParams = new URLSearchParams();

            // Add required parameters
            if (params.collection) {
                queryParams.append("collection", params.collection);
            }
            if (params.tokens?.length) {
                params.tokens.forEach((token) =>
                    queryParams.append("tokens", token)
                );
            }

            // Add boolean flags
            const booleanFlags = [
                "includeAttributes",
                "includeTopBid",
                "includeDynamicPricing",
                "includeLastSale",
                "includeRawData",
            ] as const;

            booleanFlags.forEach((flag) => {
                if (params[flag]) {
                    queryParams.append(flag, "true");
                }
            });

            return this.cachedRequest<TokenBootstrapResponse>(
                `/tokens/bootstrap/v1?${queryParams.toString()}`,
                {
                    method: "GET",
                },
                runtime,
                {
                    ttl: 300, // Cache for 5 minutes
                    context: "tokens_bootstrap",
                }
            );
        } catch (error) {
            console.error("Error in getTokensBootstrap:", error);
            throw error;
        } finally {
            endOperation();
        }
    }

    /**
     * Get detailed information about a specific token
     * @param collection Collection address
     * @param tokenId Token ID
     * @param runtime Agent runtime
     */
    async getTokenMetadata(
        collection: string,
        tokenId: string,
        runtime: IAgentRuntime
    ): Promise<TokenMetadata> {
        const tokens = await this.getTokensBootstrap(
            {
                tokens: [`${collection}:${tokenId}`],
                includeAttributes: true,
                includeTopBid: true,
                includeDynamicPricing: true,
                includeLastSale: true,
                includeRawData: true,
            },
            runtime
        );

        if (!tokens.tokens.length) {
            throw new Error(`Token ${collection}:${tokenId} not found`);
        }

        return tokens.tokens[0] as unknown as TokenMetadata;
    }

    /**
     * Get token activity (sales, listings, etc.)
     * @see https://docs.reservoir.tools/reference/gettokensactivityv6
     */
    async getTokenActivity(
        params: TokenActivityParams,
        runtime: IAgentRuntime
    ): Promise<TokenActivityData[]> {
        const endOperation = this.performanceMonitor.startOperation(
            "getTokenActivity",
            { params }
        );

        try {
            const response = await this.cachedRequest<{
                activities: TokenActivityData[];
                continuation?: string;
            }>("/tokens/activity/v6", params, runtime, {
                ttl: 60, // 1 minute cache for activity
                context: "tokens_activity",
            });

            endOperation();
            return response.activities;
        } catch (error) {
            console.error("Error fetching token activity:", error);
            this.performanceMonitor.recordMetric({
                operation: "getTokenActivity",
                duration: 0,
                success: false,
                metadata: {
                    error: error.message,
                    params,
                },
            });
            throw error;
        }
    }

    /**
     * Get activity feed for a specific token
     * @param collection Collection address
     * @param tokenId Token ID
     * @param runtime Agent runtime
     */
    async getTokenActivityFeed(
        collection: string,
        tokenId: string,
        runtime: IAgentRuntime
    ): Promise<TokenActivityData[]> {
        return this.getTokenActivity(
            {
                token: `${collection}:${tokenId}`,
                limit: 20,
                sortBy: "timestamp",
                sortDirection: "desc",
                includeMetadata: true,
            },
            runtime
        );
    }

    /**
     * Get floor prices for tokens in a collection
     * @see https://docs.reservoir.tools/reference/gettokensfloorv1
     *
     * @example
     * ```typescript
     * // Get floor prices for a collection
     * const response = await tokenService.getTokensFloor({
     *   collection: "0x8d04a8c79ceb0889bdd12acdf3fa9d207ed3ff63",
     *   normalizeRoyalties: true,
     * }, runtime);
     *
     * // Get floor price for a specific token
     * const response = await tokenService.getTokensFloor({
     *   token: "0x8d04a8c79ceb0889bdd12acdf3fa9d207ed3ff63:1",
     *   displayCurrency: "ETH",
     * }, runtime);
     * ```
     */
    async getTokensFloor(
        params: TokenFloorParams,
        runtime: IAgentRuntime
    ): Promise<TokenFloorResponse> {
        const endOperation = this.performanceMonitor.startOperation(
            "getTokensFloor",
            { params }
        );

        try {
            if (!params.collection && !params.token) {
                throw new Error(
                    "Either collection or token parameter must be provided"
                );
            }

            const queryParams = new URLSearchParams();

            // Add required parameters
            if (params.collection) {
                queryParams.append("collection", params.collection);
            }
            if (params.token) {
                queryParams.append("token", params.token);
            }

            // Add optional parameters
            if (params.normalizeRoyalties) {
                queryParams.append("normalizeRoyalties", "true");
            }
            if (params.displayCurrency) {
                queryParams.append("displayCurrency", params.displayCurrency);
            }

            return this.cachedRequest<TokenFloorResponse>(
                `/tokens/floor/v1?${queryParams.toString()}`,
                {
                    method: "GET",
                },
                runtime,
                {
                    ttl: 60, // Cache for 1 minute since floor prices change frequently
                    context: "tokens_floor",
                }
            );
        } catch (error) {
            console.error("Error in getTokensFloor:", error);
            throw error;
        } finally {
            endOperation();
        }
    }

    /**
     * Get all active listings (asks) for a specific token
     * @see https://docs.reservoir.tools/reference/gettokenstokenasksv1
     *
     * @example
     * ```typescript
     * // Get all listings for a token sorted by price
     * const response = await tokenService.getTokenAsks({
     *   token: "0x8d04a8c79ceb0889bdd12acdf3fa9d207ed3ff63:1",
     *   sortBy: "price",
     *   sortDirection: "asc",
     *   limit: 20,
     * }, runtime);
     *
     * // Get recent listings with normalized royalties
     * const response = await tokenService.getTokenAsks({
     *   token: "0x8d04a8c79ceb0889bdd12acdf3fa9d207ed3ff63:1",
     *   sortBy: "createdAt",
     *   sortDirection: "desc",
     *   normalizeRoyalties: true,
     * }, runtime);
     * ```
     */
    async getTokenAsks(
        params: TokenAsksParams,
        runtime: IAgentRuntime
    ): Promise<TokenAsksResponse> {
        const endOperation = this.performanceMonitor.startOperation(
            "getTokenAsks",
            { params }
        );

        try {
            if (!params.token) {
                throw new Error("Token parameter is required");
            }

            const queryParams = new URLSearchParams();

            // Add required parameters
            queryParams.append("token", params.token);

            // Add optional parameters
            if (params.sortBy) {
                queryParams.append("sortBy", params.sortBy);
            }
            if (params.sortDirection) {
                queryParams.append("sortDirection", params.sortDirection);
            }
            if (params.normalizeRoyalties) {
                queryParams.append("normalizeRoyalties", "true");
            }
            if (params.continuation) {
                queryParams.append("continuation", params.continuation);
            }
            if (params.limit) {
                queryParams.append("limit", params.limit.toString());
            }

            return this.cachedRequest<TokenAsksResponse>(
                `/tokens/${params.token}/asks/v1?${queryParams.toString()}`,
                {
                    method: "GET",
                },
                runtime,
                {
                    ttl: 60, // Cache for 1 minute since listings change frequently
                    context: "token_asks",
                }
            );
        } catch (error) {
            console.error("Error in getTokenAsks:", error);
            throw error;
        } finally {
            endOperation();
        }
    }

    /**
     * Get all active bids (offers) for a specific token
     * @see https://docs.reservoir.tools/reference/gettokenstokenbidsv1
     *
     * @example
     * ```typescript
     * // Get all bids for a token sorted by price
     * const response = await tokenService.getTokenBids({
     *   token: "0x8d04a8c79ceb0889bdd12acdf3fa9d207ed3ff63:1",
     *   sortBy: "price",
     *   sortDirection: "desc",
     *   limit: 20,
     * }, runtime);
     *
     * // Get recent bids with normalized royalties
     * const response = await tokenService.getTokenBids({
     *   token: "0x8d04a8c79ceb0889bdd12acdf3fa9d207ed3ff63:1",
     *   sortBy: "createdAt",
     *   sortDirection: "desc",
     *   normalizeRoyalties: true,
     * }, runtime);
     * ```
     */
    async getTokenBids(
        params: TokenBidsParams,
        runtime: IAgentRuntime
    ): Promise<TokenBidsResponse> {
        const endOperation = this.performanceMonitor.startOperation(
            "getTokenBids",
            { params }
        );

        try {
            if (!params.token) {
                throw new Error("Token parameter is required");
            }

            const queryParams = new URLSearchParams();

            // Add required parameters
            queryParams.append("token", params.token);

            // Add optional parameters
            if (params.sortBy) {
                queryParams.append("sortBy", params.sortBy);
            }
            if (params.sortDirection) {
                queryParams.append("sortDirection", params.sortDirection);
            }
            if (params.normalizeRoyalties) {
                queryParams.append("normalizeRoyalties", "true");
            }
            if (params.continuation) {
                queryParams.append("continuation", params.continuation);
            }
            if (params.limit) {
                queryParams.append("limit", params.limit.toString());
            }

            return this.cachedRequest<TokenBidsResponse>(
                `/tokens/${params.token}/bids/v1?${queryParams.toString()}`,
                {
                    method: "GET",
                },
                runtime,
                {
                    ttl: 60, // Cache for 1 minute since bids change frequently
                    context: "token_bids",
                }
            );
        } catch (error) {
            console.error("Error in getTokenBids:", error);
            throw error;
        } finally {
            endOperation();
        }
    }
}
