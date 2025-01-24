import { MemoryCacheManager } from "./cache-manager";
import { RateLimiter } from "./rate-limiter";
import { MarketData, MarketDataSchema } from "../utils/validation";
import axios from "axios";
import { z } from "zod";
import { CircuitBreaker } from "../utils/circuit-breaker";
import { exponentialBackoff } from "../utils/retry";

// Enhanced Market Data Schema with additional metrics
const ExtendedMarketDataSchema = MarketDataSchema.extend({
    liquidityScore: z.number().min(0).max(100).optional(),
    volatility: z.number().min(0).optional(),
    washTradingScore: z.number().min(0).max(100).optional(),
    socialSentiment: z.number().min(-100).max(100).optional(),
    tradeVolume: z
        .object({
            total: z.number().min(0),
            buy: z.number().min(0).optional(),
            sell: z.number().min(0).optional(),
            uniqueTraders: z.number().min(0).optional(),
        })
        .optional(),
    priceHistory: z
        .array(
            z.object({
                timestamp: z.string().datetime(),
                price: z.number().min(0),
                volume: z.number().min(0).optional(),
                trades: z.number().min(0).optional(),
            })
        )
        .optional(),
});

interface MarketIntelligenceConfig {
    cacheManager?: MemoryCacheManager;
    rateLimiter?: RateLimiter;
    openSeaApiKey?: string;
    reservoirApiKey?: string;
    maxRetries?: number;
    retryDelay?: number;
    circuitBreakerOptions?: {
        failureThreshold: number;
        resetTimeout: number;
    };
}

export class MarketIntelligenceService {
    private config: MarketIntelligenceConfig;
    private cacheManager: MemoryCacheManager;
    private rateLimiter?: RateLimiter;
    private openSeaCircuitBreaker: CircuitBreaker;
    private reservoirCircuitBreaker: CircuitBreaker;
    private static CACHE_TTL = 30 * 60; // 30 minutes cache
    private static PRICE_HISTORY_DAYS = 30;

    constructor(config: MarketIntelligenceConfig = {}) {
        this.config = {
            ...config,
            maxRetries: config.maxRetries || 3,
            retryDelay: config.retryDelay || 1000,
            circuitBreakerOptions: config.circuitBreakerOptions || {
                failureThreshold: 5,
                resetTimeout: 60000,
            },
        };

        this.cacheManager =
            config.cacheManager ||
            new MemoryCacheManager({
                ttl: MarketIntelligenceService.CACHE_TTL,
            });
        this.rateLimiter = config.rateLimiter;

        // Initialize circuit breakers
        this.openSeaCircuitBreaker = new CircuitBreaker(
            this.config.circuitBreakerOptions.failureThreshold,
            this.config.circuitBreakerOptions.resetTimeout
        );
        this.reservoirCircuitBreaker = new CircuitBreaker(
            this.config.circuitBreakerOptions.failureThreshold,
            this.config.circuitBreakerOptions.resetTimeout
        );
    }

