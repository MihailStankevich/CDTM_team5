// Advisor priority model.
// Pure functions with no I/O, so the same code runs inside Next.js and under `node --test`.
// Every number used to rank, gate or schedule a task lives in CONFIG, with the reason for its value.

export type Severity = "CRITICAL" | "SIGNIFICANT" | "MODERATE" | "MINOR" | "INFO";
export type Topic =
  | "depletion"
  | "insurance"
  | "home"
  | "career"
  | "market"
  | "college"
  | "debt"
  | "tax"
  | "general";
export type Column = "needs_attention" | "new_opportunity";
export type Automation = "auto" | "confirm" | "in_person";
export type Band = "red" | "amber" | "month" | "recap";
export type Channel = "sms" | "email" | "call" | "meeting" | "recap";
export type DecisionStyle = "DUAL" | "COLLABORATOR" | "VALIDATOR" | "OTHER";
export type TaskKind = "message" | "request" | "question" | "alert" | "goal" | "concern" | "opportunity";
export type Range = "hoy" | "semana" | "mes";

/** What the model knows about one family. Built from the case files (see features.ts). */
export interface FamilyFeatures {
  slug: string;
  displayName: string;
  state: string;
  timeZone: string;
  adults: string[];
  /** Investments plus cash (performanceAnalysis.household.aum). Used as liquid wealth and as client value. */
  aum: number;
  decisionStyle: DecisionStyle;
  /** D6 motivational anchor: PROTECTION, FREEDOM, DUTY... */
  anchor: string;
  /** D4 MISALIGNED: stated risk differs from real exposure. */
  misaligned: boolean;
  /** SIMULATED: no contact history exists in the case data. */
  daysSinceContact: number;
  /** Beta(alpha, beta) belief that the client is fine with automatic messages. */
  aiAccept: { alpha: number; beta: number };
}

/** One thing that could land on the advisor's board. */
export interface TaskCandidate {
  id: string;
  slug: string;
  kind: TaskKind;
  column: Column;
  title: string;
  detail: string;
  topic: Topic;
  /** Dollars at stake for this family. null = unknown, the model then uses a neutral impact. */
  dollars: number | null;
  /** ISO date by which something must happen. */
  deadline: string | null;
  /** Market drop today, or the family is asking right now. */
  immediate: boolean;
  severity: Severity;
  /** Recommends moving money or buying a product: only the advisor can say that. */
  givesAdvice: boolean;
  /** Needs the 4-5 touches of a big decision (home, retirement date...). */
  bigDecision: boolean;
  /** Message quotes numbers about the family's own money. */
  personalNumbers: boolean;
  sources: string[];
  /** What the family asked for (a call or a meeting). Respected when the task goes to a person. */
  preferredChannel?: "call" | "meeting";
}

export interface Factors {
  impact: number;
  urgency: number;
  sensitivity: number;
  gravity: number;
  contact: number;
  value: number;
}

export interface PrioritizedTask extends TaskCandidate {
  factors: Factors;
  /** Points each factor adds to the score (weight x value x 100). They sum to the score. */
  contributions: Factors;
  score: number;
  band: Band;
  automation: Automation;
  automationReason: string;
  channel: Channel;
  recipients: string[];
  sendWindow: string;
  minutes: number;
  /** Score per advisor minute, used to order tasks inside a band (WSJF). */
  valuePerMinute: number;
  meeting: { durationMin: number; latestDate: string; ranges: Range[] } | null;
  /** Set when a lighter task is folded into a bigger conversation with the same family. */
  foldedInto: string | null;
  why: string[];
}

export interface FamilyCard {
  slug: string;
  displayName: string;
  score: number;
  band: Band;
  column: Column;
  tasks: PrioritizedTask[];
}

