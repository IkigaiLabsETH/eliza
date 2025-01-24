import axios, { AxiosInstance } from "axios";
import { PaginationResponse } from "./types/common";
import {
    TokenData,
    TokenBootstrapParams,
    TokenFloorParams,
    TokenFloorData,
} from "./types/token";
import {
    CollectionData,
    CollectionV7Params,
    CollectionActivityData,
} from "./types/collection";
import {
    OrderData,
    OrderQuoteData,
    OrderParams,
    OrderQuoteParams,
} from "./types/order";
import {
    ReservoirError,
    ReservoirAPIError,
    ReservoirAuthenticationError,
    ReservoirRateLimitError,
    ReservoirNetworkError,
    ReservoirErrorCode,
    ReservoirValidationError,
    ReservoirTimeoutError,
} from "./errors";

export class ReservoirClient {
    private client: AxiosInstance;

    constructor(apiKey: string) {
        this.client = axios.create({
            baseURL: "https://api.reservoir.tools",
            headers: {
                "x-api-key": apiKey,
            },
        });
    }

    private handleError(error: unknown): never {
        if (error instanceof Error) {
            const mockError = error as any;
            if (mockError.response?.status === 401) {
                throw new ReservoirAuthenticationError(
                    mockError.response.data?.message ||
                        "Invalid or missing API key"
                );
            }
            if (mockError.response?.status === 429) {
                throw new ReservoirRateLimitError(
                    mockError.response.data?.message || "Rate limit exceeded"
                );
            }
            if (mockError.response?.status === 400) {
                throw new ReservoirValidationError(
                    "request",
                    mockError.response.data?.message ||
                        "Invalid request parameters",
                    mockError.response.data?.details || {}
                );
            }
            if (mockError.code === "ECONNABORTED") {
                throw new ReservoirTimeoutError();
            }
            if (mockError.code === "ECONNREFUSED") {
                throw new ReservoirNetworkError(mockError);
            }
            if (mockError.response) {
                throw new ReservoirAPIError(mockError);
            }
            throw new ReservoirError({
                message: mockError.message,
                code: ReservoirErrorCode.HttpError,
            });
        }
        throw new ReservoirError({
            message: "Unknown error",
            code: ReservoirErrorCode.UnknownError,
        });
    }

    // Token endpoints
    async getToken(
        contract: string,
        tokenId: string,
        params?: TokenBootstrapParams
    ): Promise<TokenData> {
        try {
            const response = await this.client.get<TokenData>(
                `/tokens/v6/${contract}:${tokenId}`,
                { params }
            );
            return response.data;
        } catch (error) {
            return this.handleError(error);
        }
    }

    async getTokenFloor(params: TokenFloorParams): Promise<TokenFloorData> {
        try {
            const response = await this.client.get<TokenFloorData>(
                "/tokens/floor/v1",
                { params }
            );
            return response.data;
        } catch (error) {
            return this.handleError(error);
        }
    }

    // Collection endpoints
    async getCollection(
        id: string,
        params?: CollectionV7Params
    ): Promise<CollectionData> {
        try {
            const response = await this.client.get<CollectionData>(
                `/collections/v7/${id}`,
                { params }
            );
            return response.data;
        } catch (error) {
            return this.handleError(error);
        }
    }

    async getCollectionActivity(
        collection: string,
        params?: {
            types?: string[];
            limit?: number;
            continuation?: string;
        }
    ): Promise<PaginationResponse<CollectionActivityData>> {
        try {
            const response = await this.client.get<
                PaginationResponse<CollectionActivityData>
            >(`/collections/activity/v6`, {
                params: { collection, ...params },
            });
            return response.data;
        } catch (error) {
            return this.handleError(error);
        }
    }

    // Order endpoints
    async getOrders(
        params: OrderParams
    ): Promise<PaginationResponse<OrderData>> {
        try {
            const response = await this.client.get<
                PaginationResponse<OrderData>
            >("/orders/asks/v4", { params });
            return response.data;
        } catch (error) {
            return this.handleError(error);
        }
    }

    async getOrderQuote(
        params: OrderQuoteParams
    ): Promise<PaginationResponse<OrderQuoteData>> {
        try {
            const response = await this.client.get<
                PaginationResponse<OrderQuoteData>
            >("/orders/quotes/v1", { params });
            return response.data;
        } catch (error) {
            return this.handleError(error);
        }
    }

    // User endpoints
    async getUserTokens(
        address: string
    ): Promise<PaginationResponse<TokenData>> {
        try {
            const response = await this.client.get(`/users/${address}/tokens`);
            return response.data;
        } catch (error) {
            this.handleError(error);
        }
    }

    async getUserCollections(
        address: string
    ): Promise<PaginationResponse<CollectionData>> {
        try {
            const response = await this.client.get(
                `/users/${address}/collections`
            );
            return response.data;
        } catch (error) {
            this.handleError(error);
        }
    }
}
