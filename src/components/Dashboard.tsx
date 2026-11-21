"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MessageDraft, NewsSignal } from "@/lib/types";
import DayPlanner, { SEED } from "./DayPlanner";
import {
  TASKS_EVENT,
  TASKS_KEY,
  findSlot,
  mergeIntoNotes,
  proposeToClient,
  scheduledFor,
  taskDate,
  type Range,
  type Task,
} from "@/lib/dayTasks";
import { CLIENT_ALERTS, CLIENT_REQUESTS, type RequestKind } from "@/data/client-requests";

interface ClientRow {
  slug: string;
  displayName: string;
  techWeight: number;
}

const KIND: Record<RequestKind, { label: string; cls: string }> = {
  llamada: { label: "Call", cls: "bg-black/5 text-ink" },
  reunion: { label: "Meeting", cls: "bg-black/5 text-ink" },
  chatbot: { label: "Chat", cls: "bg-black/5 text-ink/70" },
  consulta_plan: { label: "Plan view", cls: "bg-black/5 text-ink/70" },
};

/** Quiet stories go out on their own. A hard hit, or a high-severity one, waits for the advisor. */
function why(draft: MessageDraft) {
  const lines = (draft.touches?.length ? draft.touches : draft.reasons).slice(0, 2);
  return lines.join(" ");
}

function needsAdvisor(signal: NewsSignal, matched: MessageDraft[]) {
  const peak = matched.reduce((max, d) => Math.max(max, d.impactScore), 0);
  if (peak >= 52) return true;
  return signal.severity === "high" && peak >= 42;
}

type Action = {
  id: string;
  type: "mensaje" | "inversion" | "recordatorio";
  taskIds?: string[];
  title: string;
  detail: string;
  clients: string[];
  signalId?: string;
};

