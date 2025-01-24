import { BaseReservoirService } from "./base";
import { ReservoirServiceConfig } from "./base";
import { IAgentRuntime } from "@elizaos/core";
import {
    StatsParams,
    StatsData,
    DailyVolumesParams,
    DailyVolumeData,
    ChainStatsData,
} from "./types/stats";

export class StatsService extends BaseReservoirService {
    constructor(config: ReservoirServiceConfig) {
        super(config);
    }

    /**
     * Get aggregate stats for collections or tokens
     * @see https://docs.reservoir.tools/reference/getstatsv2
     *
     * @param params Parameters for fetching stats
     * @param runtime Agent runtime for making requests
     * @returns Aggregate stats including market cap, volume, floor price, etc.
     */
    async getStats(
        params: StatsParams,
        runtime: IAgentRuntime
    ): Promise<StatsData> {
        if (!params.collection && !params.token) {
            throw new Error("Either collection or token parameter is required");
        }

        const endOperation = this.performanceMonitor.startOperation(
            "getStats",
            { params }
        );

        try {
            const response = await this.cachedRequest<StatsData>(
                "/stats/v2",
                params,
                runtime,
                {
                    ttl: 60, // Cache for 1 minute since stats change frequently
                    context: "stats",
                }
            );

            console.log(
                "Raw stats response:",
                JSON.stringify(response, null, 2)
            );

            endOperation();
            return response;
        } catch (error: unknown) {
            console.error("Error fetching stats:", error);
            this.performanceMonitor.recordMetric({
                operation: "getStats",
                duration: 0,
                success: false,
                metadata: {
                    error:
                        error instanceof Error ? error.message : String(error),
                    params,
                },
            });
            throw error;
        }
    }

    /**
     * Get daily collection volumes
     * @see https://docs.reservoir.tools/reference/getcollectionsdailyvolumesv1
     *
     * @param params Parameters for fetching daily volumes
     * @param runtime Agent runtime for making requests
     * @returns Daily collection volumes with pagination support
     */
    async getDailyVolumes(
        params: DailyVolumesParams,
        runtime: IAgentRuntime
    ): Promise<DailyVolumeData> {
        const endOperation = this.performanceMonitor.startOperation(
            "getDailyVolumes",
            { params }
        );

        try {
            const response = await this.cachedRequest<DailyVolumeData>(
                "/collections/daily-volumes/v1",
                params,
                runtime,
                {
                    ttl: 300, // Cache for 5 minutes since historical data changes less frequently
                    context: "daily-volumes",
                }
            );

            console.log(
                "Raw daily volumes response:",
                JSON.stringify(response, null, 2)
            );

            endOperation();
            return response;
        } catch (error: unknown) {
            console.error("Error fetching daily volumes:", error);
            this.performanceMonitor.recordMetric({
                operation: "getDailyVolumes",
                duration: 0,
                success: false,
                metadata: {
                    error:
                        error instanceof Error ? error.message : String(error),
                    params,
                },
            });
            throw error;
        }
    }

    /**
     * Get chain-wide mint and sales statistics
     * @see https://docs.reservoir.tools/reference/getchainstatsv1
     *
     * @param runtime Agent runtime for request execution
     * @returns Chain-wide statistics for the last 24 hours and 7 days
     */
    async getChainStats(runtime: IAgentRuntime): Promise<ChainStatsData> {
        const endOperation = this.performanceMonitor.startOperation(
            "getChainStats",
            {}
        );

        try {
            const response = await this.cachedRequest<ChainStatsData>(
                "/chain/stats/v1",
                {},
                runtime,
                {
                    ttl: 60, // Cache for 1 minute since this is real-time data
                    context: "chain-stats",
                }
            );

            console.log(
                "Raw chain stats response:",
                JSON.stringify(response, null, 2)
            );

            endOperation();
            return response;
        } catch (error: unknown) {
            console.error("Error fetching chain stats:", error);
            this.performanceMonitor.recordMetric({
                operation: "getChainStats",
                duration: 0,
                success: false,
                metadata: {
                    error:
                        error instanceof Error ? error.message : String(error),
                },
            });
            throw error;
        }
    }
}
