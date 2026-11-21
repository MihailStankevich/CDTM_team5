// Builds the model's inputs from the case files: one FamilyFeatures per family and the list of candidate tasks.
// Server only (reads files).
import fs from "fs";
import path from "path";
import { CASES_DIR, FAMILY_SLUGS } from "../paths";
import type { MessageDraft, NewsSignal } from "../types";
import { CLIENT_ALERTS, CLIENT_REQUESTS, type ClientRequest } from "@/data/client-requests";
import { LAST_CONTACT_DAYS, AI_HISTORY } from "@/data/client-contact";
import { daysBetween, type DecisionStyle, type FamilyFeatures, type Severity, type TaskCandidate, type Topic } from "./model";

const TIME_ZONES: Record<string, string> = {
  CO: "America/Denver",
  TX: "America/Chicago",
  FL: "America/New_York",
  CA: "America/Los_Angeles",
};

/** Starting belief about AI acceptance from the decision style (D5). Five pseudo-observations. */
const AI_PRIOR: Record<DecisionStyle, { alpha: number; beta: number }> = {
  VALIDATOR: { alpha: 2, beta: 3 },
  COLLABORATOR: { alpha: 3, beta: 2 },
  DUAL: { alpha: 3, beta: 2 },
  OTHER: { alpha: 2.5, beta: 2.5 },
};

export interface PersonaConcern {
  code: string;
  severity: Severity;
  title: string;
  text: string;
}

interface CaseFiles {
  fh: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  inv: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  persona: string;
}

function readCase(slug: string): CaseFiles {
  const dir = path.join(CASES_DIR, slug);
  return {
    fh: JSON.parse(fs.readFileSync(path.join(dir, "financial-health.json"), "utf8")),
    inv: JSON.parse(fs.readFileSync(path.join(dir, "investment-analysis.json"), "utf8")),
    persona: fs.readFileSync(path.join(dir, "persona.md"), "utf8"),
  };
}

/** The ```classification block at the end of persona.md is machine-readable: D0-D6 and concern severities. */
export function parseClassification(md: string) {
  const block = md.match(/```classification\s*\n([\s\S]*?)```/)?.[1] ?? "";
  const field = (key: string) => block.match(new RegExp(`^${key}:\\s*(.+)$`, "m"))?.[1]?.trim() ?? "";
  const severities = new Map<string, Severity>();
  for (const m of block.matchAll(/^-\s*(O\d+)\s+(CRITICAL|SIGNIFICANT|MODERATE|MINOR)/gm)) severities.set(m[1], m[2] as Severity);
  return { d4: field("D4"), d5: field("D5"), d6: field("D6"), severities };
}

/** Concern lines look like "- **O1: Retirement ... (CRITICAL).** text" or "- **O1 SIGNIFICANT: Retirement shortfall.** text". */
export function parseConcerns(md: string): PersonaConcern[] {
  const { severities } = parseClassification(md);
  const out: PersonaConcern[] = [];
  for (const m of md.matchAll(/^-\s*\*\*(O\d+)[\s:]+([^*]+)\*\*\s*(.*)$/gm)) {
    const code = m[1];
    const title = m[2]
      .replace(/\b(CRITICAL|SIGNIFICANT|MODERATE|MINOR)\b:?/g, "")
      .replace(/[().]+\s*$/g, "")
      .replace(/\(\s*\)/g, "")
      .replace(/^[\s:]+|[\s:.]+$/g, "");
    out.push({ code, severity: severities.get(code) ?? "MODERATE", title, text: m[3].trim() });
  }
  return out;
}

const STYLE = (d5: string): DecisionStyle =>
  (["DUAL", "COLLABORATOR", "VALIDATOR"].find((s) => d5.toUpperCase().startsWith(s)) as DecisionStyle) ?? "OTHER";

