import { BaseReservoirService } from "./base";
import { ReservoirServiceConfig } from "./base";
import { IAgentRuntime } from "@elizaos/core";
import {
    CommonCollectionsParams,
    CommonCollectionData,
    OwnersParams,
    OwnerData,
    OwnersIntersectionParams,
    OwnersIntersectionData,
    OwnersDistributionData,
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
        } catch (error: unknown) {
            console.error("Error fetching common collections:", error);
            this.performanceMonitor.recordMetric({
                operation: "getCommonCollections",
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
        } catch (error: unknown) {
            console.error("Error fetching owners:", error);
            this.performanceMonitor.recordMetric({
                operation: "getOwners",
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
     * Get owners who own tokens across multiple collections
     * @see https://docs.reservoir.tools/reference/getownerscrosscollectionsv1
     *
     * @param params Parameters for fetching owners intersection
     * @param runtime Agent runtime for making requests
     * @returns Array of owners with their ownership details across collections
     */
    async getOwnersIntersection(
        params: OwnersIntersectionParams,
        runtime: IAgentRuntime
    ): Promise<{
        owners: OwnersIntersectionData[];
        continuation?: string;
    }> {
        if (!params.collections || params.collections.length === 0) {
            throw new Error("At least one collection is required");
        }

        const endOperation = this.performanceMonitor.startOperation(
            "getOwnersIntersection",
            { params }
        );

        try {
            const response = await this.cachedRequest<{
                owners: OwnersIntersectionData[];
                continuation?: string;
            }>("/owners/cross-collections/v1", params, runtime, {
                ttl: 300, // Cache for 5 minutes
                context: "owners_intersection",
            });

            console.log(
                "Raw owners intersection response:",
                JSON.stringify(response.owners[0], null, 2)
            );

            endOperation();
            return response;
        } catch (error: unknown) {
            console.error("Error fetching owners intersection:", error);
            this.performanceMonitor.recordMetric({
                operation: "getOwnersIntersection",
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
     * Get ownership distribution for a collection
     * @see https://docs.reservoir.tools/reference/getcollectionscollectionownersdistributionv1
     *
     * @param collection Collection ID/address to get distribution for
     * @param runtime Agent runtime for making requests
     * @returns Distribution data showing ownership concentration
     */
    async getOwnersDistribution(
        collection: string,
        runtime: IAgentRuntime
    ): Promise<OwnersDistributionData> {
        if (!collection) {
            throw new Error("Collection parameter is required");
        }

        const endOperation = this.performanceMonitor.startOperation(
            "getOwnersDistribution",
            { collection }
        );

        try {
            const response = await this.cachedRequest<OwnersDistributionData>(
                `/collections/${collection}/owners-distribution/v1`,
                {},
                runtime,
                {
                    ttl: 300, // Cache for 5 minutes
                    context: "owners_distribution",
                }
            );

            console.log(
                "Raw owners distribution response:",
                JSON.stringify(response, null, 2)
            );

            endOperation();
            return response;
        } catch (error: unknown) {
            console.error("Error fetching owners distribution:", error);
            this.performanceMonitor.recordMetric({
                operation: "getOwnersDistribution",
                duration: 0,
                success: false,
                metadata: {
                    error:
                        error instanceof Error ? error.message : String(error),
                    collection,
                },
            });
            throw error;
        }
    }

    /**
     * Get ownership distribution for a collections set
     * @see https://docs.reservoir.tools/reference/getcollectionssetscollectionssetidownersdistributionv1
     *
     * @param collectionsSetId ID of the collections set to get distribution for
     * @param runtime Agent runtime for making requests
     * @returns Distribution data showing ownership concentration across the collections set
     */
    async getCollectionsSetOwnersDistribution(
        collectionsSetId: string,
        runtime: IAgentRuntime
    ): Promise<OwnersDistributionData> {
        if (!collectionsSetId) {
            throw new Error("Collections set ID parameter is required");
        }

        const endOperation = this.performanceMonitor.startOperation(
            "getCollectionsSetOwnersDistribution",
            { collectionsSetId }
        );

        try {
            const response = await this.cachedRequest<OwnersDistributionData>(
                `/collections-sets/${collectionsSetId}/owners-distribution/v1`,
                {},
                runtime,
                {
                    ttl: 300, // Cache for 5 minutes
                    context: "collections_set_owners_distribution",
                }
            );

            console.log(
                "Raw collections set owners distribution response:",
                JSON.stringify(response, null, 2)
            );

            endOperation();
            return response;
        } catch (error: unknown) {
            console.error(
                "Error fetching collections set owners distribution:",
                error
            );
            this.performanceMonitor.recordMetric({
                operation: "getCollectionsSetOwnersDistribution",
                duration: 0,
                success: false,
                metadata: {
                    error:
                        error instanceof Error ? error.message : String(error),
                    collectionsSetId,
                },
            });
            throw error;
        }
    }
}
