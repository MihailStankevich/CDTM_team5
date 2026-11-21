import { generateDraft, maybePolishWithLlm } from "./draft/generator";
import { matchSignalToFamilies } from "./match/scorer";
import { fetchRssSignals } from "./news/rss";
import { loadReplaySignals, loadRuleSignal } from "./news/replay";
import { loadAllProfiles } from "./profiles";
import type { FamilyImpact, IngestResult, MessageDraft, NewsSignal } from "./types";

export type IngestMode = "replay" | "rss" | "both";

export async function runPipeline(mode: IngestMode = "replay"): Promise<IngestResult> {
  const profiles = loadAllProfiles();
  const signals: NewsSignal[] = [];

  if (mode === "replay" || mode === "both") {
    signals.push(...loadReplaySignals(6));
    signals.push(loadRuleSignal());
  }

  if (mode === "rss" || mode === "both") {
    const rss = await fetchRssSignals(8);
    signals.push(...rss);
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

  // Sort drafts: highest impact first
  drafts.sort((a, b) => b.impactScore - a.impactScore);

  return {
    signals: unique,
    matched: allMatched,
    drafts,
    meta: {
      mode,
      signalCount: unique.length,
      draftCount: drafts.length,
      generatedAt: new Date().toISOString(),
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
