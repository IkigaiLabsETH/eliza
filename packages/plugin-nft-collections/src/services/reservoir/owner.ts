import { BaseReservoirService } from "./base";
import { ReservoirServiceConfig } from "./base";
import { IAgentRuntime } from "@elizaos/core";
import {
    CommonCollectionsParams,
    CommonCollectionData,
    OwnersParams,
    OwnerData,
} from "./types/owner";

export class OwnerService extends BaseReservoirService {
    constructor(config: ReservoirServiceConfig) {
        super(config);
    }

    /**
     * Get collections common among specified owners
     * @see https://docs.reservoir.tools/reference/getownerscommoncollectionsv1
     *
     * @param params Parameters for fetching common collections
     * @param runtime Agent runtime for making requests
     * @returns Array of common collections with ownership details
     */
    async getCommonCollections(
        params: CommonCollectionsParams,
        runtime: IAgentRuntime
    ): Promise<CommonCollectionData[]> {
        if (!params.owners || params.owners.length === 0) {
            throw new Error("At least one owner address is required");
        }

        const endOperation = this.performanceMonitor.startOperation(
            "getCommonCollections",
            { params }
        );

        try {
            const response = await this.cachedRequest<{
                collections: CommonCollectionData[];
            }>("/owners/common-collections/v1", params, runtime, {
                ttl: 300, // Cache for 5 minutes
                context: "owners_common_collections",
            });

            endOperation();
            return response.collections;
        } catch (error) {
            console.error("Error fetching common collections:", error);
            this.performanceMonitor.recordMetric({
                operation: "getCommonCollections",
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
