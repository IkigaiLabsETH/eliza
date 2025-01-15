import { z } from "zod";

// Enhanced Ethereum address validation
function isAddress(address: string): boolean {
    // More comprehensive Ethereum address validation
    if (typeof address !== "string") return false;

    // Check for 0x prefix and exactly 42 characters (0x + 40 hex chars)
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) return false;

    // Additional checksum validation (case-sensitive)
    try {
        return address === toChecksumAddress(address);
    } catch {
        return false;
    }
}

// Implement checksum address conversion
function toChecksumAddress(address: string): string {
    address = address.toLowerCase().replace("0x", "");
    const hash = hashCode(address);

    return (
        "0x" +
        address
            .split("")
            .map((char, index) =>
                parseInt(hash[index], 16) >= 8 ? char.toUpperCase() : char
            )
            .join("")
    );
}

// Simple hash function for checksum
function hashCode(address: string): string {
    let hash = 0;
    for (let i = 0; i < address.length; i++) {
        const char = address.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16).padStart(40, "0");
}

function getAddress(address: string): string {
    // Normalize and validate address
    if (!isAddress(address)) {
        throw new Error("Invalid Ethereum address");
    }
    return toChecksumAddress(address);
}

// Environment Variable Validation Schema
export const EnvConfigSchema = z.object({
    TWITTER_API_KEY: z.string().optional().nullable(),
    DUNE_API_KEY: z.string().optional().nullable(),
    OPENSEA_API_KEY: z.string().optional().nullable(),
    RESERVOIR_API_KEY: z.string().min(1, "RESERVOIR_API_KEY is required"),
});

// Function to validate environment variables
export function validateEnvironmentVariables(
    env: Record<string, string | undefined>
) {
    try {
        // Filter out undefined values for optional keys
        const filteredEnv = {
            ...env,
            TWITTER_API_KEY: env.TWITTER_API_KEY || null,
            DUNE_API_KEY: env.DUNE_API_KEY || null,
            OPENSEA_API_KEY: env.OPENSEA_API_KEY || null,
        };
        return EnvConfigSchema.parse(filteredEnv);
    } catch (error) {
        if (error instanceof z.ZodError) {
            // Only show errors for required fields
            const requiredErrors = error.errors
                .filter((err) => err.path.includes("RESERVOIR_API_KEY"))
                .map((err) => err.message)
                .join(", ");
            throw new Error(
                `Environment Variable Validation Failed: ${requiredErrors || "RESERVOIR_API_KEY is required"}`
            );
        }
        throw error;
    }
}

// Enhanced NFT Collection Schema with strict validation
export const NFTCollectionSchema = z.object({
    address: z.string().refine((val) => isAddress(val), {
        message: "Invalid Ethereum address",
    }),
    name: z.string().min(1).max(100),
    symbol: z.string().min(1).max(10).optional(),
    description: z.string().max(5000).optional(),
    imageUrl: z.string().url().optional(),
    externalUrl: z.string().url().optional(),
    twitterUsername: z
        .string()
        .regex(/^[A-Za-z0-9_]{1,15}$/)
        .optional(),
    discordUrl: z.string().url().optional(),
    verified: z.boolean().default(false),
    featured: z.boolean().default(false),
    createdAt: z.string().datetime().optional(),
    floorPrice: z.number().min(0).optional(),
    volume24h: z.number().min(0).optional(),
    marketCap: z.number().min(0).optional(),
    holders: z.number().int().min(0).optional(),
    totalSupply: z.number().int().min(0).optional(),
    twitterFollowers: z.number().int().min(0).optional(),
    discordMembers: z.number().int().min(0).optional(),
    supportedMarketplaces: z.array(z.string()).optional(),
    hasRoyalties: z.boolean().optional(),
    royaltyPercentage: z.number().min(0).max(100).optional(),
    traits: z.record(z.string(), z.array(z.string())).optional(),
    categories: z.array(z.string()).optional(),
    lastUpdate: z.string().datetime().optional(),
});

// Market Data Schema
export const MarketDataSchema = z.object({
    floorPrice: z.number().min(0),
    bestOffer: z.number().min(0).optional(),
    volume24h: z.number().min(0),
    volume7d: z.number().min(0).optional(),
    volume30d: z.number().min(0).optional(),
    marketCap: z.number().min(0),
    holders: z.number().int().min(0),
    sales24h: z.number().int().min(0).optional(),
    averagePrice24h: z.number().min(0).optional(),
    lastUpdate: z.string().datetime(),
});

// Social Metrics Schema
export const SocialMetricsSchema = z.object({
    twitterFollowers: z.number().int().min(0).optional(),
    twitterEngagement: z.number().min(0).optional(),
    discordMembers: z.number().int().min(0).optional(),
    discordActive: z.number().int().min(0).optional(),
    telegramMembers: z.number().int().min(0).optional(),
    telegramActive: z.number().int().min(0).optional(),
    lastUpdate: z.string().datetime(),
});

// Validation Functions
export function validateCollection(data: unknown) {
    return NFTCollectionSchema.parse(data);
}

export function validateMarketData(data: unknown) {
    return MarketDataSchema.parse(data);
}

export function validateSocialMetrics(data: unknown) {
    return SocialMetricsSchema.parse(data);
}

// Type Inference
export type NFTCollection = z.infer<typeof NFTCollectionSchema>;
export type MarketData = z.infer<typeof MarketDataSchema>;
export type SocialMetrics = z.infer<typeof SocialMetricsSchema>;

// Utility Functions
export function isValidEthereumAddress(address: string): boolean {
    return isAddress(address);
}

export function normalizeAddress(address: string): string {
    try {
        return getAddress(address);
    } catch {
        throw new Error("Invalid Ethereum address");
    }
}

export function validateTokenId(
    tokenId: string,
    collection: NFTCollection
): boolean {
    const numericTokenId = BigInt(tokenId);
    if (collection.totalSupply) {
        return (
            numericTokenId >= 0n &&
            numericTokenId < BigInt(collection.totalSupply)
        );
    }
    return numericTokenId >= 0n;
}

export function validatePriceRange(price: number): boolean {
    return price >= 0 && price <= 1000000; // Reasonable price range in ETH
}

export function sanitizeCollectionData(data: unknown): Partial<NFTCollection> {
    try {
        return NFTCollectionSchema.parse(data);
    } catch (error) {
        // Return only the valid fields
        const partial = {};
        const validFields = Object.entries(
            data as Record<string, unknown>
        ).filter(([key, value]) => {
            try {
                NFTCollectionSchema.shape[key].parse(value);
                return true;
            } catch {
                return false;
            }
        });

        for (const [key, value] of validFields) {
            partial[key] = value;
        }

        return partial;
    }
}
