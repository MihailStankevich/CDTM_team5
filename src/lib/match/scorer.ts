import type { ClientProfile, FamilyImpact, NewsSignal } from "../types";

const TECH_THRESHOLD = 0.28;

function money(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function pct(n: number): string {
  return `${(Math.abs(n) * 100).toFixed(1)}%`;
}

function findDrawdown(profile: ClientProfile, signal: NewsSignal) {
  if (signal.eventTitle) {
    const exact = profile.drawdowns.find((d) => d.eventTitle === signal.eventTitle);
    if (exact) return exact;
  }
  const blob = `${signal.headline} ${signal.what_happened}`.toLowerCase();
  return (
    profile.drawdowns.find((d) => blob.includes(d.eventTitle.toLowerCase().slice(0, 20))) ??
    profile.drawdowns.find((d) => {
      const words = d.eventTitle.toLowerCase().split(/\s+/).slice(0, 3);
      return words.every((w) => w.length < 3 || blob.includes(w));
    })
  );
}

type StoryKind = "rates" | "tech" | "tariff" | "oil" | "tax" | "broad";

/** A headline only counts when it is about a sleeve someone actually owns. */
function storyKind(signal: NewsSignal): StoryKind | null {
  const headline = signal.headline;
  const blob = `${headline} ${signal.what_happened}`;
  if (/bond yield|treasury|fed\b|rate cut|rate hike|fomc|interest rate/i.test(blob)) return "rates";
  if (/nvidia|semiconductor|deepseek|\bchips?\b/i.test(headline)) return "tech";
  if (/tariff|trade war|reciprocal/i.test(headline)) return "tariff";
  if (/\boil\b|brent|crude|iran|airstrike/i.test(headline)) return "oil";
  if (/wage base|child tax credit|standard deduction|social security wage/i.test(blob)) return "tax";
  if (/s&p|stock market|correction|sell-?off|dow jones|nasdaq composite|\bequities\b|\bvix\b/i.test(headline)) return "broad";
  if (signal.source === "rss" || signal.group === "other") return null;
  if (signal.group === "rates") return "rates";
  if (signal.group === "sector") return "tech";
  if (signal.group === "geopolitics") return "oil";
  if (signal.group === "legislation") return /tariff|supreme/i.test(headline) ? "tariff" : "tax";
  if (signal.group === "broad_market") return "broad";
  return null;
}

function nearTermGoals(profile: ClientProfile, withinMonths = 36) {
  return profile.goals.filter((g) => g.monthsAway >= 0 && g.monthsAway <= withinMonths);
}

export function scoreFamilyAgainstSignal(
  profile: ClientProfile,
  signal: NewsSignal,
): FamilyImpact | null {
  const reasons: string[] = [];
  const touches: string[] = [];
  const where: string[] = [];
  let score = 0;

  if (signal.watchTickers?.length) {
    const held = profile.holdings.filter(
      (h) => h.ticker && signal.watchTickers!.includes(h.ticker),
    );
    if (!held.length) return null;
    const value = held.reduce((sum, h) => sum + h.value, 0);
    const lines = held.map(
      (h) => `${h.ticker || h.name} · ${money(h.value)} in ${h.account}`,
    );
    return {
      slug: profile.slug,
      displayName: profile.displayName,
      score: 50 + Math.min(40, Math.round(value / 2500)),
      reasons: [
        `Holds ${[...new Set(held.map((h) => h.ticker).filter(Boolean))].join(", ")}`,
      ],
      touches_this_family: [
        `This is about a fund already on the plan: ${lines.join("; ")}.`,
        `About ${money(value)} of this household sits in that sleeve.`,
      ],
      where_in_the_data: ["investment-analysis.json: positions"],
    };
  }

  const kind = storyKind(signal);
  if (!kind) return null;

  const listed = (held: { ticker: string; name: string; value: number }[]) => {
    const totals = new Map<string, number>();
    for (const h of held) {
      const key = h.ticker || h.name;
      totals.set(key, (totals.get(key) ?? 0) + h.value);
    }
    return [...totals.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, value]) => `${name} ${money(value)}`)
      .join(", ");
  };
  const dollars = (held: { value: number }[]) => held.reduce((sum, h) => sum + h.value, 0);

  if (kind === "rates") {
    const bonds = profile.holdings.filter((h) =>
      /SCHP|LQD|JNK|BND|FSTDX|bond|tips/i.test(`${h.ticker} ${h.name} ${h.category}`),
    );
    const home = nearTermGoals(profile, 18).find((g) => /home|mortgage/i.test(g.name));
    const value = dollars(bonds);
    if (value < 8000 && !home) return null;
    score += Math.round(value / 1500) + (home ? 4 : 0);
    if (bonds.length) {
      reasons.push(`Bond sleeve ${money(value)}`);
      touches.push(
        `The bond sleeve is ${listed(bonds)}. A move in yields shows up here, not in the stock funds.`,
      );
    }
    if (home) {
      reasons.push(`Home purchase ${home.date}`);
      touches.push(`${home.name} is ${home.monthsAway} months away, so the mortgage rate is the point.`);
    }
    where.push("investment-analysis.json: positions");
  } else if (kind === "tech") {
    if (profile.techWeight < TECH_THRESHOLD) return null;
    const tech = profile.sectors.find((s) => /technology/i.test(s.sector));
    const equity = profile.holdings.filter((h) => /VTI|VUG|FCNTX|VWELX|SCHD/i.test(h.ticker));
    score += 25 + Math.round(profile.techWeight * 80);
    reasons.push(`Technology ${pct(profile.techWeight)} of equity`);
    touches.push(
      `Technology is ${(profile.techWeight * 100).toFixed(1)}% of equity${tech?.driver ? ` (${tech.driver})` : ""}. The stock funds carrying that are ${listed(equity) || "the equity mix"}.`,
    );
    where.push("investment-analysis.json: sectorConcentration");
  } else if (kind === "tariff" || kind === "oil") {
    const foreign = profile.holdings.filter((h) => /VEA|VWO/i.test(h.ticker));
    const value = dollars(foreign);
    if (value < 8000) return null;
    score += Math.round(value / 1200);
    reasons.push(`International equity ${money(value)}`);
    touches.push(
      kind === "oil"
        ? `Foreign funds on the plan: ${listed(foreign)}. An oil shock hits this sleeve, not a leveraged US fund.`
        : `Foreign funds on the plan: ${listed(foreign)}. Tariffs land on this international sleeve.`,
    );
    where.push("investment-analysis.json: positions");
  } else if (kind === "tax") {
    const material = profile.aboveSsWageBase2027 || profile.childCount > 0;
    if (!material) return null;
    score += 25;
    if (profile.aboveSsWageBase2027) {
      score += 20;
      reasons.push("Salary above the 2027 wage base");
      touches.push(
        `Salary is about ${money(profile.salaryTotal)}, above the $192,300 Social Security wage base, so payroll tax goes up.`,
      );
    }
    if (profile.childCount > 0) {
      score += 10;
      reasons.push(`${profile.childCount} children`);
      touches.push(`Child tax credit indexing can apply — ${profile.childCount} dependent(s) on the plan.`);
    }
    where.push("legal-values.json, financial-health.json: incomes, household");
  } else if (kind === "broad") {
    const equity = profile.holdings.filter((h) => /VTI|VOO|SPY|UPRO|FCNTX|VWELX|SCHD|FIGSX/i.test(h.ticker));
    const value = dollars(equity);
    if (value < 20000) return null;
    const upro = equity.find((h) => /UPRO/i.test(h.ticker));
    const effective = equity.reduce((sum, h) => sum + h.value * (/UPRO/i.test(h.ticker) ? 3 : 1), 0);
    score += Math.min(80, 15 + Math.round(effective / 4000));
    const dd = findDrawdown(profile, signal);
    reasons.push(`US equity ${money(value)}`);
    const lever = upro ? `, including ${money(upro.value)} in UPRO, which moves about 3x the index on the day` : "";
    touches.push(
      `US stock funds: ${listed(equity)}. An index move lands on this ${money(value)} sleeve${lever}.`,
    );
    if (dd) {
      touches.push(
        `In "${dd.eventTitle}" this mix fell ${pct(dd.drawdownPct)} — about ${money(Math.abs(dd.drawdownPct) * profile.investableApprox)} on ${money(profile.investableApprox)}.`,
      );
    }
    where.push("investment-analysis.json: positions");
  }

  if (score < 25) return null;

  // Deduplicate touches / where
  const uniqueTouches = [...new Set(touches)];
  const uniqueWhere = [...new Set(where)];
  const uniqueReasons = [...new Set(reasons)];

  return {
    slug: profile.slug,
    displayName: profile.displayName,
    score,
    reasons: uniqueReasons,
    touches_this_family: uniqueTouches,
    where_in_the_data: uniqueWhere,
  };
}

export function matchSignalToFamilies(
  signal: NewsSignal,
  profiles: ClientProfile[],
): FamilyImpact[] {
  const hits = profiles
    .map((p) => scoreFamilyAgainstSignal(p, signal))
    .filter((x): x is FamilyImpact => x !== null)
    .sort((a, b) => b.score - a.score);

  if (signal.watchTickers?.length || hits.length < 2) return hits;
  const lead = hits[0];
  const indexMove = lead.touches_this_family[0]?.startsWith("US stock funds");
  if (indexMove) {
    const levered = hits.find((h) => /UPRO/.test(h.touches_this_family[0] ?? ""));
    if (levered && levered !== lead) return [lead, levered];
  }
  const buyer = hits.find((h) => h.reasons.some((r) => r.startsWith("Home purchase")));
  if (buyer && buyer !== lead) return [lead, buyer];
  return hits.slice(0, 2);
}
