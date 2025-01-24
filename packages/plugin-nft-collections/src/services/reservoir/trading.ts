import { IAgentRuntime } from "@elizaos/core";
import { BaseReservoirService } from "./base";
import { ExecuteService, ExecuteBuyParams, ExecuteListParams } from "./execute";
import { MarketService } from "./market";
import { ReservoirError, ReservoirErrorCode } from "./errors";
import { OrdersAsksParams, OrderAskData } from "./types/market";

export interface Position {
    tokenId: string;
    collection: string;
    purchasePrice: number;
    listPrice: number;
    purchaseTime: number;
    gasUsed: number;
}

export interface MarketTrend {
    volumeChange24h: number;
    priceChange24h: number;
    salesCount24h: number;
    averageListingPrice: number;
    isUptrend: boolean;
}

export interface CollectionHealth {
    uniqueHolders: number;
    floorPrice: number;
    marketCap: number;
    isHealthy: boolean;
}

export interface SweepConfig {
    minPriceGapPercent: number; // Minimum price gap % to consider an opportunity
    maxPurchasePrice: number; // Maximum price willing to pay in ETH
    walletAddress: string; // Wallet to use for transactions
    targetProfitPercent: number; // Target profit % for relisting
    maxSlippageBps: number; // Maximum allowed slippage in basis points (e.g. 100 = 1%)
    minProfitAfterGas: number; // Minimum profit required after gas costs in ETH
    maxGasPrice: number; // Maximum gas price willing to pay in gwei
    maxPositionsPerCollection: number; // Maximum number of positions to hold per collection
    maxTotalPositions: number; // Maximum total positions across all collections
    minMarketCap: number; // Minimum market cap in ETH
    minUniqueHolders: number; // Minimum number of unique holders
    minDailyVolume: number; // Minimum 24h volume in ETH
    maxHoldingTime: number; // Maximum time to hold a position in seconds
}

export interface SweepResult {
    purchased: boolean;
    listed: boolean;
    purchasePrice?: number;
    listPrice?: number;
    tokenId?: string | undefined;
    collection?: string;
    error?: string;
    gasUsed?: number; // Gas used for the entire operation
    estimatedProfit?: number; // Estimated profit after all costs
    actualSlippage?: number; // Actual slippage experienced
    marketTrend?: MarketTrend; // Market trend analysis
    collectionHealth?: CollectionHealth; // Collection health metrics
}

interface GasEstimate {
    buyGas: number;
    listGas: number;
    totalGasInEth: number;
}

export class TradingService extends BaseReservoirService {
    private executeService: ExecuteService;
    private marketService: MarketService;
    private positions: Map<string, Position[]> = new Map(); // Collection -> Positions

    // Typical gas costs for operations (can be adjusted based on network conditions)
    private readonly TYPICAL_BUY_GAS = 150000; // 150k gas units
    private readonly TYPICAL_LIST_GAS = 100000; // 100k gas units

    constructor(
        executeService: ExecuteService,
        marketService: MarketService,
        config: Record<string, any>
    ) {
        super(config);
        this.executeService = executeService;
        this.marketService = marketService;
    }

    private getSafePrice(ask: OrderAskData | undefined): number {
        if (!ask?.price?.amount) return 0;
        return Number(ask.price.amount);
    }

    private getFirstListing(
        listings: OrderAskData[]
    ): OrderAskData | undefined {
        return listings.length > 0 ? listings[0] : undefined;
    }

    private async getMarketTrend(
        collectionAddress: string,
        runtime: IAgentRuntime
    ): Promise<MarketTrend> {
        const params: OrdersAsksParams = {
            collection: collectionAddress,
            status: "active",
            sortBy: "price",
        };
        const response = await this.marketService.getAsks(params, runtime);
        const stats = await this.marketService.getMarketStats(runtime);

        // Calculate collection-specific metrics
        const listings = response.asks || [];
        const activeListings = listings.length;
        const averagePrice =
            activeListings > 0
                ? listings.reduce(
                      (sum, ask) => sum + this.getSafePrice(ask),
                      0
                  ) / activeListings
                : 0;

        return {
            volumeChange24h: stats.volumeChange24h,
            priceChange24h: stats.volumeChange24h,
            salesCount24h: stats.totalSales,
            averageListingPrice: averagePrice,
            isUptrend:
                stats.volumeChange24h > 0 &&
                stats.volumeChange7d > 0 &&
                activeListings > 0,
        };
    }

