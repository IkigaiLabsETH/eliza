export interface Currency {
    contract: string;
    name: string;
    symbol: string;
    decimals: number;
}

export interface Price {
    currency: Currency;
    amount: {
        raw: string;
        decimal: number;
        usd: number;
        native: number;
    };
}

export interface Source {
    id: string;
    domain: string;
    name: string;
    icon: string;
    url: string;
}

export interface Continuation {
    continuation?: string;
}
