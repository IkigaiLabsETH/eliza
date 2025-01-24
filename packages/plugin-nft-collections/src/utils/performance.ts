import { EventEmitter } from "events";

interface PerformanceMetric {
    operation: string;
    duration: number;
    success: boolean;
    metadata?: Record<string, any> | undefined;
    timestamp: string;
}

interface PerformanceAlert {
    type: "latency" | "error_rate" | "throughput";
    message: string;
    threshold: number;
    currentValue: number;
    metadata?: Record<string, any> | undefined;
    timestamp: string;
}

interface MetricOptions {
    operation?: string | undefined;
    timeRange?: number | undefined;
    success?: boolean | undefined;
}

export class PerformanceMonitor extends EventEmitter {
    private static instance: PerformanceMonitor;
    private metrics: PerformanceMetric[] = [];
    private readonly maxMetrics: number = 1000;
    private readonly alertThresholds: Record<string, number> = {
        latency: 1000, // 1 second
        errorRate: 0.05, // 5%
        throughput: 100, // requests per minute
    };

    private constructor() {
        super();
        this.setupPeriodicChecks();
    }

    public static getInstance(): PerformanceMonitor {
        if (!PerformanceMonitor.instance) {
            PerformanceMonitor.instance = new PerformanceMonitor();
        }
        return PerformanceMonitor.instance;
    }

    public startOperation(
        operation: string,
        metadata?: Record<string, any> | undefined
    ): () => void {
        const startTime = Date.now();
        return () => {
            const duration = Date.now() - startTime;
            this.recordMetric({
                operation,
                duration,
                success: true,
                metadata,
            });
        };
    }

    public recordMetric(metric: Omit<PerformanceMetric, "timestamp">): void {
        const fullMetric: PerformanceMetric = {
            ...metric,
            metadata: metric.metadata,
            timestamp: new Date().toISOString(),
        };

        this.metrics.push(fullMetric);

        if (this.metrics.length > this.maxMetrics) {
            this.metrics = this.metrics.slice(-this.maxMetrics);
        }

        this.checkThresholds(fullMetric);
    }

    public getMetrics(options: MetricOptions = {}): PerformanceMetric[] {
        const { operation, timeRange, success } = options;
        const now = Date.now();

        return this.metrics.filter((metric) => {
            if (operation && metric.operation !== operation) return false;
            if (success !== undefined && metric.success !== success)
                return false;
            if (timeRange) {
                const metricTime = new Date(metric.timestamp).getTime();
                if (now - metricTime > timeRange) return false;
            }
            return true;
        });
    }

    public getAverageLatency(operation?: string, timeRange?: number): number {
        const relevantMetrics = this.getMetrics({
            operation,
            timeRange,
            success: true,
        });
        if (!relevantMetrics.length) return 0;

        const totalDuration = relevantMetrics.reduce(
            (sum, metric) => sum + metric.duration,
            0
        );
        return totalDuration / relevantMetrics.length;
    }

    public getErrorRate(operation?: string, timeRange?: number): number {
        const allMetrics = this.getMetrics({ operation, timeRange });
        if (!allMetrics.length) return 0;

        const failedMetrics = allMetrics.filter((metric) => !metric.success);
        return failedMetrics.length / allMetrics.length;
    }

    public getThroughput(
        operation?: string,
        timeRange: number = 60000
    ): number {
        const relevantMetrics = this.getMetrics({ operation, timeRange });
        return (relevantMetrics.length * 60000) / timeRange;
    }

    private checkThresholds(metric: PerformanceMetric): void {
        const latencyThreshold = this.alertThresholds.latency;
        if (latencyThreshold && metric.duration > latencyThreshold) {
            const alert: PerformanceAlert = {
                type: "latency",
                message: `High latency detected for operation ${metric.operation}`,
                threshold: latencyThreshold,
                currentValue: metric.duration,
                metadata: metric.metadata,
                timestamp: new Date().toISOString(),
            };
            this.emitAlert(alert);
        }

        const errorRate = this.getErrorRate(metric.operation, 60000);
        const errorRateThreshold = this.alertThresholds.errorRate;
        if (errorRateThreshold && errorRate > errorRateThreshold) {
            const alert: PerformanceAlert = {
                type: "error_rate",
                message: `High error rate detected for operation ${metric.operation}`,
                threshold: errorRateThreshold,
                currentValue: errorRate,
                metadata: metric.metadata,
                timestamp: new Date().toISOString(),
            };
            this.emitAlert(alert);
        }

        const throughput = this.getThroughput(metric.operation);
        const throughputThreshold = this.alertThresholds.throughput;
        if (throughputThreshold && throughput > throughputThreshold) {
            const alert: PerformanceAlert = {
                type: "throughput",
                message: `High throughput detected for operation ${metric.operation}`,
                threshold: throughputThreshold,
                currentValue: throughput,
                metadata: metric.metadata,
                timestamp: new Date().toISOString(),
            };
            this.emitAlert(alert);
        }
    }

    private emitAlert(alert: PerformanceAlert): void {
        this.emit("alert", alert);
    }

    private setupPeriodicChecks(): void {
        setInterval(() => {
            const oneHourAgo = Date.now() - 3600000;
            this.metrics = this.metrics.filter(
                (metric) => new Date(metric.timestamp).getTime() > oneHourAgo
            );
        }, 3600000);

        setInterval(() => {
            const operations = [
                ...new Set(this.metrics.map((m) => m.operation)),
            ];
            operations.forEach((operation) => {
                const errorRate = this.getErrorRate(operation, 60000);
                const throughput = this.getThroughput(operation);
                const avgLatency = this.getAverageLatency(operation, 60000);

                const errorRateThreshold = this.alertThresholds.errorRate;
                if (errorRateThreshold && errorRate > errorRateThreshold) {
                    const alert: PerformanceAlert = {
                        type: "error_rate",
                        message: `Sustained high error rate for operation ${operation}`,
                        threshold: errorRateThreshold,
                        currentValue: errorRate,
                        timestamp: new Date().toISOString(),
                    };
                    this.emitAlert(alert);
                }

                const throughputThreshold = this.alertThresholds.throughput;
                if (throughputThreshold && throughput > throughputThreshold) {
                    const alert: PerformanceAlert = {
                        type: "throughput",
                        message: `Sustained high throughput for operation ${operation}`,
                        threshold: throughputThreshold,
                        currentValue: throughput,
                        timestamp: new Date().toISOString(),
                    };
                    this.emitAlert(alert);
                }

                const latencyThreshold = this.alertThresholds.latency;
                if (latencyThreshold && avgLatency > latencyThreshold) {
                    const alert: PerformanceAlert = {
                        type: "latency",
                        message: `Sustained high latency for operation ${operation}`,
                        threshold: latencyThreshold,
                        currentValue: avgLatency,
                        timestamp: new Date().toISOString(),
                    };
                    this.emitAlert(alert);
                }
            });
        }, 60000);
    }

    public setAlertThreshold(
        type: keyof typeof this.alertThresholds,
        value: number
    ): void {
        this.alertThresholds[type] = value;
    }

    public getAlertThresholds(): Readonly<typeof this.alertThresholds> {
        return { ...this.alertThresholds };
    }
}

// Enhanced usage example
/*
const monitor = PerformanceMonitor.getInstance({
    maxMetrics: 500,
    alertThresholds: {
        latency: 1500, // more aggressive latency threshold
        errorRate: 0.05 // tighter error rate
    },
    logFunction: (msg, level) => {
        // Custom logging, e.g., to a file or monitoring service
        console[level ?? 'log'](msg);
    }
});
*/
