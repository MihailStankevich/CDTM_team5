"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import {
  Briefcase,
  Calendar,
  ChevronLeft,
  Mic,
  Radar,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  Wand2,
} from "lucide-react";
import type { ClientCrmState, ClientProfile as Profile, LinkedInSim } from "@/lib/types";
import {
  Avatar,
  Donut,
  donutColor,
  Empty,
  filing,
  Meter,
  money,
  moneyShort,
  pct,
  plainOrg,
  Ring,
  Toast,
} from "./ui";

interface HouseholdMember {
  firstName: string;
  age?: number;
  role: string;
  riskProfile?: string;
  source: "plan" | "meeting";
  note?: string;
}
interface Payload {
  profile: Profile;
  crm: ClientCrmState;
  linkedIn: LinkedInSim;
  household: HouseholdMember[];
}

const EVENT_LABEL: Record<string, string> = {
  child_born: "New child",
  job_change: "Job change",
  promotion: "Promotion",
  layoff_risk: "Employer risk",
  home_intent: "Home search",
  marriage: "Marriage",
  divorce: "Divorce",
  inheritance: "Inheritance",
  health: "Health",
  college_plan: "College",
  other: "Other",
};

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "social", label: "Social signals" },
  { id: "portfolio", label: "Portfolio" },
  { id: "meetings", label: "Meetings & notes" },
] as const;
type TabId = (typeof TABS)[number]["id"];

function Card({ title, children, className = "" }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`glass p-5 ${className}`}>
      {title && <h3 className="eyebrow mb-4">{title}</h3>}
      {children}
    </section>
  );
}

