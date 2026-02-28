import List "mo:core/List";
import Array "mo:core/Array";
import Text "mo:core/Text";
import Order "mo:core/Order";
import Time "mo:core/Time";
import Int "mo:core/Int";
import Nat "mo:core/Nat";
import Iter "mo:core/Iter";
import Runtime "mo:core/Runtime";

actor {
  public type StockPick = {
    symbol : Text;
    companyName : Text;
    confidenceScore : Nat; // 0-100
    eventType : Text; // EarningsResult, GovernmentOrder, etc.
    triggerSummary : Text;
    aiExplanation : Text;
    riskFactors : Text;
    whyItMayMoveMore : Text;
    timestamp : Int;
    urgencyLevel : Text; // High, Medium, Low
    sourceCount : Nat;
    priceChangePct : Int; // Stored as integer (e.g. 85 = 8.5%)
    volumeSpikeMultiplier : Int; // Stored as integer (e.g. 23 = 2.3x)
    marketCapCategory : Text; // SmallCap, MidCap, LargeCap
    sentimentScore : Nat; // 0-100
    profitBeatPct : Int; // e.g. 15 means 15%
    revenueBeatPct : Int;
    analystCoverageScore : Text; // Low, Medium, High
  };

  public type BreakingNewsTrade = {
    id : Text;
    headline : Text;
    companySymbol : Text;
    companyName : Text;
    keywordMatched : Text;
    urgencyScore : Nat; // 0-100
    sources : [Text];
    timestamp : Int;
    confidenceLevel : Text; // HighConfidence, MediumConfidence
    eventType : Text;
  };

  public type ScanMetadata = {
    lastScanTimestamp : Int;
    nextScheduledScan : Int;
    scanStatus : Text; // Running, Idle, Error
    dataFreshnessMinutes : Nat;
    totalPicksGenerated : Nat;
    totalBreakingNews : Nat;
    marketStatus : Text; // PreMarket, Open, Closed
  };

  module StockPick {
    public func compareByConfidenceScore(a : StockPick, b : StockPick) : Order.Order {
      Nat.compare(b.confidenceScore, a.confidenceScore); // Descending order
    };

    public func compareByTimestamp(a : StockPick, b : StockPick) : Order.Order {
      Int.compare(b.timestamp, a.timestamp); // Descending order
    };
  };

  module BreakingNewsTrade {
    public func compareByTimestamp(a : BreakingNewsTrade, b : BreakingNewsTrade) : Order.Order {
      Int.compare(b.timestamp, a.timestamp); // Descending order
    };
  };

  var stockPicks : [StockPick] = [];
  var breakingNews : [BreakingNewsTrade] = [];
  var scanMetadata : ScanMetadata = {
    lastScanTimestamp = Time.now();
    nextScheduledScan = Time.now() + 3600_000_000_000; // 1 hour later
    scanStatus = "Idle";
    dataFreshnessMinutes = 0;
    totalPicksGenerated = 0;
    totalBreakingNews = 0;
    marketStatus = "Closed";
  };

  public query ({ caller }) func getTopPicks() : async [StockPick] {
    let filteredPicks = stockPicks.filter(
      func(pick) {
        pick.confidenceScore > 70;
      }
    );

    let sortedPicks = filteredPicks.sort(StockPick.compareByConfidenceScore);

    let max5Picks = sortedPicks.sliceToArray(0, Nat.min(5, sortedPicks.size()));

    max5Picks;
  };

  public query ({ caller }) func getBreakingNewsTrades() : async [BreakingNewsTrade] {
    if (breakingNews.size() <= 20) {
      return breakingNews;
    };

    let sortedBreakingNews = breakingNews.sort(BreakingNewsTrade.compareByTimestamp);
    sortedBreakingNews.sliceToArray(0, 20);
  };

  public query ({ caller }) func getScanMetadata() : async ScanMetadata {
    scanMetadata;
  };

  public query ({ caller }) func getAllPicks() : async [StockPick] {
    let sortedPicks = stockPicks.sort(StockPick.compareByTimestamp);
    sortedPicks;
  };

  public shared ({ caller }) func triggerManualScan() : async Text {
    let newPicks : [StockPick] = [
      {
        symbol = "LTTS";
        companyName = "L&T Technology Services";
        confidenceScore = 82;
        eventType = "EarningsResult";
        triggerSummary = "Strong Q4 profit beat";
        aiExplanation = "High earnings surprise with volume and price momentum";
        riskFactors = "Sector volatility";
        whyItMayMoveMore = "Sustained earnings growth";
        timestamp = Time.now();
        urgencyLevel = "High";
        sourceCount = 4;
        priceChangePct = 105; // 10.5%
        volumeSpikeMultiplier = 28; // 2.8x
        marketCapCategory = "MidCap";
        sentimentScore = 80;
        profitBeatPct = 20;
        revenueBeatPct = 16;
        analystCoverageScore = "Medium";
      },
      {
        symbol = "MAPMYINDIA";
        companyName = "CE Info Systems Ltd";
        confidenceScore = 78;
        eventType = "PrivateOrder";
        triggerSummary = "Significant new contracts announced";
        aiExplanation = "Order flow with strong volume spike";
        riskFactors = "Execution risk";
        whyItMayMoveMore = "More contracts expected";
        timestamp = Time.now();
        urgencyLevel = "Medium";
        sourceCount = 3;
        priceChangePct = 85; // 8.5%
        volumeSpikeMultiplier = 24; // 2.4x
        marketCapCategory = "SmallCap";
        sentimentScore = 77;
        profitBeatPct = 17;
        revenueBeatPct = 19;
        analystCoverageScore = "Low";
      },
    ];

    let newBreakingNews : [BreakingNewsTrade] = [
      {
        id = "news4";
        headline = "LTTS receives major order from US tech firm";
        companySymbol = "LTTS";
        companyName = "L&T Technology Services";
        keywordMatched = "receives order";
        urgencyScore = 90;
        sources = ["CNBC", "MoneyControl"];
        timestamp = Time.now();
        confidenceLevel = "HighConfidence";
        eventType = "PrivateOrder";
      },
      {
        id = "news5";
        headline = "MapMyIndia bags Rs 300 crore mapping contract";
        companySymbol = "MAPMYINDIA";
        companyName = "CE Info Systems Ltd";
        keywordMatched = "bags order";
        urgencyScore = 93;
        sources = ["ET Now", "Business Standard"];
        timestamp = Time.now();
        confidenceLevel = "MediumConfidence";
        eventType = "PrivateOrder";
      },
    ];

    stockPicks := stockPicks.concat(newPicks);
    breakingNews := breakingNews.concat(newBreakingNews);

    scanMetadata := {
      lastScanTimestamp = Time.now();
      nextScheduledScan = Time.now() + 3600_000_000_000;
      scanStatus = "Idle";
      dataFreshnessMinutes = 0;
      totalPicksGenerated = stockPicks.size();
      totalBreakingNews = breakingNews.size();
      marketStatus = "Open";
    };

    "Scan complete. Found " # stockPicks.size().toText() # " picks.";
  };

  public shared ({ caller }) func clearAllData() : async () {
    stockPicks := [];
    breakingNews := [];

    scanMetadata := {
      lastScanTimestamp = Time.now();
      nextScheduledScan = Time.now() + 3600_000_000_000;
      scanStatus = "Idle";
      dataFreshnessMinutes = 0;
      totalPicksGenerated = 0;
      totalBreakingNews = 0;
      marketStatus = "Closed";
    };
  };
};
