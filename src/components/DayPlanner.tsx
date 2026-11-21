"use client";

import Link from "next/link";
import { Fragment, useEffect, useMemo, useState, type FormEvent } from "react";
import ClientNotesModal from "./ClientNotesModal";
import {
  TASKS_EVENT,
  TASKS_KEY as KEY,
  isoDate,
  simulateReplies,
  taskDate,
  type ClientStatus,
  type Task,
  type TaskType,
} from "@/lib/dayTasks";

const STATUS: Record<ClientStatus, { label: string; cls: string }> = {
  pendiente: { label: "Waiting on them", cls: "bg-black/[0.05] text-ink/55" },
  aceptada: { label: "They accepted", cls: "bg-black/5 text-ink" },
  cambio: { label: "They want another time", cls: "bg-rose/15 text-rose" },
};

const fmtDate = (d: string) =>
  new Date(`${d}T12:00`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });

interface ClientRow {
  slug: string;
  displayName: string;
}

const TYPE: Record<TaskType, { label: string; cls: string }> = {
  reunion: { label: "Meeting", cls: "bg-lav/15 text-lav" },
  llamada: { label: "Call", cls: "bg-black/5 text-ink" },
  seguimiento: { label: "Follow-up", cls: "bg-amber/15 text-amber" },
  nota: { label: "Notes", cls: "bg-black/[0.05] text-ink/60" },
};

export const SEED: Task[] = [
  { id: "1", time: "09:00", title: "Prep notes for Daniel & Emily", slug: "daniel-emily-johnson", type: "nota", note: "Life cover after Nora; look at the 529.", done: false },
  { id: "2", time: "10:00", title: "Meeting: life insurance review", slug: "daniel-emily-johnson", type: "reunion", note: "Bring the coverage sketch.", done: false, status: "aceptada" },
  { id: "3", time: "11:30", title: "Call: layoff worry", slug: "michael-carter", type: "llamada", note: "Emergency fund and tech concentration.", done: false },
  { id: "4", time: "13:00", title: "Answer the tech-stock question", slug: "michael-carter", type: "seguimiento", note: "Nvidia drop — sell some?", done: false },
  { id: "5", time: "15:00", title: "Retirement plan vs tariffs", slug: "samantha-lewis", type: "seguimiento", note: "", done: false },
  { id: "6", time: "16:30", title: "Meeting: net worth and mortgage", slug: "timothy-melanie-weah", type: "reunion", note: "Early payoff options.", done: false, status: "aceptada" },
];

