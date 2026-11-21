import type { MomentType, NewsSignal, SignalGroup } from "../types";

const TECH_KEYWORDS =
  /tech|technology|nvidia|semiconductor|ai\b|deepseek|nasdaq|software|chip/i;
const TARIFF_KEYWORDS = /tariff|trade war|reciprocal|customs|import duty/i;
const RATE_KEYWORDS =
  /fed\b|federal reserve|rate cut|rate hike|interest rate|fomc|treasury yield/i;
const TAX_KEYWORDS =
  /irs\b|tax bracket|standard deduction|social security|wage base|child tax credit|payroll tax/i;
const EQUITY_KEYWORDS =
  /s&p|stock market|equities|selloff|sell-off|crash|drawdown|vix|bear market|rally/i;
const OIL_KEYWORDS = /oil|brent|crude|iran|geopolitic|energy shock/i;

export function classifyGroup(text: string, moment?: MomentType): SignalGroup {
  const headline = text.slice(0, 90);
  if (/fed\b|rate cut|rate hike|fomc|tips/i.test(headline)) return "rates";
  if (/iran|oil|brent|strike|geopolitic/i.test(headline)) return "geopolitics";
  if (/vix|selloff|sell-off/i.test(headline)) return "broad_market";
  if (/deepseek|nvidia|semiconductor/i.test(headline)) return "sector";
  if (moment === "rule" || /irs|wage base|supreme court|tariff/i.test(headline)) return "legislation";
  if (/fed\b|rate cut|rate hike/i.test(text)) return "rates";
  if (/iran|oil|brent|airstrike/i.test(text)) return "geopolitics";
  if (/wage base|child tax credit|supreme court/i.test(text)) return "legislation";
  if (/nvidia|semiconductor|deepseek/i.test(text)) return "sector";
  return "broad_market";
}

export function classifyMoment(text: string): MomentType {
  if (TAX_KEYWORDS.test(text)) return "rule";
  if (
    RATE_KEYWORDS.test(text) ||
    TARIFF_KEYWORDS.test(text) ||
    EQUITY_KEYWORDS.test(text) ||
    TECH_KEYWORDS.test(text) ||
    OIL_KEYWORDS.test(text)
  ) {
    return "market";
  }
  return "market";
}

export function extractEntities(text: string): string[] {
  const entities: string[] = [];
  const tickers = text.match(/\b[A-Z]{2,5}\b/g) ?? [];
  for (const t of tickers) {
    if (["US", "EU", "AI", "IRS", "SSA", "ETF", "FOMC"].includes(t)) continue;
    if (!entities.includes(t)) entities.push(t);
  }
  if (/nvidia/i.test(text) && !entities.includes("NVDA")) entities.push("NVDA");
  if (/s&p|spx/i.test(text) && !entities.includes("SPX")) entities.push("SPX");
  return entities.slice(0, 12);
}

export function extractSectors(text: string): string[] {
  const sectors: string[] = [];
  if (TECH_KEYWORDS.test(text) || TARIFF_KEYWORDS.test(text)) {
    sectors.push("Technology");
  }
  if (/bank|financial/i.test(text)) sectors.push("Financial Services");
  if (/health|pharma|biotech/i.test(text)) sectors.push("Healthcare");
  if (OIL_KEYWORDS.test(text) || /energy/i.test(text)) sectors.push("Energy");
  if (/retail|consumer/i.test(text)) sectors.push("Consumer Cyclical");
  if (/real estate|housing|mortgage/i.test(text)) sectors.push("Real Estate");
  return [...new Set(sectors)];
}

export function extractAssetClasses(text: string): string[] {
  const classes: string[] = [];
  if (EQUITY_KEYWORDS.test(text) || TECH_KEYWORDS.test(text) || TARIFF_KEYWORDS.test(text)) {
    classes.push("US equities");
  }
  if (RATE_KEYWORDS.test(text)) {
    classes.push("US Treasuries", "rate-sensitive sectors");
  }
  if (TARIFF_KEYWORDS.test(text)) {
    classes.push("international equities", "EM");
  }
  if (OIL_KEYWORDS.test(text)) classes.push("Crude oil");
  if (/bond|high yield|credit/i.test(text)) classes.push("bonds");
  return [...new Set(classes)];
}

export function inferSeverity(text: string, portfolioImpact?: string): NewsSignal["severity"] {
  if (/high|severe|worst|crash|10%|lost \$/i.test(text) || portfolioImpact === "Negative") {
    return "high";
  }
  if (/moderate|mixed|caution/i.test(text) || portfolioImpact === "Mixed") return "medium";
  return "medium";
}

export function enrichFromText(
  headline: string,
  body: string,
  partial: Partial<NewsSignal> & Pick<NewsSignal, "id" | "date" | "source">,
): NewsSignal {
  const blob = `${headline} ${body}`;
  return {
    id: partial.id,
    date: partial.date,
    source: partial.source,
    headline,
    what_happened: body,
    moment: partial.moment ?? classifyMoment(blob),
    group: partial.group ?? classifyGroup(blob, partial.moment ?? classifyMoment(blob)),
    entities: partial.entities ?? extractEntities(blob),
    sectors: partial.sectors ?? extractSectors(blob),
    assetClasses: partial.assetClasses ?? extractAssetClasses(blob),
    watchTickers: partial.watchTickers,
    severity: partial.severity ?? inferSeverity(blob),
    sources: partial.sources,
    eventTitle: partial.eventTitle,
  };
}
