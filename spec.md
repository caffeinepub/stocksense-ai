# StockSense AI - Automated Stock Intelligence Engine

## Current State

Fresh project with default scaffolding only. No backend logic, no frontend application code, no data models. Only base Motoko backend shell and React frontend shell exist.

## Requested Changes (Diff)

### Add

**Backend:**
- `StockPick` data type: symbol, company name, confidence score (0-100), event type, trigger summary, AI explanation (5 lines), risk factors, why it may move further, timestamp, urgency level, source count (for validation), price change %, volume spike multiplier, market cap category, sentiment score
- `BreakingNewsTrade` data type: headline, company, keyword matched, urgency score, sources, timestamp, confidence level (High/Medium)
- `ScanMetadata` data type: last scan timestamp, next scheduled scan time, scan status, data freshness indicator
- `ScreeningConfig` data type: scoring weights, filter thresholds (configurable)
- Background timer (heartbeat) that simulates scheduled screening every ~30 seconds in canister time (since ICP doesn't have real cron — runs on heartbeat)
- AI screening engine logic: weighted confidence scoring (Earnings Surprise 30%, News Strength 20%, Volume Structure 20%, Price Reaction 15%, Market Cap Factor 5%, Sentiment 10%)
- HTTP outcalls to fetch from NSE/BSE announcement feeds, financial news APIs
- Event classification: Earnings, Government Order, Private Order, M&A, Fundraising, Capacity Expansion, Promoter Activity, Block/Bulk Deals, Sector News
- Strict filter application: 48hr recency, profit beat >10% or revenue beat >15%, volume spike >2x, price jump 5–20%, midcap/smallcap only, sentiment >70%, low analyst coverage
- Cross-source validation: mark "High Confidence" only when 2+ sources confirm
- High-urgency keyword detection and immediate tagging
- Top 5 daily picks ranked by score
- Query APIs: getTopPicks, getBreakingNewsTrades, getScanMetadata, getScreeningConfig, triggerManualScan (test mode)

**Frontend:**
- Full dashboard with tabbed navigation: "Top Picks", "Breaking News Trades", "Scan Status"
- Pre-market shortlist banner (shown before 9:15 AM IST)
- Last scan timestamp and data freshness indicator in header
- StockPickCard: shows symbol, company, confidence score badge, event type tag, AI explanation accordion, trigger summary, risk factors, why it may move section
- BreakingNewsCard: headline, urgency badge (HIGH URGENCY), keyword tag, source count, confidence level badge
- ScanStatus panel: last scan time, next scan countdown, scan health indicator
- Compliance disclaimer footer
- Auto-refresh every 30 seconds
- Loading skeletons and empty states

### Modify

- Nothing to modify (new build)

### Remove

- Default placeholder content from initial-app scaffold

## Implementation Plan

1. Select `http-outcalls` Caffeine component (needed for NSE/BSE/news API calls)
2. Generate Motoko backend with:
   - Data types and stable storage for picks, breaking news, scan metadata
   - Heartbeat-based scheduler (ICP heartbeat acts as cron)
   - HTTP outcall logic to financial data sources
   - AI screening engine with weighted scoring
   - Strict filter validation
   - Source cross-verification logic
   - High-urgency keyword detection
   - Public query and update methods
3. Build React frontend:
   - Dashboard layout with tabs
   - Pre-market banner logic (IST timezone detection)
   - StockPickCard with AI explanation accordion
   - BreakingNewsCard with urgency styling
   - ScanStatus with live countdown
   - Auto-refresh hook
   - Compliance disclaimer
