import { BaseReservoirService, ReservoirServiceConfig } from "./base";
import { IAgentRuntime } from "@elizaos/core";
import {
    TokenMetadataParams,
    TokenMetadata,
    TokenActivityParams,
    TokenActivityData,
} from "./types";

export class TokenService extends BaseReservoirService {
    constructor(config: ReservoirServiceConfig = {}) {
        super(config);
    }

    /**
     * Get comprehensive token data including market data, attributes, and more.
     * @see https://docs.reservoir.tools/reference/gettokensbootstrapv1
     */
    async getTokensMetadata(
        params: TokenMetadataParams,
        runtime: IAgentRuntime
    ): Promise<TokenMetadata[]> {
        const endOperation = this.performanceMonitor.startOperation(
            "getTokensMetadata",
            { params }
        );

        try {
            if (!params.collection && !params.tokens?.length) {
                throw new Error(
                    "Either collection or tokens parameter must be provided"
                );
            }

            const queryParams = {
                collection: params.collection,
                tokens: params.tokens?.join(","),
                includeAttributes: params.includeAttributes
                    ? "true"
                    : undefined,
                includeTopBid: params.includeTopBid ? "true" : undefined,
                includeDynamicPricing: params.includeDynamicPricing
                    ? "true"
                    : undefined,
                includeLastSale: params.includeLastSale ? "true" : undefined,
                includeRawData: params.includeRawData ? "true" : undefined,
            };

            const response = await this.cachedRequest<{
                tokens: TokenMetadata[];
            }>("/tokens/bootstrap/v1", queryParams, runtime, {
                ttl: 300, // 5 minutes cache
                context: "tokens_metadata",
            });

            console.log(
                "Raw tokens metadata response:",
                JSON.stringify(response.tokens[0], null, 2)
            );

            endOperation();
            return response.tokens;
        } catch (error) {
            console.error("Error fetching token metadata:", error);
            this.performanceMonitor.recordMetric({
                operation: "getTokensMetadata",
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
        const tokens = await this.getTokensMetadata(
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

        if (!tokens.length) {
            throw new Error(`Token ${collection}:${tokenId} not found`);
        }

        return tokens[0];
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
}
