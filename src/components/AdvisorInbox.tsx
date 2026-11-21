"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { BellRing, CheckCheck, Newspaper, Radio, Users, Zap } from "lucide-react";
import type { AdvisorStore, DraftStatus, MessageDraft, NewsSignal, SignalGroup } from "@/lib/types";
import Composer from "./Composer";
import { Avatar, Dots, Empty, Meter, PageHeader, Skeletons, Stat, Toast } from "./ui";

const GROUPS: { id: SignalGroup; title: string }[] = [
  { id: "legislation", title: "Legislation" },
  { id: "sector", title: "Sectors" },
  { id: "rates", title: "Rates" },
  { id: "geopolitics", title: "Geopolitics" },
  { id: "broad_market", title: "Market" },
];
const GROUP_TITLE = Object.fromEntries(GROUPS.map((g) => [g.id, g.title])) as Record<SignalGroup, string>;

const SOURCE_LABEL = { book: "In the plan", rss: "Live", rule: "Tax tables", replay: "Past shock" } as const;

const sev = (s: NewsSignal["severity"]) => (s === "high" ? 3 : s === "medium" ? 2 : 1);

const STATUS_DOT: Record<DraftStatus, string> = {
  pending: "var(--amber)",
  edited: "var(--lav)",
  approved: "var(--lime)",
  dismissed: "rgba(255,255,255,0.25)",
};

