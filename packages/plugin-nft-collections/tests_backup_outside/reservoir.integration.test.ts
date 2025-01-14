/*
import { describe, it, expect } from "vitest";
import { ReservoirService } from "../services/reservoir";
import {
    IAgentRuntime,
    ServiceType,
    Service,
    IMemoryManager,
} from "@elizaos/core";
import { MemoryCacheManager } from "../services/cache-manager";
import { RateLimiter } from "../services/rate-limiter";

describe("Reservoir Service Integration", () => {
    const mockRuntime = {
        getSetting: function (key: string): string | undefined {
            if (key === "RESERVOIR_API_KEY") {
                const apiKey = process.env.RESERVOIR_API_KEY;
                if (!apiKey) {
                    console.warn("No RESERVOIR_API_KEY found in environment");
                }
                return apiKey;
            }
            return undefined;
        },
        services: new Map<ServiceType, Service>(),
        messageManager: {} as IMemoryManager,
        documentsManager: {} as any,
        knowledgeManager: {} as any,
        ragKnowledgeManager: {} as any,
        loreManager: {} as any,
        agentId: "test-agent",
        serverUrl: "http://localhost",
        databaseAdapter: {} as any,
        token: "test-token",
        modelProvider: {} as any,
        imageModelProvider: {} as any,
        imageVisionModelProvider: {} as any,
        character: {} as any,
        providers: new Map(),
        actions: new Map(),
        evaluators: new Map(),
        plugins: new Map(),
        descriptionManager: {} as any,
        memoryManager: {} as any,
        conversationManager: {} as any,
        roomManager: {} as any,
        userManager: {} as any,
        agentManager: {} as any,
        pluginManager: {} as any,
        settingsManager: {} as any,
        fileManager: {} as any,
        vectorStoreManager: {} as any,
        embeddingProvider: {} as any,
        audioModelProvider: {} as any,
        audioTranscriptionModelProvider: {} as any,
        audioSpeechModelProvider: {} as any,
        cacheManager: new MemoryCacheManager(),
        clients: new Map(),
        initialize: async () => {},
        registerMemoryManager: () => {},
    } as unknown as IAgentRuntime;

    it("should fetch top collections from Reservoir API", async () => {
        const apiKey = mockRuntime.getSetting("RESERVOIR_API_KEY");
        if (!apiKey) {
            console.warn("Skipping test: No RESERVOIR_API_KEY provided");
            return;
        }

        const service = new ReservoirService({
            apiKey,
            cacheManager: new MemoryCacheManager(),
            rateLimiter: new RateLimiter(),
        });

        const collections = await service.getTopCollections(mockRuntime);
        expect(collections).toBeDefined();
        expect(Array.isArray(collections)).toBe(true);
        expect(collections.length).toBeGreaterThan(0);
        if (collections.length > 0) {
            expect(collections[0]).toHaveProperty("name");
            expect(collections[0]).toHaveProperty("address");
            expect(collections[0]).toHaveProperty("floorPrice");
        }
    });

    it("should fetch floor listings for a collection", async () => {
        const apiKey = mockRuntime.getSetting("RESERVOIR_API_KEY");
        if (!apiKey) {
            console.warn("Skipping test: No RESERVOIR_API_KEY provided");
            return;
        }

        const service = new ReservoirService({
            apiKey,
            cacheManager: new MemoryCacheManager(),
            rateLimiter: new RateLimiter(),
        });

        // First get a collection address
        const collections = await service.getTopCollections(mockRuntime);
        expect(collections.length).toBeGreaterThan(0);

        const floorListings = await service.getFloorListings({
            collection: collections[0].address,
            limit: 3,
            sortBy: "price",
        });

        expect(floorListings).toBeDefined();
        expect(Array.isArray(floorListings)).toBe(true);
        if (floorListings.length > 0) {
            expect(floorListings[0]).toHaveProperty("tokenId");
            expect(floorListings[0]).toHaveProperty("price");
            expect(floorListings[0]).toHaveProperty("seller");
        }
    });

    it("should fetch owned NFTs for a wallet", async () => {
        const apiKey = mockRuntime.getSetting("RESERVOIR_API_KEY");
        if (!apiKey) {
            console.warn("Skipping test: No RESERVOIR_API_KEY provided");
            return;
        }

        const service = new ReservoirService({
            apiKey,
            cacheManager: new MemoryCacheManager(),
            rateLimiter: new RateLimiter(),
        });

        const ownerAddress = process.env.TEST_WALLET_ADDRESS;
        if (!ownerAddress) {
            console.log(
                "Skipping owned NFTs test - no TEST_WALLET_ADDRESS provided"
            );
            return;
        }

        const ownedNFTs = await service.getOwnedNFTs(ownerAddress);
        expect(ownedNFTs).toBeDefined();
        expect(Array.isArray(ownedNFTs)).toBe(true);
        if (ownedNFTs.length > 0) {
            expect(ownedNFTs[0]).toHaveProperty("tokenId");
            expect(ownedNFTs[0]).toHaveProperty("collectionAddress");
            expect(ownedNFTs[0]).toHaveProperty("name");
        }
    });
});
*/
