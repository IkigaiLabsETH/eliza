import {
    IAgentRuntime,
    Memory,
    State,
    HandlerCallback,
    Action,
} from "@elizaos/core";
import { elizaLogger } from "@elizaos/core";

export const getFloorPriceAction = (): Action => ({
    name: "GET_FLOOR_PRICE",
    description: "Get the floor price for an NFT collection",
    similes: ["CHECK_FLOOR", "FLOOR_CHECK"],
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state?: State,
        _options?: { [key: string]: unknown },
        callback?: HandlerCallback
    ): Promise<boolean> => {
        elizaLogger.log("Starting GET_FLOOR_PRICE handler...");

        try {
            // Initialize or update state
            if (!state) {
                state = (await runtime.composeState(message)) as State;
            } else {
                state = await runtime.updateRecentMessageState(state);
            }

            // ... existing code ...

            return true; // Return true on success
        } catch (error) {
            elizaLogger.error("Error in GET_FLOOR_PRICE handler:", error);
            callback?.({
                text: "Failed to get floor price. Please try again.",
                content: { error: String(error) },
            });
            return false; // Return false on failure
        }
    },
    validate: async (_runtime: IAgentRuntime, message: Memory) => {
        const text = message.content.text.toLowerCase();
        return text.includes("floor price") || text.includes("check floor");
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "What's the floor price?",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "The current floor price is X ETH",
                },
            },
        ],
    ],
});
