import { MemoryCacheManager } from "./cache-manager";
import { RateLimiter } from "./rate-limiter";
import axios from "axios";
import { CircuitBreaker } from "../utils/circuit-breaker";

// Types for market intelligence data
interface BaseMarketData {
    floorPrice: number;
    volume24h: number;
    holders: number;
    sales24h: number;
}

interface EnhancedMarketData extends BaseMarketData {
    marketCap: number;
    lastUpdate: string;
    bestOffer: number | null;
    volume7d: number | null;
    volume30d: number | null;
    sales7d: number | null;
    sales30d: number | null;
    uniqueHolders: number | null;
    totalSupply: number | null;
    listedCount: number | null;
    priceHistory: PriceHistoryEntry[] | null;
}

interface PriceHistoryEntry {
    timestamp: number;
    price: number;
    volume: number | null;
    trades: number | null;
}

interface MarketIntelligenceConfig {
    cacheManager?: MemoryCacheManager | undefined;
    rateLimiter?: RateLimiter | undefined;
    openSeaApiKey?: string | undefined;
    reservoirApiKey?: string | undefined;
    maxRetries?: number;
    retryDelay?: number;
    circuitBreakerOptions?: {
        failureThreshold: number;
        resetTimeout: number;
    };
}

interface InitializeConfig {
    openSeaApiKey?: string | undefined;
    reservoirApiKey?: string | undefined;
}

export class MarketIntelligenceService {
    private static readonly CACHE_TTL = 900; // 15 minutes
    private readonly config: MarketIntelligenceConfig;
    private readonly openSeaCircuitBreaker: CircuitBreaker;
    private readonly reservoirCircuitBreaker: CircuitBreaker;

    constructor(config: MarketIntelligenceConfig) {
        this.config = config;

        const defaultCircuitBreakerOptions = {
            failureThreshold: 5,
            resetTimeout: 60000,
        };

        this.openSeaCircuitBreaker = new CircuitBreaker(
            this.config.circuitBreakerOptions?.failureThreshold ??
                defaultCircuitBreakerOptions.failureThreshold,
            this.config.circuitBreakerOptions?.resetTimeout ??
                defaultCircuitBreakerOptions.resetTimeout
        );

        this.reservoirCircuitBreaker = new CircuitBreaker(
            this.config.circuitBreakerOptions?.failureThreshold ??
                defaultCircuitBreakerOptions.failureThreshold,
            this.config.circuitBreakerOptions?.resetTimeout ??
                defaultCircuitBreakerOptions.resetTimeout
        );
    }

    private extractMetric(
        data: Record<string, any> | undefined | null,
        key: string
    ): number {
        if (!data || typeof data[key] !== "number") return 0;
        return data[key];
    }

    async getMarketIntelligence(address: string): Promise<EnhancedMarketData> {
        const cacheKey = `market_intelligence:${address}`;

        try {
            // Check cache first
            const cachedData =
                await this.config.cacheManager?.get<EnhancedMarketData>(
                    cacheKey
                );
            if (cachedData) return cachedData;

            // Fetch data from APIs
            const [openSeaResult, reservoirResult] = await Promise.all([
                this.fetchOpenSeaData(address),
                this.fetchReservoirData(address),
            ]);

            const priceHistory = await this.fetchPriceHistory(address);

            const marketData: EnhancedMarketData = {
                floorPrice: this.extractMetric(openSeaResult, "floorPrice"),
                volume24h: this.extractMetric(openSeaResult, "volume24h"),
                holders: this.extractMetric(reservoirResult, "holders"),
                sales24h: this.extractMetric(reservoirResult, "sales24h"),
                marketCap: this.calculateMarketCap(
                    this.extractMetric(openSeaResult, "floorPrice"),
                    this.extractMetric(openSeaResult, "totalSupply")
                ),
                lastUpdate: new Date().toISOString(),
                bestOffer: this.extractMetric(openSeaResult, "bestOffer"),
                volume7d: this.extractMetric(reservoirResult, "volume7d"),
                volume30d: null,
                sales7d: null,
                sales30d: null,
                uniqueHolders: this.extractMetric(
                    reservoirResult,
                    "uniqueHolders"
                ),
                totalSupply: this.extractMetric(openSeaResult, "totalSupply"),
                listedCount: null,
                priceHistory: priceHistory.length > 0 ? priceHistory : null,
            };

            // Cache the result
            await this.config.cacheManager?.set(
                cacheKey,
                marketData,
                MarketIntelligenceService.CACHE_TTL
            );

            return marketData;
        } catch (error) {
            console.error("Failed to fetch market intelligence:", error);
            throw error;
        }
    }

