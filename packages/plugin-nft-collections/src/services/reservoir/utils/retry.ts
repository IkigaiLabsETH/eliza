import { ReservoirError, ReservoirRateLimitError } from "../errors";

export interface RetryOptions {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    backoffFactor?: number;
    retryableErrors?: Array<new (...args: any[]) => ReservoirError>;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 30000,
    backoffFactor: 2,
    retryableErrors: [ReservoirRateLimitError],
};

export async function withRetry<T>(
    operation: () => Promise<T>,
    options: RetryOptions = {}
): Promise<T> {
    const config = { ...DEFAULT_OPTIONS, ...options };
    let lastError: Error | undefined;
    let currentDelay = config.initialDelay;

    for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error as Error;

            if (!shouldRetry(error, config.retryableErrors)) {
                throw error;
            }

            if (attempt === config.maxRetries) {
                break;
            }

            if (error instanceof ReservoirRateLimitError) {
                const retryAfter = error.details?.retryAfter || currentDelay;
                await sleep(retryAfter);
            } else {
                await sleep(currentDelay);
                currentDelay = Math.min(
                    currentDelay * config.backoffFactor,
                    config.maxDelay
                );
            }
        }
    }

    throw lastError || new Error("Operation failed after maximum retries");
}

function shouldRetry(
    error: unknown,
    retryableErrors: Array<new (...args: any[]) => ReservoirError>
): boolean {
    return retryableErrors.some((ErrorClass) => error instanceof ErrorClass);
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number
): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(
            () => reject(new Error(`Operation timed out after ${timeoutMs}ms`)),
            timeoutMs
        );
    });

    return Promise.race([operation(), timeoutPromise]);
}

export async function withCircuitBreaker<T>(
    operation: () => Promise<T>,
    options: {
        maxFailures?: number;
        resetTimeout?: number;
        halfOpenAfter?: number;
    } = {}
): Promise<T> {
    const {
        maxFailures = 5,
        resetTimeout = 60000,
        halfOpenAfter = 30000,
    } = options;

    let failures = 0;
    let lastFailureTime: number | null = null;
    let isOpen = false;

    return (async function circuitBreakerWrapper(): Promise<T> {
        if (isOpen) {
            const timeSinceLastFailure = lastFailureTime
                ? Date.now() - lastFailureTime
                : Infinity;

            if (timeSinceLastFailure < halfOpenAfter) {
                throw new Error("Circuit breaker is open");
            }

            // Half-open state: allow one request through
            try {
                const result = await operation();
                // Success in half-open state: reset circuit breaker
                failures = 0;
                isOpen = false;
                lastFailureTime = null;
                return result;
            } catch (error) {
                // Failure in half-open state: reopen circuit breaker
                failures++;
                lastFailureTime = Date.now();
                isOpen = true;
                throw error;
            }
        }

        try {
            return await operation();
        } catch (error) {
            failures++;
            lastFailureTime = Date.now();

            if (failures >= maxFailures) {
                isOpen = true;
                setTimeout(() => {
                    isOpen = false;
                    failures = 0;
                    lastFailureTime = null;
                }, resetTimeout);
            }

            throw error;
        }
    })();
}
