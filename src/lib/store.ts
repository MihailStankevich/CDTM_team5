import type { AdvisorStore, DraftStatus, MessageDraft } from "./types";
import { groupImpactsBySignal, polishOnScreen, rescoreSignals, runPipeline, type IngestMode } from "./pipeline";
import { loadAllProfiles } from "./profiles";

declare global {
  // eslint-disable-next-line no-var
  var __advisorStore: AdvisorStore | undefined;
}

function emptyStore(): AdvisorStore {
  return {
    signals: [],
    drafts: [],
    impactsBySignal: {},
    meta: null,
  };
}

export function getStore(): AdvisorStore {
  if (!globalThis.__advisorStore) {
    globalThis.__advisorStore = emptyStore();
  }
  return globalThis.__advisorStore;
}

let filling: Promise<AdvisorStore> | null = null;
const polishing = new WeakMap<AdvisorStore, Promise<void>>();

/** The notes on screen are written for that household before anyone sees them. */
function withPersonalNotes(store: AdvisorStore): Promise<AdvisorStore> {
  let job = polishing.get(store);
  if (!job) {
    job = polishOnScreen(store.signals, store.drafts, loadAllProfiles()).catch(() => undefined);
    polishing.set(store, job);
  }
  return job.then(() => store);
}

/**
 * A fresh Vercel instance has an empty desk. Load live headlines once, and
 * fall back to the past shocks if every feed fails.
 */
export function ensureStore(): Promise<AdvisorStore> {
  const current = getStore();
  if (current.signals.length > 0) return withPersonalNotes(current);
  if (!filling) {
    filling = fillColdStore().finally(() => {
      filling = null;
    });
  }
  return filling;
}

async function fillColdStore(): Promise<AdvisorStore> {
  try {
    const live = await ingest("rss");
    if (live.signals.length > 0) return live;
  } catch {
    // Feeds or case files failed; the historical shocks still open the desk.
  }
  return ingest("replay");
}

export async function ingest(mode: IngestMode = "replay"): Promise<AdvisorStore> {
  const result = await runPipeline(mode);
  const store: AdvisorStore = {
    signals: result.signals,
    drafts: result.drafts,
    impactsBySignal: groupImpactsBySignal(result.signals, result.drafts),
    meta: result.meta,
  };
  globalThis.__advisorStore = store;
  return withPersonalNotes(store);
}

/** Re-match the headlines already on the desk. Drops stories that touch no one's book. */
export async function rescore(): Promise<AdvisorStore> {
  const current = getStore();
  if (!current.signals.length) return ingest("replay");
  const result = await rescoreSignals(current.signals);
  const store: AdvisorStore = {
    signals: result.signals,
    drafts: result.drafts,
    impactsBySignal: groupImpactsBySignal(result.signals, result.drafts),
    meta: result.meta,
  };
  globalThis.__advisorStore = store;
  return withPersonalNotes(store);
}

export function updateDraft(
  id: string,
  patch: Partial<Pick<MessageDraft, "body" | "subject" | "status">>,
): MessageDraft | null {
  const store = getStore();
  const idx = store.drafts.findIndex((d) => d.id === id);
  if (idx < 0) return null;
  const next = { ...store.drafts[idx], ...patch };
  if (
    (patch.body !== undefined || patch.subject !== undefined) &&
    patch.status === undefined
  ) {
    next.status = "edited";
  }
  store.drafts[idx] = next;
  return next;
}

export function setDraftStatus(id: string, status: DraftStatus): MessageDraft | null {
  return updateDraft(id, { status });
}

export function approveAllForSignal(signalId: string): number {
  const store = getStore();
  let n = 0;
  store.drafts = store.drafts.map((d) => {
    if (d.signalId === signalId && (d.status === "pending" || d.status === "edited")) {
      n += 1;
      return { ...d, status: "approved" as const };
    }
    return d;
  });
  return n;
}
