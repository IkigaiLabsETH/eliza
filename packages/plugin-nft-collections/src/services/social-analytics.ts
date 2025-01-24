import axios from "axios";
import { MemoryCacheManager } from "./cache-manager";
import { RateLimiter } from "./rate-limiter";
import { CircuitBreaker } from "../utils/circuit-breaker";
import { exponentialBackoff } from "../utils/retry";

interface SocialAnalyticsConfig {
    cacheManager?: MemoryCacheManager | undefined;
    rateLimiter?: RateLimiter | undefined;
    twitterApiKey?: string | undefined;
    maxRetries?: number;
    retryDelay?: number;
    circuitBreakerOptions?: {
        failureThreshold: number;
        resetTimeout: number;
    };
}

interface InitializeConfig {
    twitterApiKey?: string | undefined;
}

interface DetailedSocialMetrics {
    sentiment: number; // -100 to 100
    engagement: number; // 0 to 100
    mentions: {
        total: number;
        positive: number;
        negative: number;
        neutral: number;
    };
    influencerActivity: {
        count: number;
        reach: number;
        engagement: number;
    };
    communityGrowth: {
        twitter: number;
        discord: number;
    };
    timestamp: string;
}

export class SocialAnalyticsService {
    private config: Required<
        Pick<
            SocialAnalyticsConfig,
            "maxRetries" | "retryDelay" | "circuitBreakerOptions"
        >
    > &
        SocialAnalyticsConfig;
    private cacheManager: MemoryCacheManager;
    private rateLimiter: RateLimiter | undefined;
    private twitterCircuitBreaker: CircuitBreaker;
    private static CACHE_TTL = 30 * 60; // 30 minutes cache

    constructor(config: SocialAnalyticsConfig = {}) {
        const defaultCircuitBreakerOptions = {
            failureThreshold: 5,
            resetTimeout: 60000,
        };

        this.config = {
            ...config,
            maxRetries: config.maxRetries ?? 3,
            retryDelay: config.retryDelay ?? 1000,
            circuitBreakerOptions:
                config.circuitBreakerOptions ?? defaultCircuitBreakerOptions,
        };

        this.cacheManager =
            config.cacheManager ??
            new MemoryCacheManager({
                ttl: SocialAnalyticsService.CACHE_TTL,
            });
        this.rateLimiter = config.rateLimiter;

        this.twitterCircuitBreaker = new CircuitBreaker(
            this.config.circuitBreakerOptions.failureThreshold,
            this.config.circuitBreakerOptions.resetTimeout
        );
    }

    public async initialize(config: InitializeConfig): Promise<void> {
        this.config.twitterApiKey = config.twitterApiKey;
    }

    async getSocialMetrics(
        collectionAddress: string
    ): Promise<DetailedSocialMetrics> {
        const cacheKey = `social_metrics:${collectionAddress}`;

        try {
            const cachedData =
                await this.cacheManager.get<DetailedSocialMetrics>(cacheKey);
            if (cachedData) return cachedData;

            if (this.rateLimiter) {
                await this.rateLimiter.consume(collectionAddress);
            }

            const [twitterResult] = await Promise.allSettled([
                this.fetchTwitterMetrics(collectionAddress),
            ]);

            const twitterData =
                twitterResult.status === "fulfilled"
                    ? twitterResult.value
                    : null;

            const metrics: DetailedSocialMetrics = {
                sentiment: this.calculateOverallSentiment(twitterData),
                engagement: this.calculateEngagement(twitterData),
                mentions: this.aggregateMentions(twitterData),
                influencerActivity: this.analyzeInfluencerActivity(twitterData),
                communityGrowth: {
                    twitter: this.extractGrowthRate(twitterData),
                    discord: 0,
                },
                timestamp: new Date().toISOString(),
            };

            await this.cacheManager.set(
                cacheKey,
                metrics,
                SocialAnalyticsService.CACHE_TTL
            );

            return metrics;
        } catch (error) {
            console.error(
                `Failed to fetch social metrics for ${collectionAddress}:`,
                error
            );
            throw error;
        }
    }