export default function Dashboard() {
  const [signals, setSignals] = useState<NewsSignal[]>([]);
  const [drafts, setDrafts] = useState<MessageDraft[]>([]);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [decided, setDecided] = useState<Record<string, "ok" | "no">>({});
  const [tasks, setTasks] = useState<Task[]>(SEED);
  const [scheduled, setScheduled] = useState<Record<string, string>>({});
  const [picking, setPicking] = useState<{ key: string; type: "llamada" | "reunion" } | null>(null);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [ready, setReady] = useState(false);
  const [deskError, setDeskError] = useState<string | null>(null);
  const notified = useRef(new Set<string>());

  const load = useCallback(async () => {
    const read = async (res: Response) => {
      const text = await res.text();
      try {
        return JSON.parse(text) as { ok?: boolean; error?: string; signals?: NewsSignal[]; drafts?: MessageDraft[] };
      } catch {
        return { ok: false, error: text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 180) || `Request failed (${res.status})` };
      }
    };
    try {
      let d = await read(await fetch("/api/drafts"));
      if (!d.signals?.length) {
        d = await read(
          await fetch("/api/ingest", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mode: "rss" }),
          }),
        );
      }
      if (!d.signals?.length) {
        d = await read(
          await fetch("/api/ingest", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mode: "replay" }),
          }),
        );
      }
      setSignals(d.signals ?? []);
      setDrafts(d.drafts ?? []);
      setDeskError(d.signals?.length ? null : String(d.error ?? "The desk did not load.").slice(0, 180));
    } catch (err) {
      setDeskError(err instanceof Error ? err.message : "The desk did not load.");
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    load();
    fetch("/api/clients")
      .then((r) => r.json())
      .then((d) => setClients(d.clients ?? []));
  }, [load]);

  useEffect(() => {
    const read = () => {
      const v = localStorage.getItem(TASKS_KEY);
      setTasks(v ? JSON.parse(v) : SEED);
    };
    read();
    window.addEventListener(TASKS_EVENT, read);
    return () => window.removeEventListener(TASKS_EVENT, read);
  }, []);

  const name = (slug: string) => clients.find((c) => c.slug === slug)?.displayName ?? slug;

  const grouped = useMemo(() => {
    const rows = signals
      .map((s) => {
        const ds = drafts.filter((d) => d.signalId === s.id);
        return { s, drafts: ds };
      })
      .filter((row) => row.drafts.length > 0);
    return {
      auto: rows.filter((row) => !needsAdvisor(row.s, row.drafts)),
      review: rows.filter((row) => needsAdvisor(row.s, row.drafts)),
    };
  }, [signals, drafts]);

  useEffect(() => {
    for (const slug of new Set(CLIENT_REQUESTS.map((r) => r.slug))) {
      const t = scheduledFor(slug, tasks);
      if (t) mergeIntoNotes(t, CLIENT_REQUESTS.filter((r) => r.slug === slug).map((r) => r.text), SEED);
    }
  }, [tasks]);

  const pending = useMemo(() => {
    const slugs = [...new Set([...CLIENT_REQUESTS.map((r) => r.slug), ...CLIENT_ALERTS.map((a) => a.slug)])];
    return slugs
      .map((slug) => {
        const reqs = CLIENT_REQUESTS.filter((r) => r.slug === slug);
        const triggers = [
          ...reqs
            .filter((r) => r.kind === "llamada" || r.kind === "reunion")
            .map((r) => ({ kind: r.kind, text: r.text, when: r.when })),
          ...CLIENT_ALERTS.filter((a) => a.slug === slug).map((a) => ({ kind: "alerta" as const, text: a.reason, when: "" })),
        ];
        const queries = reqs.filter((r) => r.kind === "chatbot" || r.kind === "consulta_plan");
        return { slug, triggers, queries };
      })
      .filter((c) => !scheduledFor(c.slug, tasks))
      .sort((a, b) => b.triggers.length - a.triggers.length);
  }, [tasks]);

  function schedule(slug: string, key: string, type: "llamada" | "reunion", why: string, range: Range) {
    const label = type === "llamada" ? "Call" : "Meeting";
    const slot = proposeToClient(slug, type, range, `${label} with ${name(slug)}`, why, SEED);
    setPicking(null);
    setScheduled((p) => ({
      ...p,
      [key]: slot
        ? `${label} proposed: ${new Date(`${slot.date}T12:00`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })} · ${slot.time}. Waiting on them.`
        : `No slot|${type}`,
    }));
  }

  const meetings = useMemo(
    () => tasks.filter((t) => (t.type === "llamada" || t.type === "reunion") && !t.done),
    [tasks],
  );

  const shown = useMemo(() => {
    const peak = (ds: MessageDraft[]) => ds.reduce((max, d) => Math.max(max, d.impactScore), 0);
    const byImpact = (a: { s: NewsSignal; drafts: MessageDraft[] }, b: { s: NewsSignal; drafts: MessageDraft[] }) =>
      peak(b.drafts) - peak(a.drafts) || a.s.id.localeCompare(b.s.id);
    const open = (row: { drafts: MessageDraft[] }) =>
      row.drafts.some((d) => d.status === "pending" || d.status === "edited");
    return {
      auto: [...grouped.auto].sort(byImpact).slice(0, 5),
      review: [...grouped.review].filter(open).sort(byImpact).slice(0, 2),
    };
  }, [grouped]);

  useEffect(() => {
    const pending = shown.auto.filter(
      (row) =>
        !notified.current.has(row.s.id) &&
        row.drafts.some((d) => d.status === "pending" || d.status === "edited"),
    );
    if (!pending.length) return;
    pending.forEach((row) => notified.current.add(row.s.id));
    const ids = new Set(pending.map((row) => row.s.id));
    setDrafts((prev) =>
      prev.map((draft) =>
        ids.has(draft.signalId) && (draft.status === "pending" || draft.status === "edited")
          ? { ...draft, status: "approved" }
          : draft,
      ),
    );
    Promise.all(
      pending.map((row) =>
        fetch("/api/drafts", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ approveAllSignalId: row.s.id }),
        }),
      ),
    ).catch(() => {});
  }, [shown.auto]);

  const actions = useMemo(() => {
    const out: Action[] = [];
    for (const row of shown.review) {
      const openDrafts = row.drafts.filter((d) => d.status === "pending" || d.status === "edited");
      if (!openDrafts.length) continue;
      out.push({
        id: `msg-${row.s.id}`,
        type: "mensaje",
        signalId: row.s.id,
        title: row.s.headline,
        detail: row.s.what_happened,
        clients: openDrafts.map((d) => d.displayName),
      });
    }
    return out;
  }, [shown.review]);

  const textOf = (draft: MessageDraft) => edits[draft.id] ?? draft.body;

  async function accept(a: Action) {
    if (a.type === "mensaje" && a.signalId) {
      const row = shown.review.find((r) => r.s.id === a.signalId);
      const dirty = (row?.drafts ?? []).filter((draft) => edits[draft.id] !== undefined && edits[draft.id] !== draft.body);
      await Promise.all(
        dirty.map((draft) =>
          fetch("/api/drafts", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: draft.id, body: edits[draft.id] }),
          }),
        ),
      );
      const d = await fetch("/api/drafts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approveAllSignalId: a.signalId }),
      }).then((r) => r.json());
      if (d.drafts) setDrafts(d.drafts);
    }
    setDecided((p) => ({ ...p, [a.id]: "ok" }));
  }

  const box = "glass group p-5";
  const btn = "btn btn-ghost !px-2.5 !py-1 text-xs";
  const actionCount = actions.length;

  return (
    <div className="mx-auto grid max-w-[1500px] grid-cols-1 gap-5 p-5 lg:h-screen lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <div className="min-h-0 space-y-4 overflow-y-auto pr-1">
        <details className={box} open>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
            <span className="text-lg font-semibold">Actions</span>
            <span className="flex items-center gap-2">
              <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-ink px-1.5 text-xs font-bold text-white">
                {actionCount}
              </span>
              <span className="text-ink/40 transition group-open:rotate-180">▾</span>
            </span>
          </summary>
          <ul className="mt-4 space-y-3">
            {actions.map((a) => {
              const d = decided[a.id];
              const row = grouped.review.find((r) => r.s.id === a.signalId);
              return (
                <li key={a.id} className="rounded-2xl bg-black/[0.03] ring-1 ring-black/5">
                  <details className="group/a">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-3">
                      <span className="text-sm font-semibold leading-snug">{a.title}</span>
                      <span className="flex shrink-0 items-center gap-2">
                        <span className="rounded-full bg-black px-2 py-0.5 text-[10px] font-semibold text-white">Needs you</span>
                        <span className="text-xs text-ink/40 transition group-open/a:rotate-180">▾</span>
                      </span>
                    </summary>
                    <div className="px-3 pb-3">
                      <ul className="space-y-3">
                        {row?.drafts
                          .filter((draft) => draft.status === "pending" || draft.status === "edited")
                          .map((draft) => (
                            <li key={draft.id}>
                              <p className="text-xs text-ink/75">
                                <span className="font-semibold">{draft.displayName}</span>
                                <span className="text-ink/45"> · {why(draft)}</span>
                              </p>
                              <textarea
                                className="field mt-1.5 min-h-24 w-full resize-y text-xs leading-relaxed"
                                value={textOf(draft)}
                                onChange={(e) => setEdits((p) => ({ ...p, [draft.id]: e.target.value }))}
                              />
                            </li>
                          ))}
                      </ul>
                      {d === "ok" ? (
                        <p className="mt-3 text-xs font-medium">Sent to these clients.</p>
                      ) : d === "no" ? (
                        <p className="mt-3 text-xs text-ink/45">Left for later.</p>
                      ) : (
                        <div className="mt-3 flex gap-2">
                          <button className="btn btn-primary !px-3 !py-1.5 text-xs" onClick={() => accept(a)}>
                            Send
                          </button>
                          <button className={btn} onClick={() => setDecided((p) => ({ ...p, [a.id]: "no" }))}>
                            Not now
                          </button>
                        </div>
                      )}
                    </div>
                  </details>
                </li>
              );
            })}

            {meetings.map((t) => (
              <li key={t.id} className="rounded-2xl bg-black/[0.03] p-4 ring-1 ring-black/5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-semibold">
                      {t.type === "llamada" ? "Call" : "Meeting"}
                    </span>
                    <p className="mt-2 text-sm font-semibold">{name(t.slug)}</p>
                    <p className="mt-1 text-xs text-ink/60">
                      {new Date(`${taskDate(t)}T12:00`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })} · {t.time}
                      {t.note ? ` · ${t.note.split("•")[0].trim()}` : ""}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[10px] font-medium ring-1 ring-black/10">
                    {t.status === "aceptada" ? "Accepted" : t.status === "cambio" ? "Asked to move" : "Waiting"}
                  </span>
                </div>
              </li>
            ))}

            {pending.length > 0 && (
              <li className="pt-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink/40">
                Propose a call or a meeting
              </li>
            )}
            {pending.map((c) => (
              <li key={c.slug} className="rounded-2xl bg-black/[0.03] p-3 ring-1 ring-black/5">
                <Link href={`/clients/${c.slug}`} className="text-sm font-semibold hover:underline">
                  {name(c.slug)}
                </Link>
                {c.triggers.map((t, i) => {
                  const k = `${c.slug}-${i}`;
                  return (
                    <div key={i} className="mt-2">
                      <p className="text-sm text-ink/75">
                        <span
                          className={`mr-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            t.kind === "alerta" ? "bg-rose/15 text-rose" : KIND[t.kind].cls
                          }`}
                        >
                          {t.kind === "alerta" ? "Alert" : KIND[t.kind].label}
                        </span>
                        {t.text}
                      </p>
                      {scheduled[k] ? (
                        scheduled[k].startsWith("No slot") ? (
                          (() => {
                            const type = scheduled[k].endsWith("|reunion") ? "reunion" : "llamada";
                            const alts = (
                              [
                                ["hoy", "Today"],
                                ["semana", "This week"],
                                ["mes", "This month"],
                              ] as const
                            ).filter(([r]) => findSlot(c.slug, r, tasks));
                            return (
                              <div className="mt-2 flex flex-wrap items-center gap-2">
                                <span className="text-xs font-semibold text-rose">
                                  {alts.length ? "No free slot. Try:" : "No free slot this month."}
                                </span>
                                {alts.map(([r, l]) => (
                                  <button key={r} type="button" onClick={() => schedule(c.slug, k, type, t.text, r)} className={btn}>
                                    {l}
                                  </button>
                                ))}
                              </div>
                            );
                          })()
                        ) : (
                          <p className="mt-1 text-xs font-semibold">{scheduled[k]}</p>
                        )
                      ) : (
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          {picking?.key === k ? (
                            <>
                              {(
                                [
                                  ["hoy", "Today"],
                                  ["semana", "This week"],
                                  ["mes", "This month"],
                                ] as const
                              ).map(([r, l]) => (
                                <button key={r} type="button" onClick={() => schedule(c.slug, k, picking.type, t.text, r)} className={btn}>
                                  {l}
                                </button>
                              ))}
                              <button type="button" onClick={() => setPicking(null)} className="text-xs text-ink/40 hover:underline">
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              {t.kind !== "reunion" && (
                                <button type="button" onClick={() => setPicking({ key: k, type: "llamada" })} className={btn}>
                                  Add call
                                </button>
                              )}
                              {t.kind !== "llamada" && (
                                <button type="button" onClick={() => setPicking({ key: k, type: "reunion" })} className={btn}>
                                  Add meeting
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                {c.queries.length > 0 && (
                  <p className="mt-2 rounded-xl bg-white p-2 text-xs text-ink/60 ring-1 ring-black/5">
                    <span className="font-semibold text-ink">They are looking at ({c.queries.length}):</span>{" "}
                    {c.queries.map((q) => q.text.replace(/\.$/, "")).join(" · ")}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </details>

        <details className={box} open>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
            <span className="text-lg font-semibold">What moved today</span>
            <span className="flex items-center gap-2">
              <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-black/5 px-1.5 text-xs font-bold text-ink">
                {shown.auto.length}
              </span>
              <span className="text-ink/40 transition group-open:rotate-180">▾</span>
            </span>
          </summary>
          <p className="mt-2 text-xs text-ink/50">Already sent. These were quiet enough to notify on their own.</p>
          <ul className="mt-4 space-y-3">
            {shown.auto.map(({ s, drafts: ds }) => (
              <li key={s.id} className="rounded-2xl bg-black/[0.03] ring-1 ring-black/5">
                <details className="group/n">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-3">
                    <span className="text-sm font-semibold">{s.headline}</span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-medium ring-1 ring-black/10">
                        Notified
                      </span>
                      <span className="text-xs text-ink/40 transition group-open/n:rotate-180">▾</span>
                    </span>
                  </summary>
                  <ul className="space-y-2 px-3 pb-3">
                    {ds.map((draft) => (
                      <li key={draft.id} className="rounded-xl bg-white p-2.5 ring-1 ring-black/5">
                        <p className="text-xs text-ink/75">
                          <span className="font-semibold">{draft.displayName}</span>
                          <span className="text-ink/45"> · {why(draft)}</span>
                        </p>
                        <p className="mt-1.5 whitespace-pre-wrap text-xs leading-relaxed text-ink/70">{draft.body}</p>
                      </li>
                    ))}
                  </ul>
                </details>
              </li>
            ))}
            {shown.auto.length === 0 && (
              <li className="text-xs text-ink/45">
                {!ready
                  ? "Loading today's notes…"
                  : deskError
                    ? deskError
                    : "Nothing quiet enough to send on its own today."}
              </li>
            )}
          </ul>
        </details>
      </div>
      <DayPlanner />
    </div>
  );
}