export function loadFamilyFeatures(): FamilyFeatures[] {
  return FAMILY_SLUGS.map((slug) => {
    const { fh, inv, persona } = readCase(slug);
    const household = (fh.case?.household ?? []) as { first_name: string; role: string }[];
    const adults = household.filter((h) => h.role === "client" || h.role === "co-client").map((h) => h.first_name);
    const cls = parseClassification(persona);
    const style = STYLE(cls.d5);
    const prior = AI_PRIOR[style];
    const hist = AI_HISTORY[slug] ?? { read: 0, askedForHuman: 0 };
    return {
      slug,
      displayName: adults.join(" & ") || slug,
      state: fh.case?.state ?? "",
      timeZone: TIME_ZONES[fh.case?.state] ?? "America/New_York",
      adults,
      aum: inv.key_metrics?.performanceAnalysis?.household?.aum ?? 0,
      decisionStyle: style,
      anchor: cls.d6.toUpperCase(),
      misaligned: cls.d4.toUpperCase() === "MISALIGNED",
      daysSinceContact: LAST_CONTACT_DAYS[slug] ?? 45,
      aiAccept: { alpha: prior.alpha + hist.read, beta: prior.beta + hist.askedForHuman },
    };
  });
}

// ---------- Candidate tasks ----------

const TOPIC_RULES: [RegExp, Topic][] = [
  [/run(s)? out|depletion|withdrawal|retire|jubil|401\(k\)|\bira\b/i, "depletion"],
  [/insur|cover|umbrella|seguro|disability/i, "insurance"],
  [/home|house|mortgage|casa|hipoteca|down payment/i, "home"],
  [/layoff|despido|job|trabajo|employer|promotion/i, "career"],
  [/college|529|universit|education/i, "college"],
  [/card|debt|loan|deuda|tarjeta|cash flow|cash reserve|emergency/i, "debt"],
  [/tax|deduction|credit|wage base|social security|impuesto/i, "tax"],
  [/nvidia|tech|stock|acciones|market|mercado|tariff|arancel|s&p|concentration|allocation|equity|growth/i, "market"],
];
export const topicOf = (text: string): Topic => TOPIC_RULES.find(([re]) => re.test(text))?.[1] ?? "general";

/** The plan's own loss estimate for a market event: "this mix fell 4.1% — about $13,836". Sleeve sizes are not losses. */
export const marketLoss = (lines: string[]): number | null => {
  for (const l of lines) {
    const m = l.match(/fell [\d.]+%[^$]*about \$([\d,]+)/i);
    if (m) return Number(m[1].replace(/,/g, ""));
  }
  return null;
};

/**
 * Extra tax next year from the published values (legal-values.json): Social Security on each salary,
 * plus the change in child tax credit after the phase-out. Positive = the family pays more.
 */
export function taxDeltaNextYear(c: CaseFiles, legal: any, year: number): number { // eslint-disable-line @typescript-eslint/no-explicit-any
  const y0 = String(year - 1);
  const y1 = String(year);
  const wb0 = legal?.SSWageBaseByYear?.[y0]?.value;
  const wb1 = legal?.SSWageBaseByYear?.[y1]?.value;
  const rate = legal?.FICATaxSS?.employedTaxRate?.value ?? 0.062;
  const salaries = ((c.fh.profile?.incomes ?? []) as { type: string; yearly: number }[])
    .filter((i) => i.type === "SALARY_AND_WAGES")
    .map((i) => i.yearly);
  let delta = 0;
  if (wb0 && wb1) for (const s of salaries) delta += rate * (Math.min(s, wb1) - Math.min(s, wb0));

  const ctc = (y: string) => legal?.ChildTaxCreditByYear?.[y]?.value;
  const c0 = ctc(y0);
  const c1 = ctc(y1);
  if (c0 && c1) {
    const filing = c.fh.case?.tax_filing_status === "MARRIED_JOINTLY" ? "MARRIED_JOINTLY" : "SINGLE";
    const income = salaries.reduce((a, b) => a + b, 0);
    const kids = ((c.fh.case?.household ?? []) as { role: string; age: number }[]).filter((h) => h.role === "child" && h.age < c1.childUnderAge).length;
    const credit = (v: { perChild: number; phaseOutStart: Record<string, number>; reductionPer1000: number }) =>
      Math.max(0, kids * v.perChild - v.reductionPer1000 * Math.ceil(Math.max(0, income - v.phaseOutStart[filing]) / 1000));
    delta -= credit(c1) - credit(c0);
  }
  return Math.round(delta);
}

