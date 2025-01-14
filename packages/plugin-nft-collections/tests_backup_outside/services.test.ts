/*
import { describe, it, expect, vi } from "vitest";
import { ReservoirService } from "../services/reservoir";
import { MarketIntelligenceService } from "../services/market-intelligence";
import { SocialAnalyticsService } from "../services/social-analytics";
import { IAgentRuntime } from "@elizaos/core";
import { MemoryCacheManager } from "../services/cache-manager";
import { RateLimiter } from "../services/rate-limiter";

describe("NFT Services", () => {
    const mockRuntime = {
        getSetting: (key: string): string | undefined => {
            if (key === "RESERVOIR_API_KEY") return "test-key";
            return undefined;
        },
    } as unknown as IAgentRuntime;

    describe("ReservoirService", () => {
        it("should fetch collections", async () => {
            const service = new ReservoirService({ apiKey: "test-key" });
            const result = await service.getTopCollections(mockRuntime, 5);
            expect(result).toBeDefined();
            expect(Array.isArray(result)).toBe(true);
        });

        it("should fetch floor listings", async () => {
            const service = new ReservoirService({ apiKey: "test-key" });
            const result = await service.getFloorListings({
                collection: "0x1234",
                limit: 5,
                sortBy: "price",
            });
            expect(result).toBeDefined();
            expect(Array.isArray(result)).toBe(true);
        });
    });

    describe("MarketIntelligenceService", () => {
        const cacheManager = new MemoryCacheManager();
        const rateLimiter = new RateLimiter();

        it("should initialize correctly", () => {
            const service = new MarketIntelligenceService({
                cacheManager,
                rateLimiter,
                openSeaApiKey: "test-key",
                reservoirApiKey: "test-key",
            });
            expect(service).toBeDefined();
        });

        it("should return market intelligence data", async () => {
            const service = new MarketIntelligenceService({
                cacheManager,
                rateLimiter,
                openSeaApiKey: "test-key",
                reservoirApiKey: "test-key",
            });

            const result = await service.getMarketIntelligence("0x1234");
            expect(result).toBeDefined();
            expect(result.floorPrice).toBeDefined();
            expect(result.volume24h).toBeDefined();
        });
    });

    describe("SocialAnalyticsService", () => {
        const mockData = {
            lastUpdate: new Date().toISOString(),
            twitterFollowers: 1000,
            discordMembers: 500,
        };

        it("should initialize correctly", () => {
            const service = new SocialAnalyticsService({});
            expect(service).toBeDefined();
        });

        it("should return social metrics", async () => {
            const service = new SocialAnalyticsService({});
            vi.spyOn(service as any, "fetchSocialData").mockResolvedValue(
                mockData
            );

            const result = await service.getSocialMetrics("0x1234");
            expect(result).toBeDefined();
            expect(result.lastUpdate).toBeDefined();
            expect(result.twitterFollowers).toBeDefined();
            expect(result.discordMembers).toBeDefined();
        });
    });
});
*/
