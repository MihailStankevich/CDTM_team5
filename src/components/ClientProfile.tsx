"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, useTransition, type ReactNode } from "react";
import type { ClientCrmState, ClientProfile as Profile, LinkedInSim } from "@/lib/types";

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

function filing(value: string) {
  return value
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function plainOrg(value: string) {
  return value
    .replace(/\s*\(\s*simulated\s*\)/gi, "")
    .replace(/\s*[—–-]+\s*simulated\b/gi, "")
    .replace(/\bsimulated\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-line bg-white">
      <h2 className="border-b border-line px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
        {title}
      </h2>
      <div className="px-4 py-3">{children}</div>
    </section>
  );
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

export default function ClientProfileView({ slug }: { slug: string }) {
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState("");
  const [title, setTitle] = useState("Advisor meeting");
  const [notes, setNotes] = useState("");
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
  }

  function submitMeeting(demo: boolean) {
    setError(null);
    setLastResult(null);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/clients/${slug}/meetings`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            transcript: demo ? undefined : transcript,
            demo,
          }),
        });
        const d = await res.json();
        if (!d.ok) throw new Error(d.error || "Meeting failed");
        setData((prev) =>
          prev
            ? {
                ...prev,
                crm: d.crm,
                household: [
                  ...prev.profile.members.map((m) => ({
                    firstName: m.firstName,
                    age: m.age,
                    role: m.role,
                    riskProfile: m.riskProfile,
                    source: "plan" as const,
                  })),
                  ...d.crm.extraMembers.map(
                    (m: { firstName: string; age?: number; role: string; note: string }) => ({
                      firstName: m.firstName,
                      age: m.age,
                      role: m.role,
                      source: "meeting" as const,
                      note: m.note,
                    }),
                  ),
                ],
              }
            : prev,
        );
        setLastResult(
          d.updates?.length
            ? `Applied ${d.updates.length} profile update(s) from the meeting.`
            : "Meeting saved — no new life events detected.",
        );
        setTranscript("");
        // refresh full payload for meetings list
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
        const res = await fetch(`/api/clients/${slug}/meetings`, {
          method: "POST",
          body: form,
        });
        const d = await res.json();
        if (!d.ok) throw new Error(d.error || "Upload failed");
        setLastResult(
          d.meeting.transcriptSource === "whisper"
            ? `Transcribed ${file.name} and applied ${d.updates.length} update(s).`
            : `Audio noted (${file.name}). ${d.updates.length} update(s). Paste transcript if Whisper is unavailable.`,
        );
        load();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Upload failed");
      }
    });
  }

  if (!data) {
    return <div className="px-6 py-16 text-sm text-muted">{error || "Loading…"}</div>;
  }

  const { profile, crm, linkedIn, household } = data;
  const money = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
  const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
  const updates = crm.updates.filter(
    (u, i, all) => all.findIndex((other) => other.summary === u.summary) === i,
  );
  const sectors = [...profile.sectors].sort((a, b) => b.weight - a.weight);
  const shocks = [...profile.drawdowns].sort((a, b) => a.drawdownPct - b.drawdownPct);

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <Link href="/clients" className="text-xs font-medium text-accent hover:underline">
        Clients
      </Link>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="display text-3xl font-semibold">{profile.displayName}</h1>
          <p className="mt-1 text-sm text-muted">
            {profile.city}, {profile.state} · {filing(profile.taxFilingStatus)} · score{" "}
            {profile.score}
          </p>
          {crm.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {crm.tags.map((tag) => (
                <span key={tag} className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-900">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
        <Link href="/" className="text-sm font-semibold text-accent">
          Markets
        </Link>
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Salary", money(profile.salaryTotal)],
          ["Invested", money(Math.round(profile.investableApprox))],
          ["Equity sleeve", money(Math.round(profile.equityValue))],
          ["2027 wage base", profile.aboveSsWageBase2027 ? "Above" : "Below"],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-line bg-white px-3 py-3">
            <dt className="text-[11px] uppercase tracking-wide text-muted">{label}</dt>
            <dd className="mt-1 text-sm font-semibold">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Section title="Household">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-muted">
                <th className="pb-2 font-medium">Name</th>
                <th className="pb-2 font-medium">Age</th>
                <th className="pb-2 font-medium">Role</th>
                <th className="pb-2 font-medium">Risk</th>
              </tr>
            </thead>
            <tbody>
              {household.map((m) => (
                <tr key={`${m.source}-${m.firstName}-${m.role}`} className="border-t border-line">
                  <td className="py-2 font-medium">
                    {m.firstName}
                    {m.note ? <span className="mt-0.5 block text-xs font-normal text-muted">{m.note}</span> : null}
                  </td>
                  <td className="py-2 tabular-nums">{m.age ?? "—"}</td>
                  <td className="py-2 capitalize">{m.role.replace(/_/g, " ")}</td>
                  <td className="py-2 text-ink-soft">{m.riskProfile || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        <Section title="Work">
          <p className="text-sm font-semibold">{linkedIn.title}</p>
          <p className="mt-0.5 text-sm text-muted">
            {plainOrg(linkedIn.company)} · {linkedIn.location}
          </p>
          <p className="mt-2 text-sm text-ink-soft">{linkedIn.about}</p>
          <p className="mt-2 text-xs text-muted">{linkedIn.skills.join(" · ")}</p>
          <ul className="mt-3 space-y-2 border-t border-line pt-3">
            {linkedIn.recentActivity.map((post) => (
              <li key={post.date + post.text} className="text-sm">
                <span className="text-xs text-muted">{post.date}</span>
                <p>{post.text}</p>
                {post.signal && <p className="text-xs text-ink-soft">{post.signal}</p>}
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Holdings">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-muted">
                <th className="pb-2 font-medium">Ticker</th>
                <th className="pb-2 font-medium">Name</th>
                <th className="pb-2 text-right font-medium">Value</th>
              </tr>
            </thead>
            <tbody>
              {profile.holdings.map((h) => (
                <tr key={`${h.ticker}-${h.account}`} className="border-t border-line">
                  <td className="py-1.5 font-medium">{h.ticker}</td>
                  <td className="py-1.5 text-ink-soft">
                    {h.name}
                    <span className="block text-xs text-muted">
                      {h.type}
                      {h.category ? ` · ${h.category}` : ""} · {h.account}
                    </span>
                  </td>
                  <td className="py-1.5 text-right tabular-nums">{money(h.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        <div className="space-y-4">
          <Section title="Sectors">
            <ul className="space-y-2">
              {sectors.map((s) => (
                <li key={s.sector}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span>{s.sector}</span>
                    <span className="tabular-nums text-muted">{pct(s.weight)}</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-paper-2">
                    <div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(100, s.weight * 100)}%` }} />
                  </div>
                  <p className="mt-0.5 text-xs text-muted">
                    {s.severity}
                    {s.driver ? ` · ${s.driver}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          </Section>
          <Section title="Goals">
            <ul className="divide-y divide-line">
              {profile.goals.map((g) => (
                <li key={`${g.name}-${g.date}`} className="flex items-baseline justify-between gap-3 py-2 text-sm">
                  <span>
                    {g.name}
                    <span className="block text-xs text-muted">{g.goalType.replace(/_/g, " ")}</span>
                  </span>
                  <span className="text-right text-xs text-muted">
                    {g.date}
                    <span className="block tabular-nums">{g.monthsAway} mo</span>
                  </span>
                </li>
              ))}
            </ul>
          </Section>
        </div>

        <Section title="How they decide">
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-[11px] uppercase tracking-wide text-muted">Style</dt>
              <dd>{profile.persona.decisionStyle}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-wide text-muted">Risk</dt>
              <dd>{profile.persona.riskOrientation}</dd>
            </div>
          </dl>
          <p className="mt-3 text-[11px] uppercase tracking-wide text-muted">Concerns</p>
          <ul className="mt-1 list-disc space-y-1 pl-4 text-sm text-ink-soft">
            {profile.persona.concerns.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
          {profile.persona.tensions.length > 0 && (
            <>
              <p className="mt-3 text-[11px] uppercase tracking-wide text-muted">Tensions</p>
              <ul className="mt-1 list-disc space-y-1 pl-4 text-sm text-ink-soft">
                {profile.persona.tensions.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </>
          )}
          {profile.persona.motivationalAnchor && (
            <p className="mt-3 text-sm">
              <span className="text-[11px] uppercase tracking-wide text-muted">Anchor. </span>
              {profile.persona.motivationalAnchor}
            </p>
          )}
        </Section>

        <Section title="Past shocks">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-muted">
                <th className="pb-2 font-medium">Event</th>
                <th className="pb-2 text-right font-medium">Drop</th>
                <th className="pb-2 text-right font-medium">Recovery</th>
              </tr>
            </thead>
            <tbody>
              {shocks.map((e) => (
                <tr key={e.eventTitle} className="border-t border-line">
                  <td className="py-1.5">
                    {e.eventTitle}
                    <span className="block text-xs text-muted">{e.eventDate.slice(0, 10)}</span>
                  </td>
                  <td className="py-1.5 text-right tabular-nums">{pct(e.drawdownPct)}</td>
                  <td className="py-1.5 text-right tabular-nums text-muted">
                    {e.recoveryDays != null ? `${e.recoveryDays}d` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      </div>

      {(updates.length > 0 || crm.personalFacts.length > 0) && (
        <div className="mt-4">
          <Section title="Learned since the plan">
            <ul className="space-y-2 text-sm">
              {crm.personalFacts.map((fact) => (
                <li key={fact}>{fact}</li>
              ))}
              {updates.map((u) => (
                <li key={u.id}>
                  <span className="font-medium">{EVENT_LABEL[u.eventType] || u.eventType}.</span> {u.summary}
                </li>
              ))}
            </ul>
          </Section>
        </div>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Section title="Advisor note">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            placeholder="Private note"
            className="w-full rounded-md border border-line bg-paper px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={() => saveNotes().catch((e) => setError(e.message))}
            className="mt-2 text-xs font-semibold text-accent"
          >
            Save note
          </button>
        </Section>

        <Section title="Meetings">
          {lastResult && <p className="mb-2 text-xs text-ok">{lastResult}</p>}
          {error && <p className="mb-2 text-xs text-rose-800">{error}</p>}
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-md border border-line bg-paper px-3 py-1.5 text-sm"
          />
          <textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            rows={4}
            placeholder="Paste what was said. A new child, a raise, or a house hunt updates this profile."
            className="mt-2 w-full rounded-md border border-line bg-paper px-3 py-2 text-sm"
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={pending || !transcript.trim()}
              onClick={() => submitMeeting(false)}
              className="rounded-md bg-accent px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {pending ? "Saving…" : "Save meeting"}
            </button>
            <label className="cursor-pointer text-xs font-medium text-muted">
              Upload audio
              <input
                type="file"
                accept="audio/*,.mp3,.wav,.m4a,.webm"
                className="hidden"
                onChange={(e) => onAudio(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>
          {crm.meetings.length > 0 && (
            <ul className="mt-3 space-y-2 border-t border-line pt-3">
              {crm.meetings.map((m) => (
                <li key={m.id} className="text-sm">
                  <p className="font-medium">{m.title}</p>
                  <p className="text-xs text-muted">
                    {new Date(m.createdAt).toLocaleString()}
                    {m.extractedEvents.length
                      ? ` · ${m.extractedEvents.map((e) => EVENT_LABEL[e.eventType] || e.eventType).join(", ")}`
                      : ""}
                  </p>
                  {m.transcript && <p className="mt-1 line-clamp-3 text-xs text-ink-soft">{m.transcript}</p>}
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </div>
  );
}
