import { BaseReservoirService, ReservoirServiceConfig } from "./base";
import { IAgentRuntime } from "@elizaos/core";
import { BulkTransfersParams, BulkTransferData } from "./types/transfer";

export class TransferService extends BaseReservoirService {
    constructor(config: ReservoirServiceConfig = {}) {
        super(config);
    }

    /**
     * Get bulk historical transfers with various filter options
     * @see https://docs.reservoir.tools/reference/gettransfersbulkv2
     */
    async getBulkTransfers(
        params: BulkTransfersParams,
        runtime: IAgentRuntime
    ): Promise<{
        transfers: BulkTransferData[];
        continuation?: string;
    }> {
        const endOperation = this.performanceMonitor.startOperation(
            "getBulkTransfers",
            { params }
        );

        try {
            const response = await this.cachedRequest<{
                transfers: BulkTransferData[];
                continuation?: string;
            }>("/transfers/bulk/v2", params, runtime, {
                ttl: 300, // 5 minutes cache for historical data
                context: "bulk_transfers",
            });

            console.log(
                "Raw bulk transfers response:",
                JSON.stringify(response.transfers[0], null, 2)
            );

            endOperation();
            return response;
        } catch (error) {
            console.error("Error fetching bulk transfers:", error);
            this.performanceMonitor.recordMetric({
                operation: "getBulkTransfers",
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
