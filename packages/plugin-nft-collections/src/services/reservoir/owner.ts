import { BaseReservoirService, ReservoirServiceConfig } from "./base";
import { IAgentRuntime } from "@elizaos/core";
import { OwnersParams, OwnerData } from "./types/owner";

export class OwnerService extends BaseReservoirService {
    constructor(config: ReservoirServiceConfig = {}) {
        super(config);
    }

    /**
     * Get owners with various filter options
     * @see https://docs.reservoir.tools/reference/getownersv2
     */
    async getOwners(
        params: OwnersParams,
        runtime: IAgentRuntime
    ): Promise<{
        owners: OwnerData[];
        continuation?: string;
    }> {
        const endOperation = this.performanceMonitor.startOperation(
            "getOwners",
            { params }
        );

        try {
            if (!params.collection && !params.contract && !params.token) {
                throw new Error(
                    "At least one of collection, contract, or token parameter is required"
                );
            }

            const response = await this.cachedRequest<{
                owners: OwnerData[];
                continuation?: string;
            }>("/owners/v2", params, runtime, {
                ttl: 300, // 5 minute cache for owners data
                context: "owners",
            });

            console.log(
                "Raw owners response:",
                JSON.stringify(response.owners[0], null, 2)
            );

            endOperation();
            return response;
        } catch (error) {
            console.error("Error fetching owners:", error);
            this.performanceMonitor.recordMetric({
                operation: "getOwners",
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
