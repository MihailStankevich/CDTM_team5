import type { MessageDraft, NewsSignal } from "./types";

/**
 * How heavy the story is, apart from how large the portfolio is.
 * 3 = a shock. 2 = something the advisor should see. 0–1 = it can go out on its own.
 */
export function storyWeight(signal: NewsSignal): number {
  const headline = signal.headline;
  if (signal.moment === "rule" || signal.source === "rule") return 3;
  if (signal.source === "replay" && signal.severity === "high") return 3;
  if (/crash|meltdown|bear market|financial crisis|bankrupt|default|invasion|\bwar\b|embargo/i.test(headline)) return 3;
  if (/\bSEC\b|S\.E\.C|probe|fraud|indict/i.test(headline)) return 2;
  if (/plung|safe haven|flee to|turmoil|rate hike|emergency cut|surprise hike/i.test(headline)) return 2;
  const percents = [...headline.matchAll(/(\d{1,3})\s*%/g)].map((match) => Number(match[1]));
  const falling = /down|drop|fall|plunge|sell-?off|correction|lost/i.test(headline);
  if (falling && percents.some((n) => n >= 20)) return 2;
  if (/not that unusual|history says|history suggests|five forces|ways to|should you|current price|straight week|no longer|handshake/i.test(headline)) {
    return 0;
  }
  return 1;
}

export interface DeskRow {
  s: NewsSignal;
  drafts: MessageDraft[];
}

const peak = (drafts: MessageDraft[]) => drafts.reduce((max, draft) => Math.max(max, draft.impactScore), 0);

/** Two heavy stories stay for the advisor. Everything else can be sent on its own, loudest books first. */
export function pickDesk(signals: NewsSignal[], drafts: MessageDraft[]) {
  const rows: DeskRow[] = signals
    .map((signal) => ({ s: signal, drafts: drafts.filter((draft) => draft.signalId === signal.id) }))
    .filter((row) => row.drafts.length > 0);

  const byStory = (a: DeskRow, b: DeskRow) =>
    storyWeight(b.s) - storyWeight(a.s) || peak(b.drafts) - peak(a.drafts) || a.s.id.localeCompare(b.s.id);
  const byImpact = (a: DeskRow, b: DeskRow) => peak(b.drafts) - peak(a.drafts) || a.s.id.localeCompare(b.s.id);

  const heavy = rows.filter((row) => storyWeight(row.s) >= 2 && peak(row.drafts) >= 25).sort(byStory);
  const review = heavy.slice(0, 2);
  const taken = new Set(review.map((row) => row.s.id));
  const auto = rows.filter((row) => !taken.has(row.s.id)).sort(byImpact).slice(0, 5);
  return { review, auto };
}