const SEVERITY_FROM_SIGNAL: Record<NewsSignal["severity"], Severity> = { high: "SIGNIFICANT", medium: "MODERATE", low: "MINOR" };

/** Market and law drafts already produced by the ingest pipeline. */
function messageCandidates(signals: NewsSignal[], drafts: MessageDraft[], today: string, currentEventId?: string): TaskCandidate[] {
  const byId = new Map(signals.map((s) => [s.id, s]));
  // Only today's market event is "happening now". In the replay demo that is the chosen event (or the latest one);
  // older shocks stay on the board with low urgency.
  const market = signals.filter((s) => s.moment === "market").sort((a, b) => b.date.localeCompare(a.date));
  const nowId = currentEventId ?? market[0]?.id;
  const taxDelta = new Map<string, number>();
  for (const slug of FAMILY_SLUGS) {
    const c = readCase(slug);
    const legal = JSON.parse(fs.readFileSync(path.join(CASES_DIR, slug, "legal-values.json"), "utf8"));
    taxDelta.set(slug, taxDeltaNextYear(c, legal, Number(today.slice(0, 4)) + 1));
  }
  // Market shocks older than 30 days that are not today's event are history, not work: they stay out of the board.
  const stale = (d: MessageDraft) => {
    const s = byId.get(d.signalId);
    return !!s && s.moment === "market" && s.id !== nowId && daysBetween(s.date, today) > 30;
  };
  return drafts
    .filter((d) => (d.status === "pending" || d.status === "edited") && !stale(d))
    .map((d) => {
      const s = byId.get(d.signalId);
      const isRule = s?.moment === "rule";
      const isMarket = !s || s.moment === "market";
      const isNow = isMarket && (!s || s.id === nowId || Math.abs(daysBetween(s.date, today)) <= 3);
      const headlineTopic = topicOf(s?.headline ?? "");
      return {
        id: `draft:${d.id}`,
        slug: d.slug,
        kind: "message" as const,
        column: "needs_attention" as const,
        title: s?.headline ?? d.subject,
        detail: (d.touches ?? []).slice(0, 2).join(" "),
        topic: isRule ? "tax" : headlineTopic === "general" ? "market" : headlineTopic,
        dollars: isRule ? (taxDelta.get(d.slug) ?? null) : marketLoss(d.touches ?? []),
        // Law changes take effect on 1 January; market drops are treated as today's news in the demo replay.
        deadline: isRule ? `${Number(today.slice(0, 4)) + 1}-01-01` : null,
        immediate: isNow,
        severity: s ? SEVERITY_FROM_SIGNAL[s.severity] : "MODERATE",
        givesAdvice: false,
        bigDecision: false,
        personalNumbers: !isRule,
        sources: ["ingest pipeline", ...(s?.sources ?? [])],
      };
    });
}