export const CONFIG = {
  /** Weights sum to 1 so the score is always 0-100. Impact and urgency lead: money and dates that cannot be undone. */
  weights: { impact: 0.3, urgency: 0.25, sensitivity: 0.15, gravity: 0.1, contact: 0.1, value: 0.1 },
  /** Impact saturates at 10% of liquid wealth: the size of a market correction, after that everything is "big". */
  impactCapShare: 0.1,
  /** Impact used when the dollars at stake are unknown (a call request, a question). Neutral, not zero. */
  impactUnknown: 0.5,
  /** Urgency steps follow how an advisor plans: week, month, two months (a 4-5 touch sequence), half year, year. */
  urgencySteps: [
    { maxDays: 7, value: 1 },
    { maxDays: 30, value: 0.9 },
    { maxDays: 60, value: 0.8 },
    { maxDays: 180, value: 0.5 },
    { maxDays: 365, value: 0.3 },
  ],
  urgencyFar: 0.1,
  /** Sensitivity by topic: losing savings, insurance and a home are life topics; a deduction is not. */
  topicSensitivity: {
    depletion: 1,
    insurance: 1,
    home: 1,
    career: 0.8,
    market: 0.8,
    college: 0.6,
    debt: 0.3,
    tax: 0.3,
    general: 0.3,
  } as Record<Topic, number>,
  /** Extra sensitivity when the topic hits the family's anchor (D6), or a drop hits a misaligned family (D4). */
  anchorBonus: 0.2,
  anchorTopics: {
    PROTECTION: ["insurance", "career"],
    DUTY: ["college", "insurance"],
    FREEDOM: ["depletion", "home"],
  } as Record<string, Topic[]>,
  /** Ordinal severity to equal steps. */
  severityValue: { CRITICAL: 1, SIGNIFICANT: 0.75, MODERATE: 0.5, MINOR: 0.25, INFO: 0.1 } as Record<Severity, number>,
  /** A quarter of silence is the usual review cycle; after that the relationship is at risk either way. */
  contactCapDays: 90,
  /** $500K is the EMERGING tier line in persona.md (D0). Capped so wealth never outranks a real problem. */
  valueCapAum: 500_000,
  /** Score bands. 80 needs impact + urgency + sensitivity together; under 40 a task lives off contact and value only. */
  bands: { red: 80, amber: 60, month: 40 },
  bandDays: { red: 2, amber: 7, month: 30, recap: 30 } as Record<Band, number>,
  /** Anything more delicate than a tax line (0.3) is seen by the advisor first. */
  confirmAboveSensitivity: 0.3,
  /** COLLABORATOR prior is Beta(3,2) = 0.6. One "talk to a human" drops it to 0.5 and automation stops. */
  minAiAcceptance: 0.6,
  /** Below 0.5% of liquid wealth (one ordinary day of market noise) a change goes to the recap, not its own message. */
  ownMessageShare: 0.005,
  /** Talk about a dated decision at least two weeks before it. */
  meetingLeadDays: 14,
  /** Advisor minutes per kind of work. Learned from real approval times later. */
  minutes: { auto: 0, sms: 1, email: 5, call: 15, meeting: 45, bigMeeting: 60, recap: 0 },
  /** TCPA allows commercial contact 8:00-21:00 local; 20:00 leaves margin. */
  sendHours: { from: 8, to: 20 },
};

const DAY = 86_400_000;
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const round1 = (x: number) => Math.round(x * 10) / 10;

export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((Date.parse(toIso.slice(0, 10)) - Date.parse(fromIso.slice(0, 10))) / DAY);
}
const addDays = (iso: string, days: number) => new Date(Date.parse(iso.slice(0, 10)) + days * DAY).toISOString().slice(0, 10);

export const acceptance = (f: FamilyFeatures) => f.aiAccept.alpha / (f.aiAccept.alpha + f.aiAccept.beta);

/** Bayesian update after an automatic message: read without asking for a person = success. */
export function updateAcceptance(prior: { alpha: number; beta: number }, askedForHuman: boolean) {
  return askedForHuman ? { ...prior, beta: prior.beta + 1 } : { ...prior, alpha: prior.alpha + 1 };
}

// ---------- Factors ----------

export function impactFactor(c: TaskCandidate, f: FamilyFeatures): number {
  if (c.dollars == null || f.aum <= 0) return CONFIG.impactUnknown;
  return clamp01(Math.abs(c.dollars) / f.aum / CONFIG.impactCapShare);
}

