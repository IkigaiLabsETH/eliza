import { MemoryCacheManager } from "../cache-manager";
import { RateLimiter } from "../rate-limiter";
import { PerformanceMonitor } from "../../utils/performance";
import { ErrorHandler } from "../../utils/error-handler";
import { IAgentRuntime } from "@elizaos/core";
import { z } from "zod";
import {
    ReservoirError,
    ReservoirAuthenticationError,
    ReservoirRateLimitError,
} from "./errors";

// Enhanced error codes specific to Reservoir service
export enum ReservoirErrorCode {
    RATE_LIMIT = "RESERVOIR_RATE_LIMIT",
    API_KEY_INVALID = "RESERVOIR_API_KEY_INVALID",
    INSUFFICIENT_FUNDS = "RESERVOIR_INSUFFICIENT_FUNDS",
    COLLECTION_NOT_FOUND = "RESERVOIR_COLLECTION_NOT_FOUND",
    RateLimitExceeded = "RESERVOIR_RATE_LIMIT_EXCEEDED",
    InvalidApiKey = "RESERVOIR_API_KEY_INVALID",
    ServiceUnavailable = "RESERVOIR_SERVICE_UNAVAILABLE",
    HttpError = "RESERVOIR_HTTP_ERROR",
    UnknownError = "RESERVOIR_UNKNOWN_ERROR",
}

// Validation schema for configuration
export const ReservoirConfigSchema = z.object({
    apiKey: z.string().optional(),
    baseUrl: z.string().url().optional().default("https://api.reservoir.tools"),
    timeout: z.number().positive().optional().default(30000),
    maxRetries: z.number().min(0).optional().default(3),
});

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

// Update ReservoirError constructor interface
export interface ReservoirErrorOptions {
    message: string;
    code: ReservoirErrorCode;
    details?: Record<string, any>;
    retryable?: boolean;
    severity?: string;
    status?: number;
}

export abstract class BaseReservoirService {
    protected cacheManager: MemoryCacheManager | undefined;
    protected rateLimiter: RateLimiter | undefined;
    protected maxRetries: number;
    protected batchSize: number;
    protected performanceMonitor: PerformanceMonitor;
    protected errorHandler: ErrorHandler;
    protected config: {
        cacheManager: MemoryCacheManager | undefined;
        rateLimiter: RateLimiter | undefined;
        maxConcurrent: number;
        maxRetries: number;
        batchSize: number;
        apiKey: string | undefined;
        baseUrl: string;
        timeout: number;
        retryStrategy: {
            maxRetries: number;
            baseDelay: number;
            jitter: boolean;
        };
        cacheConfig: {
            enabled: boolean;
            defaultTTL: number;
        };
        telemetry: {
            enabled: boolean;
            serviceName: string;
        };
    };

    constructor(config: ReservoirServiceConfig = {}) {
        // Validate and merge configuration
        const validatedConfig = ReservoirConfigSchema.parse(config);

        // Initialize with default values
        this.config = {
            cacheManager: config.cacheManager ?? undefined,
            rateLimiter: config.rateLimiter ?? undefined,
            maxConcurrent: config.maxConcurrent ?? 5,
            maxRetries: validatedConfig.maxRetries,
            batchSize: config.batchSize ?? 20,
            apiKey: validatedConfig.apiKey ?? process.env.RESERVOIR_API_KEY,
            baseUrl: validatedConfig.baseUrl ?? "https://api.reservoir.tools",
            timeout: validatedConfig.timeout ?? 30000,
            retryStrategy: {
                maxRetries: config.retryStrategy?.maxRetries ?? 3,
                baseDelay: config.retryStrategy?.baseDelay ?? 1000,
                jitter: config.retryStrategy?.jitter ?? true,
            },
            cacheConfig: {
                enabled: config.cacheConfig?.enabled ?? true,
                defaultTTL: config.cacheConfig?.defaultTTL ?? 300,
            },
            telemetry: {
                enabled: config.telemetry?.enabled ?? true,
                serviceName:
                    config.telemetry?.serviceName ?? "ikigai-nft-reservoir",
            },
        };

        // Initialize components
        this.cacheManager = this.config.cacheManager;
        this.rateLimiter = this.config.rateLimiter;
        this.maxRetries = this.config.maxRetries;
        this.batchSize = this.config.batchSize;
        this.performanceMonitor = PerformanceMonitor.getInstance();
        this.errorHandler = ErrorHandler.getInstance();

        // Set up telemetry and monitoring
        if (this.config.telemetry.enabled) {
            this.setupTelemetry();
        }
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
        if (!this.config.cacheConfig.enabled || !this.cacheManager) {
            return this.makeRequest<T>(endpoint, params, 0, runtime);
        }

        const cacheKey = this.generateCacheKey(endpoint, params);
        const cachedResponse = await this.cacheManager.get<T>(cacheKey);

        if (
            cachedResponse &&
            this.isCacheFresh(cachedResponse, cacheOptions?.ttl)
        ) {
            return cachedResponse;
        }

        const freshData = await this.makeRequest<T>(
            endpoint,
            params,
            0,
            runtime
        );
        await this.cacheManager.set(
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
    protected handleReservoirError(error: unknown): ReservoirError {
        const errorMessage =
            error instanceof Error ? error.message : String(error);

        if (errorMessage.includes("rate limit")) {
            return new ReservoirRateLimitError(this.extractRetryAfter());
        }

        if (errorMessage.includes("API key")) {
            return new ReservoirAuthenticationError(
                "Invalid Reservoir API key"
            );
        }

        return new ReservoirError(errorMessage);
    }

    // Extract retry-after timestamp
    private extractRetryAfter(): number {
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
        const maxRetries =
            options.maxRetries ?? this.config.retryStrategy.maxRetries;
        const baseDelay =
            options.baseDelay ?? this.config.retryStrategy.baseDelay;
        const jitter = options.jitter ?? this.config.retryStrategy.jitter;

        let lastError: Error | null = null;

        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                return await requestFn();
            } catch (error) {
                const errorInstance =
                    error instanceof Error ? error : new Error(String(error));
                lastError = errorInstance;

                const delay = jitter
                    ? baseDelay * Math.pow(2, attempt) * (1 + Math.random())
                    : baseDelay * Math.pow(2, attempt);

                this.performanceMonitor.recordMetric({
                    operation: "retryRequest",
                    duration: delay,
                    success: false,
                    metadata: {
                        attempt,
                        error: errorInstance.message,
                    },
                });

                if (this.isCircuitBreakerTripped(errorInstance)) {
                    break;
                }

                await new Promise((resolve) => setTimeout(resolve, delay));
            }
        }

        throw lastError ?? new Error("Max retries exceeded");
    }

