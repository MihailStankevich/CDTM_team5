"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { MessageDraft, NewsSignal } from "@/lib/types";
import DayPlanner, { SEED } from "./DayPlanner";
import {
  TASKS_EVENT,
  TASKS_KEY,
  findSlot,
  isUnconfirmed,
  mergeIntoNotes,
  proposeToClient,
  remind,
  scheduledFor,
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
  llamada: { label: "Call", cls: "bg-lime/20 text-lime" },
  reunion: { label: "Meeting", cls: "bg-lav/20 text-lav" },
  chatbot: { label: "Chat", cls: "bg-white/10 text-white/70" },
  consulta_plan: { label: "Plan view", cls: "bg-amber/15 text-amber" },
};

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
  const [open, setOpen] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>(SEED);
  const [scheduled, setScheduled] = useState<Record<string, string>>({});
  const [picking, setPicking] = useState<{ key: string; type: "llamada" | "reunion" } | null>(null);

  const load = useCallback(async () => {
    let d = await fetch("/api/drafts").then((r) => r.json());
    if (!d.signals?.length) {
      d = await fetch("/api/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "replay" }),
      }).then((r) => r.json());
    }
    setSignals(d.signals ?? []);
    setDrafts(d.drafts ?? []);
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

  const trends = useMemo(
    () =>
      signals
        .map((s) => {
          const ds = drafts.filter((d) => d.signalId === s.id);
          const avg = ds.length ? Math.round(ds.reduce((a, d) => a + d.impactScore, 0) / ds.length) : 0;
          return { s, n: ds.length, avg, top: [...ds].sort((a, b) => b.impactScore - a.impactScore)[0] };
        })
        .sort((a, b) => b.avg - a.avg)
        .slice(0, 5),
    [signals, drafts],
  );

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

  const actions = useMemo<Action[]>(() => {
    const out: Action[] = [];
    const unconf = tasks.filter((t) => isUnconfirmed(t));
    if (unconf.length) {
      out.push({
        id: `remind-${unconf.map((t) => t.id).join("-")}`,
        type: "recordatorio",
        taskIds: unconf.map((t) => t.id),
        title: "These clients have not confirmed their calls and meetings. Nudge them?",
        detail: "We send a reminder. If the time does not work, they can propose another and you accept it in My day.",
        clients: [...new Set(unconf.map((t) => name(t.slug)))],
      });
    }
    for (const t of trends.slice(0, 3)) {
      const ds = drafts.filter((d) => d.signalId === t.s.id && (d.status === "pending" || d.status === "edited"));
      if (ds.length >= 2) {
        out.push({
          id: `msg-${t.s.id}`,
          type: "mensaje",
          signalId: t.s.id,
          title: `Message ${ds.length} clients about “${t.s.headline}”`,
          detail: ds[0]?.body ?? "",
          clients: ds.map((d) => d.displayName),
        });
      }
    }
    const techHeavy = clients.filter((c) => c.techWeight > 0.3);
    if (techHeavy.length) {
      out.push({
        id: "inv-tech-rebalance",
        type: "inversion",
        title: "Rebalance technology into a broad ETF (VTI)",
        detail: "Tech is above 30% after the DeepSeek shock and the tariffs. Proposal: move the excess over 25% into a broad market ETF.",
        clients: techHeavy.map((c) => c.displayName),
      });
    }
    out.push({
      id: "inv-bonds-ratecut",
      type: "inversion",
      title: "Lock bond yield (BND) before further rate cuts",
      detail: "With the Fed cutting, clients sitting on cash can lock quality bond yield now.",
      clients: clients.slice(0, 2).map((c) => c.displayName),
    });
    return out;
  }, [trends, drafts, clients, tasks]);

  async function accept(a: Action) {
    if (a.type === "recordatorio" && a.taskIds) remind(a.taskIds, SEED);
    if (a.type === "mensaje" && a.signalId) {
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

  return (
    <div className="mx-auto grid max-w-[1500px] grid-cols-1 gap-5 p-5 lg:h-screen lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <div className="min-h-0 space-y-4 overflow-y-auto pr-1">
        <details className={box} open>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
            <span className="text-lg font-semibold">Clients waiting</span>
            <span className="flex items-center gap-2">
              <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-rose px-1.5 text-xs font-bold text-navy">
                {pending.length}
              </span>
              <span className="text-white/40 transition group-open:rotate-180">▾</span>
            </span>
          </summary>
          <ul className="mt-4 space-y-3">
            {pending.map((c) => (
              <li key={c.slug} className="rounded-2xl bg-white/5 p-3 ring-1 ring-white/10">
                <Link href={`/clients/${c.slug}`} className="text-sm font-semibold text-lime hover:underline">
                  {name(c.slug)}
                </Link>
                {c.triggers.map((t, i) => {
                  const k = `${c.slug}-${i}`;
                  return (
                    <div key={i} className="mt-2">
                      <p className="text-sm text-white/75">
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
                          <p className="mt-1 text-xs font-semibold text-lime">{scheduled[k]}</p>
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
                              <button type="button" onClick={() => setPicking(null)} className="text-xs text-white/40 hover:underline">
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
                  <p className="mt-2 rounded-xl bg-white/5 p-2 text-xs text-white/60">
                    <span className="font-semibold text-white">They are looking at ({c.queries.length}):</span>{" "}
                    {c.queries.map((q) => q.text.replace(/\.$/, "")).join(" · ")}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </details>

        <details className={box}>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
            <span className="text-lg font-semibold">Actions</span>
            <span className="flex items-center gap-2">
              <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-lime px-1.5 text-xs font-bold text-navy">
                {actions.filter((a) => !decided[a.id]).length}
              </span>
              <span className="text-white/40 transition group-open:rotate-180">▾</span>
            </span>
          </summary>
          <ul className="mt-4 space-y-3">
            {actions.map((a) => {
              const st = decided[a.id];
              return (
                <li key={a.id} className={`rounded-2xl p-3 ring-1 ${st ? "bg-white/5 opacity-60 ring-white/10" : "bg-lime/5 ring-lime/30"}`}>
                  <p className="eyebrow">
                    {a.type === "mensaje" ? "Group message" : a.type === "recordatorio" ? "Reminder" : "Investment"}
                  </p>
                  <p className="mt-1 text-sm font-semibold">{a.title}</p>
                  <p className="mt-1 text-[11px] text-white/45">{a.clients.join(", ")}</p>
                  {open === a.id ? (
                    <pre className="mt-2 max-h-48 overflow-y-auto whitespace-pre-wrap rounded-xl bg-white/5 p-2 font-sans text-xs text-white/70">
                      {a.detail}
                    </pre>
                  ) : (
                    <button type="button" onClick={() => setOpen(a.id)} className="mt-1 text-xs text-lime hover:underline">
                      See detail
                    </button>
                  )}
                  {st ? (
                    <p className={`mt-2 text-xs font-semibold ${st === "ok" ? "text-lime" : "text-white/40"}`}>
                      {st === "ok" ? (a.type === "recordatorio" ? "Reminder sent" : a.type === "mensaje" ? "Sent" : "Approved") : "Dismissed"}
                    </p>
                  ) : (
                    <div className="mt-2 flex gap-2">
                      <button type="button" onClick={() => accept(a)} className="btn btn-primary !px-3 !py-1.5 text-xs">
                        {a.type === "mensaje" ? "Send to all" : a.type === "recordatorio" ? "Nudge" : "Approve"}
                      </button>
                      <button type="button" onClick={() => setDecided((p) => ({ ...p, [a.id]: "no" }))} className="btn btn-ghost !px-3 !py-1.5 text-xs">
                        Dismiss
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </details>

        <details className={box} open>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
            <span className="text-lg font-semibold">What moved today</span>
            <span className="flex items-center gap-2">
              <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-lav px-1.5 text-xs font-bold text-navy">
                {trends.length}
              </span>
              <span className="text-white/40 transition group-open:rotate-180">▾</span>
            </span>
          </summary>
          <ul className="mt-4 space-y-3">
            {trends.map(({ s, n, avg, top }) => {
              const hot = avg >= 80;
              return (
                <li key={s.id} className={`rounded-2xl ${hot ? "bg-lime/10 ring-1 ring-lime/40" : "bg-white/5 ring-1 ring-white/10"}`}>
                  <details className="group/t p-3">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-2">
                      <span className="text-sm font-semibold">{s.headline}</span>
                      <span className="flex shrink-0 items-center gap-2">
                        {hot && <span className="rounded-full bg-lime px-2 py-0.5 text-[10px] font-semibold text-navy">Important</span>}
                        <span className="text-xs text-white/40 transition group-open/t:rotate-180">▾</span>
                      </span>
                    </summary>
                    <p className="mt-2 text-xs text-white/65">{s.what_happened}</p>
                    <p className="mt-1 text-[11px] text-white/40">
                      {n} clients · impact {avg}
                      {top ? ` · most exposed: ${top.displayName}` : ""}
                    </p>
                  </details>
                </li>
              );
            })}
          </ul>
        </details>
      </div>
      <DayPlanner />
    </div>
  );
}
