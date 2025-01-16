export * from "./base";
export * from "./types";
export * from "./collection";
export * from "./token";
export * from "./user";
export * from "./market";
export * from "./transfer";

// Re-export the config and error types for convenience
export type { ReservoirServiceConfig } from "./base";
export { ReservoirErrorCode } from "./base";

// Main service that combines all functionality
import { ReservoirServiceConfig } from "./base";
import { CollectionService } from "./collection";
import { TokenService } from "./token";
import { UserService } from "./user";
import { MarketService } from "./market";
import { TransferService } from "./transfer";

export class ReservoirService {
    readonly collections: CollectionService;
    readonly tokens: TokenService;
    readonly users: UserService;
    readonly market: MarketService;
    readonly transfers: TransferService;

    constructor(config: ReservoirServiceConfig = {}) {
        this.collections = new CollectionService(config);
        this.tokens = new TokenService(config);
        this.users = new UserService(config);
        this.market = new MarketService(config);
        this.transfers = new TransferService(config);
    }
}
