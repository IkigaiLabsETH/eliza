import { BaseReservoirService, ReservoirServiceConfig } from "./base";
import { IAgentRuntime } from "@elizaos/core";
import {
    TokenData,
    TokenBootstrapParams,
    TokenFloorParams,
    TokenFloorData,
    TokenActivityParams,
    TokenActivityData,
    TokenBidsParams,
    TokenBidData,
    TokenAsksParams,
    TokenAskData,
} from "./types/token";
import { ReservoirError, ReservoirErrorCode } from "./errors";

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
        params: TokenBootstrapParams,
        runtime: IAgentRuntime
    ): Promise<TokenData[]> {
        const endOperation = this.performanceMonitor.startOperation(
            "getTokens",
            { params }
        );

        try {
            const result = await this.cachedRequest<{ tokens: TokenData[] }>(
                "/tokens/v7",
                params,
                runtime,
                {
                    ttl: 60,
                    context: "tokens",
                }
            );
            const mappedTokens = result.tokens.map((tokenData: any) => ({
                token: {
                    contract: tokenData.token.contract,
                    tokenId: tokenData.token.tokenId,
                    name: tokenData.token.name || "",
                    description: tokenData.token.description || "",
                    image: tokenData.token.image || "",
                    media: tokenData.token.media,
                    kind: tokenData.token.kind,
                    isFlagged: tokenData.token.isFlagged,
                    lastFlagUpdate: tokenData.token.lastFlagUpdate,
                    rarity: tokenData.token.rarity,
                    rarityRank: tokenData.token.rarityRank,
                    collection: tokenData.token.collection && {
                        id: tokenData.token.collection.id,
                        name: tokenData.token.collection.name,
                        image: tokenData.token.collection.image,
                        slug: tokenData.token.collection.slug,
                        description: tokenData.token.collection.description,
                        royalties: tokenData.token.collection.royalties,
                        floorAsk: tokenData.token.collection.floorAsk,
                        topBid: tokenData.token.collection.topBid,
                    },
                    attributes: tokenData.token.attributes || [],
                    lastSale: tokenData.token.lastSale && {
                        price: {
                            currency: {
                                contract:
                                    tokenData.token.lastSale.price.currency
                                        .contract,
                                name: tokenData.token.lastSale.price.currency
                                    .name,
                                symbol: tokenData.token.lastSale.price.currency
                                    .symbol,
                                decimals:
                                    tokenData.token.lastSale.price.currency
                                        .decimals,
                            },
                            amount: {
                                raw: tokenData.token.lastSale.price.amount.raw,
                                decimal:
                                    tokenData.token.lastSale.price.amount
                                        .decimal,
                                usd: tokenData.token.lastSale.price.amount.usd,
                                native: tokenData.token.lastSale.price.amount
                                    .native,
                            },
                        },
                        timestamp: tokenData.token.lastSale.timestamp,
                    },
                    owner: tokenData.token.owner,
                    lastAppraisalValue: tokenData.token.lastAppraisalValue,
                },
                market: tokenData.market && {
                    floorAsk: tokenData.market.floorAsk && {
                        id: tokenData.market.floorAsk.id,
                        price: {
                            currency: {
                                contract:
                                    tokenData.market.floorAsk.price.currency
                                        .contract,
                                name: tokenData.market.floorAsk.price.currency
                                    .name,
                                symbol: tokenData.market.floorAsk.price.currency
                                    .symbol,
                                decimals:
                                    tokenData.market.floorAsk.price.currency
                                        .decimals,
                            },
                            amount: {
                                raw: tokenData.market.floorAsk.price.amount.raw,
                                decimal:
                                    tokenData.market.floorAsk.price.amount
                                        .decimal,
                                usd: tokenData.market.floorAsk.price.amount.usd,
                                native: tokenData.market.floorAsk.price.amount
                                    .native,
                            },
                        },
                        maker: tokenData.market.floorAsk.maker,
                        validFrom: tokenData.market.floorAsk.validFrom,
                        validUntil: tokenData.market.floorAsk.validUntil,
                        source: tokenData.market.floorAsk.source && {
                            id: tokenData.market.floorAsk.source.id,
                            name: tokenData.market.floorAsk.source.name,
                            icon: tokenData.market.floorAsk.source.icon,
                            url: tokenData.market.floorAsk.source.url,
                            domain: tokenData.market.floorAsk.source.domain,
                        },
                    },
                    topBid: tokenData.market.topBid && {
                        id: tokenData.market.topBid.id,
                        price: {
                            currency: {
                                contract:
                                    tokenData.market.topBid.price.currency
                                        .contract,
                                name: tokenData.market.topBid.price.currency
                                    .name,
                                symbol: tokenData.market.topBid.price.currency
                                    .symbol,
                                decimals:
                                    tokenData.market.topBid.price.currency
                                        .decimals,
                            },
                            amount: {
                                raw: tokenData.market.topBid.price.amount.raw,
                                decimal:
                                    tokenData.market.topBid.price.amount
                                        .decimal,
                                usd: tokenData.market.topBid.price.amount.usd,
                                native: tokenData.market.topBid.price.amount
                                    .native,
                            },
                        },
                        maker: tokenData.market.topBid.maker,
                        validFrom: tokenData.market.topBid.validFrom,
                        validUntil: tokenData.market.topBid.validUntil,
                    },
                },
            }));
            endOperation();
            return mappedTokens;
        } catch (error) {
            if (error instanceof ReservoirError) {
                throw error;
            }
            if (error instanceof Error) {
                const mockError = error as any;
                if (mockError.response?.status === 401) {
                    throw new ReservoirError({
                        message: "Invalid API key",
                        code: ReservoirErrorCode.API_KEY_INVALID,
                    });
                }
                if (mockError.response?.status === 429) {
                    throw new ReservoirError({
                        message: "Rate limit exceeded",
                        code: ReservoirErrorCode.RATE_LIMIT,
                    });
                }
                if (mockError.response?.status === 404) {
                    throw new ReservoirError({
                        message: "Token not found",
                        code: ReservoirErrorCode.HttpError,
                    });
                }
                throw new ReservoirError({
                    message: "API Error: " + mockError.message,
                    code: ReservoirErrorCode.HttpError,
                });
            }
            throw new ReservoirError({
                message: "Unknown error fetching tokens",
                code: ReservoirErrorCode.UnknownError,
            });
        }
    }

    /**
     * Get token floor price
     * @see https://docs.reservoir.tools/reference/gettokensfloorv1
     */
    async getTokenFloor(
        params: TokenFloorParams,
        runtime: IAgentRuntime
    ): Promise<TokenFloorData> {
        const endOperation = this.performanceMonitor.startOperation(
            "getTokenFloor",
            { params }
        );

        try {
            const response = await this.cachedRequest<TokenFloorData>(
                "/tokens/floor/v1",
                params,
                runtime,
                {
                    ttl: 300, // 5 minutes cache
                    context: "tokens_floor",
                }
            );

            endOperation();
            return response;
        } catch (error) {
            console.error("Error fetching token floor:", error);
            this.performanceMonitor.recordMetric({
                operation: "getTokenFloor",
                duration: 0,
                success: false,
                metadata: {
                    error:
                        error instanceof Error ? error.message : String(error),
                    params,
                },
            });
            if (error instanceof Error) {
                throw new ReservoirError({
                    message: error.message,
                    code: ReservoirErrorCode.HttpError,
                });
            }
            throw new ReservoirError({
                message: "Unknown error fetching token floor",
                code: ReservoirErrorCode.UnknownError,
            });
        }
    }

    /**
     * Get token activity
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
                    error:
                        error instanceof Error ? error.message : String(error),
                    params,
                },
            });
            if (error instanceof Error) {
                throw new ReservoirError({
                    message: error.message,
                    code: ReservoirErrorCode.HttpError,
                });
            }
            throw new ReservoirError({
                message: "Unknown error fetching token activity",
                code: ReservoirErrorCode.UnknownError,
            });
        }
    }

    /**
     * Get token asks (listings)
     * @see https://docs.reservoir.tools/reference/gettokensasksv4
     */
    async getTokenAsks(
        params: TokenAsksParams,
        runtime: IAgentRuntime
    ): Promise<TokenAskData[]> {
        const endOperation = this.performanceMonitor.startOperation(
            "getTokenAsks",
            { params }
        );

        try {
            const response = await this.cachedRequest<{
                asks: TokenAskData[];
                continuation?: string;
            }>("/tokens/asks/v4", params, runtime, {
                ttl: 60, // 1 minute cache for asks
                context: "tokens_asks",
            });

            endOperation();
            return response.asks;
        } catch (error) {
            console.error("Error fetching token asks:", error);
            this.performanceMonitor.recordMetric({
                operation: "getTokenAsks",
                duration: 0,
                success: false,
                metadata: {
                    error:
                        error instanceof Error ? error.message : String(error),
                    params,
                },
            });
            if (error instanceof Error) {
                throw new ReservoirError({
                    message: error.message,
                    code: ReservoirErrorCode.HttpError,
                });
            }
            throw new ReservoirError({
                message: "Unknown error fetching token asks",
                code: ReservoirErrorCode.UnknownError,
            });
        }
    }

    /**
     * Get token bids (offers)
     * @see https://docs.reservoir.tools/reference/gettokensbidsv5
     */
    async getTokenBids(
        params: TokenBidsParams,
        runtime: IAgentRuntime
    ): Promise<TokenBidData[]> {
        const endOperation = this.performanceMonitor.startOperation(
            "getTokenBids",
            { params }
        );

        try {
            const response = await this.cachedRequest<{
                bids: TokenBidData[];
                continuation?: string;
            }>("/tokens/bids/v5", params, runtime, {
                ttl: 60, // 1 minute cache for bids
                context: "tokens_bids",
            });

            endOperation();
            return response.bids;
        } catch (error) {
            console.error("Error fetching token bids:", error);
            this.performanceMonitor.recordMetric({
                operation: "getTokenBids",
                duration: 0,
                success: false,
                metadata: {
                    error:
                        error instanceof Error ? error.message : String(error),
                    params,
                },
            });
            if (error instanceof Error) {
                throw new ReservoirError({
                    message: error.message,
                    code: ReservoirErrorCode.HttpError,
                });
            }
            throw new ReservoirError({
                message: "Unknown error fetching token bids",
                code: ReservoirErrorCode.UnknownError,
            });
        }
    }
}