    private async getCollectionHealth(
        collectionAddress: string,
        runtime: IAgentRuntime
    ): Promise<CollectionHealth> {
        const params: OrdersAsksParams = {
            collection: collectionAddress,
            status: "active",
            sortBy: "price",
        };
        const response = await this.marketService.getAsks(params, runtime);
        const stats = await this.marketService.getMarketStats(runtime);

        // Calculate collection-specific health metrics
        const listings = response.asks || [];
        const activeListings = listings.length;
        const lowestPrice = this.getSafePrice(this.getFirstListing(listings));

        const health: CollectionHealth = {
            uniqueHolders: 0, // TODO: Implement holder tracking
            floorPrice: lowestPrice || stats.floorPrice,
            marketCap: stats.totalVolume,
            isHealthy: false,
        };

        health.isHealthy =
            health.floorPrice > 0 &&
            health.marketCap > 0 &&
            activeListings >= 2; // Need at least 2 listings for price comparison

        return health;
    }

    private async validatePositionLimits(
        collection: string,
        config: SweepConfig
    ): Promise<boolean> {
        // Check collection-specific limit
        const collectionPositions = this.positions.get(collection) || [];
        if (collectionPositions.length >= config.maxPositionsPerCollection) {
            return false;
        }

        // Check total positions limit
        let totalPositions = 0;
        for (const positions of this.positions.values()) {
            totalPositions += positions.length;
        }

        return totalPositions < config.maxTotalPositions;
    }

    private async cleanupStalePositions(config: SweepConfig): Promise<void> {
        const now = Date.now();
        for (const [collection, positions] of this.positions.entries()) {
            const activePositions = positions.filter(
                (pos) => now - pos.purchaseTime < config.maxHoldingTime
            );
            if (activePositions.length !== positions.length) {
                this.positions.set(collection, activePositions);
            }
        }
    }

    private addPosition(position: Position): void {
        const collectionPositions =
            this.positions.get(position.collection) || [];
        collectionPositions.push(position);
        this.positions.set(position.collection, collectionPositions);
    }

    private async validateMarketConditions(
        collection: string,
        config: SweepConfig,
        runtime: IAgentRuntime
    ): Promise<{
        valid: boolean;
        marketTrend: MarketTrend;
        collectionHealth: CollectionHealth;
    }> {
        const [marketTrend, collectionHealth] = await Promise.all([
            this.getMarketTrend(collection, runtime),
            this.getCollectionHealth(collection, runtime),
        ]);

        const valid =
            marketTrend.volumeChange24h >= config.minDailyVolume &&
            collectionHealth.uniqueHolders >= config.minUniqueHolders &&
            collectionHealth.marketCap >= config.minMarketCap &&
            collectionHealth.isHealthy &&
            marketTrend.isUptrend;

        return { valid, marketTrend, collectionHealth };
    }

    private async estimateGasCosts(gasPrice: number): Promise<GasEstimate> {
        const buyGas = this.TYPICAL_BUY_GAS;
        const listGas = this.TYPICAL_LIST_GAS;
        const totalGas = buyGas + listGas;

        // Convert gas price from gwei to ETH and multiply by total gas
        const totalGasInEth = gasPrice * 1e-9 * totalGas;

        return {
            buyGas,
            listGas,
            totalGasInEth,
        };
    }

    private calculateMaxBuyPrice(
        targetPrice: number,
        slippageBps: number
    ): number {
        return targetPrice * (1 + slippageBps / 10000);
    }

    private async validateProfitability(
        purchasePrice: number,
        targetSalePrice: number,
        gasEstimate: GasEstimate,
        config: SweepConfig
    ): Promise<{ profitable: boolean; estimatedProfit: number }> {
        const estimatedProfit =
            targetSalePrice - purchasePrice - gasEstimate.totalGasInEth;
        const profitable = estimatedProfit >= config.minProfitAfterGas;

        return { profitable, estimatedProfit };
    }

