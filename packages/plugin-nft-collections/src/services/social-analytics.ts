import axios from "axios";
import { z } from "zod";
import { SocialMetricsSchema } from "../utils/validation";
import { MemoryCacheManager } from "./cache-manager";
import { RateLimiter } from "./rate-limiter";
import { CircuitBreaker } from "../utils/circuit-breaker";
import { exponentialBackoff } from "../utils/retry";

// Enhanced Social Metrics Schema
const ExtendedSocialMetricsSchema = SocialMetricsSchema.extend({
    twitter: z
        .object({
            followers_count: z.number().int().min(0).optional(),
            following_count: z.number().int().min(0).optional(),
            tweet_count: z.number().int().min(0).optional(),
            engagement_rate: z.number().min(0).max(100).optional(),
        })
        .optional(),
    coinGecko: z
        .object({
            community_score: z.number().min(0).max(100).optional(),
            twitter_followers: z.number().int().min(0).optional(),
            telegram_users: z.number().int().min(0).optional(),
        })
        .optional(),
    dune: z
        .object({
            total_transactions: z.number().int().min(0).optional(),
            unique_wallets: z.number().int().min(0).optional(),
            avg_transaction_value: z.number().min(0).optional(),
        })
        .optional(),
});

interface SocialAnalyticsConfig {
    twitterApiKey?: string;
    duneApiKey?: string;
    cacheManager?: MemoryCacheManager;
    rateLimiter?: RateLimiter;
    maxRetries?: number;
    retryDelay?: number;
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
    private config: SocialAnalyticsConfig;
    private cacheManager: MemoryCacheManager;
    private rateLimiter?: RateLimiter;
    private twitterCircuitBreaker: CircuitBreaker;
    private duneCircuitBreaker: CircuitBreaker;
    private static CACHE_TTL = 15 * 60; // 15 minutes

    constructor(config: SocialAnalyticsConfig = {}) {
        this.config = {
            twitterApiKey: config.twitterApiKey || process.env.TWITTER_API_KEY,
            duneApiKey: config.duneApiKey || process.env.DUNE_API_KEY,
            cacheManager:
                config.cacheManager ||
                new MemoryCacheManager({
                    ttl: SocialAnalyticsService.CACHE_TTL,
                }),
            rateLimiter: config.rateLimiter,
            maxRetries: config.maxRetries || 3,
            retryDelay: config.retryDelay || 1000,
        };

        this.cacheManager = this.config.cacheManager;
        this.rateLimiter = this.config.rateLimiter;

        this.twitterCircuitBreaker = new CircuitBreaker(5, 60000);
        this.duneCircuitBreaker = new CircuitBreaker(5, 60000);
    }

