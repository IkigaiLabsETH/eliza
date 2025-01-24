import { EventEmitter } from "events";

export enum ErrorType {
    API = "API",
    VALIDATION = "VALIDATION",
    RATE_LIMIT = "RATE_LIMIT",
    AUTHENTICATION = "AUTHENTICATION",
    NETWORK = "NETWORK",
    DATABASE = "DATABASE",
    UNKNOWN = "UNKNOWN",
}

export enum ErrorCode {
    // API Errors
    API_REQUEST_FAILED = "API_REQUEST_FAILED",
    API_RESPONSE_INVALID = "API_RESPONSE_INVALID",
    API_KEY_INVALID = "API_KEY_INVALID",

    // Validation Errors
    INVALID_PARAMETERS = "INVALID_PARAMETERS",
    MISSING_REQUIRED_FIELD = "MISSING_REQUIRED_FIELD",
    INVALID_FORMAT = "INVALID_FORMAT",

    // Rate Limit Errors
    RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED",
    TOO_MANY_REQUESTS = "TOO_MANY_REQUESTS",

    // Authentication Errors
    UNAUTHORIZED = "UNAUTHORIZED",
    TOKEN_EXPIRED = "TOKEN_EXPIRED",
    INVALID_CREDENTIALS = "INVALID_CREDENTIALS",

    // Network Errors
    NETWORK_UNAVAILABLE = "NETWORK_UNAVAILABLE",
    TIMEOUT = "TIMEOUT",
    CONNECTION_REFUSED = "CONNECTION_REFUSED",

    // Database Errors
    DB_CONNECTION_ERROR = "DB_CONNECTION_ERROR",
    QUERY_FAILED = "QUERY_FAILED",
    RECORD_NOT_FOUND = "RECORD_NOT_FOUND",

    // Unknown Errors
    UNKNOWN_ERROR = "UNKNOWN_ERROR",
}

export interface ErrorDetails {
    details?: Record<string, unknown>;
    retryable?: boolean;
    severity?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    suggestedAction?: string;
}

export class NFTError extends Error {
    public readonly type: ErrorType;
    public readonly code: ErrorCode;
    public readonly details: Record<string, unknown> | undefined;
    public readonly retryable: boolean;
    public readonly severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    public readonly timestamp: string;
    public readonly suggestedAction: string | undefined;

    constructor(
        type: ErrorType,
        code: ErrorCode,
        message: string,
        errorDetails: ErrorDetails = {}
    ) {
        super(message);
        this.name = "NFTError";
        this.type = type;
        this.code = code;
        this.details = errorDetails.details;
        this.retryable = errorDetails.retryable ?? false;
        this.severity = errorDetails.severity ?? "MEDIUM";
        this.timestamp = new Date().toISOString();
        this.suggestedAction = errorDetails.suggestedAction;

        // Ensure proper stack trace
        Error.captureStackTrace(this, this.constructor);
    }

    public toJSON(): Record<string, unknown> {
        const result: Record<string, unknown> = {
            name: this.name,
            type: this.type,
            code: this.code,
            message: this.message,
            retryable: this.retryable,
            severity: this.severity,
            timestamp: this.timestamp,
        };

        if (this.details) {
            result.details = this.details;
        }
        if (this.suggestedAction) {
            result.suggestedAction = this.suggestedAction;
        }
        if (this.stack) {
            result.stack = this.stack;
        }

        return result;
    }
}

export class NFTErrorFactory {
    public static create(
        type: ErrorType,
        code: ErrorCode,
        message: string,
        details?: ErrorDetails
    ): NFTError {
        return new NFTError(type, code, message, details);
    }

