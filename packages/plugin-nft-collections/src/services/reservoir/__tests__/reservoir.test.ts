import { ReservoirClient } from "../client";
import {
    ReservoirRateLimitError,
    ReservoirAPIError,
    ReservoirValidationError,
    ReservoirOrderError,
    ReservoirTimeoutError,
    handleReservoirError,
    ReservoirAuthenticationError,
} from "../errors";
import { withRetry } from "../utils/retry";
import { CircuitBreaker } from "../utils/circuit-breaker";
import {
    validateString,
    validateNumber,
    ethereumAddress,
    ValidationRule,
} from "../utils/validation";
import { ResponseEnhancer } from "../utils/response-enhancer";
import axios, { AxiosInstance } from "axios";
import { ReservoirService } from "../index";
import { MemoryCacheManager } from "../../cache-manager";
import { RateLimiter } from "../../rate-limiter";
import { ReservoirError, ReservoirErrorCode } from "../errors";
import { mock } from "jest-mock-extended";
import type { IAgentRuntime } from "@elizaos/core";
import type { CollectionData } from "../types/collection";
import type { TokenData } from "../types/token";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("ReservoirClient", () => {
    let client: ReservoirClient;
    let mockAxiosInstance: jest.Mocked<AxiosInstance>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockAxiosInstance = {
            get: jest.fn(),
            post: jest.fn(),
            interceptors: {
                request: { use: jest.fn(), eject: jest.fn() },
                response: { use: jest.fn(), eject: jest.fn() },
            },
            defaults: {},
            delete: jest.fn(),
            head: jest.fn(),
            options: jest.fn(),
            patch: jest.fn(),
            put: jest.fn(),
            request: jest.fn(),
            getUri: jest.fn(),
        } as any;
        mockedAxios.create.mockReturnValue(mockAxiosInstance);
        client = new ReservoirClient("demo-api-key");
    });

    describe("Token Endpoints", () => {
        it("should fetch token data", async () => {
            const mockTokenData = {
                token: {
                    contract: "0x123",
                    tokenId: "1",
                    name: "Test Token",
                },
            };
            mockAxiosInstance.get.mockResolvedValueOnce({
                data: mockTokenData,
            });

            const token = await client.getToken("0x123", "1");
            expect(token).toBeDefined();
            expect(token).toEqual(mockTokenData);
        });

        it("should fetch token floor price", async () => {
            const mockFloorPrice = {
                floorAsk: {
                    price: 1.5,
                    currency: "ETH",
                },
            };
            mockAxiosInstance.get.mockResolvedValueOnce({
                data: mockFloorPrice,
            });

            const floorPrice = await client.getTokenFloor({
                tokens: ["0x123:1"],
            });
            expect(floorPrice).toBeDefined();
            expect(floorPrice).toEqual(mockFloorPrice);
        });
    });

    describe("Collection Endpoints", () => {
        it("should fetch collection data", async () => {
            const mockCollectionData = {
                collection: {
                    id: "bayc",
                    name: "Bored Ape Yacht Club",
                },
            };
            mockAxiosInstance.get.mockResolvedValueOnce({
                data: mockCollectionData,
            });

            const collection = await client.getCollection("bayc");
            expect(collection).toBeDefined();
            expect(collection).toEqual(mockCollectionData);
        });

        it("should fetch collection activity", async () => {
            const mockActivityData = {
                activities: [
                    {
                        type: "sale",
                        price: 100,
                        timestamp: Date.now(),
                    },
                ],
            };
            mockAxiosInstance.get.mockResolvedValueOnce({
                data: mockActivityData,
            });

            const activity = await client.getCollectionActivity("bayc");
            expect(activity).toBeDefined();
            expect(activity).toEqual(mockActivityData);
        });
    });

    describe("Order Endpoints", () => {
        it("should fetch orders", async () => {
            const mockOrdersData = {
                orders: [
                    {
                        id: "order1",
                        type: "ask",
                        price: 1.5,
                    },
                ],
            };
            mockAxiosInstance.get.mockResolvedValueOnce({
                data: mockOrdersData,
            });

            const orders = await client.getOrders({
                status: "active",
            });
            expect(orders).toBeDefined();
            expect(orders).toEqual(mockOrdersData);
        });

        it("should get order quote", async () => {
            const mockQuoteData = {
                quote: {
                    price: 1.5,
                    fees: 0.1,
                },
            };
            mockAxiosInstance.get.mockResolvedValueOnce({
                data: mockQuoteData,
            });

            const quote = await client.getOrderQuote({
                token: "0x123:1",
                side: "buy",
            });
            expect(quote).toBeDefined();
            expect(quote).toEqual(mockQuoteData);
        });
    });

    describe("User Endpoints", () => {
        it("should fetch user tokens", async () => {
            const mockUserTokens = {
                tokens: [
                    {
                        contract: "0x123",
                        tokenId: "1",
                    },
                ],
            };
            mockAxiosInstance.get.mockResolvedValueOnce({
                data: mockUserTokens,
            });

            const tokens = await client.getUserTokens(
                "0x1234567890123456789012345678901234567890"
            );
            expect(tokens).toBeDefined();
            expect(tokens).toEqual(mockUserTokens);
        });

        it("should fetch user collections", async () => {
            const mockUserCollections = {
                collections: [
                    {
                        id: "bayc",
                        name: "Bored Ape Yacht Club",
                    },
                ],
            };
            mockAxiosInstance.get.mockResolvedValueOnce({
                data: mockUserCollections,
            });

            const collections = await client.getUserCollections(
                "0x1234567890123456789012345678901234567890"
            );
            expect(collections).toBeDefined();
            expect(collections).toEqual(mockUserCollections);
        });
    });

    describe("Error Handling", () => {
        it("should handle rate limiting", async () => {
            const operation = jest
                .fn()
                .mockRejectedValue(new ReservoirRateLimitError(5));

            await expect(withRetry(operation)).rejects.toThrow(
                ReservoirRateLimitError
            );
            expect(operation).toHaveBeenCalledTimes(3); // Default max retries
        }, 15000);

        it("should handle API errors", async () => {
            const operation = jest.fn().mockRejectedValue(
                new ReservoirAPIError({
                    response: {
                        status: 400,
                        data: {
                            message: "Invalid request",
                            code: "BAD_REQUEST",
                        },
                    },
                } as any)
            );

            await expect(withRetry(operation)).rejects.toThrow(
                ReservoirAPIError
            );
        });

        it("should handle network errors", async () => {
            const operation = jest
                .fn()
                .mockRejectedValue(new Error("Network error"));
            await expect(withRetry(operation)).rejects.toThrow("Network error");
        });

        it("should handle authentication errors", async () => {
            mockAxiosInstance.get.mockRejectedValueOnce({
                name: "AxiosError",
                message: "Request failed with status code 401",
                isAxiosError: true,
                response: {
                    status: 401,
                    data: {
                        message: "Invalid or missing API key",
                        code: "UNAUTHORIZED",
                    },
                },
            });

            await expect(client.getToken("0x123", "1")).rejects.toThrow(
                ReservoirAuthenticationError
            );

            mockAxiosInstance.get.mockRejectedValueOnce({
                name: "AxiosError",
                message: "Request failed with status code 401",
                isAxiosError: true,
                response: {
                    status: 401,
                    data: {
                        message: "Invalid or missing API key",
                        code: "UNAUTHORIZED",
                    },
                },
            });

            await expect(client.getToken("0x123", "1")).rejects.toThrow(
                "Invalid or missing API key"
            );
        });

        it("should handle validation errors", () => {
            const error = new ReservoirValidationError(
                "price",
                "Price must be greater than 0",
                { min: 0, received: -1 }
            );

            expect(error.field).toBe("price");
            expect(error.message).toBe("Price must be greater than 0");
            expect(error.details).toEqual({ min: 0, received: -1 });
        });

        it("should handle order errors", () => {
            const error = new ReservoirOrderError(
                "order-123",
                "Order already filled",
                { filledAt: "2024-01-24T12:00:00Z" }
            );

            expect(error.orderId).toBe("order-123");
            expect(error.message).toBe("Order already filled");
            expect(error.details).toEqual({ filledAt: "2024-01-24T12:00:00Z" });
        });

        it("should handle timeout errors", () => {
            const error = new ReservoirTimeoutError();
            expect(error.message).toBe("Request timed out");
            expect(error.name).toBe("ReservoirTimeoutError");
        });

        it("should handle unknown errors", () => {
            const unknownError = new Error("Unknown error");
            expect(() => {
                handleReservoirError(unknownError);
            }).toThrow("Unknown error occurred");
        });
    });

    describe("Circuit Breaker", () => {
        it("should trip after max failures", async () => {
            const circuitBreaker = new CircuitBreaker({ maxFailures: 2 });
            const operation = jest.fn().mockRejectedValue(new Error("Failed"));

            await expect(circuitBreaker.execute(operation)).rejects.toThrow();
            await expect(circuitBreaker.execute(operation)).rejects.toThrow();
            await expect(circuitBreaker.execute(operation)).rejects.toThrow(
                "Circuit breaker is open"
            );

            expect(operation).toHaveBeenCalledTimes(2);
        });

        it("should reset after cooldown period", async () => {
            jest.useFakeTimers();
            const circuitBreaker = new CircuitBreaker({
                maxFailures: 1,
                resetTimeout: 1000,
            });
            const operation = jest
                .fn()
                .mockRejectedValueOnce(new Error("Failed"))
                .mockResolvedValueOnce("Success");

            await expect(circuitBreaker.execute(operation)).rejects.toThrow();

            // Fast-forward past the cooldown period
            jest.advanceTimersByTime(1500);

            const result = await circuitBreaker.execute(operation);
            expect(result).toBe("Success");

            jest.useRealTimers();
        });

        it("should handle concurrent requests when open", async () => {
            const circuitBreaker = new CircuitBreaker({ maxFailures: 1 });
            const operation = jest.fn().mockRejectedValue(new Error("Failed"));

            await expect(circuitBreaker.execute(operation)).rejects.toThrow();

            // Multiple concurrent requests when circuit is open
            const requests = Promise.all([
                circuitBreaker.execute(operation),
                circuitBreaker.execute(operation),
                circuitBreaker.execute(operation),
            ]);

            await expect(requests).rejects.toThrow("Circuit breaker is open");
            expect(operation).toHaveBeenCalledTimes(1); // Only the first request should call the operation
        });
    });

    describe("Validation", () => {
        it("should validate strings", () => {
            expect(validateString("test", "field")).toBe("test");
            expect(() => validateString(123, "field")).toThrow();
        });

        it("should handle null/undefined strings", () => {
            expect(() => validateString(null, "field")).toThrow();
            expect(() => validateString(undefined, "field")).toThrow();
        });

        it("should validate string length", () => {
            const minLength: ValidationRule<string> = {
                validate: (str: string) => str.length >= 3,
                message: "String must be at least 3 characters long",
            };
            const maxLength: ValidationRule<string> = {
                validate: (str: string) => str.length <= 10,
                message: "String must be at most 10 characters long",
            };

            expect(
                validateString("test", "field", [minLength, maxLength])
            ).toBe("test");
            expect(() => validateString("ab", "field", [minLength])).toThrow();
            expect(() =>
                validateString("verylongstring", "field", [maxLength])
            ).toThrow();
        });

        it("should validate numbers", () => {
            expect(validateNumber(123, "field")).toBe(123);
            expect(() => validateNumber("123", "field")).toThrow();
        });

        it("should handle null/undefined numbers", () => {
            expect(() => validateNumber(null, "field")).toThrow();
            expect(() => validateNumber(undefined, "field")).toThrow();
        });

        it("should validate number ranges", () => {
            const min: ValidationRule<number> = {
                validate: (n: number) => n >= 0,
                message: "Number must be non-negative",
            };
            const max: ValidationRule<number> = {
                validate: (n: number) => n <= 100,
                message: "Number must be at most 100",
            };

            expect(validateNumber(50, "field", [min, max])).toBe(50);
            expect(() => validateNumber(-1, "field", [min])).toThrow();
            expect(() => validateNumber(101, "field", [max])).toThrow();
        });

        it("should validate Ethereum addresses", () => {
            const address = "0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d";
            expect(() =>
                validateString(address, "address", [ethereumAddress])
            ).not.toThrow();
            expect(() =>
                validateString("invalid", "address", [ethereumAddress])
            ).toThrow();
        });
    });

    describe("Response Enhancement", () => {
        const enhancer = new ResponseEnhancer();

        it("should enhance token data", () => {
            const token = {
                token: {
                    contract: "0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d",
                    tokenId: "1",
                    name: "BAYC #1",
                },
            };

            const enhanced = enhancer.enhanceToken(token);

            expect(enhanced.analytics).toBeDefined();
            expect(enhanced.recommendations).toBeDefined();
        });

        it("should enhance collection data", () => {
            const collection = {
                id: "bayc",
                name: "Bored Ape Yacht Club",
            };

            const enhanced = enhancer.enhanceCollection(collection);

            expect(enhanced.analytics).toBeDefined();
            expect(enhanced.insights).toBeDefined();
        });

        it("should enhance order data", () => {
            const order = {
                id: "order1",
                kind: "seaport-v1.4",
                side: "sell" as const,
                status: "active" as const,
                tokenSetId:
                    "token:0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d:1",
                contract: "0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d",
                maker: "0x1234",
                price: {
                    currency: {
                        contract: "0x0000000000000000000000000000000000000000",
                        name: "ETH",
                        symbol: "ETH",
                        decimals: 18,
                    },
                    amount: {
                        raw: "1000000000000000000",
                        decimal: 1,
                        usd: 1800,
                        native: 1,
                    },
                },
                validFrom: 1625097600,
                validUntil: 1625184000,
                quantityFilled: 0,
                quantityRemaining: 1,
            };

            const enhanced = enhancer.enhanceOrder(order);

            expect(enhanced.analytics).toBeDefined();
            expect(enhanced.risk).toBeDefined();
        });
    });
});

