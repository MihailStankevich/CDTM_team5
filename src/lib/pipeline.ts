import { generateDraft, maybePolishWithLlm } from "./draft/generator";
import { matchSignalToFamilies } from "./match/scorer";
import { fetchRssSignals } from "./news/rss";
import { loadHoldingSignals } from "./news/holdings";
import { loadReplaySignals, loadRuleSignal } from "./news/replay";
import { loadAllProfiles } from "./profiles";
import type { FamilyImpact, IngestResult, MessageDraft, NewsSignal } from "./types";

export type IngestMode = "replay" | "rss" | "both";

export async function runPipeline(mode: IngestMode = "rss"): Promise<IngestResult> {
  const profiles = loadAllProfiles();
  const signals: NewsSignal[] = [];

  // The book and the published 2027 tax tables are always on the desk.
  signals.push(...loadHoldingSignals(profiles));
  signals.push(loadRuleSignal());

  // Past shocks already written into the case files. Not today's news.
  if (mode === "replay" || mode === "both") {
    signals.push(...loadReplaySignals(8));
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

  const impactsBySignal: Record<string, FamilyImpact[]> = {};
  const drafts: MessageDraft[] = [];
  const allMatched: FamilyImpact[] = [];

  for (const signal of unique) {
    const matched = matchSignalToFamilies(signal, profiles);
    impactsBySignal[signal.id] = matched;
    allMatched.push(...matched);

    for (const impact of matched) {
      const profile = profiles.find((p) => p.slug === impact.slug)!;
      let draft = generateDraft(signal, impact, profile);
      draft = await maybePolishWithLlm(draft, signal);
      drafts.push(draft);
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
      mode,
      signalCount: visible.length,
      draftCount: visibleDrafts.length,
      generatedAt: new Date().toISOString(),
      liveRead,
      liveKept,
      feeds,
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
