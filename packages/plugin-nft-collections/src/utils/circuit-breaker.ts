export class CircuitBreaker {
    private failures: number = 0;
    private lastFailureTime: number = 0;
    private state: "CLOSED" | "OPEN" | "HALF_OPEN" = "CLOSED";

    constructor(
        private failureThreshold: number,
        private resetTimeout: number
    ) {}

    public isAvailable(): boolean {
        if (this.state === "CLOSED") {
            return true;
        }

        if (this.state === "OPEN") {
            const now = Date.now();
            if (now - this.lastFailureTime >= this.resetTimeout) {
                this.state = "HALF_OPEN";
                return true;
            }
            return false;
        }

        return this.state === "HALF_OPEN";
    }

    public recordSuccess(): void {
        this.failures = 0;
        this.state = "CLOSED";
    }

    public recordFailure(): void {
        this.failures++;
        this.lastFailureTime = Date.now();

        if (this.failures >= this.failureThreshold) {
            this.state = "OPEN";
        }
    }

    public getState(): string {
        return this.state;
    }

    public getFailureCount(): number {
        return this.failures;
    }

    public reset(): void {
        this.failures = 0;
        this.state = "CLOSED";
        this.lastFailureTime = 0;
    }
}
