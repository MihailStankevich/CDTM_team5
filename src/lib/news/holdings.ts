import type { ClientProfile, NewsSignal } from "../types";
import { enrichFromText } from "./enrich";

interface DeskItem {
  id: string;
  tickers: string[];
  group: NewsSignal["group"];
  moment: NewsSignal["moment"];
  sectors: string[];
  headline: string;
  what: string;
}

const DESK: DeskItem[] = [
  {
    id: "book-lqd",
    tickers: ["LQD"],
    group: "rates",
    moment: "market",
    sectors: [],
    headline: "Investment-grade bonds (LQD) move with long-term yields",
    what: "LQD is investment-grade corporate credit. Only households that actually hold it are listed — a stock-only plan is not this story.",
  },
  {
    id: "book-schp",
    tickers: ["SCHP"],
    group: "rates",
    moment: "market",
    sectors: [],
    headline: "TIPS (SCHP) reprice when real yields move",
    what: "SCHP is inflation-protected Treasuries. Households without SCHP are left off, even if they own other bond funds.",
  },
  {
    id: "book-vea",
    tickers: ["VEA"],
    group: "geopolitics",
    moment: "market",
    sectors: [],
    headline: "Developed markets outside the US (VEA)",
    what: "VEA is Europe, Japan and other developed markets. A dollar spike shows up here and not in a US-only fund.",
  },
  {
    id: "book-upro",
    tickers: ["UPRO"],
    group: "broad_market",
    moment: "market",
    sectors: ["Technology"],
    headline: "Leveraged US equity (UPRO) triples the index day",
    what: "UPRO targets 3x the daily S&P 500 move. A plain VTI holding is a different risk and is not listed on this card.",
  },
];

function holders(profiles: ClientProfile[], tickers: string[]) {
  if (!tickers.length) return profiles;
  return profiles.filter((p) => p.tickers.some((t) => tickers.includes(t)));
}

/** One card per sleeve that actually appears in a family's positions. */
export function loadHoldingSignals(profiles: ClientProfile[]): NewsSignal[] {
  const out: NewsSignal[] = [];
  for (const item of DESK) {
    const who = holders(profiles, item.tickers);
    if (item.tickers.length && who.length === 0) continue;
    const names = who.map((p) => p.displayName).join(", ");
    const bookNote = item.tickers.length
      ? ` On the book today: ${item.tickers.join(", ")} — held by ${names}.`
      : ` Checked against every household's filing status, salary and children.`;
    out.push(
      enrichFromText(item.headline, item.what + bookNote, {
        id: item.id,
        date: "2026-11-21",
        source: "book",
        moment: item.moment,
        group: item.group,
        sectors: item.sectors,
        watchTickers: item.tickers.length ? item.tickers : undefined,
        entities: item.tickers,
        severity: item.id === "book-upro" ? "high" : "medium",
        sources: ["Positions in investment-analysis.json"],
      }),
    );
  }
  return out;
}