export default function ClientProfileView({ slug }: { slug: string }) {
  const params = useSearchParams();
  const initialTab = (TABS.find((t) => t.id === params.get("tab"))?.id ?? "overview") as TabId;
  const [tab, setTab] = useState<TabId>(initialTab);
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState("");
  const [title, setTitle] = useState("Advisor meeting");
  const [notes, setNotes] = useState("");
  const [saved, setSaved] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [pending, startTransition] = useTransition();
  const [lastResult, setLastResult] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch(`/api/clients/${slug}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.ok) throw new Error(d.error || "Failed to load");
        setData(d);
        setNotes(d.crm.notes || "");
      })
      .catch((e) => setError(e.message));
  }, [slug]);

  useEffect(() => {
    load();
  }, [load]);

  async function saveNotes() {
    const res = await fetch(`/api/clients/${slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes }),
    });
    const d = await res.json();
    if (!d.ok) throw new Error(d.error);
    setData((prev) => (prev ? { ...prev, crm: d.crm } : prev));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function submitMeeting(demo: boolean) {
    setError(null);
    setLastResult(null);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/clients/${slug}/meetings`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, transcript: demo ? undefined : transcript, demo }),
        });
        const d = await res.json();
        if (!d.ok) throw new Error(d.error || "Meeting failed");
        setLastResult(
          d.updates?.length
            ? `Applied ${d.updates.length} profile update(s) from the meeting.`
            : "Meeting saved — no new life events detected.",
        );
        setTranscript("");
        load();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed");
      }
    });
  }

  async function onAudio(file: File | null) {
    if (!file) return;
    setError(null);
    startTransition(async () => {
      try {
        const form = new FormData();
        form.append("title", title || `Audio: ${file.name}`);
        form.append("audio", file);
        if (transcript.trim()) form.append("transcript", transcript);
        const res = await fetch(`/api/clients/${slug}/meetings`, { method: "POST", body: form });
        const d = await res.json();
        if (!d.ok) throw new Error(d.error || "Upload failed");
        setLastResult(
          d.meeting.transcriptSource === "whisper"
            ? `Transcribed ${file.name} and applied ${d.updates.length} update(s).`
            : `Audio noted (${file.name}). Paste a transcript if Whisper is unavailable.`,
        );
        load();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Upload failed");
      }
    });
  }

  const timeline = useMemo(() => {
    if (!data) return [];
    const seen = new Set<string>();
    const items: { date: string; kind: "update" | "social" | "fact"; title: string; text: string }[] = [];
    data.crm.updates.forEach((u) => {
      if (seen.has(u.summary)) return;
      seen.add(u.summary);
      items.push({
        date: u.createdAt.slice(0, 10),
        kind: "update",
        title: EVENT_LABEL[u.eventType] || u.eventType,
        text: u.summary,
      });
    });
    data.linkedIn.recentActivity.forEach((a) =>
      items.push({ date: a.date, kind: "social", title: "Social post", text: a.text }),
    );
    data.crm.personalFacts.forEach((f) => items.push({ date: "", kind: "fact", title: "Personal fact", text: f }));
    return items.sort((a, b) => b.date.localeCompare(a.date));
  }, [data]);

  if (!data) {
    return (
      <div className="mx-auto max-w-[1240px] space-y-4 px-3 py-5 sm:px-6 sm:py-8">
        {error ? <Toast tone="error">{error}</Toast> : <div className="skeleton h-40" />}
        <div className="skeleton h-80" />
      </div>
    );
  }

  const { profile, crm, linkedIn, household } = data;
  const sectors = [...profile.sectors].sort((a, b) => b.weight - a.weight);
  const shocks = [...profile.drawdowns].sort((a, b) => a.drawdownPct - b.drawdownPct);
  const holdings = [...profile.holdings].sort((a, b) => b.value - a.value);
  const maxHolding = holdings[0]?.value || 1;
  const goals = profile.goals;
  const socialSignals = linkedIn.recentActivity.filter((a) => a.signal).length;
  const worst = shocks[0];

  return (
    <div className="mx-auto max-w-[1240px] px-3 py-5 sm:px-6 sm:py-7 lg:px-8">
      <Link href="/clients" className="inline-flex items-center gap-1 text-xs font-medium text-lav hover:text-ink">
        <ChevronLeft size={14} /> Clients
      </Link>

      {/* ---------- hero ---------- */}
      <section className="glass-strong animate-rise mt-3 p-4 sm:p-6">
        <div className="flex flex-wrap items-center gap-5">
          <Avatar name={profile.displayName} size={72} />
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{profile.displayName}</h1>
            <p className="mt-1 text-sm text-ink/55">
              {profile.city}, {profile.state} · {filing(profile.taxFilingStatus)} · {household.length} in household
            </p>
            {(crm.tags.length > 0 || socialSignals > 0) && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {socialSignals > 0 && (
                  <span className="chip !text-ink">
                    <Radar size={11} /> {socialSignals} social signal{socialSignals > 1 ? "s" : ""}
                  </span>
                )}
                {crm.tags.map((t) => (
                  <span key={t} className="chip !text-amber">
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="grid w-full grid-cols-3 gap-2 sm:hidden">
            {[
              ["Invested", moneyShort(profile.investableApprox)],
              ["Income", moneyShort(profile.salaryTotal)],
              ["Equity", moneyShort(profile.equityValue)],
            ].map(([k, v]) => (
              <div key={k} className="rounded-2xl bg-black/[0.03] px-2 py-2">
                <p className="text-sm font-semibold tabular-nums">{v}</p>
                <p className="text-[10px] uppercase tracking-wider text-ink/40">{k}</p>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-6">
            {[
              ["Invested", moneyShort(profile.investableApprox)],
              ["Income", moneyShort(profile.salaryTotal)],
              ["Equity", moneyShort(profile.equityValue)],
            ].map(([k, v]) => (
              <div key={k} className="hidden text-right sm:block">
                <p className="text-xl font-semibold tabular-nums">{v}</p>
                <p className="text-[10px] uppercase tracking-wider text-ink/40">{k}</p>
              </div>
            ))}
            <Ring value={profile.score} size={64} label="Financial health score" />
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link href={`/inbox?slug=${slug}`} className="btn btn-primary">
            <Sparkles size={14} /> Message {profile.members.find((m) => m.role === "client")?.firstName ?? "client"}
          </Link>
          <button className="btn btn-ghost" disabled={pending} onClick={() => submitMeeting(true)}>
            <Wand2 size={14} /> Run demo meeting
          </button>
        </div>
      </section>

      {lastResult && (
        <div className="mt-3">
          <Toast tone="ok">{lastResult}</Toast>
        </div>
      )}
      {error && (
        <div className="mt-3">
          <Toast tone="error">{error}</Toast>
        </div>
      )}

      {/* ---------- tabs ---------- */}
      <nav className="glass mt-5 flex max-w-full gap-0.5 overflow-x-auto !rounded-full p-1">
        {TABS.map((t) => (
          <button key={t.id} className="tab shrink-0 whitespace-nowrap" data-active={tab === t.id} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </nav>

      <div className="animate-fade mt-5" key={tab}>
        {/* ---------- OVERVIEW ---------- */}
        {tab === "overview" && (
          <div className="grid gap-5 lg:grid-cols-12">
            <Card title="Household" className="lg:col-span-5">
              <ul className="space-y-3">
                {household.map((m) => (
                  <li key={`${m.source}-${m.firstName}-${m.role}`} className="flex items-center gap-3">
                    <Avatar name={m.firstName} size={38} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">
                        {m.firstName}
                        {m.source === "meeting" && <span className="chip ml-2 !text-ink">new</span>}
                      </p>
                      <p className="text-xs capitalize text-ink/45">
                        {m.role.replace(/_/g, " ")}
                        {m.age != null && ` · ${m.age}`}
                      </p>
                    </div>
                    {m.riskProfile && <span className="chip">{m.riskProfile}</span>}
                  </li>
                ))}
              </ul>
            </Card>

            <Card title="What’s ahead" className="lg:col-span-7">
              {goals.length === 0 ? (
                <p className="text-sm text-ink/45">No goals on the plan.</p>
              ) : (
                <ul className="space-y-4">
                  {goals.slice(0, 5).map((g) => (
                    <li key={`${g.name}-${g.date}`}>
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="flex items-center gap-2 text-sm font-medium">
                          <Calendar size={13} className="text-amber" />
                          {g.name}
                        </p>
                        <p className="text-xs tabular-nums text-ink/50">
                          {g.date} · {g.monthsAway} mo
                        </p>
                      </div>
                      <div className="mt-2">
                        <Meter value={1 - Math.min(120, Math.max(0, g.monthsAway)) / 120} color="var(--amber)" />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card title="Life timeline" className="lg:col-span-12">
              {timeline.length === 0 ? (
                <p className="text-sm text-ink/45">Nothing new since the plan was made.</p>
              ) : (
                <ol className="relative ml-2 space-y-5 border-l border-black/10 pl-6">
                  {timeline.slice(0, 8).map((t, i) => (
                    <li key={i} className="relative">
                      <span
                        className="absolute -left-[31px] top-1 h-2.5 w-2.5 rounded-full ring-4 ring-[#10153b]"
                        style={{
                          background: t.kind === "update" ? "var(--lime)" : t.kind === "social" ? "var(--lav)" : "var(--amber)",
                        }}
                      />
                      <p className="text-[11px] text-ink/40">
                        {t.title}
                        {t.date && ` · ${t.date}`}
                      </p>
                      <p className="mt-0.5 text-sm text-ink/85">{t.text}</p>
                    </li>
                  ))}
                </ol>
              )}
            </Card>
          </div>
        )}

        {/* ---------- SOCIAL ---------- */}
        {tab === "social" && (
          <div className="grid gap-5 lg:grid-cols-12">
            <Card className="lg:col-span-5">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-lav/15 text-lav">
                  <Briefcase size={20} />
                </span>
                <div className="min-w-0">
                  <p className="text-base font-semibold leading-snug">{linkedIn.title}</p>
                  <p className="mt-0.5 text-xs text-ink/50">
                    {plainOrg(linkedIn.company)} · {linkedIn.location}
                  </p>
                </div>
              </div>
              <p className="mt-4 text-[13px] leading-relaxed text-ink/65">{linkedIn.about}</p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {linkedIn.skills.map((s) => (
                  <span key={s} className="chip">
                    {s}
                  </span>
                ))}
              </div>
              <p className="mt-5 flex items-center gap-1.5 text-[11px] text-ink/35">
                <ShieldCheck size={12} /> Demo data, shown as if connected with client consent.
              </p>
            </Card>

            <Card title="Recent activity & what it means" className="lg:col-span-7">
              {linkedIn.recentActivity.length === 0 ? (
                <Empty icon={Radar} title="No public activity yet" />
              ) : (
                <ul className="space-y-3">
                  {linkedIn.recentActivity.map((a) => (
                    <li key={a.date + a.text} className="rounded-2xl bg-black/[0.03] p-4">
                      <p className="text-[11px] text-ink/40">{a.date}</p>
                      <p className="mt-1 text-sm">{a.text}</p>
                      {a.signal && (
                        <p className="mt-2.5 flex items-start gap-2 rounded-xl bg-black/5 px-3 py-2 text-xs font-medium text-ink">
                          <Radar size={13} className="mt-0.5 shrink-0" />
                          {a.signal}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        )}

        {/* ---------- PORTFOLIO ---------- */}
        {tab === "portfolio" && (
          <div className="grid gap-5 lg:grid-cols-12">
            <Card title="Where the money sits" className="lg:col-span-5">
              <div className="flex flex-col items-center gap-5 sm:flex-row lg:flex-col xl:flex-row">
                <Donut
                  parts={sectors.map((s) => ({ value: s.weight }))}
                  center={
                    <>
                      <p className="text-lg font-semibold tabular-nums">{moneyShort(profile.investableApprox)}</p>
                      <p className="text-[10px] uppercase tracking-wider text-ink/40">invested</p>
                    </>
                  }
                />
                <ul className="w-full space-y-2">
                  {sectors.slice(0, 6).map((s, i) => (
                    <li key={s.sector} className="flex items-center gap-2.5 text-xs">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: donutColor(i) }} />
                      <span className="min-w-0 flex-1 truncate">{s.sector}</span>
                      <span className="tabular-nums text-ink/55">{pct(s.weight, 0)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>

            <Card title="Holdings" className="lg:col-span-7">
              <ul className="space-y-3.5">
                {(showAll ? holdings : holdings.slice(0, 6)).map((h) => (
                  <li key={`${h.ticker}-${h.account}`}>
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="min-w-0 truncate">
                        <span className="font-semibold">{h.ticker}</span>
                        <span className="ml-2 text-xs text-ink/45">{h.name}</span>
                      </span>
                      <span className="tabular-nums">{money(h.value)}</span>
                    </div>
                    <div className="mt-1.5">
                      <Meter value={h.value / maxHolding} color="var(--lav)" />
                    </div>
                  </li>
                ))}
              </ul>
              {holdings.length > 6 && (
                <button className="mt-4 text-xs font-medium text-lav hover:text-ink" onClick={() => setShowAll((v) => !v)}>
                  {showAll ? "Show top 6" : `Show all ${holdings.length}`}
                </button>
              )}
            </Card>

            <Card title="How past shocks hit this plan" className="lg:col-span-12">
              {worst && (
                <p className="mb-4 flex items-center gap-2 text-sm text-ink/65">
                  <TrendingDown size={15} className="text-rose" />
                  Worst case on record: {worst.eventTitle}, {pct(worst.drawdownPct)} (about{" "}
                  {money(Math.abs(worst.drawdownPct) * profile.investableApprox)}).
                </p>
              )}
              <ul className="grid gap-x-8 gap-y-3 md:grid-cols-2">
                {shocks.map((e) => (
                  <li key={e.eventTitle}>
                    <div className="flex items-baseline justify-between gap-3 text-xs">
                      <span className="truncate">{e.eventTitle}</span>
                      <span className="tabular-nums text-ink/55">
                        {pct(e.drawdownPct)}
                        {e.recoveryDays != null && ` · ${e.recoveryDays}d`}
                      </span>
                    </div>
                    <div className="mt-1.5">
                      <Meter value={Math.min(1, Math.abs(e.drawdownPct) * 2.5)} color="var(--rose)" />
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        )}

        {/* ---------- MEETINGS ---------- */}
        {tab === "meetings" && (
          <div className="grid gap-5 lg:grid-cols-12">
            <Card title="Log a meeting" className="lg:col-span-7">
              <input className="field" value={title} onChange={(e) => setTitle(e.target.value)} />
              <textarea
                className="field mt-3 resize-none"
                rows={6}
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="Paste what was said. A new child, a raise or a house hunt updates this profile."
              />
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button className="btn btn-primary" disabled={pending || !transcript.trim()} onClick={() => submitMeeting(false)}>
                  {pending ? "Saving…" : "Save meeting"}
                </button>
                <label className="btn btn-ghost cursor-pointer">
                  <Mic size={14} /> Upload audio
                  <input
                    type="file"
                    accept="audio/*,.mp3,.wav,.m4a,.webm"
                    className="hidden"
                    onChange={(e) => onAudio(e.target.files?.[0] ?? null)}
                  />
                </label>
              </div>
            </Card>

            <Card title="Private note" className="lg:col-span-5">
              <textarea
                className="field resize-none"
                rows={6}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Only you see this"
              />
              <button className="btn btn-ghost mt-3" onClick={() => saveNotes().catch((e) => setError(e.message))}>
                {saved ? "Saved ✓" : "Save note"}
              </button>
            </Card>

            <Card title="History" className="lg:col-span-12">
              {crm.meetings.length === 0 ? (
                <p className="text-sm text-ink/45">No meetings logged yet.</p>
              ) : (
                <ul className="space-y-3">
                  {crm.meetings.map((m) => (
                    <li key={m.id} className="rounded-2xl bg-black/[0.03] p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-medium">{m.title}</p>
                        <p className="text-[11px] text-ink/40">{new Date(m.createdAt).toLocaleDateString()}</p>
                      </div>
                      {m.extractedEvents.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {m.extractedEvents.map((e, i) => (
                            <span key={i} className="chip !text-ink">
                              {EVENT_LABEL[e.eventType] || e.eventType}
                            </span>
                          ))}
                        </div>
                      )}
                      {m.transcript && <p className="mt-2 line-clamp-2 text-xs text-ink/50">{m.transcript}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