describe("ReservoirService", () => {
    let reservoirService: ReservoirService;
    let cacheManager: MemoryCacheManager;
    let rateLimiter: RateLimiter;

    beforeEach(() => {
        cacheManager = new MemoryCacheManager({ ttl: 3600 });
        rateLimiter = new RateLimiter({ maxRequests: 100, windowMs: 60000 });

        reservoirService = new ReservoirService({
            apiKey: "test-api-key",
            cacheManager,
            rateLimiter,
        });
    });

    describe("Collections API", () => {
        it("should fetch collection successfully", async () => {
            const mockClient = mock<ReservoirClient>();
            mockClient.getCollection.mockResolvedValue(mockCollectionData);
            (reservoirService as any).client = mockClient;

            const collection =
                await reservoirService.collections.getCollections(
                    {
                        id: "0x1234",
                    },
                    mockRuntime
                );

            expect(collection).toEqual(mockCollectionData);
        });

        it("should handle API errors gracefully", async () => {
            const mockClient = mock<ReservoirClient>();
            mockClient.getCollection.mockRejectedValue(
                new ReservoirError({
                    message: "API Error",
                    code: ReservoirErrorCode.HttpError,
                })
            );
            (reservoirService as any).client = mockClient;

            await expect(
                reservoirService.collections.getCollections(
                    {
                        id: "0x1234",
                    },
                    mockRuntime
                )
            ).rejects.toThrow("API Error");
        });

        it("should use cache when available", async () => {
            const mockClient = mock<ReservoirClient>();
            mockClient.getCollection.mockResolvedValue(mockCollectionData);
            (reservoirService as any).client = mockClient;

            // First call should hit the API
            await reservoirService.collections.getCollections(
                {
                    id: "0x1234",
                },
                mockRuntime
            );

            // Second call should use cache
            await reservoirService.collections.getCollections(
                {
                    id: "0x1234",
                },
                mockRuntime
            );

            expect(mockClient.getCollection).toHaveBeenCalledTimes(1);
        });
    });

    describe("Tokens API", () => {
        it("should fetch token details successfully", async () => {
            const mockClient = mock<ReservoirClient>();
            mockClient.getToken.mockResolvedValue(mockTokenData);
            (reservoirService as any).client = mockClient;

            const token = await reservoirService.tokens.getTokens(
                {
                    tokens: ["0x1234:1"],
                },
                mockRuntime
            );

            expect(token).toEqual(mockTokenData);
        });

        it("should handle token not found", async () => {
            const mockClient = mock<ReservoirClient>();
            mockClient.getToken.mockRejectedValue(
                new ReservoirError({
                    message: "Token not found",
                    code: ReservoirErrorCode.COLLECTION_NOT_FOUND,
                })
            );
            (reservoirService as any).client = mockClient;

            await expect(
                reservoirService.tokens.getTokens(
                    {
                        tokens: ["0x1234:999"],
                    },
                    mockRuntime
                )
            ).rejects.toThrow("Token not found");
        });
    });

    describe("Error Handling", () => {
        it("should handle rate limiting", async () => {
            const mockClient = mock<ReservoirClient>();
            mockClient.getCollection.mockRejectedValue(
                new ReservoirError({
                    message: "Rate limit exceeded",
                    code: ReservoirErrorCode.RATE_LIMIT,
                })
            );
            (reservoirService as any).client = mockClient;

            await expect(
                reservoirService.collections.getCollections(
                    {
                        id: "0x1234",
                    },
                    mockRuntime
                )
            ).rejects.toThrow("Rate limit exceeded");
        });

        it("should handle authentication errors", async () => {
            const mockClient = mock<ReservoirClient>();
            mockClient.getCollection.mockRejectedValue(
                new ReservoirError({
                    message: "Invalid API key",
                    code: ReservoirErrorCode.API_KEY_INVALID,
                })
            );
            (reservoirService as any).client = mockClient;

            await expect(
                reservoirService.collections.getCollections(
                    {
                        id: "0x1234",
                    },
                    mockRuntime
                )
            ).rejects.toThrow("Invalid API key");
        });
    });
});

