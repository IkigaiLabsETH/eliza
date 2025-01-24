import { BaseReservoirService, ReservoirServiceConfig } from "./base";
import { IAgentRuntime } from "@elizaos/core";
import {
    MarketStats,
    TopTradersParams,
    TopTraderData,
    FloorListingParams,
    FloorListing,
    OrdersAsksParams,
    OrderAskData,
    OrdersBidsParams,
    OrderBidData,
    OrdersDepthParams,
    OrdersDepthData,
} from "./types/market";
import { ReservoirError, ReservoirErrorCode } from "./errors";

export class MarketService extends BaseReservoirService {
    constructor(config: ReservoirServiceConfig = {}) {
        super(config);
    }

    /**
     * Get market stats
     * @see https://docs.reservoir.tools/reference/getmarketstatsv1
     */
    async getMarketStats(runtime: IAgentRuntime): Promise<MarketStats> {
        const endOperation =
            this.performanceMonitor.startOperation("getMarketStats");

        try {
            const response = await this.cachedRequest<MarketStats>(
                "/market/stats/v1",
                {},
                runtime,
                {
                    ttl: 300, // 5 minutes cache
                    context: "market_stats",
                }
            );

            endOperation();
            return response;
        } catch (error) {
            console.error("Error fetching market stats:", error);
            this.performanceMonitor.recordMetric({
                operation: "getMarketStats",
                duration: 0,
                success: false,
                metadata: {
                    error:
                        error instanceof Error ? error.message : String(error),
                },
            });
            if (error instanceof Error) {
                throw new ReservoirError({
                    message: error.message,
                    code: ReservoirErrorCode.HttpError,
                });
            }
            throw new ReservoirError({
                message: "Unknown error fetching market stats",
                code: ReservoirErrorCode.UnknownError,
            });
        }
    }

    /**
     * Get top traders
     * @see https://docs.reservoir.tools/reference/gettoptradersv2
     */
    async getTopTraders(
        params: TopTradersParams,
        runtime: IAgentRuntime
    ): Promise<TopTraderData[]> {
        const endOperation = this.performanceMonitor.startOperation(
            "getTopTraders",
            { params }
        );

        try {
            const response = await this.cachedRequest<{
                traders: TopTraderData[];
                continuation?: string;
            }>("/traders/top/v2", params, runtime, {
                ttl: 300, // 5 minutes cache
                context: "top_traders",
            });

            endOperation();
            return response.traders;
        } catch (error) {
            console.error("Error fetching top traders:", error);
            this.performanceMonitor.recordMetric({
                operation: "getTopTraders",
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
                message: "Unknown error fetching top traders",
                code: ReservoirErrorCode.UnknownError,
            });
        }
    }

    /**
     * Get floor listings
     * @see https://docs.reservoir.tools/reference/getordersasksv4
     */
    async getFloorListings(
        params: FloorListingParams,
        runtime: IAgentRuntime
    ): Promise<FloorListing[]> {
        const endOperation = this.performanceMonitor.startOperation(
            "getFloorListings",
            { params }
        );

        try {
            const response = await this.cachedRequest<{
                asks: FloorListing[];
                continuation?: string;
            }>("/orders/asks/v4", params, runtime, {
                ttl: 60, // 1 minute cache for listings
                context: "floor_listings",
            });

            endOperation();
            return response.asks;
        } catch (error) {
            console.error("Error fetching floor listings:", error);
            this.performanceMonitor.recordMetric({
                operation: "getFloorListings",
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
                message: "Unknown error fetching floor listings",
                code: ReservoirErrorCode.UnknownError,
            });
        }
    }

    /**
     * Get asks (listings)
     * @see https://docs.reservoir.tools/reference/getordersasksv4
     */
    async getAsks(
        params: OrdersAsksParams,
        runtime: IAgentRuntime
    ): Promise<{ asks: OrderAskData[]; continuation?: string | undefined }> {
        const endOperation = this.performanceMonitor.startOperation("getAsks", {
            params,
        });

        try {
            const response = await this.cachedRequest<{
                asks: OrderAskData[];
                continuation?: string;
            }>("/orders/asks/v4", params, runtime, {
                ttl: 60, // 1 minute cache for asks
                context: "orders_asks",
            });

            endOperation();
            return {
                asks: response.asks,
                continuation: response.continuation,
            };
        } catch (error) {
            console.error("Error fetching asks:", error);
            this.performanceMonitor.recordMetric({
                operation: "getAsks",
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
                message: "Unknown error fetching asks",
                code: ReservoirErrorCode.UnknownError,
            });
        }
    }

    /**
     * Get bids (offers)
     * @see https://docs.reservoir.tools/reference/getordersbidsv5
     */
    async getBids(
        params: OrdersBidsParams,
        runtime: IAgentRuntime
    ): Promise<{ bids: OrderBidData[]; continuation?: string | undefined }> {
        const endOperation = this.performanceMonitor.startOperation("getBids", {
            params,
        });

        try {
            const response = await this.cachedRequest<{
                bids: OrderBidData[];
                continuation?: string;
            }>("/orders/bids/v5", params, runtime, {
                ttl: 60, // 1 minute cache for bids
                context: "orders_bids",
            });

            endOperation();
            return {
                bids: response.bids,
                continuation: response.continuation,
            };
        } catch (error) {
            console.error("Error fetching bids:", error);
            this.performanceMonitor.recordMetric({
                operation: "getBids",
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
                message: "Unknown error fetching bids",
                code: ReservoirErrorCode.UnknownError,
            });
        }
    }

    /**
     * Get orders depth
     * @see https://docs.reservoir.tools/reference/getordersdepthv1
     */
    async getOrdersDepth(
        params: OrdersDepthParams,
        runtime: IAgentRuntime
    ): Promise<OrdersDepthData[]> {
        const endOperation = this.performanceMonitor.startOperation(
            "getOrdersDepth",
            { params }
        );

        try {
            const response = await this.cachedRequest<{
                depths: OrdersDepthData[];
            }>("/orders/depth/v1", params, runtime, {
                ttl: 60, // 1 minute cache for depth
                context: "orders_depth",
            });

            endOperation();
            return response.depths;
        } catch (error) {
            console.error("Error fetching orders depth:", error);
            this.performanceMonitor.recordMetric({
                operation: "getOrdersDepth",
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
                message: "Unknown error fetching orders depth",
                code: ReservoirErrorCode.UnknownError,
            });
        }
    }
}