    public static fromError(error: Error): NFTError {
        if (error instanceof NFTError) {
            return error;
        }

        // Network errors
        if (error.name === "NetworkError") {
            return new NFTError(
                ErrorType.NETWORK,
                ErrorCode.NETWORK_UNAVAILABLE,
                error.message,
                {
                    retryable: true,
                    severity: "HIGH",
                    suggestedAction: "Check network connectivity and retry",
                }
            );
        }

        // Timeout errors
        if (error.name === "TimeoutError") {
            return new NFTError(
                ErrorType.NETWORK,
                ErrorCode.TIMEOUT,
                error.message,
                {
                    retryable: true,
                    severity: "MEDIUM",
                    suggestedAction: "Retry with increased timeout",
                }
            );
        }

        // API errors
        if (error.message.includes("API")) {
            return new NFTError(
                ErrorType.API,
                ErrorCode.API_REQUEST_FAILED,
                error.message,
                {
                    retryable: false,
                    severity: "HIGH",
                    suggestedAction:
                        "Check API documentation and request format",
                }
            );
        }

        // Default unknown error
        return new NFTError(
            ErrorType.UNKNOWN,
            ErrorCode.UNKNOWN_ERROR,
            error.message,
            {
                retryable: false,
                severity: "MEDIUM",
                suggestedAction: "Contact support if error persists",
            }
        );
    }
}

export class ErrorHandler extends EventEmitter {
    private static instance: ErrorHandler;
    private errorLog: NFTError[] = [];
    private readonly maxLogSize: number = 1000;

    private constructor() {
        super();
    }

    public static getInstance(): ErrorHandler {
        if (!ErrorHandler.instance) {
            ErrorHandler.instance = new ErrorHandler();
        }
        return ErrorHandler.instance;
    }

    public handleError(error: Error | NFTError): void {
        const nftError =
            error instanceof NFTError
                ? error
                : NFTErrorFactory.fromError(error);

        // Log error
        this.logError(nftError);

        // Emit error event
        this.emit("error", nftError);

        // Handle based on severity
        switch (nftError.severity) {
            case "CRITICAL":
                this.handleCriticalError(nftError);
                break;
            case "HIGH":
                this.handleHighSeverityError(nftError);
                break;
            case "MEDIUM":
                this.handleMediumSeverityError(nftError);
                break;
            case "LOW":
                this.handleLowSeverityError(nftError);
                break;
        }
    }

    private logError(error: NFTError): void {
        this.errorLog.push(error);
        if (this.errorLog.length > this.maxLogSize) {
            this.errorLog = this.errorLog.slice(-this.maxLogSize);
        }

        console.error("NFT Error:", error.toJSON());
    }

    private handleCriticalError(error: NFTError): void {
        // Implement critical error handling
        // For example: Stop all operations, notify admin, etc.
        this.emit("critical-error", error);
    }

    private handleHighSeverityError(error: NFTError): void {
        // Implement high severity error handling
        // For example: Retry with backoff, alert monitoring, etc.
        this.emit("high-severity-error", error);
    }

    private handleMediumSeverityError(error: NFTError): void {
        // Implement medium severity error handling
        // For example: Log for monitoring, retry if retryable
        this.emit("medium-severity-error", error);
    }

    private handleLowSeverityError(error: NFTError): void {
        // Implement low severity error handling
        // For example: Log for monitoring only
        this.emit("low-severity-error", error);
    }

    public getErrorLog(): NFTError[] {
        return [...this.errorLog];
    }

    public getErrorStats(timeRange?: number): {
        total: number;
        bySeverity: Record<string, number>;
        byType: Record<string, number>;
        byCode: Record<string, number>;
    } {
        const relevantErrors = timeRange
            ? this.errorLog.filter((error) => {
                  const errorTime = new Date(error.timestamp).getTime();
                  return Date.now() - errorTime <= timeRange;
              })
            : this.errorLog;

        const stats = {
            total: relevantErrors.length,
            bySeverity: {} as Record<string, number>,
            byType: {} as Record<string, number>,
            byCode: {} as Record<string, number>,
        };

        relevantErrors.forEach((error) => {
            // Count by severity
            stats.bySeverity[error.severity] =
                (stats.bySeverity[error.severity] || 0) + 1;

            // Count by type
            stats.byType[error.type] = (stats.byType[error.type] || 0) + 1;

            // Count by code
            stats.byCode[error.code] = (stats.byCode[error.code] || 0) + 1;
        });

        return stats;
    }

    public clearErrorLog(): void {
        this.errorLog = [];
    }
}
