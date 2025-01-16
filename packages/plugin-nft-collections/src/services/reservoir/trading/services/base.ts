import { BaseReservoirService, ReservoirServiceConfig } from "../../base";
import { OrderResponse } from "../types/common";
import { IAgentRuntime } from "@elizaos/core";
import { MemoryCacheManager } from "../../../cache-manager";
import { RateLimiter } from "../../../rate-limiter";

/**
 * Base class for trading services with common functionality
 */
export abstract class BaseTradingService extends BaseReservoirService {
    constructor(config: ReservoirServiceConfig) {
        // Ensure all required properties have default values
        const fullConfig: Required<ReservoirServiceConfig> = {
            baseUrl: config.baseUrl ?? "https://api.reservoir.tools",
            apiKey: config.apiKey ?? "",
            cacheManager: config.cacheManager ?? new MemoryCacheManager(),
            rateLimiter: config.rateLimiter ?? new RateLimiter(),
            maxConcurrent: config.maxConcurrent ?? 10,
            maxRetries: config.maxRetries ?? 3,
            batchSize: config.batchSize ?? 50,
            timeout: config.timeout ?? 30000,
            retryStrategy: config.retryStrategy ?? {
                maxRetries: 3,
                baseDelay: 1000,
                jitter: true,
            },
            cacheConfig: config.cacheConfig ?? {
                enabled: true,
                defaultTTL: 300,
            },
            telemetry: config.telemetry ?? {
                enabled: true,
                serviceName: "reservoir-trading",
            },
        };
        super(fullConfig);
    }

    /**
     * Execute a trading operation with error handling and monitoring
     */
    protected async executeOrder<T>(
        endpoint: string,
        params: any,
        operationName: string,
        runtime: IAgentRuntime
    ): Promise<T> {
        const endOperation = this.performanceMonitor.startOperation(
            operationName,
            {}
        );

        try {
            const response = await runtime.fetch(
                `${this.config.baseUrl}${endpoint}`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "X-Api-Key": this.config.apiKey,
                    },
                    body: JSON.stringify(params),
                }
            );

            if (!response.ok) {
                throw new Error(
                    `${operationName} failed: ${response.status} ${response.statusText}`
                );
            }

            return response.json();
        } catch (error) {
            console.error(`Error in ${operationName}:`, error);
            throw error;
        } finally {
            endOperation();
        }
    }

    protected async get<T>(
        endpoint: string,
        runtime: IAgentRuntime
    ): Promise<T> {
        const endOperation = this.performanceMonitor.startOperation("get", {
            endpoint,
        });

        try {
            const response = await runtime.fetch(
                `${this.config.baseUrl}${endpoint}`,
                {
                    method: "GET",
                    headers: {
                        "X-Api-Key": this.config.apiKey,
                    },
                }
            );

            if (!response.ok) {
                throw new Error(
                    `GET request failed: ${response.status} ${response.statusText}`
                );
            }

            return response.json();
        } catch (error) {
            console.error(`Error in GET request:`, error);
            throw error;
        } finally {
            endOperation();
        }
    }
}
