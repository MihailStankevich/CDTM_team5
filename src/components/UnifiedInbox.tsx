"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Inbox, Send } from "lucide-react";
import type { Channel, ChatMessage, ClientCrmState, ClientProfile, LinkedInSim } from "@/lib/types";
import { Avatar, CHANNEL, ChannelIcon, Empty, moneyShort, Toast } from "./ui";

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

function clientBrief(profile: ClientProfile, extraKids: number) {
  const style = profile.persona.decisionStyle.toLowerCase();
  const risk = profile.persona.riskOrientation.toLowerCase();
  let talk = "Plain and personal. One idea per message.";
  if (style.includes("validator")) talk = "Short and factual. She confirms before she acts.";
  else if (style.includes("dual")) talk = "Write so both of them can follow. Skip the jargon.";
  else if (style.includes("collaborator")) talk = "Decide it with them. Offer the option, don't push.";

  const names = profile.members.filter((m) => m.role === "child").map((m) => m.firstName);
  const n = profile.childCount + extraKids;
  const family = n === 0 ? "No kids." : `${n} ${n === 1 ? "child" : "kids"}${names.length ? `: ${names.join(", ")}` : ""}.`;

  let markets = "Knows the basics. Stay concrete.";
  if (style.includes("validator")) markets = "Comfortable with a simple portfolio. Lead with the number.";
  else if (style.includes("dual")) markets = "Not deep in markets. Say what it changes for the family.";
  else if (profile.score < 40) markets = "Needs everyday language. Don't assume they follow the news.";
  else if (risk.includes("aggressive") || profile.score >= 70) markets = "Comfortable with risk. Be direct.";

  const next = [...profile.goals].sort((a, b) => a.monthsAway - b.monthsAway)[0];
  return { talk, family, markets, next };
}

function BriefFacts({ profile, extraKids }: { profile: ClientProfile; extraKids: number }) {
  const b = clientBrief(profile, extraKids);
  const rows = [
    ["How to talk", b.talk],
    ["Family", b.family],
    ["Investing", b.markets],
    b.next ? ["Next", `${b.next.name} · ${b.next.date}`] : null,
  ].filter((row): row is [string, string] => row !== null);
  return (
    <dl className="space-y-3">
      {rows.map(([k, v]) => (
        <div key={k}>
          <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40">{k}</dt>
          <dd className="mt-0.5 text-xs leading-snug text-ink/80">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

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
  const [openChat, setOpenChat] = useState(Boolean(params.get("slug")));
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
    setOpenChat(true);
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
    <div className="flex min-h-full flex-col p-3 lg:grid lg:h-full lg:min-h-0 lg:grid-cols-[210px_minmax(0,1fr)_230px] lg:gap-4 lg:p-4 lg:pl-0">
      {/* ---------- threads ---------- */}
      <section className={`${openChat ? "hidden lg:flex" : "flex"} glass min-h-0 flex-1 flex-col overflow-hidden`}>
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
                    t.slug === slug ? "bg-black/[0.06]" : "hover:bg-black/[0.04]"
                  }`}
                >
                  <Avatar name={t.displayName} size={40} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-[13px] font-semibold">{t.displayName}</span>
                      <span className="shrink-0 text-[10px] text-ink/35">{last ? time(last.at) : ""}</span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-ink/45">
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
      <section className={`${openChat ? "flex" : "hidden lg:flex"} glass min-h-[70dvh] min-w-0 flex-1 flex-col overflow-hidden lg:min-h-0`}>
        {active ? (
          <>
            <header className="flex items-center gap-2 border-b border-black/10 px-3 py-3 sm:gap-3 sm:px-6 sm:py-4">
              <button
                type="button"
                onClick={() => setOpenChat(false)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/5 lg:hidden"
                aria-label="All conversations"
              >
                <ChevronLeft size={18} />
              </button>
              <Avatar name={active.displayName} size={38} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{active.displayName}</p>
                <p className="flex items-center gap-1.5 text-[11px] text-ink/45">
                  <ChannelIcon channel={active.channel} size={11} /> {CHANNEL[active.channel].label}
                </p>
              </div>
              <Link href={`/clients/${active.slug}`} className="btn btn-ghost shrink-0 !px-2.5 !py-1.5">
                <span className="hidden sm:inline">Profile</span> <ChevronRight size={13} />
              </Link>
            </header>

            <details className="border-b border-black/10 px-4 py-3 lg:hidden">
              <summary className="cursor-pointer text-xs font-semibold">How to talk to them</summary>
              <div className="pt-3">
                {ctx ? (
                  <BriefFacts profile={ctx.profile} extraKids={ctx.crm.extraMembers.filter((m) => m.role === "child").length} />
                ) : (
                  <p className="text-xs text-ink/40">Loading…</p>
                )}
              </div>
            </details>

            <div className="flex-1 space-y-3 overflow-auto px-3 py-4 sm:px-6 sm:py-5">
              {messages.map((m) => {
                const out = m.direction === "out";
                return (
                  <div key={m.id} className={`flex ${out ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[85%] rounded-3xl px-4 py-2.5 text-[13px] leading-relaxed sm:max-w-[560px] ${
                        out ? "rounded-br-lg bg-ink text-white" : "rounded-bl-lg bg-black/[0.05] text-ink"
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{m.body}</p>
                      <p className={`mt-1 text-[10px] ${out ? "text-white/70" : "text-ink/40"}`}>
                        {time(m.at)}
                        {m.nurtureId && " · approved draft"}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={endRef} />
            </div>

            <div className="border-t border-black/10 px-3 py-3 sm:px-6 sm:py-4">
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
              <p className="mt-2 text-[10px] text-ink/35">
                Logged messages are read for life events — a promotion, a baby or a layoff worry updates the profile.
              </p>
            </div>
          </>
        ) : (
          <Empty icon={Inbox} title="Pick a conversation" />
        )}
      </section>

      {/* ---------- client snapshot ---------- */}
      <aside className="glass hidden min-h-0 flex-col overflow-auto p-5 lg:flex">
        {ctx && active ? (
          <div className="animate-fade">
            <div className="flex items-center gap-3">
              <Avatar name={ctx.profile.displayName} size={40} />
              <div>
                <p className="text-sm font-semibold">{ctx.profile.displayName}</p>
                <p className="text-[11px] text-ink/45">
                  {ctx.profile.city} · {moneyShort(ctx.profile.investableApprox)} invested
                </p>
              </div>
            </div>
            <div className="mt-5">
              <BriefFacts profile={ctx.profile} extraKids={ctx.crm.extraMembers.filter((m) => m.role === "child").length} />
            </div>
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