    async getMarketIntelligence(address: string): Promise<MarketData> {
        const cacheKey = `market_intelligence:${address}`;

        try {
            // Check cache first
            const cachedData =
                await this.cacheManager.get<MarketData>(cacheKey);
            if (cachedData) return cachedData;

            // Apply rate limiting if configured
            if (this.rateLimiter) {
                await this.rateLimiter.consume(address);
            }

            // Fetch market data with retries and circuit breaker
            const [openSeaData, reservoirData, priceHistory] =
                await Promise.allSettled([
                    this.fetchWithRetry(() =>
                        this.fetchOpenSeaMarketData(address)
                    ),
                    this.fetchWithRetry(() =>
                        this.fetchReservoirMarketData(address)
                    ),
                    this.fetchPriceHistory(address),
                ]);

            const marketData: MarketData = {
                lastUpdate: new Date().toISOString(),
                floorPrice: this.extractMetric(openSeaData, "floorPrice") || 0,
                volume24h: this.extractMetric(openSeaData, "volume24h") || 0,
                volume7d: this.extractMetric(reservoirData, "volume7d") || 0,
                marketCap: this.calculateMarketCap(
                    this.extractMetric(openSeaData, "floorPrice") || 0,
                    this.extractMetric(openSeaData, "totalSupply") || 0
                ),
                holders:
                    this.extractMetric(reservoirData, "uniqueHolders") || 0,
                bestOffer: this.extractMetric(openSeaData, "bestOffer") || 0,
            };

            // Calculate advanced metrics
            const volatility = this.calculateVolatility(priceHistory);
            const liquidityScore = this.calculateLiquidityScore(
                marketData,
                priceHistory
            );
            const washTradingScore = await this.detectWashTrading(address);
            const socialSentiment = await this.analyzeSocialSentiment(address);

            // Validate and cache market data with advanced metrics
            const validatedData = ExtendedMarketDataSchema.parse({
                ...marketData,
                liquidityScore,
                volatility,
                washTradingScore,
                socialSentiment,
                priceHistory: this.extractMetric(priceHistory, "prices"),
            });

            await this.cacheManager.set(
                cacheKey,
                validatedData,
                MarketIntelligenceService.CACHE_TTL
            );

            return validatedData;
        } catch (error) {
            console.error(
                `Market intelligence fetch failed for ${address}:`,
                error
            );
            throw new Error(
                `Failed to retrieve market intelligence: ${error.message}`
            );
        }
    }

    private async fetchWithRetry<T>(operation: () => Promise<T>): Promise<T> {
        return exponentialBackoff(
            operation,
            this.config.maxRetries,
            this.config.retryDelay
        );
    }

