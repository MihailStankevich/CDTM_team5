import fs from "fs";
import path from "path";
import { CASES_DIR, FAMILY_SLUGS, LEGAL_PATH, type FamilySlug } from "./paths";
import type {
  ClientProfile,
  EventDrawdown,
  GoalHook,
  Holding,
  PersonaHooks,
  SectorWeight,
} from "./types";

interface LegalValues {
  SSWageBaseByYear?: { value?: Record<string, number> };
}

function monthsBetween(from: Date, to: Date): number {
  return (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
}

function parseSectors(raw: unknown): SectorWeight[] {
  if (!Array.isArray(raw) || raw.length < 2) return [];
  // First row is header
  return raw.slice(1).map((row) => {
    const r = row as unknown[];
    return {
      sector: String(r[0] ?? ""),
      weight: Number(r[1] ?? 0),
      severity: String(r[3] ?? ""),
      driver: String(r[4] ?? ""),
    };
  });
}

function parsePersona(md: string): PersonaHooks {
  const decisionMatch = md.match(/## D5: Decision-making style\s*\n\n([^\n]+)/i);
  const riskMatch = md.match(/D4a stated:\*\*\s*([^.]+)/i);
  const anchorMatch = md.match(/## D6: Motivational anchor\s*\n\n([^\n]+)/i);

  const concerns: string[] = [];
  for (const m of md.matchAll(/\*\*(O\d+[^*]*)\*\*/g)) {
    concerns.push(m[1].replace(/\s+/g, " ").trim());
  }

  const tensions: string[] = [];
  for (const m of md.matchAll(/\*\*(T\d+[^*]*)\*\*/g)) {
    tensions.push(m[1].replace(/\s+/g, " ").trim());
  }

  return {
    decisionStyle: decisionMatch?.[1]?.trim() ?? "Collaborator",
    riskOrientation: riskMatch?.[1]?.trim() ?? "Growth",
    concerns: concerns.slice(0, 8),
    tensions: tensions.slice(0, 5),
    motivationalAnchor: anchorMatch?.[1]?.trim() ?? "",
  };
}

function displayNameFromHousehold(
  household: { first_name: string; role: string }[],
  slug: string,
): string {
  const clients = household.filter((h) => h.role === "client" || h.role === "co-client");
  if (clients.length >= 2) {
    return `${clients[0].first_name} & ${clients[1].first_name}`;
  }
  if (clients.length === 1) return clients[0].first_name;
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function loadFamily(slug: FamilySlug, wageBase2027: number): ClientProfile {
  const dir = path.join(CASES_DIR, slug);
  const fh = JSON.parse(fs.readFileSync(path.join(dir, "financial-health.json"), "utf8"));
  const inv = JSON.parse(fs.readFileSync(path.join(dir, "investment-analysis.json"), "utf8"));
  const personaMd = fs.readFileSync(path.join(dir, "persona.md"), "utf8");

  const caseInfo = fh.case ?? inv.case;
  const household = caseInfo.household ?? [];
  const now = new Date("2026-11-21");

  const incomes = (fh.profile?.incomes ?? []) as {
    type: string;
    yearly: number;
    starts?: number;
    ends?: number;
  }[];
  const salaryTotal = incomes
    .filter((i) => i.type === "SALARY_AND_WAGES")
    .reduce((s, i) => s + (i.yearly ?? 0), 0);

  const childCount = household.filter(
    (h: { role: string }) => h.role === "child" || h.role === "dependent",
  ).length;

  const positions = (inv.positions ?? []) as {
    account: string;
    ticker: string;
    name: string;
    type: string;
    category: string;
    value: number;
  }[];

  const holdings: Holding[] = positions.map((p) => ({
    ticker: p.ticker || "",
    name: p.name,
    type: p.type,
    category: p.category,
    value: p.value ?? 0,
    account: p.account,
  }));

  const tickers = [
    ...new Set(holdings.map((h) => h.ticker).filter(Boolean)),
  ];

  const bondExposure = holdings.some(
    (h) =>
      /bond|tips|treasury|fixed/i.test(h.category) ||
      /bond|tips|jnk|lqd|schp/i.test(h.ticker) ||
      /bond|tips/i.test(h.name),
  );

  const equityValue = holdings
    .filter(
      (h) =>
        h.type === "ETF" ||
        h.type === "MUTUAL_FUND" ||
        /equity|stock|fund/i.test(h.category),
    )
    .reduce((s, h) => s + h.value, 0);

  const investableApprox = holdings.reduce((s, h) => s + h.value, 0);

  const sectors = parseSectors(
    inv.key_metrics?.concentrationAndDiversification?.sectorConcentration,
  );
  const tech = sectors.find((s) => /technology/i.test(s.sector));
  const techWeight = tech?.weight ?? 0;

  const chartGoals = (fh.goals?.chartGoals ?? []) as {
    date?: string;
    goalType?: string;
    name?: string;
  }[];

  const goals: GoalHook[] = chartGoals
    .filter((g) => g.date && g.goalType && g.goalType !== "BANKRUPTCY_ZEROCASH")
    .map((g) => {
      const d = new Date(g.date!);
      return {
        name: g.name ?? g.goalType ?? "Goal",
        goalType: g.goalType!,
        date: g.date!.slice(0, 10),
        monthsAway: monthsBetween(now, d),
      };
    });

  const rawDrawdowns =
    (inv.key_metrics?.performanceAnalysis?.perEventDrawdowns as {
      eventTitle: string;
      eventDate: string;
      household?: { drawdownPct?: number; recoveryDays?: number };
    }[]) ?? [];

  const drawdowns: EventDrawdown[] = rawDrawdowns.map((e) => ({
    eventTitle: e.eventTitle,
    eventDate: e.eventDate,
    drawdownPct: e.household?.drawdownPct ?? 0,
    recoveryDays: e.household?.recoveryDays,
  }));

  return {
    slug,
    displayName: displayNameFromHousehold(household, slug),
    city: caseInfo.city ?? "",
    state: caseInfo.state ?? "",
    taxFilingStatus: caseInfo.tax_filing_status ?? "",
    score: fh.score?.published_score ?? 0,
    members: household.map(
      (h: {
        first_name: string;
        age: number;
        role: string;
        risk_profile: string;
      }) => ({
        firstName: h.first_name,
        age: h.age,
        role: h.role,
        riskProfile: h.risk_profile,
      }),
    ),
    salaryTotal,
    childCount,
    investableApprox,
    holdings,
    tickers,
    bondExposure,
    equityValue: equityValue || investableApprox,
    sectors,
    techWeight,
    goals,
    drawdowns,
    persona: parsePersona(personaMd),
    aboveSsWageBase2027: salaryTotal > wageBase2027,
  };
}

let cached: ClientProfile[] | null = null;

export function loadAllProfiles(): ClientProfile[] {
  if (cached) return cached;

  let wageBase2027 = 192300;
  try {
    const legal = JSON.parse(fs.readFileSync(LEGAL_PATH, "utf8")) as LegalValues;
    wageBase2027 = legal.SSWageBaseByYear?.value?.["2027"] ?? wageBase2027;
  } catch {
    // keep default
  }

  cached = FAMILY_SLUGS.map((slug) => loadFamily(slug, wageBase2027));
  return cached;
}

export function getProfile(slug: string): ClientProfile | undefined {
  return loadAllProfiles().find((p) => p.slug === slug);
}
