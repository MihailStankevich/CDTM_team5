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

  const blob = `${signal.headline} ${signal.what_happened}`.toLowerCase();
  const holds = (re: RegExp) => profile.tickers.some((t) => re.test(t));
  const tech = profile.sectors.find((s) => /technology/i.test(s.sector));
  const techIsSignificant = /significant/i.test(tech?.severity ?? "") || profile.techWeight >= 0.34;

  const isRates = signal.group === "rates" || /fed\b|rate cut|rate hike|fomc/i.test(signal.headline);
  const isTech =
    signal.group === "sector" || /deepseek|nvidia|semiconductor/i.test(signal.headline);
  const isTariff = /tariff|supreme court/i.test(signal.headline);
  const isOil = signal.group === "geopolitics" || /iran|oil|brent|airstrike/i.test(signal.headline);
  const isTax =
    signal.moment === "rule" ||
    /wage base|child tax credit|standard deduction/i.test(signal.headline);
  const isBroad = signal.group === "broad_market";

  if (isRates) {
    const bonds = profile.holdings.filter((h) => /SCHP|LQD/i.test(h.ticker));
    const home = nearTermGoals(profile, 18).find((g) => /home/i.test(g.name));
    if (!bonds.length && !home) return null;
    score += 40;
    if (bonds.length) {
      reasons.push(`Holds ${bonds.map((h) => h.ticker).join(", ")}`);
      touches.push(
        `Rate move hits ${bonds.map((h) => `${h.ticker} (${money(h.value)})`).join("; ")}, not the stock funds.`,
      );
    }
    if (home) {
      reasons.push(`Home purchase ${home.date}`);
      touches.push(`${home.name} is ${home.monthsAway} months away, so the mortgage rate is the point.`);
      score += 15;
    }
    where.push("investment-analysis.json: positions");
  } else if (isTech) {
    if (!techIsSignificant && !holds(/UPRO|FCNTX/)) return null;
    score += 40 + Math.round(profile.techWeight * 40);
    reasons.push(
      holds(/UPRO|FCNTX/)
        ? "Leveraged or active US equity"
        : `Technology ${pct(profile.techWeight)} of equity`,
    );
    touches.push(
      `Technology is ${(profile.techWeight * 100).toFixed(1)}% of equity${tech?.driver ? ` (${tech.driver})` : ""}.`,
    );
    where.push("investment-analysis.json: sectorConcentration");
  } else if (isTariff) {
    if (!holds(/VWO|VEA/) || profile.techWeight < TECH_THRESHOLD) return null;
    if (!techIsSignificant && !holds(/UPRO/)) return null;
    score += 35 + Math.round(profile.techWeight * 30);
    reasons.push("Emerging or foreign equity plus a heavy tech weight");
    touches.push(
      `Holds ${profile.tickers.filter((t) => /VWO|VEA|UPRO/.test(t)).join(", ")}. Technology is ${(profile.techWeight * 100).toFixed(1)}% of equity.`,
    );
    where.push("investment-analysis.json: positions");
  } else if (isOil) {
    const foreign = profile.holdings.filter((h) => /VEA|VWO/.test(h.ticker));
    if (!holds(/VEA/) && !techIsSignificant) return null;
    score += holds(/VEA/) ? 45 : 30;
    reasons.push(holds(/VEA/) ? "Holds VEA" : "High technology weight in a risk-off shock");
    if (foreign.length) {
      touches.push(
        `Foreign funds on the plan: ${foreign.map((h) => `${h.ticker} ${money(h.value)}`).join("; ")}.`,
      );
    }
    where.push("investment-analysis.json: positions");
  } else if (isTax) {
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
  } else if (isBroad && profile.equityValue > 0) {
    const dd = findDrawdown(profile, signal);
    const leveraged = holds(/UPRO/);
    score += (leveraged ? 50 : 15) + Math.round(Math.abs(dd?.drawdownPct ?? 0) * 200);
    reasons.push(leveraged ? "Holds UPRO" : "Equity book");
    if (dd) {
      touches.push(
        `In "${dd.eventTitle}" this mix fell ${pct(dd.drawdownPct)} — about ${money(Math.abs(dd.drawdownPct) * profile.investableApprox)} on ${money(profile.investableApprox)}.`,
      );
    }
    where.push("investment-analysis.json: perEventDrawdowns");
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

  // A plain index move is real for everyone with stocks. Show who is actually
  // different — leveraged, or the deeper drawdown — instead of listing the whole book.
  if (!signal.watchTickers?.length && signal.group === "broad_market" && hits.length > 2) {
    return hits.slice(0, 2);
  }
  return hits;
}