function requestCandidates(requests: ClientRequest[]): TaskCandidate[] {
  return requests.map((r, i) => {
    const asksForPerson = r.kind === "llamada" || r.kind === "reunion";
    const isQuestion = r.kind === "chatbot";
    return {
      id: `request:${r.slug}:${i}`,
      slug: r.slug,
      kind: asksForPerson ? "request" : isQuestion ? "question" : "opportunity",
      column: r.kind === "consulta_plan" ? "new_opportunity" : "needs_attention",
      title: r.text,
      detail: `${r.kind} · ${r.when}`,
      topic: topicOf(r.text),
      dollars: null,
      deadline: null,
      immediate: r.kind !== "consulta_plan",
      severity: asksForPerson ? "SIGNIFICANT" : isQuestion ? "MODERATE" : "MINOR",
      givesAdvice: isQuestion && /should i|debería|sell|vender|buy|comprar/i.test(r.text),
      preferredChannel: r.kind === "reunion" ? "meeting" : r.kind === "llamada" || isQuestion ? "call" : undefined,
      bigDecision: false,
      personalNumbers: isQuestion,
      sources: ["data/client-requests.ts (simulated)"],
    } satisfies TaskCandidate;
  });
}

function alertCandidates(): TaskCandidate[] {
  return CLIENT_ALERTS.map((a, i) => ({
    id: `alert:${a.slug}:${i}`,
    slug: a.slug,
    kind: "alert",
    column: "needs_attention",
    title: a.reason,
    detail: "CRM / simulated signal",
    topic: topicOf(a.reason),
    dollars: null,
    deadline: null,
    immediate: false,
    severity: "MODERATE",
    givesAdvice: false,
    bigDecision: false,
    personalNumbers: false,
    sources: ["data/client-requests.ts CLIENT_ALERTS (simulated)"],
  }));
}

/** Dated goals in the next 24 months (persona.md transition-alert horizon). */
function goalCandidates(slug: string, c: CaseFiles, today: string): TaskCandidate[] {
  const horizon = new Date(Date.parse(today) + 730 * 86_400_000).toISOString().slice(0, 10);
  const needs = (c.inv.key_metrics?.cashNeeds?.shortTermGoalsNeeded ?? []) as { goal: string; amount: number; date: string }[];
  const goals = (c.fh.goals?.chartGoals ?? []) as { name?: string; goalType: string; date: string }[];
  return goals
    .filter((g) => g.name && g.goalType !== "VACATION" && !g.goalType.startsWith("BANKRUPTCY"))
    .filter((g) => g.date.slice(0, 10) >= today && g.date.slice(0, 10) <= horizon)
    .map((g) => {
      const need = needs.find((n) => n.goal === g.name);
      const isHome = g.goalType === "PURCHASE" && /home|house/i.test(g.name!);
      return {
        id: `goal:${slug}:${g.name}`,
        slug,
        kind: "goal" as const,
        column: "needs_attention" as const,
        title: `${g.name} on ${g.date.slice(0, 10)}`,
        detail: need ? `$${need.amount.toLocaleString("en-US")} needed` : "",
        topic: g.goalType === "COLLEGE" ? ("college" as const) : isHome ? ("home" as const) : topicOf(g.name!),
        dollars: need?.amount ?? null,
        deadline: g.date.slice(0, 10),
        immediate: false,
        severity: isHome ? ("SIGNIFICANT" as const) : ("MODERATE" as const),
        givesAdvice: false,
        bigDecision: isHome,
        personalNumbers: true,
        sources: ["financial-health.json: goals.chartGoals", "investment-analysis.json: cashNeeds"],
      };
    });
}

/** Critical and significant concerns from persona.md. Retirement-type ones are dated to 31 Dec (contribution deadline). */
function concernCandidates(slug: string, c: CaseFiles, today: string): TaskCandidate[] {
  const cap = c.inv.key_metrics?.capacity ?? {};
  const cash = c.inv.key_metrics?.cashNeeds ?? {};
  return parseConcerns(c.persona)
    .filter((k) => k.severity === "CRITICAL" || k.severity === "SIGNIFICANT")
    .map((k) => {
      const topic = topicOf(k.title);
      let dollars: number | null = null;
      if (topic === "depletion") dollars = cap.retirementGap || Math.max(0, -(cap.liquidAssetsAtEndOfPlan ?? 0)) || null;
      if (topic === "debt" && cash.accessibleCashGap) dollars = cash.accessibleCashGap;
      const yearEnd = /retire|401|ira|contribut|run(s)? out/i.test(`${k.title} ${k.text}`) ? `${today.slice(0, 4)}-12-31` : null;
      return {
        id: `concern:${slug}:${k.code}`,
        slug,
        kind: "concern" as const,
        column: "needs_attention" as const,
        title: `${k.code}: ${k.title}`,
        detail: k.text.slice(0, 220),
        topic,
        dollars,
        deadline: yearEnd,
        immediate: false,
        severity: k.severity,
        givesAdvice: true,
        bigDecision: false,
        personalNumbers: true,
        sources: [`persona.md ${k.code}`],
      };
    });
}

