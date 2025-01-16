import { BaseReservoirService, ReservoirServiceConfig } from "./base";
import { IAgentRuntime } from "@elizaos/core";
import {
    CollectionFloorAskEventParams,
    CollectionFloorAskEvent,
    CollectionTopBidEventParams,
    CollectionTopBidEvent,
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
}