    async getSocialMetrics(
        collectionAddress: string
    ): Promise<DetailedSocialMetrics> {
        const cacheKey = `social_metrics:${collectionAddress}`;

        try {
            // Check cache first
            const cachedData =
                await this.cacheManager.get<DetailedSocialMetrics>(cacheKey);
            if (cachedData) return cachedData;

            // Apply rate limiting if configured
            if (this.rateLimiter) {
                await this.rateLimiter.consume(collectionAddress);
            }

            // Fetch data from multiple sources with retries
            const [twitterData, discordData, duneData] =
                await Promise.allSettled([
                    this.fetchTwitterMetrics(collectionAddress),
                    this.fetchDiscordMetrics(collectionAddress),
                    this.fetchDuneMetrics(collectionAddress),
                ]);

            // Calculate combined metrics
            const metrics: DetailedSocialMetrics = {
                sentiment: this.calculateOverallSentiment(
                    twitterData,
                    discordData
                ),
                engagement: this.calculateEngagement(twitterData, discordData),
                mentions: this.aggregateMentions(twitterData, discordData),
                influencerActivity: this.analyzeInfluencerActivity(twitterData),
                communityGrowth: {
                    twitter: this.extractGrowthRate(twitterData),
                    discord: this.extractGrowthRate(discordData),
                },
                timestamp: new Date().toISOString(),
            };

            // Cache the results
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

    private async fetchDiscordMetrics(collectionAddress: string): Promise<any> {
        // Implementation for Discord metrics
        return null;
    }

    private async fetchDuneMetrics(collectionAddress: string): Promise<any> {
        if (!this.config.duneApiKey || !this.duneCircuitBreaker.isAvailable()) {
            return null;
        }

        try {
            const result = await exponentialBackoff(
                async () => {
                    const response = await axios.get(
                        `https://api.dune.com/api/v1/query/123/results`,
                        {
                            params: {
                                address: collectionAddress,
                            },
                            headers: {
                                "x-dune-api-key": this.config.duneApiKey,
                            },
                        }
                    );
                    return response.data;
                },
                this.config.maxRetries,
                this.config.retryDelay
            );

            this.duneCircuitBreaker.recordSuccess();
            return result;
        } catch (error) {
            this.duneCircuitBreaker.recordFailure();
            console.error("Dune metrics fetch failed:", error);
            return null;
        }
    }

    private calculateOverallSentiment(
        twitterData: PromiseSettledResult<any>,
        discordData: PromiseSettledResult<any>
    ): number {
        let sentiment = 0;
        let weight = 0;

        if (twitterData.status === "fulfilled" && twitterData.value) {
            sentiment += this.analyzeTweetSentiment(twitterData.value) * 0.7;
            weight += 0.7;
        }

        if (discordData.status === "fulfilled" && discordData.value) {
            sentiment += this.analyzeDiscordSentiment(discordData.value) * 0.3;
            weight += 0.3;
        }

        return weight > 0 ? sentiment / weight : 0;
    }

    private calculateEngagement(
        twitterData: PromiseSettledResult<any>,
        discordData: PromiseSettledResult<any>
    ): number {
        let engagement = 0;
        let weight = 0;

        if (twitterData.status === "fulfilled" && twitterData.value) {
            engagement +=
                this.analyzeTwitterEngagement(twitterData.value) * 0.6;
            weight += 0.6;
        }

        if (discordData.status === "fulfilled" && discordData.value) {
            engagement +=
                this.analyzeDiscordEngagement(discordData.value) * 0.4;
            weight += 0.4;
        }

        return weight > 0 ? engagement / weight : 0;
    }

    private aggregateMentions(
        twitterData: PromiseSettledResult<any>,
        discordData: PromiseSettledResult<any>
    ): DetailedSocialMetrics["mentions"] {
        const mentions = {
            total: 0,
            positive: 0,
            negative: 0,
            neutral: 0,
        };

        if (twitterData.status === "fulfilled" && twitterData.value) {
            const twitterMentions = this.analyzeTwitterMentions(
                twitterData.value
            );
            mentions.total += twitterMentions.total;
            mentions.positive += twitterMentions.positive;
            mentions.negative += twitterMentions.negative;
            mentions.neutral += twitterMentions.neutral;
        }

        if (discordData.status === "fulfilled" && discordData.value) {
            const discordMentions = this.analyzeDiscordMentions(
                discordData.value
            );
            mentions.total += discordMentions.total;
            mentions.positive += discordMentions.positive;
            mentions.negative += discordMentions.negative;
            mentions.neutral += discordMentions.neutral;
        }

        return mentions;
    }

    private analyzeInfluencerActivity(
        twitterData: PromiseSettledResult<any>
    ): DetailedSocialMetrics["influencerActivity"] {
        if (twitterData.status !== "fulfilled" || !twitterData.value) {
            return {
                count: 0,
                reach: 0,
                engagement: 0,
            };
        }

        const tweets = twitterData.value.data || [];
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

    private extractGrowthRate(data: PromiseSettledResult<any>): number {
        if (data.status !== "fulfilled" || !data.value) {
            return 0;
        }

        // Implementation depends on data structure
        return 0;
    }

    private analyzeTweetSentiment(twitterData: any): number {
        if (!twitterData?.data) return 0;

        const tweets = twitterData.data;
        let totalSentiment = 0;

        for (const tweet of tweets) {
            totalSentiment += this.getSentimentScore(tweet.text);
        }

        return tweets.length > 0 ? (totalSentiment / tweets.length) * 100 : 0;
    }

    private analyzeDiscordSentiment(discordData: any): number {
        // Implementation for Discord sentiment analysis
        return 0;
    }

    private analyzeTwitterEngagement(twitterData: any): number {
        if (!twitterData?.data) return 0;

        const tweets = twitterData.data;
        let totalEngagement = 0;

        for (const tweet of tweets) {
            const metrics = tweet.public_metrics || {};
            totalEngagement +=
                (metrics.retweet_count || 0) * 2 +
                (metrics.reply_count || 0) * 1.5 +
                (metrics.like_count || 0);
        }

        return Math.min(totalEngagement / (tweets.length || 1) / 100, 100);
    }

    private analyzeDiscordEngagement(discordData: any): number {
        // Implementation for Discord engagement analysis
        return 0;
    }

    private analyzeTwitterMentions(
        twitterData: any
    ): DetailedSocialMetrics["mentions"] {
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
            const sentiment = this.getSentimentScore(tweet.text);
            if (sentiment > 0.2) mentions.positive++;
            else if (sentiment < -0.2) mentions.negative++;
            else mentions.neutral++;
        }

        return mentions;
    }

    private analyzeDiscordMentions(
        discordData: any
    ): DetailedSocialMetrics["mentions"] {
        // Implementation for Discord mentions analysis
        return {
            total: 0,
            positive: 0,
            negative: 0,
            neutral: 0,
        };
    }

    private getSentimentScore(text: string): number {
        // Basic sentiment analysis implementation
        // In production, use a proper NLP service
        const positiveWords = ["bullish", "moon", "gem", "amazing", "great"];
        const negativeWords = ["bearish", "scam", "rug", "bad", "awful"];

        const words = text.toLowerCase().split(/\s+/);
        let score = 0;

        for (const word of words) {
            if (positiveWords.includes(word)) score += 1;
            if (negativeWords.includes(word)) score -= 1;
        }

        return score / words.length;
    }
}

export const socialAnalyticsService = new SocialAnalyticsService({
    twitterApiKey: process.env.TWITTER_API_KEY,
    duneApiKey: process.env.DUNE_API_KEY,
});
