import { pickDesk } from "./desk";
import { composeDraft, generateDraft, mapPool } from "./draft/generator";
import { matchSignalToFamilies } from "./match/scorer";
import { fetchRssSignals } from "./news/rss";
import { loadReplaySignals, loadRuleSignal } from "./news/replay";
import { loadAllProfiles } from "./profiles";
import type { ClientProfile, FamilyImpact, IngestResult, MessageDraft, NewsSignal } from "./types";

export type IngestMode = "replay" | "rss" | "both";

export async function runPipeline(mode: IngestMode = "replay"): Promise<IngestResult> {
  const profiles = loadAllProfiles();
  const signals: NewsSignal[] = [];

  // Past shocks written into the case files, plus the 2027 tax tables.
  if (mode === "replay" || mode === "both") {
    signals.push(...loadReplaySignals(8));
    signals.push(loadRuleSignal());
  }

  let feeds: { label: string; ok: boolean; count: number }[] = [];
  let liveRead = 0;
  if (mode === "rss" || mode === "both") {
    const rss = await fetchRssSignals(24);
    feeds = rss.feeds;
    liveRead = rss.signals.length;
    signals.push(...rss.signals);
  }

  // Deduplicate by headline
  const seen = new Set<string>();
  const unique: NewsSignal[] = [];
  for (const s of signals) {
    const key = s.headline.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(s);
  }

  return finish(unique, profiles, { mode, liveRead, feeds });
}

export async function rescoreSignals(signals: NewsSignal[]): Promise<IngestResult> {
  return finish(signals, loadAllProfiles(), { mode: "rss", liveRead: signals.length, feeds: [] });
}

async function finish(
  unique: NewsSignal[],
  profiles: ClientProfile[],
  origin: { mode: IngestMode; liveRead: number; feeds: { label: string; ok: boolean; count: number }[] },
): Promise<IngestResult> {
  const impactsBySignal: Record<string, FamilyImpact[]> = {};
  const drafts: MessageDraft[] = [];
  const allMatched: FamilyImpact[] = [];

  for (const signal of unique) {
    const matched = matchSignalToFamilies(signal, profiles);
    impactsBySignal[signal.id] = matched;
    allMatched.push(...matched);

    for (const impact of matched) {
      const profile = profiles.find((p) => p.slug === impact.slug)!;
      drafts.push(generateDraft(signal, impact, profile));
    }
  }

  drafts.sort((a, b) => b.impactScore - a.impactScore);

  // A live headline with no family match does not belong on the desk.
  const visible = unique.filter(
    (signal) => signal.source !== "rss" || (impactsBySignal[signal.id]?.length ?? 0) > 0,
  );
  const visibleDrafts = drafts.filter((draft) => visible.some((signal) => signal.id === draft.signalId));
  const liveKept = visible.filter((signal) => signal.source === "rss").length;

  return {
    signals: visible,
    matched: allMatched,
    drafts: visibleDrafts,
    meta: {
      mode: origin.mode,
      signalCount: visible.length,
      draftCount: visibleDrafts.length,
      generatedAt: new Date().toISOString(),
      liveRead: origin.liveRead,
      liveKept,
      feeds: origin.feeds,
    },
  };
}

/** The desk shows two decisions and five quiet notes. Only those are worth a model call. */
function onScreen(signals: NewsSignal[], drafts: MessageDraft[]): MessageDraft[] {
  const picked = pickDesk(signals, drafts);
  return [...picked.review, ...picked.auto].flatMap((row) => row.drafts);
}

/** Writes the notes on screen for each household. A failed call keeps the short paragraph from the card. */
export function polishOnScreen(
  signals: NewsSignal[],
  drafts: MessageDraft[],
  profiles: ClientProfile[],
): Promise<void> {
  const jobs = onScreen(signals, drafts)
    .map((draft) => {
      const signal = signals.find((s) => s.id === draft.signalId);
      const profile = profiles.find((p) => p.slug === draft.slug);
      return signal && profile ? { draft, signal, profile } : null;
    })
    .filter((job): job is { draft: MessageDraft; signal: NewsSignal; profile: ClientProfile } => job !== null);

  return mapPool(jobs, 4, async (job) => {
    const written = await composeDraft(job.draft, job.signal, job.profile);
    job.draft.subject = written.subject;
    job.draft.body = written.body;
  });
}

export function groupImpactsBySignal(
  signals: NewsSignal[],
  drafts: MessageDraft[],
): Record<string, FamilyImpact[]> {
  // Rebuild light impacts from drafts for UI grouping
  const map: Record<string, FamilyImpact[]> = {};
  for (const s of signals) {
    map[s.id] = drafts
      .filter((d) => d.signalId === s.id)
      .map((d) => ({
        slug: d.slug,
        displayName: d.displayName,
        score: d.impactScore,
        reasons: d.reasons,
        touches_this_family: d.touches,
        where_in_the_data: [],
      }));
  }
  return map;
}