export default function DayPlanner() {
  const [tasks, setTasks] = useState<Task[]>(SEED);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [adding, setAdding] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [form, setForm] = useState({ time: "12:00", title: "", slug: "", type: "seguimiento" as TaskType });

  useEffect(() => {
    const saved = localStorage.getItem(KEY);
    if (saved) setTasks(JSON.parse(saved));
    const reload = () => {
      const v = localStorage.getItem(KEY);
      if (v) setTasks(JSON.parse(v));
    };
    window.addEventListener(TASKS_EVENT, reload);
    fetch("/api/clients")
      .then((r) => r.json())
      .then((d) => setClients(d.clients ?? []));
    const iv = setInterval(() => simulateReplies(SEED), 2000);
    return () => {
      window.removeEventListener(TASKS_EVENT, reload);
      clearInterval(iv);
    };
  }, []);

  const save = (t: Task[]) => {
    setTasks(t);
    localStorage.setItem(KEY, JSON.stringify(t));
  };
  const update = (id: string, p: Partial<Task>) => save(tasks.map((t) => (t.id === id ? { ...t, ...p } : t)));
  const timed = (t: Task) => t.type === "reunion" || t.type === "llamada";
  const todayIso = isoDate(new Date());
  const upcoming = useMemo(
    () => tasks.filter((t) => taskDate(t) > todayIso).sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`)),
    [tasks, todayIso],
  );
  const sorted = useMemo(
    () =>
      tasks
        .filter((t) => taskDate(t) === todayIso)
        .sort((a, b) => Number(timed(b)) - Number(timed(a)) || (timed(a) ? a.time.localeCompare(b.time) : 0)),
    [tasks, todayIso],
  );
  const name = (slug: string) => clients.find((c) => c.slug === slug)?.displayName ?? slug;
  const done = sorted.filter((t) => t.done).length;
  const today = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });

  function add(e: FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    save([...tasks, { ...form, id: String(Date.now()), note: "", done: false }]);
    setForm({ ...form, title: "" });
    setAdding(false);
  }

  return (
    <section className="glass flex h-auto min-h-[420px] flex-col p-4 sm:p-6 lg:h-full">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">My day</h2>
          <p className="text-xs capitalize text-ink/45">{today}</p>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-sm text-ink/60">
            <span className="font-semibold text-ink">{done}</span> / {sorted.length} done
          </p>
          <button type="button" onClick={() => setAdding(!adding)} className="btn btn-primary">
            + Add task
          </button>
        </div>
      </div>

      {adding && (
        <form onSubmit={add} className="mt-3 flex flex-wrap gap-2 rounded-2xl bg-black/[0.03] p-3 text-sm">
          {(form.type === "reunion" || form.type === "llamada") && (
            <input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} className="field w-full sm:w-auto" />
          )}
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="New task"
            className="field w-full min-w-0 flex-1 sm:min-w-40"
          />
          <select value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="field w-full sm:w-auto">
            <option value="">No client</option>
            {clients.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.displayName}
              </option>
            ))}
          </select>
          <select
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value as TaskType })}
            className="field w-full sm:w-auto"
          >
            {(Object.keys(TYPE) as TaskType[]).map((k) => (
              <option key={k} value={k}>
                {TYPE[k].label}
              </option>
            ))}
          </select>
          <button type="submit" className="btn btn-primary">
            Add
          </button>
          <button type="button" onClick={() => setAdding(false)} className="btn btn-ghost">
            Cancel
          </button>
        </form>
      )}

      <ol className="mt-4 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
        {sorted.map((t, i) => (
          <Fragment key={t.id}>
            {!timed(t) && (i === 0 || timed(sorted[i - 1])) && (
              <li className="pt-2 text-[11px] font-semibold uppercase tracking-wider text-ink/40">Tasks</li>
            )}
            <li className={`flex gap-3 rounded-2xl bg-black/[0.03] p-3 ring-1 ring-black/8 ${t.done ? "opacity-50" : ""}`}>
              {timed(t) && <span className="w-12 shrink-0 pt-0.5 text-sm font-semibold">{t.time}</span>}
              <input
                type="checkbox"
                checked={t.done}
                onChange={(e) => update(t.id, { done: e.target.checked })}
                className="mt-1 h-4 w-4 accent-[var(--lime)]"
                aria-label="Done"
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className={`text-sm font-semibold ${t.done ? "line-through" : ""}`}>{t.title}</p>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${TYPE[t.type].cls}`}>{TYPE[t.type].label}</span>
                  {timed(t) && (
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS[t.status ?? "pendiente"].cls}`}>
                      {STATUS[t.status ?? "pendiente"].label}
                    </span>
                  )}
                </div>
                {t.status === "cambio" && t.proposal && (
                  <Proposal
                    t={t}
                    onAccept={() => update(t.id, { ...t.proposal!, status: "aceptada", proposal: undefined })}
                    onKeep={() => update(t.id, { status: "pendiente", sentAt: Date.now(), proposal: undefined })}
                  />
                )}
                <div className="mt-1 flex flex-wrap gap-3 text-xs">
                  {t.type === "reunion" ? (
                    <a
                      href={`https://meet.google.com/lookup/sherpas-${t.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-semibold text-ink hover:underline"
                    >
                      Join meeting
                    </a>
                  ) : t.type === "llamada" ? (
                    <a href="tel:+10000000000" className="font-semibold text-ink hover:underline">
                      Call {name(t.slug)}
                    </a>
                  ) : (
                    t.slug && (
                      <Link href={`/clients/${t.slug}`} className="text-ink hover:underline">
                        {name(t.slug)}
                      </Link>
                    )
                  )}
                  <button type="button" onClick={() => setOpenId(t.id)} className="text-ink/55 hover:underline">
                    Notes
                  </button>
                  <button type="button" onClick={() => save(tasks.filter((x) => x.id !== t.id))} className="text-ink/35 hover:underline">
                    Remove
                  </button>
                </div>
                {openId === t.id &&
                  (t.slug ? (
                    <ClientNotesModal slug={t.slug} taskNote={t.note} onNote={(v) => update(t.id, { note: v })} onClose={() => setOpenId(null)} />
                  ) : (
                    <textarea
                      value={t.note}
                      onChange={(e) => update(t.id, { note: e.target.value })}
                      rows={2}
                      placeholder="Task notes…"
                      className="field mt-2"
                    />
                  ))}
              </div>
            </li>
          </Fragment>
        ))}
      </ol>

      {upcoming.length > 0 && (
        <div className="mt-3 border-t border-black/10 pt-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-ink/40">Coming up</p>
          <ul className="mt-2 max-h-48 space-y-2 overflow-y-auto">
            {upcoming.map((t) => (
              <li key={t.id} className="rounded-2xl bg-black/[0.03] p-3 text-sm ring-1 ring-black/8">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold capitalize">
                    {fmtDate(t.date!)} · {t.time}
                  </span>
                  <span className="text-ink/60">{t.title}</span>
                  {t.status && (
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS[t.status].cls}`}>
                      {STATUS[t.status].label}
                    </span>
                  )}
                  <button type="button" onClick={() => save(tasks.filter((x) => x.id !== t.id))} className="ml-auto text-xs text-ink/35 hover:underline">
                    Cancel
                  </button>
                </div>
                {t.status === "cambio" && t.proposal && (
                  <Proposal
                    t={t}
                    onAccept={() => update(t.id, { ...t.proposal!, status: "aceptada", proposal: undefined })}
                    onKeep={() => update(t.id, { status: "pendiente", sentAt: Date.now(), proposal: undefined })}
                  />
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function Proposal({ t, onAccept, onKeep }: { t: Task; onAccept: () => void; onKeep: () => void }) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 rounded-xl bg-rose/10 p-2 text-xs">
      <span className="text-ink/70">
        They prefer <b className="capitalize">{fmtDate(t.proposal!.date)} · {t.proposal!.time}</b>
      </span>
      <button type="button" onClick={onAccept} className="btn btn-primary !px-2.5 !py-1 text-xs">
        Accept
      </button>
      <button type="button" onClick={onKeep} className="btn btn-ghost !px-2.5 !py-1 text-xs">
        Keep the original
      </button>
    </div>
  );
}