export default function AdvisorInbox() {
  const params = useSearchParams();
  const [store, setStore] = useState<AdvisorStore | null>(null);
  const [signalId, setSignalId] = useState<string | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [desk, setDesk] = useState<"replay" | "rss">("replay");
  const [group, setGroup] = useState<SignalGroup | "all">("all");
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const applyStore = useCallback(
    (data: AdvisorStore) => {
      setStore(data);
      const wanted = params.get("signal");
      const first = data.signals.find((s) => s.id === wanted) ?? data.signals[0];
      if (first) {
        setSignalId(first.id);
        setDraftId(data.drafts.find((d) => d.signalId === first.id)?.id ?? null);
      }
    },
    [params],
  );

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!note) return;
    const t = setTimeout(() => setNote(null), 4000);
    return () => clearTimeout(t);
  }, [note]);

  const draftsBySignal = useMemo(() => {
    const m = new Map<string, MessageDraft[]>();
    store?.drafts.forEach((d) => m.set(d.signalId, [...(m.get(d.signalId) ?? []), d]));
    return m;
  }, [store]);

  const signals = useMemo(
    () => (store?.signals ?? []).filter((s) => group === "all" || s.group === group),
    [store, group],
  );
  const signal = store?.signals.find((s) => s.id === signalId) ?? null;
  const drafts = signal ? (draftsBySignal.get(signal.id) ?? []) : [];
  const draft = store?.drafts.find((d) => d.id === draftId) ?? null;

  const stats = useMemo(() => {
    const d = store?.drafts ?? [];
    return {
      pending: d.filter((x) => x.status === "pending" || x.status === "edited").length,
      approved: d.filter((x) => x.status === "approved").length,
      families: new Set(d.map((x) => x.slug)).size,
    };
  }, [store]);

  function select(id: string) {
    setSignalId(id);
    setExpanded(false);
    setDraftId(draftsBySignal.get(id)?.[0]?.id ?? null);
  }

  async function patch(payload: Record<string, unknown>, okText?: string) {
    try {
      const res = await fetch("/api/drafts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Update failed");
      setStore((prev) => (prev ? { ...prev, drafts: data.drafts } : prev));
      if (okText) setNote(okText);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    }
  }

  return (
    <div className="mx-auto max-w-[1360px] px-6 py-7 lg:px-8">
      <PageHeader
        eyebrow="What touches the book"
        title="News, matched to your clients"
        subtitle="Only clients who actually hold the fund or rule appear on a card."
        actions={
          <div className="glass flex gap-0.5 !rounded-full p-1">
            <button className="tab" data-active={desk === "replay"} disabled={pending} onClick={() => runIngest("replay")}>
              <Zap size={13} className="mr-1.5 inline" />
              Past shocks
            </button>
            <button className="tab" data-active={desk === "rss"} disabled={pending} onClick={() => runIngest("rss")}>
              <Radio size={13} className="mr-1.5 inline" />
              Live headlines
            </button>
          </div>
        }
      />

      <section className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Stories" value={store?.signals.length ?? "–"} icon={Newspaper} tone="lav" />
        <Stat label="Clients touched" value={store ? stats.families : "–"} icon={Users} tone="amber" />
        <Stat label="To review" value={store ? stats.pending : "–"} icon={BellRing} tone="rose" />
        <Stat label="Approved" value={store ? stats.approved : "–"} icon={CheckCheck} tone="lime" />
      </section>

      <div className="mt-4 space-y-2">
        {error && <Toast tone="error">{error}</Toast>}
        {note && <Toast tone="ok">{note}</Toast>}
      </div>

      {!store ? (
        <div className="mt-6 grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <Skeletons n={5} h={92} />
          </div>
          <div className="skeleton h-[520px] lg:col-span-7" />
        </div>
      ) : store.signals.length === 0 ? (
        <div className="mt-6">
          <Empty
            icon={Newspaper}
            title="No stories yet"
            text={desk === "rss" ? "No live story touched a fund or tax rule on a plan." : "Past shocks will show here."}
          />
        </div>
      ) : (
        <div className="mt-6 grid items-start gap-6 lg:grid-cols-12">
          {/* ---------- list ---------- */}
          <section className="lg:col-span-5">
            <div className="mb-3 flex flex-wrap gap-1.5">
              {[{ id: "all" as const, title: "All" }, ...GROUPS].map((g) => {
                const n = g.id === "all" ? store.signals.length : store.signals.filter((s) => s.group === g.id).length;
                if (!n) return null;
                return (
                  <button key={g.id} className="tab glass !rounded-full" data-active={group === g.id} onClick={() => setGroup(g.id)}>
                    {g.title} <span className="ml-1 text-ink/40">{n}</span>
                  </button>
                );
              })}
            </div>
            <ul className="space-y-2.5 lg:max-h-[calc(100vh-330px)] lg:overflow-auto lg:pr-1">
              {signals.map((s) => {
                const ds = draftsBySignal.get(s.id) ?? [];
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => select(s.id)}
                      className={`glass glass-hover w-full px-4 py-3.5 text-left ${s.id === signalId ? "glass-active" : ""}`}
                    >
                      <div className="flex items-center justify-between gap-2 text-[10px] font-medium uppercase tracking-wider text-ink/45">
                        <span className="flex items-center gap-2">
                          <Dots level={sev(s.severity)} />
                          {GROUP_TITLE[s.group]}
                        </span>
                        <span>{SOURCE_LABEL[s.source]}</span>
                      </div>
                      <p className="mt-2 line-clamp-2 text-[13.5px] font-medium leading-snug">{s.headline}</p>
                      <div className="mt-3 flex items-center gap-3">
                        <div className="flex -space-x-2">
                          {ds.slice(0, 4).map((d) => (
                            <span key={d.id} className="rounded-full ring-2 ring-[#161b45]">
                              <Avatar name={d.displayName} size={24} />
                            </span>
                          ))}
                        </div>
                        <span className="text-[11px] text-ink/50">
                          {ds.length} {ds.length === 1 ? "client" : "clients"}
                        </span>
                        {s.watchTickers?.slice(0, 2).map((t) => (
                          <span key={t} className="chip !text-ink">
                            {t}
                          </span>
                        ))}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* ---------- detail ---------- */}
          <section className="lg:sticky lg:top-6 lg:col-span-7">
            {signal && (
              <div className="glass-strong animate-fade p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="eyebrow">
                      {signal.date} · {GROUP_TITLE[signal.group]}
                    </p>
                    <h2 className="mt-1.5 text-xl font-semibold leading-snug">{signal.headline}</h2>
                  </div>
                  {drafts.length > 1 && (
                    <button
                      type="button"
                      className="btn btn-ghost shrink-0"
                      onClick={() => patch({ approveAllSignalId: signal.id }, `Approved ${drafts.length} messages.`)}
                    >
                      <CheckCheck size={14} /> Approve all
                    </button>
                  )}
                </div>
                <p className={`mt-2.5 text-[13px] leading-relaxed text-ink/60 ${expanded ? "" : "line-clamp-2"}`}>
                  {signal.what_happened}
                </p>
                {signal.what_happened.length > 140 && (
                  <button className="mt-1 text-xs font-medium text-lav hover:text-ink" onClick={() => setExpanded((v) => !v)}>
                    {expanded ? "Show less" : "Read more"}
                  </button>
                )}

                {drafts.length === 0 ? (
                  <p className="mt-6 rounded-2xl bg-black/[0.03] px-4 py-8 text-center text-sm text-ink/50">
                    No client matched this strongly enough.
                  </p>
                ) : (
                  <>
                    <p className="eyebrow mt-6">Who it touches</p>
                    <div className="mt-3 flex gap-2.5 overflow-x-auto pb-2">
                      {drafts.map((d) => (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => setDraftId(d.id)}
                          className={`flex w-[148px] shrink-0 flex-col gap-2 rounded-2xl border px-3 py-3 text-left transition ${
                            d.id === draftId
                              ? "border-lime/60 bg-lime/10"
                              : "border-black/10 bg-black/[0.03] hover:bg-black/[0.05]"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Avatar name={d.displayName} size={28} />
                            <span className="truncate text-xs font-semibold">{d.displayName}</span>
                            <span
                              className="ml-auto h-2 w-2 shrink-0 rounded-full"
                              style={{ background: STATUS_DOT[d.status] }}
                              title={d.status}
                            />
                          </div>
                          <Meter value={Math.min(1, d.impactScore / 100)} />
                          <p className="line-clamp-1 text-[10px] text-ink/45">{d.reasons[0]}</p>
                        </button>
                      ))}
                    </div>

                    {draft && (
                      <div className="mt-4 border-t border-black/10 pt-5">
                        <Composer
                          slug={draft.slug}
                          name={draft.displayName}
                          channel="email"
                          why={draft.touches.length ? draft.touches : draft.reasons}
                          subject={draft.subject}
                          body={draft.body}
                          approved={draft.status === "approved"}
                          onSave={(e) => patch({ id: draft.id, ...e }, "Edit saved.")}
                          onApprove={(e) => patch({ id: draft.id, ...e, status: "approved" }, `Approved for ${draft.displayName}.`)}
                          onDismiss={() => patch({ id: draft.id, status: "dismissed" })}
                        />
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </section>
        </div>
      )}

      {store?.meta && (
        <p className="mt-8 text-[11px] text-ink/30">
          Updated {new Date(store.meta.generatedAt).toLocaleString()}
          {store.meta.mode === "rss" && ` · read ${store.meta.liveRead ?? 0} live headlines, kept ${store.meta.liveKept ?? 0}`}
          {" · "}Synthetic Sherpas case families. Messages are never auto-sent.
        </p>
      )}
    </div>
  );
}