    private async fetchPriceHistory(
        address: string
    ): Promise<PriceHistoryEntry[]> {
        const cacheKey = `price_history:${address}`;
        const cachedHistory =
            await this.config.cacheManager?.get<PriceHistoryEntry[]>(cacheKey);

        if (cachedHistory) return cachedHistory;

        try {
            // Fetch from Reservoir API
            const history = await this.fetchReservoirPriceHistory(address);
            const formattedHistory: PriceHistoryEntry[] = history.map(
                (entry) => ({
                    timestamp: Math.floor(
                        new Date(entry.timestamp).getTime() / 1000
                    ),
                    price: entry.price,
                    volume: entry.volume || null,
                    trades: entry.trades || null,
                })
            );

            await this.config.cacheManager?.set(
                cacheKey,
                formattedHistory,
                MarketIntelligenceService.CACHE_TTL
            );
            return formattedHistory;
        } catch (error) {
            console.error("Failed to fetch price history:", error);
            return [];
        }
    }

    private async fetchOpenSeaData(address: string) {
        const apiKey = this.config.openSeaApiKey;
        if (!apiKey) {
            console.warn(
                "OpenSea API key not provided for market intelligence"
            );
            return undefined;
        }

        if (!this.openSeaCircuitBreaker.isAvailable()) {
            throw new Error("OpenSea circuit breaker is open");
        }

        try {
            const response = await axios.get(
                `https://api.opensea.io/api/v2/collections/${address}`,
                {
                    headers: {
                        "X-API-KEY": apiKey,
                    },
                }
            );

            this.openSeaCircuitBreaker.recordSuccess();

            return {
                floorPrice: response.data.floor_price,
                volume24h: response.data.total_volume,
                bestOffer: response.data.best_offer,
                totalSupply: response.data.total_supply,
            };
        } catch (error) {
            this.openSeaCircuitBreaker.recordFailure();
            console.error("OpenSea market data fetch failed", error);
            throw error;
        }
    }

    private async fetchReservoirData(address: string) {
        const apiKey = this.config.reservoirApiKey;
        if (!apiKey) {
            console.warn(
                "Reservoir API key not provided for market intelligence"
            );
            return undefined;
        }

        if (!this.reservoirCircuitBreaker.isAvailable()) {
            throw new Error("Reservoir circuit breaker is open");
        }

        try {
            const response = await axios.get(
                `https://api.reservoir.tools/collections/v6?id=${address}`,
                {
                    headers: {
                        "X-API-KEY": apiKey,
                    },
                }
            );

            this.reservoirCircuitBreaker.recordSuccess();

            return {
                volume7d: response.data.volume7d,
                uniqueHolders: response.data.uniqueHolders,
            };
        } catch (error) {
            this.reservoirCircuitBreaker.recordFailure();
            console.error("Reservoir market data fetch failed", error);
            throw error;
        }
    }

    private async fetchReservoirPriceHistory(address: string): Promise<any[]> {
        const apiKey = this.config.reservoirApiKey;
        if (!apiKey) {
            console.warn("Reservoir API key not provided for price history");
            return [];
        }

        if (!this.reservoirCircuitBreaker.isAvailable()) {
            throw new Error("Reservoir circuit breaker is open");
        }

        try {
            const response = await axios.get(
                `https://api.reservoir.tools/collections/${address}/prices/v2`,
                {
                    headers: {
                        "X-API-KEY": apiKey,
                    },
                    params: {
                        limit: 100,
                    },
                }
            );

            this.reservoirCircuitBreaker.recordSuccess();
            return response.data.prices || [];
        } catch (error) {
            this.reservoirCircuitBreaker.recordFailure();
            console.error("Reservoir price history fetch failed", error);
            return [];
        }
    }

    private calculateMarketCap(
        floorPrice: number,
        totalSupply: number
    ): number {
        return floorPrice * totalSupply;
    }

    public async initialize(config: InitializeConfig): Promise<void> {
        this.config.openSeaApiKey = config.openSeaApiKey;
        this.config.reservoirApiKey = config.reservoirApiKey;
    }
}

export const marketIntelligenceService = new MarketIntelligenceService({
    openSeaApiKey: process.env.OPENSEA_API_KEY,
    reservoirApiKey: process.env.RESERVOIR_API_KEY,
});
