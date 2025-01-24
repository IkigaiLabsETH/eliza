/**
 * Implements exponential backoff retry logic for async operations
 * @param operation The async operation to retry
 * @param maxRetries Maximum number of retry attempts
 * @param baseDelay Base delay in milliseconds
 * @returns Promise that resolves with the operation result or rejects after max retries
 */
export async function exponentialBackoff<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error;

            if (attempt === maxRetries) {
                break;
            }

            // Calculate delay with exponential backoff and jitter
            const delay = Math.min(
                baseDelay * Math.pow(2, attempt) * (0.5 + Math.random()),
                30000 // Max delay of 30 seconds
            );

            await new Promise((resolve) => setTimeout(resolve, delay));
        }
    }

    throw lastError;
}

/**
 * Retry decorator that can be used to automatically retry class methods
 * @param maxRetries Maximum number of retry attempts
 * @param baseDelay Base delay in milliseconds
 */
export function withRetry(maxRetries: number = 3, baseDelay: number = 1000) {
    return function (
        target: any,
        propertyKey: string,
        descriptor: PropertyDescriptor
    ) {
        const originalMethod = descriptor.value;

        descriptor.value = async function (...args: any[]) {
            return exponentialBackoff(
                () => originalMethod.apply(this, args),
                maxRetries,
                baseDelay
            );
        };

        return descriptor;
    };
}

/**
 * Utility to create a retry policy with custom configuration
 */
export interface RetryPolicy {
    maxRetries: number;
    baseDelay: number;
    maxDelay?: number;
    shouldRetry?: (error: Error) => boolean;
}

/**
 * Creates a configurable retry function with the specified policy
 * @param policy Retry policy configuration
 * @returns Function that implements the retry policy
 */
export function createRetryFunction(policy: RetryPolicy) {
    return async function retry<T>(operation: () => Promise<T>): Promise<T> {
        let lastError: Error;

        for (let attempt = 0; attempt <= policy.maxRetries; attempt++) {
            try {
                return await operation();
            } catch (error) {
                lastError = error;

                if (
                    attempt === policy.maxRetries ||
                    (policy.shouldRetry && !policy.shouldRetry(error))
                ) {
                    break;
                }

                const delay = Math.min(
                    policy.baseDelay *
                        Math.pow(2, attempt) *
                        (0.5 + Math.random()),
                    policy.maxDelay || 30000
                );

                await new Promise((resolve) => setTimeout(resolve, delay));
            }
        }

        throw lastError;
    };
}
