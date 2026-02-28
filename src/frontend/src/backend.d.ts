import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface BreakingNewsTrade {
    id: string;
    urgencyScore: bigint;
    headline: string;
    confidenceLevel: string;
    timestamp: bigint;
    companyName: string;
    sources: Array<string>;
    companySymbol: string;
    keywordMatched: string;
    eventType: string;
}
export interface ScanMetadata {
    totalPicksGenerated: bigint;
    marketStatus: string;
    dataFreshnessMinutes: bigint;
    nextScheduledScan: bigint;
    lastScanTimestamp: bigint;
    scanStatus: string;
    totalBreakingNews: bigint;
}
export interface StockPick {
    urgencyLevel: string;
    sentimentScore: bigint;
    revenueBeatPct: bigint;
    analystCoverageScore: string;
    riskFactors: string;
    triggerSummary: string;
    sourceCount: bigint;
    confidenceScore: bigint;
    volumeSpikeMultiplier: bigint;
    aiExplanation: string;
    timestamp: bigint;
    priceChangePct: bigint;
    marketCapCategory: string;
    companyName: string;
    whyItMayMoveMore: string;
    symbol: string;
    profitBeatPct: bigint;
    eventType: string;
}
export interface backendInterface {
    clearAllData(): Promise<void>;
    getAllPicks(): Promise<Array<StockPick>>;
    getBreakingNewsTrades(): Promise<Array<BreakingNewsTrade>>;
    getScanMetadata(): Promise<ScanMetadata>;
    getTopPicks(): Promise<Array<StockPick>>;
    triggerManualScan(): Promise<string>;
}