    // Circuit breaker logic
    protected isCircuitBreakerTripped(error: Error): boolean {
        if (error instanceof ReservoirAuthenticationError) {
            return true;
        }
        if (error instanceof ReservoirRateLimitError) {
            return true;
        }
        return false;
    }

    /**
     * Setup telemetry and monitoring
     */
    protected setupTelemetry(): void {
        if (this.config.telemetry?.enabled) {
            this.performanceMonitor.on("alert", (alert: any) => {
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
                const headers = new Headers();
                headers.set("Content-Type", "application/json");
                if (reservoirApiKey) {
                    headers.set("x-api-key", reservoirApiKey);
                }

                const response = await fetch(
                    `${this.config.baseUrl}${endpoint}?${new URLSearchParams(
                        this.sanitizeParams(params)
                    ).toString()}`,
                    {
                        headers,
                        signal: AbortSignal.timeout(this.config.timeout),
                    }
                );

                if (!response.ok) {
                    if (response.status === 401) {
                        throw new ReservoirAuthenticationError(
                            "Invalid Reservoir API key"
                        );
                    }
                    if (response.status === 429) {
                        const retryAfter = parseInt(
                            response.headers.get("retry-after") || "0"
                        );
                        throw new ReservoirRateLimitError(retryAfter);
                    }

                    throw new ReservoirError(
                        `HTTP error! status: ${response.status}`
                    );
                }

                const responseData = await response.json();
                if (!this.validateResponseData<T>(responseData)) {
                    throw new ReservoirError("Invalid response data format");
                }
                return responseData;
            });

            endOperation();
            return result;
        } catch (error) {
            const errorInstance =
                error instanceof Error ? error : new Error(String(error));

            this.performanceMonitor.recordMetric({
                operation: "makeRequest",
                duration: 0,
                success: false,
                metadata: {
                    error: errorInstance.message,
                    endpoint,
                    params,
                },
            });

            const nftError = this.handleReservoirError(errorInstance);
            this.errorHandler.handleError(nftError);
            throw nftError;
        }
    }

    // Validate response data matches expected type
    private validateResponseData<T>(data: unknown): data is T {
        if (!data || typeof data !== "object") {
            return false;
        }
        // Add additional type validation if needed
        return true;
    }

    // Sanitize parameters for URL
    private sanitizeParams(
        params: Record<string, any>
    ): Record<string, string> {
        const sanitized: Record<string, string> = {};
        for (const [key, value] of Object.entries(params)) {
            if (value !== undefined && value !== null) {
                sanitized[key] = String(value);
            }
        }
        return sanitized;
    }

    protected async handleError(error: unknown): Promise<Error | null> {
        if (error instanceof Error) {
            return error;
        }
        return null;
    }

    protected async handleRequestError(error: unknown): Promise<never> {
        if (error instanceof ReservoirError) {
            throw error;
        }
        if (error instanceof Error) {
            throw new ReservoirError("Unknown error occurred");
        }
        throw new ReservoirError("Unknown error occurred");
    }
}
