import { BaseReservoirService, ReservoirServiceConfig } from "./base";
import { IAgentRuntime } from "@elizaos/core";
import {
    CollectionFloorAskEventParams,
    CollectionFloorAskEvent,
    CollectionTopBidEventParams,
    CollectionTopBidEvent,
    TokenFloorAskEventParams,
    TokenFloorAskEvent,
} from "./types/event";

export class EventService extends BaseReservoirService {
    constructor(config: ReservoirServiceConfig = {}) {
        super(config);
    }

    /**
     * Get collection floor ask events with various filter options
     * @see https://docs.reservoir.tools/reference/geteventscollectionsflooraskv2
     */
    async getCollectionFloorAskEvents(
        params: CollectionFloorAskEventParams,
        runtime: IAgentRuntime
    ): Promise<{
        events: CollectionFloorAskEvent[];
        continuation?: string;
    }> {
        const endOperation = this.performanceMonitor.startOperation(
            "getCollectionFloorAskEvents",
            { params }
        );

        try {
            if (!params.collection && !params.contract) {
                throw new Error(
                    "Either collection or contract parameter is required"
                );
            }

            const response = await this.cachedRequest<{
                events: CollectionFloorAskEvent[];
                continuation?: string;
            }>("/events/collections/floor-ask/v2", params, runtime, {
                ttl: 60, // 1 minute cache for events
                context: "collection_floor_ask_events",
            });

            console.log(
                "Raw collection floor ask events response:",
                JSON.stringify(response.events[0], null, 2)
            );

            endOperation();
            return response;
        } catch (error) {
            console.error("Error fetching collection floor ask events:", error);
            this.performanceMonitor.recordMetric({
                operation: "getCollectionFloorAskEvents",
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
     * Get collection top bid events with various filter options
     * @see https://docs.reservoir.tools/reference/geteventscollectionstopbidv2
     */
    async getCollectionTopBidEvents(
        params: CollectionTopBidEventParams,
        runtime: IAgentRuntime
    ): Promise<{
        events: CollectionTopBidEvent[];
        continuation?: string;
    }> {
        const endOperation = this.performanceMonitor.startOperation(
            "getCollectionTopBidEvents",
            { params }
        );

        try {
            if (!params.collection && !params.contract) {
                throw new Error(
                    "Either collection or contract parameter is required"
                );
            }

            const response = await this.cachedRequest<{
                events: CollectionTopBidEvent[];
                continuation?: string;
            }>("/events/collections/top-bid/v2", params, runtime, {
                ttl: 60, // 1 minute cache for events
                context: "collection_top_bid_events",
            });

            console.log(
                "Raw collection top bid events response:",
                JSON.stringify(response.events[0], null, 2)
            );

            endOperation();
            return response;
        } catch (error) {
            console.error("Error fetching collection top bid events:", error);
            this.performanceMonitor.recordMetric({
                operation: "getCollectionTopBidEvents",
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
     * Get token floor ask events with various filter options
     * @see https://docs.reservoir.tools/reference/geteventstokensflooraskv4
     */
    async getTokenFloorAskEvents(
        params: TokenFloorAskEventParams,
        runtime: IAgentRuntime
    ): Promise<{
        events: TokenFloorAskEvent[];
        continuation?: string;
    }> {
        const endOperation = this.performanceMonitor.startOperation(
            "getTokenFloorAskEvents",
            { params }
        );

        try {
            if (!params.token && !params.contract && !params.collection) {
                throw new Error(
                    "At least one of token, contract, or collection parameter is required"
                );
            }

            const response = await this.cachedRequest<{
                events: TokenFloorAskEvent[];
                continuation?: string;
            }>("/events/tokens/floor-ask/v4", params, runtime, {
                ttl: 60, // 1 minute cache for events
                context: "token_floor_ask_events",
            });

            console.log(
                "Raw token floor ask events response:",
                JSON.stringify(response.events[0], null, 2)
            );

            endOperation();
            return response;
        } catch (error) {
            console.error("Error fetching token floor ask events:", error);
            this.performanceMonitor.recordMetric({
                operation: "getTokenFloorAskEvents",
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
}
