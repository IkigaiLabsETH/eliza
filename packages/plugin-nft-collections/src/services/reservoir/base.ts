import { PerformanceMonitor } from "../../utils/performance";
import {
    ErrorHandler,
    NFTErrorFactory,
    ErrorType,
    ErrorCode,
    NFTError,
} from "../../utils/error-handler";
import { MemoryCacheManager } from "../cache-manager";
import { RateLimiter } from "../rate-limiter";
import { IAgentRuntime } from "@elizaos/core";
import { z } from "zod";

// Enhanced error codes specific to Reservoir service
export enum ReservoirErrorCode {
    RATE_LIMIT = "RESERVOIR_RATE_LIMIT",
    API_KEY_INVALID = "RESERVOIR_API_KEY_INVALID",
    INSUFFICIENT_FUNDS = "RESERVOIR_INSUFFICIENT_FUNDS",
    COLLECTION_NOT_FOUND = "RESERVOIR_COLLECTION_NOT_FOUND",
}

// Comprehensive configuration interface
export interface ReservoirServiceConfig {
    cacheManager?: MemoryCacheManager;
    rateLimiter?: RateLimiter;
    maxConcurrent?: number;
    maxRetries?: number;
    batchSize?: number;
    apiKey?: string;
    baseUrl?: string;
    timeout?: number;
    retryStrategy?: {
        maxRetries?: number;
        baseDelay?: number;
        jitter?: boolean;
    };
    cacheConfig?: {
        enabled?: boolean;
        defaultTTL?: number;
    };
    telemetry?: {
        enabled?: boolean;
        serviceName?: string;
    };
}

// Validation schema for configuration
const ReservoirConfigSchema = z.object({
    apiKey: z.string().optional(),
    baseUrl: z.string().url().optional().default("https://api.reservoir.tools"),
    timeout: z.number().positive().optional().default(10000),
    maxRetries: z.number().min(0).optional().default(3),
});

export abstract class BaseReservoirService {
    protected cacheManager?: MemoryCacheManager;
    protected rateLimiter?: RateLimiter;
    protected maxRetries: number;
    protected batchSize: number;
    protected performanceMonitor: PerformanceMonitor;
    protected errorHandler: ErrorHandler;
    protected config: Required<ReservoirServiceConfig>;

    constructor(config: ReservoirServiceConfig = {}) {
        // Validate and merge configuration
        const validatedConfig = ReservoirConfigSchema.parse(config);

        this.config = {
            cacheManager: config.cacheManager,
            rateLimiter: config.rateLimiter,
            maxConcurrent: config.maxConcurrent || 5,
            maxRetries: validatedConfig.maxRetries,
            batchSize: config.batchSize || 20,
            apiKey: validatedConfig.apiKey || process.env.RESERVOIR_API_KEY,
            baseUrl: validatedConfig.baseUrl,
            timeout: validatedConfig.timeout,
            retryStrategy: {
                maxRetries: 3,
                baseDelay: 1000,
                jitter: true,
                ...config.retryStrategy,
            },
            cacheConfig: {
                enabled: true,
                defaultTTL: 300,
                ...config.cacheConfig,
            },
            telemetry: {
                enabled: true,
                serviceName: "ikigai-nft-reservoir",
                ...config.telemetry,
            },
        };

        this.cacheManager = this.config.cacheManager;
        this.rateLimiter = this.config.rateLimiter;
        this.maxRetries = this.config.maxRetries;
        this.batchSize = this.config.batchSize;
        this.performanceMonitor = PerformanceMonitor.getInstance();
        this.errorHandler = ErrorHandler.getInstance();

        // Setup telemetry and monitoring
        this.setupTelemetry();
    }

    // Advanced caching with context-aware invalidation
    protected async cachedRequest<T>(
        endpoint: string,
        params: Record<string, any>,
        runtime: IAgentRuntime,
        cacheOptions?: {
            ttl?: number;
            context?: string;
        }
    ): Promise<T> {
        if (!this.config.cacheConfig.enabled) {
            return this.makeRequest<T>(endpoint, params, 0, runtime);
        }

        const cacheKey = this.generateCacheKey(endpoint, params);

        const cachedResponse = await this.cacheManager?.get<T>(cacheKey);
        if (cachedResponse) {
            if (this.isCacheFresh(cachedResponse, cacheOptions?.ttl)) {
                return cachedResponse;
            }
        }

        const freshData = await this.makeRequest<T>(
            endpoint,
            params,
            0,
            runtime
        );

        await this.cacheManager?.set(
            cacheKey,
            freshData,
            cacheOptions?.ttl ?? this.config.cacheConfig.defaultTTL
        );

        return freshData;
    }

