"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import type {
  AdvisorStore,
  DraftStatus,
  MessageDraft,
  NewsSignal,
  SignalGroup,
} from "@/lib/types";

const GROUPS: { id: SignalGroup; title: string; blurb: string }[] = [
  {
    id: "legislation",
    title: "Legislation",
    blurb: "Tax, tariffs, and rules that change what a family keeps.",
  },
  {
    id: "sector",
    title: "Sectors in their funds",
    blurb: "Technology, high yield, dividends — only the families who hold that sleeve.",
  },
  {
    id: "rates",
    title: "Rates and bonds",
    blurb: "The Fed, TIPS, and investment-grade credit on the plan.",
  },
  {
    id: "geopolitics",
    title: "Geopolitics and trade",
    blurb: "Energy, emerging markets, and anything that hits the non-US funds.",
  },
  {
    id: "broad_market",
    title: "The whole market",
    blurb: "Index drops and leveraged funds. Calm first, then the dollar figure.",
  },
];

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
  const [desk, setDesk] = useState<"replay" | "rss">("replay");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [editBody, setEditBody] = useState("");
  const [editSubject, setEditSubject] = useState("");
  const [groupFilter, setGroupFilter] = useState<SignalGroup | "all">("all");

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
    (next: "replay" | "rss") => {
      setDesk(next);
      setError(null);
      startTransition(async () => {
        try {
          const res = await fetch("/api/ingest", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mode: next }),
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
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted">What touches the book</p>
            <h1 className="display mt-1 text-3xl font-semibold tracking-tight">Markets</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted">
              Grouped by legislation, sector, rates, and the broad market. A card only lists a
              family when that fund or rule is actually on their plan.
            </p>
          </div>
          <div className="flex flex-col items-start gap-2 sm:items-end">
            <div className="inline-flex rounded-lg border border-line bg-paper p-0.5">
              <button
                type="button"
                disabled={pending}
                onClick={() => runIngest("replay")}
                className={`rounded-md px-3 py-1.5 text-sm font-semibold disabled:opacity-60 ${
                  desk === "replay" ? "bg-ink text-paper" : "text-ink-soft"
                }`}
              >
                {pending && desk === "replay" ? "Loading shocks…" : "Past shocks"}
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => runIngest("rss")}
                className={`rounded-md px-3 py-1.5 text-sm font-semibold disabled:opacity-60 ${
                  desk === "rss" ? "bg-ink text-paper" : "text-ink-soft"
                }`}
              >
                {pending && desk === "rss" ? "Reading the wires…" : "Live headlines"}
              </button>
            </div>
            <p className="max-w-xs text-right text-xs text-muted">
              {desk === "replay"
                ? "Liberation Day, the Fed, DeepSeek, Iran, and the other shocks saved on each plan."
                : "Yahoo Finance, CNBC, and Google News, pulled now. A story stays only if it touches a fund or a rule."}
            </p>
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
              {desk === "rss"
                ? "No live story touched a fund or a tax rule on a plan."
                : "Past shocks from the plans will show here."}
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setGroupFilter("all")}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  groupFilter === "all" ? "bg-ink text-paper" : "bg-white text-ink-soft border border-line"
                }`}
              >
                All
              </button>
              {GROUPS.map((g) => {
                const n = store.signals.filter((s) => s.group === g.id).length;
                if (!n) return null;
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setGroupFilter(g.id)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      groupFilter === g.id ? "bg-ink text-paper" : "bg-white text-ink-soft border border-line"
                    }`}
                  >
                    {g.title} · {n}
                  </button>
                );
              })}
            </div>

            {GROUPS.filter((g) => groupFilter === "all" || groupFilter === g.id).map((g) => {
              const items = store.signals.filter((s) => s.group === g.id);
              if (!items.length) return null;
              return (
                <section key={g.id}>
                  <h2 className="display text-xl font-semibold">{g.title}</h2>
                  <p className="mt-1 text-xs text-muted">{g.blurb}</p>
                  <ul className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {items.map((signal) => {
                      const drafts = store.drafts.filter((d) => d.signalId === signal.id);
                      const active = signal.id === selectedSignalId;
                      return (
                        <li key={signal.id}>
                          <button
                            type="button"
                            onClick={() => selectSignal(signal.id)}
                            className={`flex h-full w-full flex-col rounded-xl border px-3 py-3 text-left ${
                              active
                                ? "border-accent bg-white shadow-md"
                                : "border-line bg-white/80 hover:border-accent/40"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[10px] uppercase tracking-wide text-muted">
                                {signal.source === "book"
                                  ? "Held in the plan"
                                  : signal.source === "rss"
                                    ? "Live headline"
                                    : signal.source === "rule"
                                      ? "Tax tables"
                                      : "Past shock"}
                              </span>
                              <span className="rounded-full bg-paper-2 px-2 py-0.5 text-[10px] font-medium">
                                {drafts.length} {drafts.length === 1 ? "family" : "families"}
                              </span>
                            </div>
                            <p className="mt-2 text-sm font-semibold leading-snug">{signal.headline}</p>
                            <p className="mt-2 text-[11px] text-muted">
                              {drafts.map((d) => d.displayName).join(" · ") || "No household matched"}
                            </p>
                            {signal.watchTickers && signal.watchTickers.length > 0 && (
                              <p className="mt-2 text-[11px] font-medium text-accent">
                                {signal.watchTickers.join(" · ")}
                              </p>
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })}

            <section className="space-y-4">
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
                            Ready to send
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
              {store.meta.mode === "rss"
                ? `Last pull: ${new Date(store.meta.generatedAt).toLocaleString()}. Read ${store.meta.liveRead ?? 0} live headlines, kept ${store.meta.liveKept ?? 0} that touch a family.`
                : `Past shocks from the plans. Updated ${new Date(store.meta.generatedAt).toLocaleString()}.`}{" "}
              Messages are never auto-sent.
              {store.meta.feeds && store.meta.feeds.length > 0 && (
                <span className="mt-1 block">
                  {store.meta.feeds
                    .map((f) => `${f.label}: ${f.ok ? f.count : "unreachable"}`)
                    .join(" · ")}
                </span>
              )}
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