    private async fetchTwitterMetrics(collectionAddress: string): Promise<any> {
        if (
            !this.config.twitterApiKey ||
            !this.twitterCircuitBreaker.isAvailable()
        ) {
            return null;
        }

        try {
            const result = await exponentialBackoff(
                async () => {
                    const response = await axios.get(
                        `https://api.twitter.com/2/tweets/search/recent`,
                        {
                            params: {
                                query: `${collectionAddress} OR #NFT`,
                                "tweet.fields": "public_metrics,sentiment",
                                max_results: 100,
                            },
                            headers: {
                                Authorization: `Bearer ${this.config.twitterApiKey}`,
                            },
                        }
                    );
                    return response.data;
                },
                this.config.maxRetries,
                this.config.retryDelay
            );

            this.twitterCircuitBreaker.recordSuccess();
            return result;
        } catch (error) {
            this.twitterCircuitBreaker.recordFailure();
            console.error("Twitter metrics fetch failed:", error);
            return null;
        }
    }

    private calculateOverallSentiment(twitterData: any): number {
        if (!twitterData?.data) return 0;

        const tweets = twitterData.data;
        let totalSentiment = 0;

        for (const tweet of tweets) {
            if (tweet.sentiment) {
                totalSentiment += tweet.sentiment;
            }
        }

        return tweets.length > 0 ? totalSentiment / tweets.length : 0;
    }

    private calculateEngagement(twitterData: any): number {
        if (!twitterData?.data) return 0;

        const tweets = twitterData.data;
        let totalEngagement = 0;

        for (const tweet of tweets) {
            const metrics = tweet.public_metrics || {};
            totalEngagement +=
                (metrics.retweet_count || 0) +
                (metrics.reply_count || 0) +
                (metrics.like_count || 0);
        }

        return tweets.length > 0 ? totalEngagement / tweets.length : 0;
    }

    private aggregateMentions(twitterData: any): {
        total: number;
        positive: number;
        negative: number;
        neutral: number;
    } {
        if (!twitterData?.data) {
            return {
                total: 0,
                positive: 0,
                negative: 0,
                neutral: 0,
            };
        }

        const tweets = twitterData.data;
        const mentions = {
            total: tweets.length,
            positive: 0,
            negative: 0,
            neutral: 0,
        };

        for (const tweet of tweets) {
            if (tweet.sentiment > 0.2) mentions.positive++;
            else if (tweet.sentiment < -0.2) mentions.negative++;
            else mentions.neutral++;
        }

        return mentions;
    }

    private analyzeInfluencerActivity(twitterData: any): {
        count: number;
        reach: number;
        engagement: number;
    } {
        if (!twitterData?.data) {
            return {
                count: 0,
                reach: 0,
                engagement: 0,
            };
        }

        const tweets = twitterData.data;
        const influencers = tweets.filter(
            (tweet: any) => tweet.author_metrics?.followers_count > 10000
        );

        return {
            count: influencers.length,
            reach: influencers.reduce(
                (sum: number, tweet: any) =>
                    sum + (tweet.author_metrics?.followers_count || 0),
                0
            ),
            engagement: influencers.reduce(
                (sum: number, tweet: any) =>
                    sum + (tweet.public_metrics?.engagement_count || 0),
                0
            ),
        };
    }

    private extractGrowthRate(data: any): number {
        if (!data?.data) return 0;

        const metrics = data.data;
        if (!metrics.length) return 0;

        // Calculate growth rate based on follower count changes
        const oldestMetric = metrics[metrics.length - 1];
        const newestMetric = metrics[0];

        const oldCount = oldestMetric.author_metrics?.followers_count || 0;
        const newCount = newestMetric.author_metrics?.followers_count || 0;

        if (oldCount === 0) return 0;

        return ((newCount - oldCount) / oldCount) * 100;
    }
}

export const socialAnalyticsService = new SocialAnalyticsService({
    twitterApiKey: process.env.TWITTER_API_KEY,
});
