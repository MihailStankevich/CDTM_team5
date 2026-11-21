"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Calendar, ChevronRight, Inbox, Radar, Send } from "lucide-react";
import type { Channel, ChatMessage, ClientCrmState, ClientProfile, LinkedInSim } from "@/lib/types";
import { Avatar, CHANNEL, ChannelIcon, Empty, moneyShort, Ring, Toast } from "./ui";

interface Thread {
  slug: string;
  channel: Channel;
  displayName: string;
}
interface Context {
  profile: ClientProfile;
  crm: ClientCrmState;
  linkedIn: LinkedInSim;
}

const time = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

export default function UnifiedInbox() {
  const params = useSearchParams();
  const router = useRouter();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [all, setAll] = useState<ChatMessage[]>([]);
  const [slug, setSlug] = useState<string | null>(params.get("slug"));
  const [ctx, setCtx] = useState<Context | null>(null);
  const [draft, setDraft] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Channel | "all">("all");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/inbox")
      .then((r) => r.json())
      .then((d) => {
        if (!d.ok) throw new Error(d.error || "Failed");
        setThreads(d.threads);
        setAll(d.messages);
        setSlug((cur) => cur ?? d.threads[0]?.slug ?? null);
      })
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    if (!slug) return;
    setCtx(null);
    fetch(`/api/clients/${slug}`)
      .then((r) => r.json())
      .then((d) => d.ok && setCtx(d))
      .catch(() => undefined);
  }, [slug]);

  const bySlug = useMemo(() => {
    const m = new Map<string, ChatMessage[]>();
    [...all]
      .sort((a, b) => a.at.localeCompare(b.at))
      .forEach((x) => m.set(x.slug, [...(m.get(x.slug) ?? []), x]));
    return m;
  }, [all]);

  const messages = (slug && bySlug.get(slug)) || [];
  const active = threads.find((t) => t.slug === slug) ?? null;
  const visible = threads.filter((t) => filter === "all" || t.channel === filter);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, slug]);

  useEffect(() => {
    if (!note) return;
    const t = setTimeout(() => setNote(null), 4500);
    return () => clearTimeout(t);
  }, [note]);

  function select(next: string) {
    setSlug(next);
    router.replace(`/inbox?slug=${next}`);
  }

  async function sendInbound() {
    if (!slug || !draft.trim() || !active) return;
    setError(null);
    const res = await fetch("/api/inbox", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "inbound", slug, channel: active.channel, text: draft }),
    });
    const data = await res.json();
    if (!data.ok) return setError(data.error || "Failed");
    setDraft("");
    setAll((prev) => [...prev, data.message]);
    setNote(
      data.updates?.length
        ? `Profile updated with ${data.updates.length} new fact${data.updates.length === 1 ? "" : "s"}.`
        : "Saved to the thread.",
    );
  }

  return (
    <div className="flex h-full min-h-0 gap-4 p-4 pl-0">
      {/* ---------- threads ---------- */}
      <section className="glass flex w-[300px] shrink-0 flex-col overflow-hidden">
        <div className="px-5 pb-3 pt-5">
          <h1 className="text-lg font-semibold">Inbox</h1>
          <div className="mt-3 flex flex-wrap gap-1">
            {(["all", "whatsapp", "email", "telegram"] as const).map((c) => (
              <button key={c} className="tab !px-3 !py-1.5 !text-[11px]" data-active={filter === c} onClick={() => setFilter(c)}>
                {c === "all" ? "All" : CHANNEL[c].label}
              </button>
            ))}
          </div>
        </div>
        <ul className="flex-1 space-y-1 overflow-auto px-2 pb-3">
          {visible.map((t) => {
            const msgs = bySlug.get(t.slug) ?? [];
            const last = msgs[msgs.length - 1];
            const waiting = last?.direction === "in";
            return (
              <li key={t.slug}>
                <button
                  type="button"
                  onClick={() => select(t.slug)}
                  className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition ${
                    t.slug === slug ? "bg-white/12" : "hover:bg-white/6"
                  }`}
                >
                  <Avatar name={t.displayName} size={40} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-[13px] font-semibold">{t.displayName}</span>
                      <span className="shrink-0 text-[10px] text-white/35">{last ? time(last.at) : ""}</span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-white/45">
                      <ChannelIcon channel={t.channel} size={11} />
                      <span className="line-clamp-1 flex-1 text-[11px]">{last?.body}</span>
                      {waiting && <span className="h-2 w-2 shrink-0 rounded-full bg-lime" />}
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      {/* ---------- conversation ---------- */}
      <section className="glass flex min-w-0 flex-1 flex-col overflow-hidden">
        {active ? (
          <>
            <header className="flex items-center gap-3 border-b border-white/10 px-6 py-4">
              <Avatar name={active.displayName} size={38} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{active.displayName}</p>
                <p className="flex items-center gap-1.5 text-[11px] text-white/45">
                  <ChannelIcon channel={active.channel} size={11} /> {CHANNEL[active.channel].label}
                </p>
              </div>
              <Link href={`/clients/${active.slug}`} className="btn btn-ghost !py-1.5">
                Profile <ChevronRight size={13} />
              </Link>
            </header>

            <div className="flex-1 space-y-3 overflow-auto px-6 py-5">
              {messages.map((m) => {
                const out = m.direction === "out";
                return (
                  <div key={m.id} className={`flex ${out ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[560px] rounded-3xl px-4 py-2.5 text-[13px] leading-relaxed ${
                        out ? "rounded-br-lg bg-lime text-navy" : "rounded-bl-lg bg-white/10 text-white"
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{m.body}</p>
                      <p className={`mt-1 text-[10px] ${out ? "text-navy/60" : "text-white/40"}`}>
                        {time(m.at)}
                        {m.nurtureId && " · approved draft"}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={endRef} />
            </div>

            <div className="border-t border-white/10 px-6 py-4">
              {note && <div className="mb-3"><Toast tone="ok">{note}</Toast></div>}
              {error && <div className="mb-3"><Toast tone="error">{error}</Toast></div>}
              <div className="flex items-end gap-2">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={2}
                  className="field resize-none"
                  placeholder={`Log what ${active.displayName} just said…`}
                />
                <button type="button" onClick={sendInbound} disabled={!draft.trim()} className="btn btn-primary !h-11 !w-11 shrink-0 !p-0" title="Log & update profile">
                  <Send size={16} />
                </button>
              </div>
              <p className="mt-2 text-[10px] text-white/35">
                Logged messages are read for life events — a promotion, a baby or a layoff worry updates the profile.
              </p>
            </div>
          </>
        ) : (
          <Empty icon={Inbox} title="Pick a conversation" />
        )}
      </section>

      {/* ---------- client snapshot ---------- */}
      <aside className="glass hidden w-[290px] shrink-0 flex-col overflow-auto p-5 xl:flex">
        {ctx && active ? (
          <div className="animate-fade space-y-5">
            <div className="flex items-center gap-3">
              <Ring value={ctx.profile.score} size={52} label="Financial health" />
              <div>
                <p className="text-sm font-semibold">{ctx.profile.displayName}</p>
                <p className="text-[11px] text-white/45">
                  {moneyShort(ctx.profile.investableApprox)} invested
                </p>
              </div>
            </div>

            <div>
              <p className="eyebrow mb-2">Talk to them like this</p>
              <p className="rounded-2xl bg-white/6 px-3 py-2.5 text-xs leading-snug text-white/80">
                {ctx.profile.persona.decisionStyle}
              </p>
            </div>

            {ctx.profile.persona.concerns.length > 0 && (
              <div>
                <p className="eyebrow mb-2">On their mind</p>
                <ul className="space-y-1.5">
                  {ctx.profile.persona.concerns.slice(0, 2).map((c) => (
                    <li key={c} className="line-clamp-3 text-xs leading-snug text-white/65">
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {ctx.profile.goals[0] && (
              <div className="flex items-center gap-2.5 rounded-2xl bg-amber/10 px-3 py-2.5 text-xs text-amber">
                <Calendar size={14} className="shrink-0" />
                <span>
                  {ctx.profile.goals[0].name} · {ctx.profile.goals[0].date}
                </span>
              </div>
            )}

            {ctx.linkedIn.recentActivity.filter((a) => a.signal).slice(0, 1).map((a) => (
              <div key={a.date} className="flex items-start gap-2.5 rounded-2xl bg-lime/10 px-3 py-2.5 text-xs text-lime">
                <Radar size={14} className="mt-0.5 shrink-0" />
                <span>{a.signal}</span>
              </div>
            ))}

            {ctx.crm.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {ctx.crm.tags.map((t) => (
                  <span key={t} className="chip">
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="skeleton h-14" />
            <div className="skeleton h-24" />
            <div className="skeleton h-16" />
          </div>
        )}
      </aside>
    </div>
  );
}