export function urgencyFactor(c: TaskCandidate, today: string): number {
  if (c.immediate) return 1;
  if (!c.deadline) return CONFIG.urgencyFar;
  const d = daysBetween(today, c.deadline);
  if (d <= 0) return 1;
  for (const s of CONFIG.urgencySteps) if (d <= s.maxDays) return s.value;
  return CONFIG.urgencyFar;
}

export function sensitivityFactor(c: TaskCandidate, f: FamilyFeatures): number {
  let s = CONFIG.topicSensitivity[c.topic];
  const anchorHit = (CONFIG.anchorTopics[f.anchor] ?? []).includes(c.topic);
  const misalignedDrop = c.topic === "market" && f.misaligned;
  if (anchorHit || misalignedDrop) s += CONFIG.anchorBonus;
  return clamp01(s);
}

export function computeFactors(c: TaskCandidate, f: FamilyFeatures, today: string): Factors {
  return {
    impact: impactFactor(c, f),
    urgency: urgencyFactor(c, today),
    sensitivity: sensitivityFactor(c, f),
    gravity: CONFIG.severityValue[c.severity],
    contact: clamp01(f.daysSinceContact / CONFIG.contactCapDays),
    value: clamp01(f.aum / CONFIG.valueCapAum),
  };
}

export function scoreOf(factors: Factors): { score: number; contributions: Factors } {
  const w = CONFIG.weights;
  const contributions = {
    impact: 100 * w.impact * factors.impact,
    urgency: 100 * w.urgency * factors.urgency,
    sensitivity: 100 * w.sensitivity * factors.sensitivity,
    gravity: 100 * w.gravity * factors.gravity,
    contact: 100 * w.contact * factors.contact,
    value: 100 * w.value * factors.value,
  };
  const score = Math.round(Object.values(contributions).reduce((a, b) => a + b, 0));
  const rounded = Object.fromEntries(Object.entries(contributions).map(([k, v]) => [k, round1(v)])) as unknown as Factors;
  return { score, contributions: rounded };
}

export function bandOf(score: number): Band {
  if (score >= CONFIG.bands.red) return "red";
  if (score >= CONFIG.bands.amber) return "amber";
  if (score >= CONFIG.bands.month) return "month";
  return "recap";
}

// ---------- Automation (rules, in order: first match wins) ----------

export function automationOf(c: TaskCandidate, f: FamilyFeatures, factors: Factors): { level: Automation; reason: string } {
  if (c.kind === "request") return { level: "in_person", reason: "The family asked for a person." };
  if (c.givesAdvice) return { level: "in_person", reason: "Recommends moving money or buying cover: the advisor signs that." };
  if (c.severity === "CRITICAL") return { level: "in_person", reason: "Critical concern in the plan." };
  if (c.bigDecision) return { level: "in_person", reason: "Big decision: needs a conversation, not a message." };
  if (c.personalNumbers) return { level: "confirm", reason: "Quotes numbers about their own money." };
  if (factors.sensitivity > CONFIG.confirmAboveSensitivity) return { level: "confirm", reason: "Topic more delicate than a tax line." };
  if (acceptance(f) < CONFIG.minAiAcceptance) return { level: "confirm", reason: `AI acceptance ${acceptance(f).toFixed(2)} is below ${CONFIG.minAiAcceptance}.` };
  return { level: "auto", reason: "Informative, nothing to do, low sensitivity." };
}

// ---------- Channel, recipients, timing, effort ----------

function channelOf(c: TaskCandidate, f: FamilyFeatures, level: Automation, band: Band, factors: Factors): Channel {
  if (level === "in_person" && c.preferredChannel) return c.preferredChannel;
  if (level === "in_person") return c.bigDecision || band === "red" || band === "amber" ? "meeting" : "call";
  const smallChange = c.dollars != null && Math.abs(c.dollars) < f.aum * CONFIG.ownMessageShare;
  if (band === "recap" || smallChange) return "recap";
  if (c.immediate && factors.sensitivity >= 0.6) return "sms";
  if (f.decisionStyle === "VALIDATOR" || c.personalNumbers) return "email";
  return "sms";
}

