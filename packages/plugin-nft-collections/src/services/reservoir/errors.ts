import { AxiosError } from "axios";

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

export interface ReservoirErrorOptions {
    message: string;
    code: ReservoirErrorCode;
    details?: Record<string, any>;
    retryable?: boolean;
    severity?: string;
    status?: number;
}

export class ReservoirError extends Error {
    public readonly code: ReservoirErrorCode;
    public readonly details: Record<string, any>;
    public readonly retryable: boolean;
    public readonly severity: string;
    public readonly status: number;

    constructor(options: ReservoirErrorOptions) {
        super(options.message);
        this.name = "ReservoirError";
        this.code = options.code;
        this.details = options.details || {};
        this.retryable = options.retryable ?? false;
        this.severity = options.severity ?? "ERROR";
        this.status = options.status ?? 500;
    }

    override toString(): string {
        return `${this.name}: ${this.message} (${this.code})`;
    }
}

export class ReservoirAPIError extends ReservoirError {
    public statusCode: number;
    public errorCode: string;
    public override details: Record<string, any>;

    constructor(error: AxiosError) {
        const response = error.response?.data as any;
        const message = response?.message || error.message;
        super({
            message,
            code: ReservoirErrorCode.HttpError,
            details: response?.details || {},
            status: error.response?.status || 500,
        });

        this.name = "ReservoirAPIError";
        this.statusCode = error.response?.status || 500;
        this.errorCode = response?.code || "UNKNOWN_ERROR";
        this.details = response?.details || {};
    }
}

export class ReservoirNetworkError extends ReservoirError {
    constructor(error: Error) {
        super({
            message: `Network error: ${error.message}`,
            code: ReservoirErrorCode.HttpError,
            retryable: false,
            severity: "CRITICAL",
        });
        this.name = "ReservoirNetworkError";
    }
}

export class ReservoirTimeoutError extends ReservoirError {
    constructor() {
        super({
            message: "Request timed out",
            code: ReservoirErrorCode.HttpError,
            retryable: false,
            severity: "CRITICAL",
        });
        this.name = "ReservoirTimeoutError";
    }
}

export class ReservoirValidationError extends ReservoirError {
    public field: string;
    public override details: Record<string, any>;

    constructor(
        field: string,
        message: string,
        details: Record<string, any> = {}
    ) {
        super({
            message,
            code: ReservoirErrorCode.HttpError,
            details,
            retryable: false,
            severity: "CRITICAL",
        });
        this.name = "ReservoirValidationError";
        this.field = field;
        this.details = details;
    }
}

export class ReservoirAuthenticationError extends ReservoirError {
    constructor(options: ReservoirErrorOptions) {
        super({
            ...options,
            code: ReservoirErrorCode.API_KEY_INVALID,
            retryable: false,
            severity: "CRITICAL",
        });
        this.name = "ReservoirAuthenticationError";
    }

    override toString(): string {
        return `${this.name}: ${this.message}`;
    }
}

export class ReservoirRateLimitError extends ReservoirError {
    constructor(retryAfter: number) {
        super({
            message: "Rate limit exceeded",
            code: ReservoirErrorCode.RATE_LIMIT,
            details: { retryAfter },
            retryable: true,
            severity: "WARNING",
        });
        this.name = "ReservoirRateLimitError";
    }

    override toString(): string {
        return `${this.name}: ${this.message} (retry after: ${this.details.retryAfter}ms)`;
    }
}

export class ReservoirOrderError extends ReservoirError {
    public orderId: string;
    public override details: Record<string, any>;

    constructor(
        orderId: string,
        message: string,
        details: Record<string, any> = {}
    ) {
        super({
            message,
            code: ReservoirErrorCode.HttpError,
            details,
            retryable: false,
            severity: "CRITICAL",
        });
        this.name = "ReservoirOrderError";
        this.orderId = orderId;
        this.details = details;
    }
}

export function handleReservoirError(error: unknown): never {
    if (error instanceof ReservoirError) {
        throw error;
    }

    if (error instanceof AxiosError) {
        const response = error.response;

        if (!response) {
            throw new ReservoirNetworkError(error);
        }

        switch (response.status) {
            case 401:
                throw new ReservoirAuthenticationError(
                    response.data?.message || "Invalid or missing API key"
                );
            case 429:
                throw new ReservoirRateLimitError(
                    parseInt(response.headers["retry-after"] || "0")
                );
            default:
                throw new ReservoirAPIError(error);
        }
    }

    throw new ReservoirError({
        message: "Unknown error occurred",
        code: ReservoirErrorCode.UnknownError,
        retryable: false,
        severity: "CRITICAL",
    });
}
