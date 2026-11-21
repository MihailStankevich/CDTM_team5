"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import type {
  AdvisorStore,
  DraftStatus,
  MessageDraft,
  NewsSignal,
} from "@/lib/types";

type Mode = "replay" | "rss" | "both";

const STATUS_STYLE: Record<DraftStatus, string> = {
  pending: "bg-amber-100 text-amber-900",
  edited: "bg-sky-100 text-sky-900",
  approved: "bg-emerald-100 text-emerald-900",
  dismissed: "bg-stone-200 text-stone-600",
};

export default function AdvisorInbox() {
  const [store, setStore] = useState<AdvisorStore | null>(null);
  const [selectedSignalId, setSelectedSignalId] = useState<string | null>(null);
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("replay");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [editBody, setEditBody] = useState("");
  const [editSubject, setEditSubject] = useState("");

  const applyStore = useCallback((data: {
    signals: NewsSignal[];
    drafts: MessageDraft[];
    impactsBySignal: AdvisorStore["impactsBySignal"];
    meta: AdvisorStore["meta"];
  }) => {
    setStore({
      signals: data.signals,
      drafts: data.drafts,
      impactsBySignal: data.impactsBySignal,
      meta: data.meta,
    });
    const first = data.signals[0];
    if (first) {
      setSelectedSignalId(first.id);
      const firstDraft = data.drafts.find((d) => d.signalId === first.id);
      setSelectedDraftId(firstDraft?.id ?? null);
      if (firstDraft) {
        setEditBody(firstDraft.body);
        setEditSubject(firstDraft.subject);
      }
    }
  }, []);

  const runIngest = useCallback(
    (ingestMode: Mode) => {
      setError(null);
      startTransition(async () => {
        try {
          const res = await fetch("/api/ingest", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mode: ingestMode }),
          });
          const data = await res.json();
          if (!data.ok) throw new Error(data.error || "Ingest failed");
          applyStore(data);
        } catch (e) {
          setError(e instanceof Error ? e.message : "Ingest failed");
        }
      });
    },
    [applyStore],
  );

  useEffect(() => {
    runIngest("replay");
  }, [runIngest]);

  const selectedSignal = useMemo(
    () => store?.signals.find((s) => s.id === selectedSignalId) ?? null,
    [store, selectedSignalId],
  );

  const draftsForSignal = useMemo(() => {
    if (!store || !selectedSignalId) return [];
    return store.drafts.filter((d) => d.signalId === selectedSignalId);
  }, [store, selectedSignalId]);

  const selectedDraft = useMemo(
    () => store?.drafts.find((d) => d.id === selectedDraftId) ?? null,
    [store, selectedDraftId],
  );

  useEffect(() => {
    if (selectedDraft) {
      setEditBody(selectedDraft.body);
      setEditSubject(selectedDraft.subject);
    }
  }, [selectedDraft]);

  const stats = useMemo(() => {
    if (!store) return { pending: 0, approved: 0, families: 0 };
    return {
      pending: store.drafts.filter((d) => d.status === "pending" || d.status === "edited")
        .length,
      approved: store.drafts.filter((d) => d.status === "approved").length,
      families: new Set(store.drafts.map((d) => d.slug)).size,
    };
  }, [store]);

  async function patchDraft(payload: Record<string, unknown>) {
    const res = await fetch("/api/drafts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || "Update failed");
    setStore((prev) =>
      prev
        ? {
            ...prev,
            drafts: data.drafts,
          }
        : prev,
    );
    if (data.draft) {
      setSelectedDraftId(data.draft.id);
      setEditBody(data.draft.body);
      setEditSubject(data.draft.subject);
    }
  }

  function selectSignal(id: string) {
    setSelectedSignalId(id);
    const draft = store?.drafts.find((d) => d.signalId === id);
    setSelectedDraftId(draft?.id ?? null);
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-line/80 bg-ink/95 text-paper">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="animate-rise">
            <p className="text-xs uppercase tracking-[0.22em] text-emerald-200/80">
              Tracker · Communications
            </p>
            <h1 className="display mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
              Advisor inbox
            </h1>
            <p className="mt-2 max-w-xl text-sm text-emerald-50/80">
              News that touches a plan, turned into personal drafts you approve before
              anything reaches a family.
            </p>
          </div>
          <div className="animate-rise-delay-1 flex flex-wrap items-center gap-2">
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as Mode)}
              className="rounded-md border border-emerald-700/50 bg-ink-soft px-3 py-2 text-sm"
            >
              <option value="replay">Demo replay</option>
              <option value="rss">Live RSS</option>
              <option value="both">Replay + RSS</option>
            </select>
            <button
              type="button"
              disabled={pending}
              onClick={() => runIngest(mode)}
              className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-deep disabled:opacity-60"
            >
              {pending ? "Matching…" : "Ingest today"}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-6">
        {error && (
          <div className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
            {error}
          </div>
        )}

        <section className="animate-rise-delay-1 mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Signals", value: store?.signals.length ?? "—" },
            { label: "Drafts pending", value: stats.pending },
            { label: "Approved", value: stats.approved },
            { label: "Families touched", value: stats.families },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-lg border border-line bg-white/70 px-4 py-3 shadow-sm"
            >
              <p className="text-xs uppercase tracking-wide text-muted">{s.label}</p>
              <p className="display mt-1 text-2xl font-semibold text-ink">{s.value}</p>
            </div>
          ))}
        </section>

        {!store || store.signals.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line bg-white/50 px-6 py-16 text-center">
            <p className="display text-xl text-ink">No signals yet</p>
            <p className="mt-2 text-sm text-muted">
              Click <strong>Ingest today</strong> to replay market shocks from the case
              data (or pull live RSS).
            </p>
          </div>
        ) : (
          <div className="animate-rise-delay-2 grid gap-5 lg:grid-cols-12">
            {/* Signal list */}
            <aside className="lg:col-span-4">
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">
                Today&apos;s signals
              </h2>
              <ul className="space-y-2">
                {store.signals.map((signal) => {
                  const count = store.drafts.filter((d) => d.signalId === signal.id).length;
                  const active = signal.id === selectedSignalId;
                  return (
                    <li key={signal.id}>
                      <button
                        type="button"
                        onClick={() => selectSignal(signal.id)}
                        className={`w-full rounded-lg border px-3 py-3 text-left transition ${
                          active
                            ? "border-accent bg-white shadow-md"
                            : "border-line bg-white/60 hover:border-accent/40 hover:bg-white"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-[10px] uppercase tracking-wide text-muted">
                            {signal.moment} · {signal.source}
                          </span>
                          {pending && active ? (
                            <span className="live-dot text-[10px] text-accent">matching</span>
                          ) : (
                            <span className="rounded-full bg-paper-2 px-2 py-0.5 text-[10px] font-medium text-ink-soft">
                              {count} {count === 1 ? "family" : "families"}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-sm font-semibold leading-snug text-ink">
                          {signal.headline}
                        </p>
                        <p className="mt-1 line-clamp-2 text-xs text-muted">
                          {signal.what_happened}
                        </p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </aside>

            {/* Impact + draft */}
            <section className="lg:col-span-8 space-y-4">
              {selectedSignal && (
                <div className="rounded-xl border border-line bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted">
                        {selectedSignal.date} · severity {selectedSignal.severity}
                      </p>
                      <h3 className="display mt-1 text-2xl font-semibold leading-tight">
                        {selectedSignal.headline}
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        patchDraft({ approveAllSignalId: selectedSignal.id }).catch((e) =>
                          setError(e.message),
                        )
                      }
                      className="rounded-md border border-accent px-3 py-1.5 text-sm font-semibold text-accent hover:bg-accent hover:text-white"
                    >
                      Approve all for this news
                    </button>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-ink-soft">
                    {selectedSignal.what_happened}
                  </p>
                  {selectedSignal.sectors.length > 0 && (
                    <p className="mt-3 text-xs text-muted">
                      Sectors: {selectedSignal.sectors.join(", ")}
                    </p>
                  )}
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-5">
                <div className="md:col-span-2 space-y-2">
                  <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
                    Affected families
                  </h2>
                  {draftsForSignal.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-line px-3 py-6 text-sm text-muted">
                      No family matched this signal strongly enough.
                    </p>
                  ) : (
                    draftsForSignal.map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => setSelectedDraftId(d.id)}
                        className={`w-full rounded-lg border px-3 py-3 text-left ${
                          d.id === selectedDraftId
                            ? "border-accent bg-white shadow"
                            : "border-line bg-white/70 hover:bg-white"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-ink">{d.displayName}</span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_STYLE[d.status]}`}
                          >
                            {d.status}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-muted">
                          Impact {d.impactScore} · {d.reasons.slice(0, 2).join(" · ")}
                        </p>
                      </button>
                    ))
                  )}
                </div>

                <div className="md:col-span-3">
                  {selectedDraft ? (
                    <div className="rounded-xl border border-line bg-white p-5 shadow-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h2 className="display text-xl font-semibold">
                          Draft for {selectedDraft.displayName}
                        </h2>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_STYLE[selectedDraft.status]}`}
                        >
                          {selectedDraft.status}
                        </span>
                      </div>

                      <ul className="mt-3 space-y-1.5 border-b border-line pb-4 text-sm text-ink-soft">
                        {selectedDraft.touches.slice(0, 4).map((t) => (
                          <li key={t} className="flex gap-2">
                            <span className="text-accent">▸</span>
                            <span>{t}</span>
                          </li>
                        ))}
                      </ul>

                      <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-muted">
                        Subject
                      </label>
                      <input
                        value={editSubject}
                        onChange={(e) => setEditSubject(e.target.value)}
                        className="mt-1 w-full rounded-md border border-line bg-paper px-3 py-2 text-sm"
                      />

                      <label className="mt-3 block text-xs font-semibold uppercase tracking-wide text-muted">
                        Message preview
                      </label>
                      <textarea
                        value={editBody}
                        onChange={(e) => setEditBody(e.target.value)}
                        rows={12}
                        className="mt-1 w-full rounded-md border border-line bg-paper px-3 py-2 font-sans text-sm leading-relaxed"
                      />

                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            patchDraft({
                              id: selectedDraft.id,
                              subject: editSubject,
                              body: editBody,
                            }).catch((e) => setError(e.message))
                          }
                          className="rounded-md border border-line px-3 py-2 text-sm font-medium hover:bg-paper-2"
                        >
                          Save edit
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            patchDraft({
                              id: selectedDraft.id,
                              subject: editSubject,
                              body: editBody,
                              status: "approved",
                            }).catch((e) => setError(e.message))
                          }
                          className="rounded-md bg-accent px-3 py-2 text-sm font-semibold text-white hover:bg-accent-deep"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            patchDraft({
                              id: selectedDraft.id,
                              status: "dismissed",
                            }).catch((e) => setError(e.message))
                          }
                          className="rounded-md px-3 py-2 text-sm font-medium text-muted hover:text-danger"
                        >
                          Dismiss
                        </button>
                      </div>

                      {selectedDraft.status === "approved" && (
                        <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50/80 p-4">
                          <p className="text-xs font-semibold uppercase tracking-wide text-ok">
                            Client preview · ready to send (simulated)
                          </p>
                          <p className="mt-2 text-sm font-semibold">{editSubject}</p>
                          <pre className="mt-2 whitespace-pre-wrap font-sans text-sm leading-relaxed text-ink-soft">
                            {editBody}
                          </pre>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-line px-4 py-12 text-center text-sm text-muted">
                      Select a family to review the draft.
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>
        )}

        <footer className="mt-10 border-t border-line pt-4 text-xs text-muted">
          {store?.meta && (
            <p>
              Last ingest: {new Date(store.meta.generatedAt).toLocaleString()} · mode{" "}
              {store.meta.mode} · {store.meta.signalCount} signals →{" "}
              {store.meta.draftCount} drafts. Messages are never auto-sent.
            </p>
          )}
          <p className="mt-1">
            Demo uses synthetic Sherpas case families from <code>cases/</code>. Drafts are
            never auto-sent — advisor approval only.
          </p>
        </footer>
      </main>
    </div>
  );
}
