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
} from "./types/user";
import { ReservoirError, ReservoirErrorCode } from "./errors";

export class UserService extends BaseReservoirService {
    constructor(config: ReservoirServiceConfig = {}) {
        super(config);
    }

    /**
     * Get user activity
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
                    error:
                        error instanceof Error ? error.message : String(error),
                    params,
                },
            });
            if (error instanceof Error) {
                throw new ReservoirError({
                    message: error.message,
                    code: ReservoirErrorCode.HttpError,
                });
            }
            throw new ReservoirError({
                message: "Unknown error fetching user activity",
                code: ReservoirErrorCode.UnknownError,
            });
        }
    }

    /**
     * Get user tokens
     * @see https://docs.reservoir.tools/reference/getuserstokensv7
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
                    error:
                        error instanceof Error ? error.message : String(error),
                    params,
                },
            });
            if (error instanceof Error) {
                throw new ReservoirError({
                    message: error.message,
                    code: ReservoirErrorCode.HttpError,
                });
            }
            throw new ReservoirError({
                message: "Unknown error fetching user tokens",
                code: ReservoirErrorCode.UnknownError,
            });
        }
    }

    /**
     * Get user asks (listings)
     * @see https://docs.reservoir.tools/reference/getusersasksv4
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
                    error:
                        error instanceof Error ? error.message : String(error),
                    params,
                },
            });
            if (error instanceof Error) {
                throw new ReservoirError({
                    message: error.message,
                    code: ReservoirErrorCode.HttpError,
                });
            }
            throw new ReservoirError({
                message: "Unknown error fetching user asks",
                code: ReservoirErrorCode.UnknownError,
            });
        }
    }

    /**
     * Get user bids (offers)
     * @see https://docs.reservoir.tools/reference/getusersbidsv5
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
                "/users/bids/v5",
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
                    error:
                        error instanceof Error ? error.message : String(error),
                    params,
                },
            });
            if (error instanceof Error) {
                throw new ReservoirError({
                    message: error.message,
                    code: ReservoirErrorCode.HttpError,
                });
            }
            throw new ReservoirError({
                message: "Unknown error fetching user bids",
                code: ReservoirErrorCode.UnknownError,
            });
        }
    }

    /**
     * Get user top bids
     * @see https://docs.reservoir.tools/reference/getuserstopbidsv2
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
                "/users/top-bids/v2",
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
                    error:
                        error instanceof Error ? error.message : String(error),
                    params,
                },
            });
            if (error instanceof Error) {
                throw new ReservoirError({
                    message: error.message,
                    code: ReservoirErrorCode.HttpError,
                });
            }
            throw new ReservoirError({
                message: "Unknown error fetching user top bids",
                code: ReservoirErrorCode.UnknownError,
            });
        }
    }
}
