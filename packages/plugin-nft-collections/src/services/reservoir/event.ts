import { BaseReservoirService, ReservoirServiceConfig } from "./base";
import { IAgentRuntime } from "@elizaos/core";
import {
    CollectionFloorAskEventParams,
    CollectionFloorAskEvent,
    CollectionTopBidEventParams,
    CollectionTopBidEvent,
    TokenFloorAskEventParams,
    TokenFloorAskEvent,
    EventsParams,
    EventData,
    EventsStatusParams,
    EventStatusData,
    EventsTransfersParams,
    EventTransferData,
} from "./types/event";
import { ReservoirError, ReservoirErrorCode } from "./errors";

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
        } catch (error: unknown) {
            console.error("Error fetching collection floor ask events:", error);
            this.performanceMonitor.recordMetric({
                operation: "getCollectionFloorAskEvents",
                duration: 0,
                success: false,
                metadata: {
                    error:
                        error instanceof Error
                            ? error.message
                            : "Unknown error",
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
                message: "Unknown error fetching collection floor ask events",
                code: ReservoirErrorCode.UnknownError,
            });
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
        } catch (error: unknown) {
            console.error("Error fetching collection top bid events:", error);
            this.performanceMonitor.recordMetric({
                operation: "getCollectionTopBidEvents",
                duration: 0,
                success: false,
                metadata: {
                    error:
                        error instanceof Error
                            ? error.message
                            : "Unknown error",
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
                message: "Unknown error fetching collection top bid events",
                code: ReservoirErrorCode.UnknownError,
            });
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
        } catch (error: unknown) {
            console.error("Error fetching token floor ask events:", error);
            this.performanceMonitor.recordMetric({
                operation: "getTokenFloorAskEvents",
                duration: 0,
                success: false,
                metadata: {
                    error:
                        error instanceof Error
                            ? error.message
                            : "Unknown error",
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
                message: "Unknown error fetching token floor ask events",
                code: ReservoirErrorCode.UnknownError,
            });
        }
    }

    /**
     * Get events
     * @see https://docs.reservoir.tools/reference/geteventsv5
     */
    async getEvents(
        params: EventsParams,
        runtime: IAgentRuntime
    ): Promise<EventData[]> {
        const endOperation = this.performanceMonitor.startOperation(
            "getEvents",
            { params }
        );

        try {
            const response = await this.cachedRequest<{
                events: EventData[];
                continuation?: string;
            }>("/events/v5", params, runtime, {
                ttl: 60, // 1 minute cache for events
                context: "events",
            });

            endOperation();
            return response.events;
        } catch (error: unknown) {
            console.error("Error fetching events:", error);
            this.performanceMonitor.recordMetric({
                operation: "getEvents",
                duration: 0,
                success: false,
                metadata: {
                    error:
                        error instanceof Error
                            ? error.message
                            : "Unknown error",
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
                message: "Unknown error fetching events",
                code: ReservoirErrorCode.UnknownError,
            });
        }
    }

    /**
     * Get event status
     * @see https://docs.reservoir.tools/reference/geteventsstatusv1
     */
    async getEventStatus(
        params: EventsStatusParams,
        runtime: IAgentRuntime
    ): Promise<EventStatusData> {
        const endOperation = this.performanceMonitor.startOperation(
            "getEventStatus",
            { params }
        );

        try {
            const response = await this.cachedRequest<EventStatusData>(
                "/events/status/v1",
                params,
                runtime,
                {
                    ttl: 60, // 1 minute cache for event status
                    context: "events_status",
                }
            );

            endOperation();
            return response;
        } catch (error: unknown) {
            console.error("Error fetching event status:", error);
            this.performanceMonitor.recordMetric({
                operation: "getEventStatus",
                duration: 0,
                success: false,
                metadata: {
                    error:
                        error instanceof Error
                            ? error.message
                            : "Unknown error",
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
                message: "Unknown error fetching event status",
                code: ReservoirErrorCode.UnknownError,
            });
        }
    }

    /**
     * Get event transfers
     * @see https://docs.reservoir.tools/reference/geteventstransfersv3
     */
    async getEventTransfers(
        params: EventsTransfersParams,
        runtime: IAgentRuntime
    ): Promise<EventTransferData[]> {
        const endOperation = this.performanceMonitor.startOperation(
            "getEventTransfers",
            { params }
        );

        try {
            const response = await this.cachedRequest<{
                transfers: EventTransferData[];
                continuation?: string;
            }>("/events/transfers/v3", params, runtime, {
                ttl: 60, // 1 minute cache for transfers
                context: "events_transfers",
            });

            endOperation();
            return response.transfers;
        } catch (error: unknown) {
            console.error("Error fetching event transfers:", error);
            this.performanceMonitor.recordMetric({
                operation: "getEventTransfers",
                duration: 0,
                success: false,
                metadata: {
                    error:
                        error instanceof Error
                            ? error.message
                            : "Unknown error",
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
                message: "Unknown error fetching event transfers",
                code: ReservoirErrorCode.UnknownError,
            });
        }
    }
}
