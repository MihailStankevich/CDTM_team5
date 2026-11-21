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

  const blob = `${signal.headline} ${signal.what_happened}`.toLowerCase();
  const isEquity =
    signal.moment === "market" &&
    (signal.assetClasses.some((a) => /equit|stock/i.test(a)) ||
      /s&p|market|selloff|tariff|vix|nasdaq|equity/i.test(blob));
  const isTech =
    signal.sectors.some((s) => /technology/i.test(s)) ||
    /tech|nvidia|ai\b|deepseek|semiconductor|tariff/i.test(blob);
  const isRates =
    signal.assetClasses.some((a) => /treasury|rate/i.test(a)) ||
    /fed\b|rate cut|rate hike|interest rate/i.test(blob);
  const isTax = signal.moment === "rule" || /irs|tax|wage base|child tax|standard deduction/i.test(blob);
  const isOil = /oil|brent|iran|energy/i.test(blob);

  // Equity / market shock
  if (isEquity && profile.equityValue > 0) {
    score += 35;
    reasons.push("Equity exposure in plan");
    const dd = findDrawdown(profile, signal);
    if (dd) {
      const dollarHit = Math.abs(dd.drawdownPct) * profile.investableApprox;
      touches.push(
        `In a similar shock ("${dd.eventTitle}"), this portfolio fell ${pct(dd.drawdownPct)}${
          dd.recoveryDays ? ` and recovered in ${dd.recoveryDays} days` : ""
        }. On today's ~${money(profile.investableApprox)} invested book, that size move is about ${money(dollarHit)}.`,
      );
      where.push(
        "investment-analysis.json: key_metrics.performanceAnalysis.perEventDrawdowns",
      );
      score += Math.min(25, Math.round(Math.abs(dd.drawdownPct) * 200));
    } else {
      touches.push(
        `Investable assets are about ${money(profile.investableApprox)}; a broad equity move would touch this book.`,
      );
      where.push("investment-analysis.json: positions");
    }
  }

  // Tech / tariffs
  if (isTech && profile.techWeight >= TECH_THRESHOLD) {
    score += 25;
    reasons.push(`Technology ${pct(profile.techWeight)} of equity`);
    const tech = profile.sectors.find((s) => /technology/i.test(s.sector));
    touches.push(
      `Technology is ${(profile.techWeight * 100).toFixed(1)}% of equity holdings${
        tech?.driver ? ` (${tech.driver})` : ""
      } — elevated vs a 20% comfort band.`,
    );
    where.push(
      "investment-analysis.json: key_metrics.concentrationAndDiversification.sectorConcentration",
    );
  }

  // Rates / bonds / home buyers
  if (isRates) {
    if (profile.bondExposure) {
      score += 18;
      reasons.push("Bond / rate-sensitive holdings");
      const bondTickers = profile.tickers.filter((t) =>
        /JNK|LQD|SCHP|BND|TIP/i.test(t),
      );
      touches.push(
        `Rate-sensitive holdings include ${
          bondTickers.length ? bondTickers.join(", ") : "bond funds in the plan"
        }.`,
      );
      where.push("investment-analysis.json: positions");
    }
    const home = nearTermGoals(profile, 24).find((g) =>
      /home|REAL_ESTATE|Purchase a home/i.test(`${g.goalType} ${g.name}`),
    );
    if (home) {
      score += 20;
      reasons.push(`Near-term home goal (${home.date})`);
      touches.push(
        `${home.name} is planned for ${home.date} (${home.monthsAway} months away) — mortgage rates and investment draws for a down payment both matter.`,
      );
      where.push("financial-health.json: goals.chartGoals");
    }
  }

  // Tax / SSA rules
  if (isTax) {
    score += 20;
    reasons.push("Tax filing / payroll sensitivity");
    const filing =
      profile.taxFilingStatus === "SINGLE"
        ? "single"
        : profile.taxFilingStatus === "MARRIED_JOINTLY"
          ? "married filing jointly"
          : profile.taxFilingStatus;
    touches.push(
      `Filing status is ${filing}; salary income is about ${money(profile.salaryTotal)}/year.`,
    );
    if (profile.aboveSsWageBase2027) {
      touches.push(
        `Salary is above the 2027 Social Security wage base ($192,300), so the higher wage base raises payroll tax on the excess.`,
      );
      score += 10;
    } else {
      touches.push(
        `Salary is below the 2027 Social Security wage base ($192,300), so the wage-base increase does not raise payroll tax.`,
      );
    }
    if (profile.childCount > 0) {
      touches.push(
        `${profile.childCount} dependent(s) in the household — child tax credit indexing may apply.`,
      );
      score += 8;
    } else {
      touches.push("No children on the plan — child tax credit changes do not apply.");
    }
    where.push(
      "legal-values.json: SSWageBaseByYear, StandardDeductionByYear, ChildTaxCreditByYear",
      "financial-health.json: case.tax_filing_status, profile.incomes, case.household",
    );
  }

  // Oil / energy
  if (isOil && profile.equityValue > 0) {
    score += 12;
    reasons.push("Broad equity book in energy shock");
    const energy = profile.sectors.find((s) => /energy/i.test(s.sector));
    if (energy) {
      touches.push(
        `Energy is ${(energy.weight * 100).toFixed(1)}% of equity; oil spikes also move the broader book.`,
      );
    } else {
      touches.push("An energy/geopolitical shock typically hits the equity sleeve first.");
    }
  }

  // Goal proximity for college / life moments
  const college = nearTermGoals(profile, 36).filter((g) =>
    /COLLEGE|EDUCATION|college/i.test(`${g.goalType} ${g.name}`),
  );
  if (college.length && (isEquity || isTax || isRates)) {
    score += 10;
    reasons.push("College funding window");
    touches.push(
      `College-related goals: ${college.map((g) => `${g.name} (${g.date})`).join("; ")}.`,
    );
    where.push("financial-health.json: goals.chartGoals");
  }

  // Persona hooks
  if (score > 0 && profile.persona.concerns.length) {
    const relevant = profile.persona.concerns.find((c) =>
      /cash|home|retirement|employer|technolog|insurance|college/i.test(c),
    );
    if (relevant) {
      touches.push(`Persona concern still open: ${relevant}.`);
      where.push("persona.md: Objective concerns");
      score += 5;
    }
  }

  if (score < 15) return null;

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
  return profiles
    .map((p) => scoreFamilyAgainstSignal(p, signal))
    .filter((x): x is FamilyImpact => x !== null)
    .sort((a, b) => b.score - a.score);
}
