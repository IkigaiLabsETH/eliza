// Import services
import { BaseReservoirService, type ReservoirServiceConfig } from "./base";
import { CollectionService } from "./collection";
import { TokenService } from "./token";
import { UserService } from "./user";
import { MarketService } from "./market";
import { EventService } from "./event";
import { OwnerService } from "./owner";
import { TransferService } from "./transfer";
import { StatsService } from "./stats";

// Re-export types from base
export type { ReservoirServiceConfig } from "./base";
export { ReservoirErrorCode, BaseReservoirService } from "./base";

// Re-export client
export { ReservoirClient } from "./client";

// Re-export types
export type * from "./types/token";
export type * from "./types/collection";
export type * from "./types/order";
export type * from "./types/user";

// Re-export errors
export * from "./errors";

// Re-export utils
export * from "./utils/retry";
export * from "./utils/circuit-breaker";
export * from "./utils/validation";
export * from "./utils/response-enhancer";

// Re-export services
export { CollectionService } from "./collection";
export { TokenService } from "./token";
export { UserService } from "./user";
export { MarketService } from "./market";
export { EventService } from "./event";
export { OwnerService } from "./owner";
export { TransferService } from "./transfer";
export { StatsService } from "./stats";

// Main service class
export class ReservoirService extends BaseReservoirService {
    readonly collections: CollectionService;
    readonly tokens: TokenService;
    readonly users: UserService;
    readonly market: MarketService;
    readonly events: EventService;
    readonly owners: OwnerService;
    readonly transfers: TransferService;
    readonly stats: StatsService;

    constructor(config: ReservoirServiceConfig) {
        super(config);
        this.collections = new CollectionService(config);
        this.tokens = new TokenService(config);
        this.users = new UserService(config);
        this.market = new MarketService(config);
        this.events = new EventService(config);
        this.owners = new OwnerService(config);
        this.transfers = new TransferService(config);
        this.stats = new StatsService(config);
    }
}