    // Generate deterministic cache key
    private generateCacheKey(
        endpoint: string,
        params: Record<string, any>
    ): string {
        const sortedParams = Object.keys(params)
            .sort()
            .map((key) => `${key}:${params[key]}`)
            .join("|");
        return `reservoir:${endpoint}:${sortedParams}`;
    }

    // Check cache freshness
    private isCacheFresh(cachedResponse: any, ttl?: number): boolean {
        const MAX_CACHE_AGE = ttl || this.config.cacheConfig.defaultTTL * 1000;
        return Date.now() - cachedResponse.timestamp < MAX_CACHE_AGE;
    }

    // Enhanced error handling method
    protected handleReservoirError(
        error: Error,
        context: Record<string, any>
    ): NFTError {
        if (error.message.includes("rate limit")) {
            return NFTErrorFactory.create(
                ErrorType.RATE_LIMIT,
                ErrorCode.RATE_LIMIT_EXCEEDED,
                "Reservoir API rate limit exceeded",
                {
                    details: {
                        ...context,
                        retryAfter: this.extractRetryAfter(error),
                    },
                    retryable: true,
                    severity: "HIGH",
                }
            );
        }

        if (error.message.includes("API key")) {
            return NFTErrorFactory.create(
                ErrorType.AUTHENTICATION,
                ErrorCode.API_KEY_INVALID,
                "Invalid Reservoir API key",
                {
                    details: context,
                    retryable: false,
                    severity: "CRITICAL",
                }
            );
        }

        return NFTErrorFactory.fromError(error);
    }

    // Extract retry-after timestamp
    private extractRetryAfter(error: Error): number {
        return Date.now() + 60000; // Default 1 minute
    }

    // Intelligent retry mechanism
    protected async retryRequest<T>(
        requestFn: () => Promise<T>,
        options: {
            maxRetries?: number;
            baseDelay?: number;
            jitter?: boolean;
        } = {}
    ): Promise<T> {
        const {
            maxRetries = this.config.retryStrategy.maxRetries,
            baseDelay = this.config.retryStrategy.baseDelay,
            jitter = this.config.retryStrategy.jitter,
        } = options;

        let lastError: Error | null = null;

        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                return await requestFn();
            } catch (error) {
                lastError = error;

                const delay = jitter
                    ? baseDelay * Math.pow(2, attempt) * (1 + Math.random())
                    : baseDelay * Math.pow(2, attempt);

                this.performanceMonitor.recordMetric({
                    operation: "retryRequest",
                    duration: delay,
                    success: false,
                    metadata: {
                        attempt,
                        error: error.message,
                    },
                });

                if (this.isCircuitBreakerTripped(error)) {
                    break;
                }

                await new Promise((resolve) => setTimeout(resolve, delay));
            }
        }

        throw lastError || new Error("Max retries exceeded");
    }

    // Circuit breaker logic
    private isCircuitBreakerTripped(error: Error): boolean {
        const criticalErrors = ["API_KEY_INVALID", "UNAUTHORIZED", "FORBIDDEN"];
        return criticalErrors.some((code) => error.message.includes(code));
    }

    /**
     * Setup telemetry and monitoring
     */
    protected setupTelemetry(): void {
        if (this.config.telemetry?.enabled) {
            this.performanceMonitor.on("alert", (alert) => {
                console.log(
                    `Reservoir Service Alert: ${JSON.stringify(alert)}`
                );
            });
        }
    }

    // Make request method
    protected async makeRequest<T>(
        endpoint: string,
        params: Record<string, any> = {},
        priority: number = 0,
        runtime: IAgentRuntime
    ): Promise<T> {
        const endOperation = this.performanceMonitor.startOperation(
            "makeRequest",
            { endpoint, params, priority }
        );

        try {
            if (this.rateLimiter) {
                await this.rateLimiter.consume("reservoir", 1);
            }

            const reservoirApiKey =
                runtime.getSetting("RESERVOIR_API_KEY") || this.config.apiKey;

            const result = await this.retryRequest(async () => {
                const response = await fetch(
                    `${this.config.baseUrl}${endpoint}?${new URLSearchParams(params).toString()}`,
                    {
                        headers: {
                            "x-api-key": reservoirApiKey,
                            "Content-Type": "application/json",
                        },
                        signal: AbortSignal.timeout(this.config.timeout),
                    }
                );

                if (!response.ok) {
                    throw new Error(
                        `Reservoir API error: ${response.status} ${await response.text()}`
                    );
                }

                return response.json();
            });

            endOperation();
            return result;
        } catch (error) {
            this.performanceMonitor.recordMetric({
                operation: "makeRequest",
                duration: 0,
                success: false,
                metadata: {
                    error: error.message,
                    endpoint,
                    params,
                },
            });

            const nftError = this.handleReservoirError(error, {
                endpoint,
                params,
            });
            this.errorHandler.handleError(nftError);
            throw error;
        }
    }
}
