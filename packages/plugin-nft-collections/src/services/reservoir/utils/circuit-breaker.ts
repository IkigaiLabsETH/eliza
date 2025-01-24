export interface CircuitBreakerOptions {
    maxFailures?: number;
    resetTimeout?: number;
    halfOpenAfter?: number;
    onStateChange?: (state: CircuitBreakerState) => void;
}

export type CircuitBreakerState = "CLOSED" | "OPEN" | "HALF_OPEN";

export class CircuitBreaker {
    private failures: number = 0;
    private lastFailureTime: number | null = null;
    private state: CircuitBreakerState = "CLOSED";
    private resetTimeoutId: NodeJS.Timeout | null = null;

    constructor(private options: CircuitBreakerOptions = {}) {
        this.options = {
            maxFailures: 5,
            resetTimeout: 60000,
            halfOpenAfter: 30000,
            ...options,
        };
    }

    async execute<T>(operation: () => Promise<T>): Promise<T> {
        if (this.isOpen()) {
            const timeSinceLastFailure = this.lastFailureTime
                ? Date.now() - this.lastFailureTime
                : Infinity;

            if (timeSinceLastFailure < (this.options.halfOpenAfter || 30000)) {
                throw new Error("Circuit breaker is open");
            }

            this.transitionTo("HALF_OPEN");
        }

        try {
            const result = await operation();
            this.onSuccess();
            return result;
        } catch (error) {
            this.onFailure();
            throw error;
        }
    }

    private isOpen(): boolean {
        return this.state === "OPEN";
    }

    private onSuccess(): void {
        if (this.state === "HALF_OPEN") {
            this.reset();
        }
    }

    private onFailure(): void {
        this.failures++;
        this.lastFailureTime = Date.now();

        if (this.failures >= (this.options.maxFailures || 5)) {
            this.transitionTo("OPEN");

            if (this.resetTimeoutId) {
                clearTimeout(this.resetTimeoutId);
            }

            this.resetTimeoutId = setTimeout(() => {
                this.reset();
            }, this.options.resetTimeout || 60000);
        }
    }

    private reset(): void {
        this.failures = 0;
        this.lastFailureTime = null;
        this.transitionTo("CLOSED");

        if (this.resetTimeoutId) {
            clearTimeout(this.resetTimeoutId);
            this.resetTimeoutId = null;
        }
    }

    private transitionTo(newState: CircuitBreakerState): void {
        if (this.state !== newState) {
            this.state = newState;
            if (this.options.onStateChange) {
                this.options.onStateChange(newState);
            }
        }
    }

    getState(): CircuitBreakerState {
        return this.state;
    }

    getFailures(): number {
        return this.failures;
    }

    getLastFailureTime(): number | null {
        return this.lastFailureTime;
    }
}