function minutesOf(level: Automation, channel: Channel, c: TaskCandidate): number {
  const m = CONFIG.minutes;
  if (channel === "meeting") return c.bigDecision ? m.bigMeeting : m.meeting;
  if (channel === "call") return m.call;
  if (level === "auto" || channel === "recap") return m.auto;
  return channel === "email" ? m.email : m.sms;
}

function sendWindowOf(c: TaskCandidate, f: FamilyFeatures, channel: Channel): string {
  const { from, to } = CONFIG.sendHours;
  const tz = f.timeZone;
  if (channel === "recap") return `Next monthly recap (${tz})`;
  if (channel === "meeting" || channel === "call") return `Slot in the family's hours, ${from}:00-${to}:00 ${tz}`;
  if (c.immediate && c.topic === "market") return `Today after the US close, before ${to}:00 ${tz}`;
  return `Next working day ${from + 1}:00-${to}:00 ${tz}`;
}

function meetingOf(c: TaskCandidate, band: Band, channel: Channel, minutes: number, today: string) {
  if (channel !== "meeting" && channel !== "call") return null;
  let latest = addDays(today, CONFIG.bandDays[band]);
  if (c.deadline) {
    const beforeDeadline = addDays(c.deadline, -CONFIG.meetingLeadDays);
    if (beforeDeadline < latest) latest = beforeDeadline < today ? addDays(today, 1) : beforeDeadline;
  }
  const ranges: Range[] = band === "red" ? ["hoy", "semana", "mes"] : band === "amber" ? ["semana", "mes"] : ["mes"];
  return { durationMin: minutes, latestDate: latest, ranges };
}

function whyOf(c: TaskCandidate, factors: Factors, contributions: Factors, f: FamilyFeatures, today: string): string[] {
  const parts: [number, string][] = [
    [contributions.impact, c.dollars == null ? "impact unknown, neutral 0.5" : `$${Math.round(Math.abs(c.dollars)).toLocaleString("en-US")} at stake, ${((100 * Math.abs(c.dollars)) / f.aum).toFixed(1)}% of liquid wealth`],
    [contributions.urgency, c.immediate ? "happening now" : c.deadline ? `${daysBetween(today, c.deadline)} days to ${c.deadline}` : "no deadline"],
    [contributions.sensitivity, `topic ${c.topic}${factors.sensitivity > CONFIG.topicSensitivity[c.topic] ? ` (touches ${f.misaligned && c.topic === "market" ? "a misaligned risk profile" : `the ${f.anchor} anchor`})` : ""}`],
    [contributions.gravity, `severity ${c.severity}`],
    [contributions.contact, `${f.daysSinceContact} days without contact`],
    [contributions.value, `$${Math.round(f.aum / 1000)}K under advice`],
  ];
  return parts.sort((a, b) => b[0] - a[0]).map(([pts, text]) => `+${pts.toFixed(1)} ${text}`);
}

// ---------- Main entry points ----------

export function prioritizeTask(c: TaskCandidate, f: FamilyFeatures, today: string): PrioritizedTask {
  const factors = computeFactors(c, f, today);
  const { score, contributions } = scoreOf(factors);
  const band = bandOf(score);
  const { level, reason } = automationOf(c, f, factors);
  const channel = channelOf(c, f, level, band, factors);
  const minutes = minutesOf(level, channel, c);
  return {
    ...c,
    factors,
    contributions,
    score,
    band,
    automation: level,
    automationReason: reason,
    channel,
    recipients: f.decisionStyle === "DUAL" || f.adults.length > 1 ? f.adults : f.adults.slice(0, 1),
    sendWindow: sendWindowOf(c, f, channel),
    minutes,
    valuePerMinute: round1(score / Math.max(1, minutes)),
    meeting: meetingOf(c, band, channel, minutes, today),
    foldedInto: null,
    why: whyOf(c, factors, contributions, f, today),
  };
}

const BAND_RANK: Record<Band, number> = { red: 0, amber: 1, month: 2, recap: 3 };