    private async fetchOpenSeaMarketData(address: string) {
        if (!this.config.openSeaApiKey) {
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
                        "X-API-KEY": this.config.openSeaApiKey,
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

    private async fetchReservoirMarketData(address: string) {
        if (!this.config.reservoirApiKey) {
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
                        "X-API-KEY": this.config.reservoirApiKey,
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

    private async fetchPriceHistory(address: string): Promise<any[]> {
        const cacheKey = `price_history:${address}`;
        const cachedHistory = await this.cacheManager.get<any[]>(cacheKey);

        if (cachedHistory) return cachedHistory;

        try {
            const response = await axios.get(
                `https://api.reservoir.tools/collections/${address}/prices/v2`,
                {
                    params: {
                        limit: MarketIntelligenceService.PRICE_HISTORY_DAYS,
                    },
                    headers: {
                        "X-API-KEY": this.config.reservoirApiKey,
                    },
                }
            );

            const priceHistory = response.data.prices.map((p: any) => ({
                timestamp: p.timestamp,
                price: p.price,
                volume: p.volume,
                trades: p.trades,
            }));

            await this.cacheManager.set(
                cacheKey,
                priceHistory,
                MarketIntelligenceService.CACHE_TTL
            );
            return priceHistory;
        } catch (error) {
            console.error("Price history fetch failed", error);
            return [];
        }
    }

    private calculateVolatility(
        priceHistory: PromiseSettledResult<any[]>
    ): number {
        if (
            priceHistory.status !== "fulfilled" ||
            !priceHistory.value?.length
        ) {
            return 0;
        }

        const prices = priceHistory.value.map((p) => p.price);
        const returns = prices
            .slice(1)
            .map((price, i) => Math.log(price / prices[i]));

        const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
        const variance =
            returns.reduce((a, b) => a + Math.pow(b - meanReturn, 2), 0) /
            returns.length;

        return Math.sqrt(variance * 365) * 100; // Annualized volatility
    }

    private calculateLiquidityScore(
        marketData: MarketData,
        priceHistory: PromiseSettledResult<any[]>
    ): number {
        const { volume24h, holders } = marketData;

        if (!volume24h || !holders) return 0;

        // Base liquidity score from volume/holders ratio
        const volumeScore = Math.min((volume24h / holders) * 10, 50);

        // Additional factors from price history
        const priceStability = this.calculatePriceStability(priceHistory);
        const tradeFrequency = this.calculateTradeFrequency(priceHistory);

        // Weighted combination
        return Math.min(
            volumeScore + priceStability * 25 + tradeFrequency * 25,
            100
        );
    }

    private calculatePriceStability(
        priceHistory: PromiseSettledResult<any[]>
    ): number {
        if (
            priceHistory.status !== "fulfilled" ||
            !priceHistory.value?.length
        ) {
            return 0;
        }

        const prices = priceHistory.value.map((p) => p.price);
        const maxPrice = Math.max(...prices);
        const minPrice = Math.min(...prices);
        const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;

        return 1 - (maxPrice - minPrice) / avgPrice;
    }

    private calculateTradeFrequency(
        priceHistory: PromiseSettledResult<any[]>
    ): number {
        if (
            priceHistory.status !== "fulfilled" ||
            !priceHistory.value?.length
        ) {
            return 0;
        }

        const totalTrades = priceHistory.value.reduce(
            (sum, p) => sum + (p.trades || 0),
            0
        );
        return Math.min(totalTrades / priceHistory.value.length / 10, 1);
    }

    private async detectWashTrading(address: string): Promise<number> {
        try {
            const trades = await this.fetchRecentTrades(address);

            // Analyze trading patterns
            const suspiciousPatterns = this.analyzeTradingPatterns(trades);
            const addressConcentration =
                this.calculateAddressConcentration(trades);
            const priceDeviation = this.calculatePriceDeviation(trades);

            // Combine factors into wash trading score (0-100)
            return Math.min(
                suspiciousPatterns * 40 +
                    addressConcentration * 30 +
                    priceDeviation * 30,
                100
            );
        } catch (error) {
            console.error("Wash trading detection failed", error);
            return 0;
        }
    }

    private async analyzeSocialSentiment(address: string): Promise<number> {
        try {
            const [twitterData, discordData] = await Promise.all([
                this.fetchTwitterSentiment(address),
                this.fetchDiscordActivity(address),
            ]);

            // Combine social metrics into sentiment score (-100 to 100)
            return this.calculateSentimentScore(twitterData, discordData);
        } catch (error) {
            console.error("Social sentiment analysis failed", error);
            return 0;
        }
    }

    private async fetchRecentTrades(address: string): Promise<any[]> {
        // Implementation for fetching recent trades
        return [];
    }

    private analyzeTradingPatterns(trades: any[]): number {
        // Implementation for analyzing trading patterns
        return 0;
    }

    private calculateAddressConcentration(trades: any[]): number {
        // Implementation for calculating address concentration
        return 0;
    }

    private calculatePriceDeviation(trades: any[]): number {
        // Implementation for calculating price deviation
        return 0;
    }

    private async fetchTwitterSentiment(address: string): Promise<any> {
        // Implementation for fetching Twitter sentiment
        return {};
    }

    private async fetchDiscordActivity(address: string): Promise<any> {
        // Implementation for fetching Discord activity
        return {};
    }

    private calculateSentimentScore(
        twitterData: any,
        discordData: any
    ): number {
        // Implementation for calculating sentiment score
        return 0;
    }

    private extractMetric(
        result: PromiseSettledResult<any>,
        key: string
    ): number | undefined {
        if (result.status === "fulfilled" && result.value) {
            return result.value[key];
        }
        return undefined;
    }

    private calculateMarketCap(
        floorPrice: number,
        totalSupply: number
    ): number {
        return floorPrice * totalSupply;
    }
}

export const marketIntelligenceService = new MarketIntelligenceService({
    openSeaApiKey: process.env.OPENSEA_API_KEY,
    reservoirApiKey: process.env.RESERVOIR_API_KEY,
});
