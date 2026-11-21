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

  const pending: { signal: NewsSignal; profile: ClientProfile; draft: MessageDraft }[] = [];

  for (const signal of unique) {
    const matched = matchSignalToFamilies(signal, profiles);
    impactsBySignal[signal.id] = matched;
    allMatched.push(...matched);

    for (const impact of matched) {
      const profile = profiles.find((p) => p.slug === impact.slug)!;
      const draft = generateDraft(signal, impact, profile);
      drafts.push(draft);
      pending.push({ signal, profile, draft });
    }
  }

  const toWrite = [...pending].sort((a, b) => b.draft.impactScore - a.draft.impactScore).slice(0, 6);
  await mapPool(toWrite, 4, async (job) => {
    const written = await composeDraft(job.draft, job.signal, job.profile);
    job.draft.subject = written.subject;
    job.draft.body = written.body;
  });

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