// Mock runtime for testing
const mockRuntime = {
    workspaceId: "test-workspace",
    agentId: "test-agent",
    serverUrl: "http://localhost:3000",
    databaseAdapter: {},
    token: "test-token",
} as unknown as IAgentRuntime;

// Mock data
const mockCurrency = {
    contract: "0x0000000000000000000000000000000000000000",
    name: "Ethereum",
    symbol: "ETH",
    decimals: 18,
};

const mockAmount = {
    raw: "1500000000000000000",
    decimal: 1.5,
    usd: 3000,
    native: 1.5,
};

// Mock API responses
const mockCollectionData: CollectionData = {
    id: "0x1234",
    name: "Test Collection",
    metadata: {
        imageUrl: "https://test.com/image.png",
        description: "Test description",
    },
    stats: {
        floorAsk: {
            id: "ask-1",
            price: {
                currency: mockCurrency,
                amount: mockAmount,
            },
            maker: "0xmaker",
            validFrom: 1234567890,
            validUntil: 1234567899,
            source: {
                id: "opensea",
                name: "OpenSea",
                icon: "https://opensea.io/favicon.ico",
                url: "https://opensea.io",
                domain: "opensea.io",
            },
        },
        volume24h: 100,
        volumeAll: 1000,
    },
};

const mockTokenData: TokenData = {
    token: {
        contract: "0x1234",
        tokenId: "1",
        name: "Test Token",
        image: "https://test.com/image.png",
    },
    market: {
        floorAsk: {
            id: "ask-1",
            price: {
                currency: mockCurrency,
                amount: mockAmount,
            },
            maker: "0xmaker",
            validFrom: 1234567890,
            validUntil: 1234567899,
        },
    },
};