/** Within a band, most value per advisor minute first (WSJF). Effort never lowers the score itself. */
export function compareTasks(a: PrioritizedTask, b: PrioritizedTask): number {
  return BAND_RANK[a.band] - BAND_RANK[b.band] || b.valuePerMinute - a.valuePerMinute || b.score - a.score;
}

export function prioritize(candidates: TaskCandidate[], families: FamilyFeatures[], today: string) {
  const bySlug = new Map(families.map((f) => [f.slug, f]));
  const tasks = candidates
    .filter((c) => bySlug.has(c.slug))
    .map((c) => prioritizeTask(c, bySlug.get(c.slug)!, today));

  // One conversation per family: fold lighter messages into that family's top in-person task.
  for (const f of families) {
    const own = tasks.filter((t) => t.slug === f.slug).sort((a, b) => b.score - a.score);
    const anchor = own.find((t) => t.automation === "in_person" && (t.band === "red" || t.band === "amber"));
    if (!anchor) continue;
    for (const t of own) {
      if (t !== anchor && t.automation !== "in_person" && t.score >= CONFIG.bands.month) t.foldedInto = anchor.id;
    }
  }

  const cards: FamilyCard[] = families
    .map((f) => {
      const own = tasks.filter((t) => t.slug === f.slug).sort(compareTasks);
      const top = own.reduce<PrioritizedTask | null>((m, t) => (!m || t.score > m.score ? t : m), null);
      return {
        slug: f.slug,
        displayName: f.displayName,
        score: top?.score ?? 0,
        band: top?.band ?? "recap",
        column: top?.column ?? "needs_attention",
        tasks: own,
      };
    })
    .filter((c) => c.tasks.length)
    .sort((a, b) => b.score - a.score);

  const board = {
    needs_attention: tasks.filter((t) => t.column === "needs_attention").sort(compareTasks),
    new_opportunity: tasks.filter((t) => t.column === "new_opportunity").sort(compareTasks),
  };

  const approvalQueue = tasks
    .filter((t) => t.automation === "confirm" && !t.foldedInto && t.channel !== "recap")
    .sort(compareTasks);
  const autoSend = tasks.filter((t) => t.automation === "auto" && t.channel !== "recap");
  const recap = tasks.filter((t) => t.channel === "recap");

  return { tasks: [...tasks].sort(compareTasks), cards, board, approvalQueue, autoSend, recap };
}

// ---------- Agenda: greedy list scheduling by score ----------

export interface Booked {
  taskId: string;
  slug: string;
  date: string;
  time: string;
  durationMin: number;
  channel: Channel;
  score: number;
}

/**
 * Highest score first, each in-person task goes to the first free slot before its latest date.
 * `findSlot` is injected (the app passes lib/dayTasks.findSlot) so this stays pure and testable.
 * Formally this approximates min sum(score x lateness); greedy is near-optimal at ~30 tasks a day.
 */
export function scheduleByPriority(
  tasks: PrioritizedTask[],
  findSlot: (slug: string, range: Range, taken: { date: string; time: string }[]) => { date: string; time: string } | null,
  alreadyTaken: { date: string; time: string }[] = [],
) {
  const taken = [...alreadyTaken];
  const booked: Booked[] = [];
  const unscheduled: { taskId: string; slug: string; reason: string }[] = [];
  const seen = new Set<string>();
  const queue = tasks.filter((t) => t.meeting).sort((a, b) => b.score - a.score);
  for (const t of queue) {
    if (seen.has(t.slug)) continue; // one conversation per family; the rest go in its notes
    let slot: { date: string; time: string } | null = null;
    for (const r of t.meeting!.ranges) {
      const s = findSlot(t.slug, r, taken);
      if (s && s.date <= t.meeting!.latestDate) {
        slot = s;
        break;
      }
    }
    if (!slot) {
      unscheduled.push({ taskId: t.id, slug: t.slug, reason: `No free slot before ${t.meeting!.latestDate}` });
      continue;
    }
    seen.add(t.slug);
    taken.push(slot);
    booked.push({ taskId: t.id, slug: t.slug, ...slot, durationMin: t.meeting!.durationMin, channel: t.channel, score: t.score });
  }
  return { booked, unscheduled };
}
