export * from "./base";
export * from "./collection";
export * from "./token";
export * from "./user";
export * from "./market";
export * from "./event";
export * from "./owner";
export * from "./transfer";
export * from "./stats";

import { ReservoirServiceConfig } from "./base";
import { CollectionService } from "./collection";
import { TokenService } from "./token";
import { UserService } from "./user";
import { MarketService } from "./market";
import { EventService } from "./event";
import { OwnerService } from "./owner";
import { TransferService } from "./transfer";
import { StatsService } from "./stats";

export class ReservoirService {
    readonly collections: CollectionService;
    readonly tokens: TokenService;
    readonly users: UserService;
    readonly market: MarketService;
    readonly events: EventService;
    readonly owners: OwnerService;
    readonly transfers: TransferService;
    readonly stats: StatsService;

    constructor(config: ReservoirServiceConfig) {
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
