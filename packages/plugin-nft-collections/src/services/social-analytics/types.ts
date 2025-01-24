export interface DetailedSocialMetrics {
    sentiment: number;
    engagement: number;
    mentions: {
        total: number;
        positive: number;
        negative: number;
        neutral: number;
    };
    influencerActivity: {
        count: number;
        reach: number;
        engagement: number;
    };
    communityGrowth: {
        twitter: number;
        discord: number;
    };
    timestamp: string;
}