/** The plan's top moves are the "New opportunity" column: an invitation to talk, not advice by message. */
function opportunityCandidates(slug: string, c: CaseFiles): TaskCandidate[] {
  const moves = (c.fh.score?.top_moves ?? []) as { title: string; action: string; effort: string; score_before: number; score_after: number }[];
  const excess = c.inv.key_metrics?.cashNeeds?.accessibleCashExcess ?? null;
  return moves
    .filter((m) => m.score_after > m.score_before)
    .map((m, i) => {
      const topic = topicOf(`${m.title} ${m.action}`);
      return {
        id: `move:${slug}:${i}`,
        slug,
        kind: "opportunity" as const,
        column: "new_opportunity" as const,
        title: `${m.title} (score ${m.score_before} → ${m.score_after})`,
        detail: m.action,
        topic,
        dollars: topic === "debt" && excess ? excess : null,
        deadline: null,
        immediate: false,
        severity: m.score_after - m.score_before >= 10 ? ("SIGNIFICANT" as const) : ("MODERATE" as const),
        givesAdvice: false,
        bigDecision: false,
        personalNumbers: true,
        sources: ["financial-health.json: score.top_moves"],
      };
    });
}

/** 2027 tax line per person, even when today's headlines did not include the rule. $0 means no change. */
function taxCandidates(drafts: MessageDraft[], signals: NewsSignal[], today: string): TaskCandidate[] {
  const ruleIds = new Set(signals.filter((s) => s.moment === "rule").map((s) => s.id));
  const covered = new Set(drafts.filter((d) => ruleIds.has(d.signalId)).map((d) => d.slug));
  const year = Number(today.slice(0, 4)) + 1;
  const out: TaskCandidate[] = [];
  for (const slug of FAMILY_SLUGS) {
    if (covered.has(slug)) continue;
    const c = readCase(slug);
    const legal = JSON.parse(fs.readFileSync(path.join(CASES_DIR, slug, "legal-values.json"), "utf8"));
    const dollars = taxDeltaNextYear(c, legal, year);
    if (!dollars) continue;
    const more = dollars > 0;
    out.push({
      id: `tax:${slug}`,
      slug,
      kind: "message",
      column: "needs_attention",
      title: `2027 tax: ${more ? "pays" : "saves"} $${Math.abs(dollars).toLocaleString("en-US")}`,
      detail: "Social Security wage base per person, plus the child tax credit.",
      topic: "tax",
      dollars,
      deadline: `${year}-01-01`,
      immediate: false,
      severity: "INFO",
      givesAdvice: false,
      bigDecision: false,
      personalNumbers: false,
      sources: ["legal-values.json"],
    });
  }
  return out;
}

export function buildCandidates(signals: NewsSignal[], drafts: MessageDraft[], today: string, currentEventId?: string): TaskCandidate[] {
  const out: TaskCandidate[] = [
    ...messageCandidates(signals, drafts, today, currentEventId),
    ...taxCandidates(drafts, signals, today),
    ...requestCandidates(CLIENT_REQUESTS),
    ...alertCandidates(),
  ];
  for (const slug of FAMILY_SLUGS) {
    const c = readCase(slug);
    out.push(...goalCandidates(slug, c, today), ...concernCandidates(slug, c, today), ...opportunityCandidates(slug, c));
  }
  return out;
}
