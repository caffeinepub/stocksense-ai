import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Toaster } from "@/components/ui/sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Building2,
  CheckCircle2,
  ChevronDown,
  Clock,
  Eye,
  Flame,
  Loader2,
  Newspaper,
  Radio,
  RefreshCw,
  Settings2,
  Shield,
  Target,
  TrendingUp,
  XCircle,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { BreakingNewsTrade, ScanMetadata, StockPick } from "./backend.d";
import {
  useBreakingNewsTrades,
  useScanMetadata,
  useTopPicks,
  useTriggerScan,
} from "./hooks/useQueries";

/* ────────────────────────────────────────────────────────────────────────────
   Utility helpers
   ──────────────────────────────────────────────────────────────────────────── */

function nanoToMs(ns: bigint): number {
  return Number(ns) / 1_000_000;
}

function formatIST(nsTimestamp: bigint): string {
  if (nsTimestamp === 0n) return "—";
  const date = new Date(nanoToMs(nsTimestamp));
  return date.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function relativeTime(nsTimestamp: bigint): string {
  if (nsTimestamp === 0n) return "Unknown";
  const diffMs = Date.now() - nanoToMs(nsTimestamp);
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

function isPreMarket(): boolean {
  const now = new Date();
  // Convert to IST by adjusting UTC offset
  const istOffset = 5.5 * 60 * 60 * 1000;
  const ist = new Date(
    now.getTime() + istOffset + now.getTimezoneOffset() * 60 * 1000,
  );
  const h = ist.getHours();
  const m = ist.getMinutes();
  return h < 9 || (h === 9 && m < 15);
}

function formatPrice(pct: bigint): string {
  const val = Number(pct) / 10;
  const sign = val >= 0 ? "+" : "";
  return `${sign}${val.toFixed(1)}%`;
}

function formatVolume(mult: bigint): string {
  const val = Number(mult) / 10;
  return `${val.toFixed(1)}x`;
}

function countdownStr(nsTimestamp: bigint): string {
  if (nsTimestamp === 0n) return "—";
  const diffMs = nanoToMs(nsTimestamp) - Date.now();
  if (diffMs <= 0) return "Now";
  const diffSec = Math.floor(diffMs / 1000);
  const h = Math.floor(diffSec / 3600);
  const m = Math.floor((diffSec % 3600) / 60);
  const s = diffSec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

/* ────────────────────────────────────────────────────────────────────────────
   Event type config
   ──────────────────────────────────────────────────────────────────────────── */

const EVENT_CONFIG: Record<string, { label: string; color: string }> = {
  EarningsResult: {
    label: "Earnings Result",
    color: "bg-cyan-dim/60 text-cyan border border-cyan/30",
  },
  GovernmentOrder: {
    label: "Govt Order",
    color: "bg-emerald-dim/60 text-emerald border border-emerald/30",
  },
  PrivateOrder: {
    label: "Private Order",
    color: "bg-emerald-dim/60 text-emerald border border-emerald/30",
  },
  MnA: {
    label: "M&A",
    color: "bg-surface-3 text-amber border border-amber/30",
  },
  Fundraising: {
    label: "Fundraising",
    color: "bg-cyan-dim/40 text-cyan border border-cyan/20",
  },
  CapacityExpansion: {
    label: "Capacity Expansion",
    color: "bg-emerald-dim/40 text-emerald border border-emerald/20",
  },
  PromoterActivity: {
    label: "Promoter Activity",
    color: "bg-surface-3 text-amber border border-amber/30",
  },
  BlockBulkDeal: {
    label: "Block/Bulk Deal",
    color: "bg-crimson-dim/40 text-crimson border border-crimson/30",
  },
  SectorNews: {
    label: "Sector News",
    color: "bg-surface-2 text-foreground/70 border border-border",
  },
};

function getEventConfig(type: string) {
  return (
    EVENT_CONFIG[type] ?? {
      label: type,
      color: "bg-surface-2 text-foreground/60 border border-border",
    }
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Confidence badge
   ──────────────────────────────────────────────────────────────────────────── */

function ConfidenceBadge({ score }: { score: bigint }) {
  const val = Number(score);
  const isHigh = val >= 80;
  const isMid = val >= 70 && val < 80;

  const colorCls = isHigh
    ? "text-emerald border-emerald/50 glow-emerald"
    : isMid
      ? "text-amber border-amber/50 glow-amber"
      : "text-foreground/60 border-border";

  return (
    <div
      className={`relative flex flex-col items-center justify-center w-16 h-16 rounded-full border-2 ${colorCls} bg-surface-2`}
    >
      <span className="font-mono text-lg font-bold leading-none">{val}</span>
      <span className="text-[9px] text-muted-foreground/70 leading-none mt-0.5">
        /100
      </span>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Market cap badge
   ──────────────────────────────────────────────────────────────────────────── */

function MarketCapBadge({ category }: { category: string }) {
  const cfg: Record<string, string> = {
    SmallCap: "bg-amber-dim/50 text-amber border border-amber/30",
    MidCap: "bg-cyan-dim/50 text-cyan border border-cyan/30",
    LargeCap: "bg-emerald-dim/50 text-emerald border border-emerald/30",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium ${cfg[category] ?? "bg-surface-2 text-foreground/60 border border-border"}`}
    >
      <Building2 className="w-2.5 h-2.5" />
      {category}
    </span>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Skeleton cards
   ──────────────────────────────────────────────────────────────────────────── */

function StockPickSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-surface-1 p-5 space-y-4">
      <div className="flex items-start gap-4">
        <Skeleton className="w-16 h-16 rounded-full bg-surface-2" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-6 w-24 bg-surface-2" />
          <Skeleton className="h-4 w-48 bg-surface-2" />
          <div className="flex gap-2">
            <Skeleton className="h-5 w-20 rounded bg-surface-2" />
            <Skeleton className="h-5 w-16 rounded bg-surface-2" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-12 rounded bg-surface-2" />
        ))}
      </div>
    </div>
  );
}

function NewsCardSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-surface-1 p-4 space-y-3">
      <Skeleton className="h-5 w-3/4 bg-surface-2" />
      <Skeleton className="h-4 w-1/2 bg-surface-2" />
      <div className="flex gap-2">
        <Skeleton className="h-5 w-20 rounded bg-surface-2" />
        <Skeleton className="h-5 w-24 rounded bg-surface-2" />
      </div>
      <Skeleton className="h-2 w-full rounded bg-surface-2" />
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Stock Pick Card
   ──────────────────────────────────────────────────────────────────────────── */

function StockPickCard({ pick, rank }: { pick: StockPick; rank: number }) {
  const evt = getEventConfig(pick.eventType);
  const priceVal = Number(pick.priceChangePct) / 10;
  const pricePositive = priceVal >= 0;
  const sourceCount = Number(pick.sourceCount);
  const highConfidence = sourceCount >= 2;

  return (
    <div
      className={`relative rounded-lg border bg-surface-1 overflow-hidden transition-all duration-300 hover:border-cyan/30 scanlines
      ${pick.urgencyLevel === "High" ? "border-crimson/40" : "border-border"}`}
    >
      {/* Rank stripe */}
      <div
        className={`absolute left-0 top-0 bottom-0 w-1 ${rank === 1 ? "bg-cyan" : rank === 2 ? "bg-emerald" : "bg-surface-3"}`}
      />

      <div className="pl-4 pr-5 pt-5 pb-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-start gap-4 flex-1 min-w-0">
            <ConfidenceBadge score={pick.confidenceScore} />

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="font-mono text-xl font-bold text-foreground tracking-wider">
                  {pick.symbol}
                </span>
                {pick.urgencyLevel === "High" && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold text-crimson border border-crimson/50 animate-urgency bg-crimson-dim/30 uppercase tracking-wider">
                    <Radio className="w-2.5 h-2.5" />
                    HIGH URGENCY
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground truncate mb-2">
                {pick.companyName}
              </p>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${evt.color}`}
                >
                  {evt.label}
                </span>
                <MarketCapBadge category={pick.marketCapCategory} />
                {highConfidence && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-dim/40 text-emerald border border-emerald/30">
                    <Shield className="w-2.5 h-2.5" />
                    High Confidence
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Price change */}
          <div
            className={`flex-shrink-0 text-right ${pricePositive ? "text-emerald" : "text-crimson"}`}
          >
            <div className="font-mono text-2xl font-bold">
              {formatPrice(pick.priceChangePct)}
            </div>
            <div className="text-xs text-muted-foreground">price chg</div>
          </div>
        </div>

        {/* Metrics grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          <MetricTile
            label="Volume Spike"
            value={formatVolume(pick.volumeSpikeMultiplier)}
            icon={<BarChart3 className="w-3 h-3" />}
            highlight="cyan"
          />
          <MetricTile
            label="Profit Beat"
            value={`+${Number(pick.profitBeatPct)}%`}
            icon={<TrendingUp className="w-3 h-3" />}
            highlight="emerald"
          />
          <MetricTile
            label="Rev Beat"
            value={`+${Number(pick.revenueBeatPct)}%`}
            icon={<Target className="w-3 h-3" />}
            highlight="emerald"
          />
          <MetricTile
            label="Sources"
            value={`${sourceCount} verified`}
            icon={<Shield className="w-3 h-3" />}
            highlight={sourceCount >= 2 ? "emerald" : "amber"}
          />
        </div>

        {/* Sentiment bar */}
        <div className="mb-4 space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground flex items-center gap-1">
              <Activity className="w-3 h-3" /> Sentiment Score
            </span>
            <span className="font-mono text-foreground/80">
              {Number(pick.sentimentScore)}/100
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-surface-3 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan to-emerald transition-all duration-500"
              style={{ width: `${Number(pick.sentimentScore)}%` }}
            />
          </div>
        </div>

        {/* Analyst coverage */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
          <Eye className="w-3 h-3" />
          <span>Analyst Coverage:</span>
          <span
            className={`font-medium ${
              pick.analystCoverageScore === "Low"
                ? "text-emerald"
                : pick.analystCoverageScore === "Medium"
                  ? "text-amber"
                  : "text-crimson"
            }`}
          >
            {pick.analystCoverageScore}
          </span>
          {pick.analystCoverageScore === "Low" && (
            <span className="text-emerald/70 text-[10px]">
              ← Good (less competition)
            </span>
          )}
        </div>

        {/* Expandable details */}
        <Accordion type="single" collapsible className="stock-accordion">
          <AccordionItem value="details" className="border-0">
            <AccordionTrigger className="py-2 text-xs text-cyan hover:text-cyan/80 hover:no-underline [&>svg]:text-cyan">
              <span className="flex items-center gap-1.5">
                <ChevronDown className="w-3 h-3" />
                View AI Analysis
              </span>
            </AccordionTrigger>
            <AccordionContent className="pb-2">
              <div className="space-y-3 pt-1">
                <AnalysisBlock
                  icon={<Zap className="w-3.5 h-3.5 text-cyan" />}
                  title="AI Explanation"
                  text={pick.aiExplanation}
                  accentColor="cyan"
                />
                <AnalysisBlock
                  icon={<Flame className="w-3.5 h-3.5 text-amber" />}
                  title="Trigger Summary"
                  text={pick.triggerSummary}
                  accentColor="amber"
                />
                <AnalysisBlock
                  icon={<AlertTriangle className="w-3.5 h-3.5 text-crimson" />}
                  title="Risk Factors"
                  text={pick.riskFactors}
                  accentColor="crimson"
                />
                <AnalysisBlock
                  icon={<TrendingUp className="w-3.5 h-3.5 text-emerald" />}
                  title="Why It May Move Further"
                  text={pick.whyItMayMoveMore}
                  accentColor="emerald"
                />
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  );
}

function MetricTile({
  label,
  value,
  icon,
  highlight,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  highlight: "cyan" | "emerald" | "amber" | "crimson";
}) {
  const colorMap = {
    cyan: "text-cyan",
    emerald: "text-emerald",
    amber: "text-amber",
    crimson: "text-crimson",
  };
  return (
    <div className="rounded bg-surface-2 border border-border px-3 py-2">
      <div
        className={`flex items-center gap-1 text-[10px] ${colorMap[highlight]} mb-1`}
      >
        {icon}
        <span className="uppercase tracking-wide">{label}</span>
      </div>
      <div className="font-mono text-sm font-semibold text-foreground">
        {value}
      </div>
    </div>
  );
}

function AnalysisBlock({
  icon,
  title,
  text,
  accentColor,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
  accentColor: string;
}) {
  const borderMap: Record<string, string> = {
    cyan: "border-l-cyan/50",
    amber: "border-l-amber/50",
    crimson: "border-l-crimson/50",
    emerald: "border-l-emerald/50",
  };
  return (
    <div
      className={`border-l-2 pl-3 py-1 ${borderMap[accentColor] ?? "border-l-border"} bg-surface-2/50 rounded-r`}
    >
      <div className="flex items-center gap-1.5 text-xs font-medium text-foreground/80 mb-1">
        {icon}
        {title}
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{text}</p>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Breaking News Card
   ──────────────────────────────────────────────────────────────────────────── */

function BreakingNewsCard({ item }: { item: BreakingNewsTrade }) {
  const urgencyVal = Number(item.urgencyScore);
  const isHighUrgency = urgencyVal >= 90;
  const isHighConfidence = item.confidenceLevel === "HighConfidence";

  return (
    <div
      className={`relative rounded-lg border bg-surface-1 p-4 overflow-hidden transition-all duration-300 scanlines
      ${isHighUrgency ? "border-crimson/50 hover:border-crimson/70" : "border-border hover:border-cyan/30"}`}
    >
      {isHighUrgency && (
        <div className="absolute inset-0 rounded-lg bg-crimson/[0.03] pointer-events-none" />
      )}

      <div className="relative">
        {/* Headline */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <h3 className="text-sm font-semibold text-foreground leading-snug flex-1">
            {item.headline}
          </h3>
          {isHighUrgency && (
            <span className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold text-crimson border border-crimson/50 animate-urgency bg-crimson-dim/30 uppercase tracking-wider whitespace-nowrap">
              <Radio className="w-2.5 h-2.5" />
              HIGH URGENCY
            </span>
          )}
        </div>

        {/* Company info */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className="font-mono text-base font-bold text-cyan">
            {item.companySymbol}
          </span>
          <span className="text-sm text-muted-foreground">
            {item.companyName}
          </span>
        </div>

        {/* Badges row */}
        <div className="flex items-center gap-2 flex-wrap mb-3">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-amber-dim/40 text-amber border border-amber/30">
            <Zap className="w-2.5 h-2.5" />
            {item.keywordMatched}
          </span>
          {isHighConfidence ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-dim/40 text-emerald border border-emerald/30">
              <CheckCircle2 className="w-2.5 h-2.5" />
              High Confidence
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-amber-dim/30 text-amber/80 border border-amber/20">
              <Activity className="w-2.5 h-2.5" />
              Medium Confidence
            </span>
          )}
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium ${getEventConfig(item.eventType).color}`}
          >
            {getEventConfig(item.eventType).label}
          </span>
        </div>

        {/* Urgency score bar */}
        <div className="space-y-1 mb-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Urgency Score</span>
            <span
              className={`font-mono font-medium ${isHighUrgency ? "text-crimson" : "text-amber"}`}
            >
              {urgencyVal}/100
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-surface-3 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${isHighUrgency ? "bg-gradient-to-r from-amber to-crimson" : "bg-gradient-to-r from-amber-dim to-amber"}`}
              style={{ width: `${urgencyVal}%` }}
            />
          </div>
        </div>

        {/* Footer row */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Shield className="w-3 h-3" />
            <span>
              {item.sources.length} source{item.sources.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>{relativeTime(item.timestamp)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Scan Engine Panel
   ──────────────────────────────────────────────────────────────────────────── */

function ScanEnginePanel({ meta }: { meta: ScanMetadata | undefined }) {
  const triggerScan = useTriggerScan();
  const [countdown, setCountdown] = useState("—");

  useEffect(() => {
    if (!meta?.nextScheduledScan) return;
    const interval = setInterval(() => {
      setCountdown(countdownStr(meta.nextScheduledScan));
    }, 1000);
    setCountdown(countdownStr(meta.nextScheduledScan));
    return () => clearInterval(interval);
  }, [meta?.nextScheduledScan]);

  const handleTriggerScan = async () => {
    try {
      const result = await triggerScan.mutateAsync();
      toast.success("Scan triggered", { description: result });
    } catch {
      toast.error("Failed to trigger scan");
    }
  };

  const freshness = meta ? Number(meta.dataFreshnessMinutes) : 0;
  const freshnessColor =
    freshness < 30
      ? "text-emerald"
      : freshness < 60
        ? "text-amber"
        : "text-crimson";
  const freshnessBg =
    freshness < 30
      ? "bg-emerald-dim/40 border-emerald/30"
      : freshness < 60
        ? "bg-amber-dim/40 border-amber/30"
        : "bg-crimson-dim/40 border-crimson/30";
  const freshnessLabel =
    freshness < 30 ? "Fresh" : freshness < 60 ? "Stale" : "Outdated";

  const scanStatusColor: Record<string, string> = {
    Running: "text-cyan",
    Idle: "text-emerald",
    Error: "text-crimson",
  };
  const marketStatusColor: Record<string, string> = {
    PreMarket: "text-amber",
    Open: "text-emerald",
    Closed: "text-muted-foreground",
  };

  return (
    <div className="space-y-4">
      {/* Status grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <StatusCard
          title="Last Scan"
          value={meta ? formatIST(meta.lastScanTimestamp) : "—"}
          icon={<Clock className="w-4 h-4 text-cyan" />}
          sub="IST"
        />
        <StatusCard
          title="Next Scan In"
          value={countdown}
          icon={<Activity className="w-4 h-4 text-cyan" />}
          sub="Scheduled"
        />
        <StatusCard
          title="Scan Status"
          value={meta?.scanStatus ?? "—"}
          icon={
            meta?.scanStatus === "Running" ? (
              <Loader2 className="w-4 h-4 text-cyan animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-cyan" />
            )
          }
          valueColor={
            scanStatusColor[meta?.scanStatus ?? ""] ?? "text-foreground"
          }
          sub="Engine"
        />
        <StatusCard
          title="Market Status"
          value={meta?.marketStatus ?? "—"}
          icon={<Radio className="w-4 h-4 text-cyan" />}
          valueColor={
            marketStatusColor[meta?.marketStatus ?? ""] ?? "text-foreground"
          }
          sub="NSE / BSE"
        />
        <StatusCard
          title="Total Picks"
          value={meta ? Number(meta.totalPicksGenerated).toString() : "—"}
          icon={<TrendingUp className="w-4 h-4 text-emerald" />}
          valueColor="text-emerald"
          sub="Generated today"
        />
        <StatusCard
          title="Breaking News"
          value={meta ? Number(meta.totalBreakingNews).toString() : "—"}
          icon={<Newspaper className="w-4 h-4 text-amber" />}
          valueColor="text-amber"
          sub="Captured today"
        />
      </div>

      {/* Data freshness */}
      <div
        className={`flex items-center justify-between rounded-lg border px-4 py-3 ${freshnessBg}`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-2.5 h-2.5 rounded-full ${freshnessColor.replace("text-", "bg-")} animate-blink`}
          />
          <div>
            <div className="text-xs text-muted-foreground">Data Freshness</div>
            <div
              className={`font-mono text-sm font-semibold ${freshnessColor}`}
            >
              {freshness > 0 ? `${freshness}m old` : "Just updated"} —{" "}
              {freshnessLabel}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted-foreground">Threshold</div>
          <div className="font-mono text-xs text-foreground/60">
            {"<30m = Fresh"}
          </div>
        </div>
      </div>

      {/* Schedule info */}
      <div className="rounded-lg border border-border bg-surface-1 p-4 scanlines">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-cyan" />
          Automated Schedule
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald" />
            <span>
              Daily pre-market scan:{" "}
              <span className="text-foreground font-mono">8:00 AM IST</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-cyan" />
            <span>
              Intra-day: every{" "}
              <span className="text-foreground font-mono">30 minutes</span>{" "}
              during market hours
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-amber" />
            <span>Data sources: NSE · BSE · Earnings · News portals</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-crimson" />
            <span>
              Cross-verification:{" "}
              <span className="text-foreground font-mono">≥2 sources</span> for
              High Confidence
            </span>
          </div>
        </div>
      </div>

      {/* Scoring model */}
      <div className="rounded-lg border border-border bg-surface-1 p-4 scanlines">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Target className="w-4 h-4 text-cyan" />
          AI Scoring Model — Weighted Confidence (out of 100)
        </h3>
        <div className="space-y-2">
          {[
            { label: "Earnings Surprise", weight: 30, color: "bg-cyan" },
            { label: "News Strength", weight: 20, color: "bg-emerald" },
            { label: "Volume Structure", weight: 20, color: "bg-amber" },
            {
              label: "Price Reaction Quality",
              weight: 15,
              color: "bg-crimson",
            },
            { label: "Sentiment Score", weight: 10, color: "bg-cyan/60" },
            { label: "Market Cap Factor", weight: 5, color: "bg-surface-3" },
          ].map(({ label, weight, color }) => (
            <div key={label} className="flex items-center gap-3">
              <div className="w-36 text-xs text-muted-foreground truncate">
                {label}
              </div>
              <div className="flex-1 h-1.5 rounded-full bg-surface-3 overflow-hidden">
                <div
                  className={`h-full rounded-full ${color}`}
                  style={{ width: `${weight * 3.33}%` }}
                />
              </div>
              <div className="w-8 text-right font-mono text-xs text-foreground/70">
                {weight}%
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Trigger button */}
      <div className="rounded-lg border border-border bg-surface-1 p-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-1">
              Manual Scan
            </h3>
            <p className="text-xs text-muted-foreground">
              Trigger an immediate AI screening scan across all data sources
            </p>
          </div>
          <Button
            onClick={handleTriggerScan}
            disabled={triggerScan.isPending}
            className="bg-cyan text-background hover:bg-cyan/90 font-mono font-medium gap-2"
          >
            {triggerScan.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            {triggerScan.isPending ? "Scanning…" : "Trigger Scan"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function StatusCard({
  title,
  value,
  icon,
  sub,
  valueColor,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  sub?: string;
  valueColor?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface-1 px-4 py-3 scanlines">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs text-muted-foreground uppercase tracking-wide">
          {title}
        </span>
      </div>
      <div
        className={`font-mono text-sm font-semibold ${valueColor ?? "text-foreground"} leading-tight`}
      >
        {value}
      </div>
      {sub && (
        <div className="text-[10px] text-muted-foreground/60 mt-0.5">{sub}</div>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Empty state
   ──────────────────────────────────────────────────────────────────────────── */

function EmptyState({ message, sub }: { message: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-16 h-16 rounded-full border-2 border-dashed border-border flex items-center justify-center mb-4">
        <Activity className="w-6 h-6 text-muted-foreground/40" />
      </div>
      <p className="text-sm font-medium text-muted-foreground">{message}</p>
      {sub && <p className="text-xs text-muted-foreground/60 mt-1">{sub}</p>}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Header components
   ──────────────────────────────────────────────────────────────────────────── */

function MarketStatusBadge({ status }: { status: string | undefined }) {
  if (!status) return null;
  const cfg: Record<string, { dot: string; label: string; bg: string }> = {
    Open: {
      dot: "bg-emerald animate-blink",
      label: "Market Open",
      bg: "bg-emerald-dim/40 border-emerald/30 text-emerald",
    },
    PreMarket: {
      dot: "bg-amber animate-blink",
      label: "Pre-Market",
      bg: "bg-amber-dim/40 border-amber/30 text-amber",
    },
    Closed: {
      dot: "bg-muted-foreground",
      label: "Market Closed",
      bg: "bg-surface-2 border-border text-muted-foreground",
    },
  };
  const c = cfg[status] ?? cfg.Closed;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs font-medium ${c.bg}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}

function FreshnessIndicator({ minutes }: { minutes: bigint | undefined }) {
  const m = minutes ? Number(minutes) : 0;
  const color =
    m < 30
      ? "text-emerald border-emerald/40 bg-emerald-dim/30"
      : m < 60
        ? "text-amber border-amber/40 bg-amber-dim/30"
        : "text-crimson border-crimson/40 bg-crimson-dim/30";
  const label = m < 30 ? "Fresh" : m < 60 ? "Stale" : "Outdated";
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs font-mono ${color}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current animate-blink" />
      {label} · {m}m
    </span>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Pre-market banner
   ──────────────────────────────────────────────────────────────────────────── */

function PreMarketBanner() {
  return (
    <div className="relative overflow-hidden border-b border-amber/30 bg-amber-dim/30 px-4 py-2.5 animate-amber-pulse">
      <div className="flex items-center justify-center gap-2.5 text-sm text-amber font-medium">
        <Radio className="w-4 h-4 flex-shrink-0" />
        <span>
          <span className="font-bold font-mono">Pre-Market Scan Active</span> —
          Shortlisting opportunities before market opens at{" "}
          <span className="font-mono font-bold">9:15 AM IST</span>
        </span>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Main App
   ──────────────────────────────────────────────────────────────────────────── */

export default function App() {
  const [activeTab, setActiveTab] = useState("picks");
  const [showPreMarket, setShowPreMarket] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const topPicksQuery = useTopPicks();
  const breakingNewsQuery = useBreakingNewsTrades();
  const scanMetaQuery = useScanMetadata();

  const meta = scanMetaQuery.data;
  const picks = topPicksQuery.data ?? [];
  const news = breakingNewsQuery.data ?? [];

  // Pre-market banner check
  useEffect(() => {
    const check = () => setShowPreMarket(isPreMarket());
    check();
    const id = setInterval(check, 60_000);
    return () => clearInterval(id);
  }, []);

  // Track last refresh time
  const handleRefresh = useCallback(() => {
    topPicksQuery.refetch();
    breakingNewsQuery.refetch();
    scanMetaQuery.refetch();
    setLastRefresh(new Date());
  }, [topPicksQuery, breakingNewsQuery, scanMetaQuery]);

  // Auto-refresh every 30s
  useEffect(() => {
    const id = setInterval(handleRefresh, 30_000);
    return () => clearInterval(id);
  }, [handleRefresh]);

  const isLoading =
    topPicksQuery.isLoading ||
    breakingNewsQuery.isLoading ||
    scanMetaQuery.isLoading;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Toaster theme="dark" />

      {/* Pre-market banner */}
      {showPreMarket && <PreMarketBanner />}

      {/* ── Header ── */}
      <header className="sticky top-0 z-50 border-b border-border bg-surface-1/95 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-cyan-dim/60 border border-cyan/30 glow-cyan">
                <TrendingUp className="w-5 h-5 text-cyan" />
              </div>
              <div>
                <h1 className="font-display text-lg font-bold text-foreground leading-none tracking-tight">
                  StockSense <span className="text-cyan">AI</span>
                </h1>
                <p className="text-[10px] text-muted-foreground/60 font-mono tracking-widest uppercase">
                  NSE · BSE Intelligence
                </p>
              </div>
            </div>

            {/* Status row */}
            <div className="flex items-center gap-2 flex-wrap">
              <MarketStatusBadge status={meta?.marketStatus} />
              <FreshnessIndicator minutes={meta?.dataFreshnessMinutes} />
              <div className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground/60">
                <Clock className="w-3 h-3" />
                <span className="font-mono">
                  {lastRefresh.toLocaleTimeString("en-IN", {
                    hour12: false,
                    timeZone: "Asia/Kolkata",
                  })}
                </span>
              </div>
              <button
                type="button"
                onClick={handleRefresh}
                className="flex items-center gap-1 px-2 py-1 rounded border border-border bg-surface-2 text-muted-foreground hover:text-foreground hover:border-cyan/30 transition-colors text-xs"
                aria-label="Refresh data"
              >
                <RefreshCw
                  className={`w-3 h-3 ${isLoading ? "animate-spin text-cyan" : ""}`}
                />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ── Main content ── */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-5"
        >
          <TabsList className="bg-surface-1 border border-border p-1 h-auto gap-1">
            <TabsTrigger
              value="picks"
              className="data-[state=active]:bg-cyan-dim/50 data-[state=active]:text-cyan data-[state=active]:border-cyan/30 border border-transparent text-sm gap-1.5 font-medium"
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Top AI Picks</span>
              {picks.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-cyan/20 text-cyan font-mono text-[10px]">
                  {picks.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="news"
              className="data-[state=active]:bg-crimson-dim/40 data-[state=active]:text-crimson data-[state=active]:border-crimson/30 border border-transparent text-sm gap-1.5 font-medium"
            >
              <Newspaper className="w-3.5 h-3.5" />
              <span>Breaking News</span>
              {news.filter((n) => Number(n.urgencyScore) >= 90).length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-crimson/20 text-crimson font-mono text-[10px] animate-urgency">
                  {news.filter((n) => Number(n.urgencyScore) >= 90).length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="engine"
              className="data-[state=active]:bg-surface-3 data-[state=active]:text-foreground border border-transparent text-sm gap-1.5 font-medium"
            >
              <Settings2 className="w-3.5 h-3.5" />
              <span>Scan Engine</span>
            </TabsTrigger>
          </TabsList>

          {/* ── Tab 1: Top AI Picks ── */}
          <TabsContent value="picks" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-base font-semibold text-foreground">
                  Top AI Picks — Today
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Stocks scoring &gt;70/100 · Only midcap &amp; smallcap ·
                  Cross-verified data
                </p>
              </div>
              {!isLoading && (
                <div className="text-xs text-muted-foreground font-mono">
                  {picks.length} pick{picks.length !== 1 ? "s" : ""} found
                </div>
              )}
            </div>

            {topPicksQuery.isLoading ? (
              <div className="space-y-4">
                {[0, 1, 2].map((i) => (
                  <StockPickSkeleton key={i} />
                ))}
              </div>
            ) : picks.length === 0 ? (
              <EmptyState
                message="No picks qualify today"
                sub="The AI engine requires score >70 with all mandatory filters. Check back after the next scan."
              />
            ) : (
              <div className="space-y-4">
                {picks.map((pick, idx) => (
                  <StockPickCard key={pick.symbol} pick={pick} rank={idx + 1} />
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── Tab 2: Breaking News Trades ── */}
          <TabsContent value="news" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-base font-semibold text-foreground">
                  Breaking News Trades
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  High-impact events · Real-time keyword detection ·
                  Multi-source validation
                </p>
              </div>
              {!isLoading && (
                <div className="text-xs text-muted-foreground font-mono">
                  {news.length} item{news.length !== 1 ? "s" : ""}
                </div>
              )}
            </div>

            {breakingNewsQuery.isLoading ? (
              <div className="space-y-3">
                {[0, 1, 2, 4].map((i) => (
                  <NewsCardSkeleton key={i} />
                ))}
              </div>
            ) : news.length === 0 ? (
              <EmptyState
                message="No breaking news detected"
                sub="High-impact keywords (wins order, merger, block deal…) will appear here when detected."
              />
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {news.map((item) => (
                  <BreakingNewsCard key={item.id} item={item} />
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── Tab 3: Scan Engine ── */}
          <TabsContent value="engine" className="space-y-4">
            <div>
              <h2 className="font-display text-base font-semibold text-foreground">
                Scan Engine Status
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Automated AI screening — NSE/BSE/Earnings/News pipeline
              </p>
            </div>
            {scanMetaQuery.isLoading ? (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-20 rounded-lg bg-surface-1" />
                ))}
              </div>
            ) : (
              <ScanEnginePanel meta={meta} />
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-border bg-surface-1/50">
        {/* Compliance disclaimer */}
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-start gap-2.5 p-3 rounded-lg border border-amber/20 bg-amber-dim/10">
            <AlertTriangle className="w-4 h-4 text-amber/70 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-muted-foreground/70 leading-relaxed">
              <span className="font-semibold text-amber/80">DISCLAIMER:</span>{" "}
              StockSense AI is for informational and educational purposes only.
              This is not financial advice, investment advice, or a
              recommendation to buy or sell any security. Past performance does
              not guarantee future results. Always consult a SEBI-registered
              financial advisor before making investment decisions. Stock market
              investments are subject to market risks.
            </p>
          </div>
          <div className="flex items-center justify-between mt-3 text-[10px] text-muted-foreground/40">
            <span className="font-mono">StockSense AI · NSE · BSE</span>
            <a
              href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-muted-foreground/70 transition-colors"
            >
              © {new Date().getFullYear()}. Built with ♥ using caffeine.ai
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
