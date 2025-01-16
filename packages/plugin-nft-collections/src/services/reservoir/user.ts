import { BaseReservoirService, ReservoirServiceConfig } from "./base";
import { IAgentRuntime } from "@elizaos/core";
import {
    UserActivityParams,
    UserActivityData,
    UserTokensParams,
    UserTokensData,
    UserAsksParams,
    UserAsksData,
    UserBidsParams,
    UserBidsData,
    UserTopBidsParams,
    UserTopBidsData,
} from "./types";

export class UserService extends BaseReservoirService {
    constructor(config: ReservoirServiceConfig = {}) {
        super(config);
    }

    /**
     * Get user activity (sales, listings, etc.)
     * @see https://docs.reservoir.tools/reference/getusersactivityv6
     */
    async getUserActivity(
        params: UserActivityParams,
        runtime: IAgentRuntime
    ): Promise<UserActivityData[]> {
        const endOperation = this.performanceMonitor.startOperation(
            "getUserActivity",
            { params }
        );

        try {
            const response = await this.cachedRequest<{
                activities: UserActivityData[];
                continuation?: string;
            }>("/users/activity/v6", params, runtime, {
                ttl: 60, // 1 minute cache for activity
                context: "users_activity",
            });

            endOperation();
            return response.activities;
        } catch (error) {
            console.error("Error fetching user activity:", error);
            this.performanceMonitor.recordMetric({
                operation: "getUserActivity",
                duration: 0,
                success: false,
                metadata: {
                    error: error.message,
                    params,
                },
            });
            throw error;
        }
    }

    /**
     * Get activity feed for a specific user
     * @param user User address
     * @param runtime Agent runtime
     */
    async getUserActivityFeed(
        user: string,
        runtime: IAgentRuntime
    ): Promise<UserActivityData[]> {
        return this.getUserActivity(
            {
                users: [user],
                limit: 20,
                sortBy: "timestamp",
                sortDirection: "desc",
                includeMetadata: true,
                includeTokenMetadata: true,
            },
            runtime
        );
    }

    /**
     * Get tokens owned by a user
     * @see https://docs.reservoir.tools/reference/getusersusertokensv7
     */
    async getUserTokens(
        params: UserTokensParams,
        runtime: IAgentRuntime
    ): Promise<UserTokensData> {
        const endOperation = this.performanceMonitor.startOperation(
            "getUserTokens",
            { params }
        );

        try {
            const response = await this.cachedRequest<UserTokensData>(
                "/users/tokens/v7",
                params,
                runtime,
                {
                    ttl: 300, // 5 minutes cache
                    context: "users_tokens",
                }
            );

            endOperation();
            return response;
        } catch (error) {
            console.error("Error fetching user tokens:", error);
            this.performanceMonitor.recordMetric({
                operation: "getUserTokens",
                duration: 0,
                success: false,
                metadata: {
                    error: error.message,
                    params,
                },
            });
            throw error;
        }
    }

    /**
     * Get user asks (listings)
     * @see https://docs.reservoir.tools/reference/getusersusertokensv7
     */
    async getUserAsks(
        params: UserAsksParams,
        runtime: IAgentRuntime
    ): Promise<UserAsksData> {
        const endOperation = this.performanceMonitor.startOperation(
            "getUserAsks",
            { params }
        );

        try {
            const response = await this.cachedRequest<UserAsksData>(
                "/users/asks/v4",
                params,
                runtime,
                {
                    ttl: 60, // 1 minute cache for asks
                    context: "users_asks",
                }
            );

            endOperation();
            return response;
        } catch (error) {
            console.error("Error fetching user asks:", error);
            this.performanceMonitor.recordMetric({
                operation: "getUserAsks",
                duration: 0,
                success: false,
                metadata: {
                    error: error.message,
                    params,
                },
            });
            throw error;
        }
    }

    /**
     * Get user bids (offers)
     * @see https://docs.reservoir.tools/reference/getusersuserbidsv4
     */
    async getUserBids(
        params: UserBidsParams,
        runtime: IAgentRuntime
    ): Promise<UserBidsData> {
        const endOperation = this.performanceMonitor.startOperation(
            "getUserBids",
            { params }
        );

        try {
            const response = await this.cachedRequest<UserBidsData>(
                "/users/bids/v4",
                params,
                runtime,
                {
                    ttl: 60, // 1 minute cache for bids
                    context: "users_bids",
                }
            );

            endOperation();
            return response;
        } catch (error) {
            console.error("Error fetching user bids:", error);
            this.performanceMonitor.recordMetric({
                operation: "getUserBids",
                duration: 0,
                success: false,
                metadata: {
                    error: error.message,
                    params,
                },
            });
            throw error;
        }
    }

    /**
     * Get user top bids
     * @see https://docs.reservoir.tools/reference/getordersusersusertopbidsv4
     */
    async getUserTopBids(
        params: UserTopBidsParams,
        runtime: IAgentRuntime
    ): Promise<UserTopBidsData> {
        const endOperation = this.performanceMonitor.startOperation(
            "getUserTopBids",
            { params }
        );

        try {
            const response = await this.cachedRequest<UserTopBidsData>(
                "/orders/users/top-bids/v4",
                params,
                runtime,
                {
                    ttl: 60, // 1 minute cache for top bids
                    context: "users_top_bids",
                }
            );

            endOperation();
            return response;
        } catch (error) {
            console.error("Error fetching user top bids:", error);
            this.performanceMonitor.recordMetric({
                operation: "getUserTopBids",
                duration: 0,
                success: false,
                metadata: {
                    error: error.message,
                    params,
                },
            });
            throw error;
        }
    }
}
