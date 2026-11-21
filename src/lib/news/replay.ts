import fs from "fs";
import path from "path";
import { CASES_DIR, FAMILY_SLUGS } from "../paths";
import type { NewsSignal, SignalGroup } from "../types";
import { enrichFromText, inferSeverity } from "./enrich";

interface AnalysisEvent {
  name: string;
  description: string;
  dateLabel: string;
  startDate: string;
  type: string;
  severity: string;
  portfolioImpact: string;
  assetClassesAffected: string[];
  impactDirection: string;
}

function groupForEvent(name: string, type: string): SignalGroup {
  if (/fed|rate/i.test(name) || /fed/i.test(type)) return "rates";
  if (/iran|oil|fury|geopolit/i.test(name) || /geopolit/i.test(type)) return "geopolitics";
  if (/deepseek|nvidia|tech|semi/i.test(name) || /tech/i.test(type)) return "sector";
  if (/tariff|supreme|tax/i.test(name)) return "legislation";
  return "broad_market";
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

/** Deduplicate historical market events across families into demo "today" signals. */
export function loadReplaySignals(limit = 6): NewsSignal[] {
  const byName = new Map<string, AnalysisEvent>();

  for (const slug of FAMILY_SLUGS) {
    const invPath = path.join(CASES_DIR, slug, "investment-analysis.json");
    const inv = JSON.parse(fs.readFileSync(invPath, "utf8"));
    const events = (inv.analysis?.events ?? []) as AnalysisEvent[];
    for (const e of events) {
      if (!byName.has(e.name)) byName.set(e.name, e);
    }
  }

  // Prefer high-impact / memorable demo events first
  const preferred = [
    "Liberation Day tariffs announced",
    "DeepSeek AI shock",
    "Global selloff — VIX spikes above 60",
    "Fed first rate cut — 50bp",
    "Fed final hike to 5.25–5.50%",
    "Operation Epic Fury — US-Israel strikes on Iran",
    "Trump election win",
    "Supreme Court strikes down Liberation Day tariffs",
  ];

  const ordered: AnalysisEvent[] = [];
  for (const name of preferred) {
    const e = byName.get(name);
    if (e) ordered.push(e);
  }
  for (const e of byName.values()) {
    if (!ordered.find((o) => o.name === e.name)) ordered.push(e);
  }

  return ordered.slice(0, limit).map((e) => {
    const severity =
      e.severity?.toLowerCase() === "high"
        ? "high"
        : inferSeverity(e.description, e.portfolioImpact);

    return enrichFromText(e.name, e.description, {
      id: `replay-${slugify(e.name)}`,
      date: e.dateLabel || e.startDate,
      source: "replay",
      moment: "market",
      group: groupForEvent(e.name, e.type),
      assetClasses: e.assetClassesAffected ?? [],
      severity: severity as NewsSignal["severity"],
      eventTitle: e.name,
      sources: [`Historical event in investment-analysis.json (${e.type})`],
    });
  });
}

/** Synthetic rule signal from 2027 tax values (mirrors signals.json examples). */
export function loadRuleSignal(): NewsSignal {
  return enrichFromText(
    "2027 tax values published: standard deduction, brackets, child tax credit, Social Security wage base",
    "The IRS published the 2027 inflation adjustments: standard deduction $16,600 single and $33,200 married filing jointly (from $16,100 and $32,200), brackets indexed, child tax credit $2,300 per child (from $2,200). The Social Security wage base rises to $192,300 for 2027 (from $184,500). They apply from 1 January 2027.",
    {
      id: "rule-2027-tax-values",
      date: "2026-11-05",
      source: "rule",
      moment: "rule",
      severity: "medium",
      sectors: [],
      assetClasses: [],
      entities: ["IRS", "SSA"],
      sources: [
        "https://www.irs.gov/newsroom/irs-releases-tax-inflation-adjustments-for-tax-year-2027-taxpayers-continue-to-benefit-from-the-working-families-tax-cuts",
        "https://www.ssa.gov/oact/cola/cbb.html",
      ],
    },
  );
}
