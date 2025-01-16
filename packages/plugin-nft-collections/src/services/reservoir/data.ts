import { BaseReservoirService, ReservoirServiceConfig } from "./base";
import { IAgentRuntime } from "@elizaos/core";

export interface NFTMetadataParams {
    collection?: string;
    tokens?: string[];
    includeAttributes?: boolean;
    includeTopBid?: boolean;
    includeDynamicPricing?: boolean;
    includeLastSale?: boolean;
    includeRawData?: boolean;
}

export interface NFTMetadata {
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
        attributes?: Array<{
            key: string;
            value: string;
            tokenCount?: number;
            onSaleCount?: number;
            floorAskPrice?: number;
            topBidValue?: number;
        }>;
        lastSale?: {
            price: number;
            timestamp: string;
        };
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

export class NFTDataService extends BaseReservoirService {
    constructor(config: ReservoirServiceConfig = {}) {
        super(config);
    }

    /**
     * Get comprehensive token data including market data, attributes, and more.
     * @see https://docs.reservoir.tools/reference/gettokensbootstrapv1
     *
     * @param params Configuration options for the token bootstrap request
     * @param runtime Agent runtime for API key management
     * @returns Array of token data with market information
     */
    async getTokensMetadata(
        params: NFTMetadataParams,
        runtime: IAgentRuntime
    ): Promise<NFTMetadata[]> {
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
                tokens: NFTMetadata[];
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
    ): Promise<NFTMetadata> {
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
}
