"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, useTransition } from "react";
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
    return (
      <div className="mx-auto max-w-7xl px-5 py-16 text-sm text-muted">
        {error || "Loading client…"}
      </div>
    );
  }

  const { profile, crm, linkedIn, household } = data;

  return (
    <div className="mx-auto max-w-7xl px-5 py-8">
      <Link href="/clients" className="text-xs font-medium text-accent hover:underline">
        ← All clients
      </Link>

      <header className="animate-rise mt-3 flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted">Client profile</p>
          <h1 className="display mt-1 text-3xl font-semibold sm:text-4xl">{profile.displayName}</h1>
          <p className="mt-1 text-sm text-muted">
            {profile.city}, {profile.state} · {profile.taxFilingStatus.replace(/_/g, " ")} · score{" "}
            {profile.score}
          </p>
          {crm.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {crm.tags.map((t) => (
                <span
                  key={t}
                  className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-900"
                >
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
        <Link
          href="/"
          className="rounded-md border border-accent px-3 py-2 text-sm font-semibold text-accent hover:bg-accent hover:text-white"
        >
          News for this book →
        </Link>
      </header>

      {error && (
        <p className="mt-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
          {error}
        </p>
      )}
      {lastResult && (
        <p className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {lastResult}
        </p>
      )}

      <div className="mt-6 grid gap-5 lg:grid-cols-12">
        {/* Left: personal + household */}
        <section className="animate-rise space-y-4 lg:col-span-4">
          <div className="rounded-xl border border-line bg-white p-5 shadow-sm">
            <h2 className="display text-lg font-semibold">Household</h2>
            <ul className="mt-3 space-y-2">
              {household.map((m) => (
                <li
                  key={`${m.source}-${m.firstName}-${m.role}`}
                  className="flex items-start justify-between gap-2 border-b border-line/60 pb-2 text-sm last:border-0"
                >
                  <div>
                    <p className="font-medium text-ink">
                      {m.firstName}{" "}
                      <span className="text-xs font-normal text-muted">({m.role})</span>
                    </p>
                    {m.note && <p className="mt-0.5 text-xs text-muted">{m.note}</p>}
                  </div>
                  <div className="text-right text-xs text-muted">
                    {m.age !== undefined && <div>age {m.age}</div>}
                    <div
                      className={
                        m.source === "meeting" ? "font-medium text-accent" : ""
                      }
                    >
                      {m.source === "meeting" ? "from meeting" : m.riskProfile || "plan"}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-line bg-white p-5 shadow-sm">
            <h2 className="display text-lg font-semibold">How they decide</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted">Style</dt>
                <dd className="text-ink-soft">{profile.persona.decisionStyle}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted">Risk</dt>
                <dd className="text-ink-soft">{profile.persona.riskOrientation}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted">Anchor</dt>
                <dd className="text-ink-soft">{profile.persona.motivationalAnchor || "—"}</dd>
              </div>
            </dl>
            <h3 className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted">
              Open concerns
            </h3>
            <ul className="mt-2 space-y-1.5 text-sm text-ink-soft">
              {profile.persona.concerns.slice(0, 5).map((c) => (
                <li key={c} className="flex gap-2">
                  <span className="text-accent">▸</span>
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-line bg-white p-5 shadow-sm">
            <h2 className="display text-lg font-semibold">Advisor notes</h2>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder="Private notes — tone, family context, follow-ups…"
              className="mt-2 w-full rounded-md border border-line bg-paper px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={() => saveNotes().catch((e) => setError(e.message))}
              className="mt-2 rounded-md border border-line px-3 py-1.5 text-sm font-medium hover:bg-paper-2"
            >
              Save notes
            </button>
          </div>
        </section>

        {/* Center: LinkedIn + plan hooks */}
        <section className="animate-rise-delay-1 space-y-4 lg:col-span-4">
          <div className="rounded-xl border border-line bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <h2 className="display text-lg font-semibold">Professional signal</h2>
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-900">
                Simulated LinkedIn
              </span>
            </div>
            <p className="mt-2 text-sm font-semibold text-ink">{linkedIn.headline}</p>
            <p className="text-sm text-muted">
              {linkedIn.title} · {linkedIn.company}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-ink-soft">{linkedIn.about}</p>
            <h3 className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted">
              Recent activity
            </h3>
            <ul className="mt-2 space-y-3">
              {linkedIn.recentActivity.map((a) => (
                <li key={a.date + a.text} className="text-sm">
                  <p className="text-[10px] uppercase tracking-wide text-muted">{a.date}</p>
                  <p className="text-ink-soft">{a.text}</p>
                  {a.signal && (
                    <p className="mt-1 text-xs font-medium text-accent">→ {a.signal}</p>
                  )}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-[11px] text-muted">{linkedIn.connectionsNote}</p>
          </div>

          <div className="rounded-xl border border-line bg-white p-5 shadow-sm">
            <h2 className="display text-lg font-semibold">Plan hooks</h2>
            <p className="mt-1 text-sm text-muted">
              Salary ~$
              {profile.salaryTotal.toLocaleString()} · investable ~
              ${Math.round(profile.investableApprox).toLocaleString()} · tech{" "}
              {(profile.techWeight * 100).toFixed(0)}% of equity
            </p>
            <ul className="mt-3 space-y-2 text-sm">
              {profile.goals
                .filter((g) => g.monthsAway >= 0 && g.monthsAway <= 60)
                .slice(0, 6)
                .map((g) => (
                  <li key={g.name + g.date} className="flex justify-between gap-2 border-b border-line/50 pb-2">
                    <span className="text-ink-soft">{g.name}</span>
                    <span className="text-xs text-muted">
                      {g.date} · {g.monthsAway}m
                    </span>
                  </li>
                ))}
            </ul>
            {crm.personalFacts.length > 0 && (
              <>
                <h3 className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted">
                  Learned from meetings
                </h3>
                <ul className="mt-2 space-y-1.5 text-sm text-ink-soft">
                  {crm.personalFacts.slice(0, 8).map((f) => (
                    <li key={f} className="flex gap-2">
                      <span className="text-accent">▸</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>

          {crm.updates.length > 0 && (
            <div className="rounded-xl border border-line bg-white p-5 shadow-sm">
              <h2 className="display text-lg font-semibold">Profile updates</h2>
              <ul className="mt-3 space-y-3">
                {crm.updates.slice(0, 8).map((u) => (
                  <li key={u.id} className="border-b border-line/50 pb-3 text-sm last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-900">
                        {EVENT_LABEL[u.eventType] || u.eventType}
                      </span>
                      <span className="text-[10px] text-muted">
                        {new Date(u.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="mt-1 text-ink-soft">{u.summary}</p>
                    <p className="mt-1 text-[11px] text-muted">
                      Fields: {u.fieldsChanged.join(", ") || "—"}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* Right: meetings */}
        <section className="animate-rise-delay-2 space-y-4 lg:col-span-4">
          <div className="rounded-xl border border-line bg-white p-5 shadow-sm">
            <h2 className="display text-lg font-semibold">Meeting → CRM</h2>
            <p className="mt-1 text-sm text-muted">
              Upload audio or paste a transcript. We extract life events (baby, job, home…) and
              update this household.
            </p>

            <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-muted">
              Title
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded-md border border-line bg-paper px-3 py-2 text-sm"
            />

            <label className="mt-3 block text-xs font-semibold uppercase tracking-wide text-muted">
              Transcript
            </label>
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              rows={8}
              placeholder="Paste meeting notes or transcript…"
              className="mt-1 w-full rounded-md border border-line bg-paper px-3 py-2 text-sm leading-relaxed"
            />

            <label className="mt-3 block text-xs font-semibold uppercase tracking-wide text-muted">
              Audio (optional)
            </label>
            <input
              type="file"
              accept="audio/*,.mp3,.wav,.m4a,.webm"
              onChange={(e) => onAudio(e.target.files?.[0] ?? null)}
              className="mt-1 block w-full text-sm text-muted file:mr-3 file:rounded-md file:border-0 file:bg-paper-2 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-ink"
            />

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={pending || !transcript.trim()}
                onClick={() => submitMeeting(false)}
                className="rounded-md bg-accent px-3 py-2 text-sm font-semibold text-white hover:bg-accent-deep disabled:opacity-50"
              >
                {pending ? "Processing…" : "Transcribe & update"}
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => submitMeeting(true)}
                className="rounded-md border border-accent px-3 py-2 text-sm font-semibold text-accent hover:bg-accent hover:text-white disabled:opacity-50"
              >
                Run demo meeting
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-line bg-white p-5 shadow-sm">
            <h2 className="display text-lg font-semibold">Past meetings</h2>
            {crm.meetings.length === 0 ? (
              <p className="mt-2 text-sm text-muted">
                No meetings yet. Try <strong>Run demo meeting</strong> for a ready-made transcript.
              </p>
            ) : (
              <ul className="mt-3 space-y-4">
                {crm.meetings.map((m) => (
                  <li key={m.id} className="border-b border-line/50 pb-4 last:border-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-ink">{m.title}</p>
                      <span className="text-[10px] text-muted">
                        {m.transcriptSource}
                        {m.audioFileName ? ` · ${m.audioFileName}` : ""}
                      </span>
                    </div>
                    <p className="mt-1 text-[10px] text-muted">
                      {new Date(m.createdAt).toLocaleString()}
                    </p>
                    <p className="mt-2 line-clamp-3 text-xs text-ink-soft">{m.transcript}</p>
                    {m.extractedEvents.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {m.extractedEvents.map((e, i) => (
                          <li key={i} className="text-xs text-accent">
                            → {EVENT_LABEL[e.eventType] || e.eventType}: {e.summary}
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
