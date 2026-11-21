import type { AdvisorStore, DraftStatus, MessageDraft } from "./types";
import { groupImpactsBySignal, runPipeline, type IngestMode } from "./pipeline";

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

export async function ingest(mode: IngestMode = "replay"): Promise<AdvisorStore> {
  const result = await runPipeline(mode);
  const store: AdvisorStore = {
    signals: result.signals,
    drafts: result.drafts,
    impactsBySignal: groupImpactsBySignal(result.signals, result.drafts),
    meta: result.meta,
  };
  globalThis.__advisorStore = store;
  return store;
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