    async sweepFloor(
        collection: string,
        config: SweepConfig,
        runtime: IAgentRuntime
    ): Promise<SweepResult> {
        const endOperation = this.performanceMonitor.startOperation(
            "sweepFloor",
            {
                collection,
                config,
            }
        );

        try {
            // Clean up stale positions first
            await this.cleanupStalePositions(config);

            // Validate position limits
            if (!(await this.validatePositionLimits(collection, config))) {
                return {
                    purchased: false,
                    listed: false,
                    error: "Position limits exceeded",
                    gasUsed: 0,
                    estimatedProfit: 0,
                };
            }

            // Validate market conditions
            const { valid, marketTrend, collectionHealth } =
                await this.validateMarketConditions(
                    collection,
                    config,
                    runtime
                );

            if (!valid) {
                return {
                    purchased: false,
                    listed: false,
                    error: "Market conditions unfavorable",
                    gasUsed: 0,
                    estimatedProfit: 0,
                    marketTrend,
                    collectionHealth,
                };
            }

            // 1. Get current floor listings
            const params: OrdersAsksParams = {
                collection,
                sortBy: "price",
                limit: 10,
                status: "active",
            };

            const response = await this.marketService.getAsks(params, runtime);
            const listings: OrderAskData[] = response.asks;

            // Ensure we have at least 2 listings to compare
            if (!listings || listings.length < 2) {
                throw new ReservoirError({
                    message: "Insufficient listings to analyze floor",
                    code: ReservoirErrorCode.UnknownError,
                });
            }

            // Get first two listings after length check
            const firstListing = listings[0];
            const secondListing = listings[1];

            // Additional safety check after array access
            if (!firstListing || !secondListing) {
                throw new ReservoirError({
                    message: "Failed to access listings",
                    code: ReservoirErrorCode.UnknownError,
                });
            }

            if (!firstListing.price?.amount || !secondListing.price?.amount) {
                throw new ReservoirError({
                    message: "Invalid price data in listings",
                    code: ReservoirErrorCode.UnknownError,
                });
            }

            const tokenId = firstListing.criteria?.data.token?.tokenId;
            if (!tokenId) {
                throw new ReservoirError({
                    message: "Missing token ID in listing",
                    code: ReservoirErrorCode.UnknownError,
                });
            }

            // 2. Analyze price gap and estimate gas costs
            const lowestPrice = Number(firstListing.price.amount);
            const secondLowestPrice = Number(secondListing.price.amount);
            const priceGapPercent =
                ((secondLowestPrice - lowestPrice) / lowestPrice) * 100;

            // Get current gas estimate
            const gasEstimate = await this.estimateGasCosts(config.maxGasPrice);

            if (priceGapPercent < config.minPriceGapPercent) {
                return {
                    purchased: false,
                    listed: false,
                    error: "Price gap too small",
                    gasUsed: 0,
                    estimatedProfit: 0,
                    marketTrend,
                    collectionHealth,
                };
            }

            if (lowestPrice > config.maxPurchasePrice) {
                return {
                    purchased: false,
                    listed: false,
                    error: "Price above maximum purchase threshold",
                    gasUsed: 0,
                    estimatedProfit: 0,
                    marketTrend,
                    collectionHealth,
                };
            }

            // Calculate target sale price and validate profitability
            const targetListPrice =
                lowestPrice * (1 + config.targetProfitPercent / 100);
            const { profitable, estimatedProfit } =
                await this.validateProfitability(
                    lowestPrice,
                    targetListPrice,
                    gasEstimate,
                    config
                );

            if (!profitable) {
                return {
                    purchased: false,
                    listed: false,
                    error: "Insufficient profit after gas costs",
                    gasUsed: 0,
                    estimatedProfit,
                    marketTrend,
                    collectionHealth,
                };
            }

            // 3. Execute buy with slippage protection
            const maxBuyPrice = this.calculateMaxBuyPrice(
                lowestPrice,
                config.maxSlippageBps
            );
            const buyParams: ExecuteBuyParams = {
                tokens: [`${collection}:${tokenId}`],
                taker: config.walletAddress,
                price: maxBuyPrice,
                skipBalanceCheck: false,
            };

            const buyResult = await this.executeService.executeBuy(
                buyParams,
                runtime
            );

            if (!buyResult.path?.[0]?.quote?.gross?.amount) {
                throw new ReservoirError({
                    message: "Invalid buy result data",
                    code: ReservoirErrorCode.UnknownError,
                });
            }

            const actualBuyPrice = Number(buyResult.path[0].quote.gross.amount);
            const actualSlippage =
                ((actualBuyPrice - lowestPrice) / lowestPrice) * 100;

            // 4. Calculate and execute listing
            const listParams: ExecuteListParams = {
                maker: config.walletAddress,
                token: `${collection}:${tokenId}`,
                weiPrice: (targetListPrice * 1e18).toString(),
                orderKind: "seaport",
                orderbook: "reservoir",
            };

            await this.executeService.executeListing(listParams, runtime);

            // Track the new position
            this.addPosition({
                tokenId,
                collection,
                purchasePrice: actualBuyPrice,
                listPrice: targetListPrice,
                purchaseTime: Date.now(),
                gasUsed: gasEstimate.buyGas + gasEstimate.listGas,
            });

            endOperation();

            return {
                purchased: true,
                listed: true,
                purchasePrice: actualBuyPrice,
                listPrice: targetListPrice,
                tokenId,
                collection,
                gasUsed: gasEstimate.buyGas + gasEstimate.listGas,
                estimatedProfit,
                actualSlippage,
                marketTrend,
                collectionHealth,
            };
        } catch (error) {
            console.error("Error in floor sweep:", error);
            this.performanceMonitor.recordMetric({
                operation: "sweepFloor",
                duration: 0,
                success: false,
                metadata: {
                    error:
                        error instanceof Error ? error.message : String(error),
                    collection,
                    config,
                },
            });

            return {
                purchased: false,
                listed: false,
                error:
                    error instanceof Error
                        ? error.message
                        : "Unknown error during floor sweep",
                gasUsed: 0,
                estimatedProfit: 0,
            };
        }
    }
}
