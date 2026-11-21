"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface ClientRow {
  slug: string;
  displayName: string;
  city: string;
  state: string;
  score: number;
  childCount: number;
  tags: string[];
  updateCount: number;
  meetingCount: number;
  linkedIn: { company: string; title: string; headline: string };
  persona: { decisionStyle: string; concerns: string[] };
}

export default function ClientsList() {
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/clients")
      .then((r) => r.json())
      .then((d) => {
        if (!d.ok) throw new Error(d.error || "Failed");
        setClients(d.clients);
      })
      .catch((e) => setError(e.message));
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-5 py-8">
      <header className="animate-rise mb-8">
        <p className="text-xs uppercase tracking-[0.2em] text-muted">Profiling</p>
        <h1 className="display mt-1 text-3xl font-semibold text-ink sm:text-4xl">
          Know the person, not just the plan
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Personal context, simulated professional signals, and meeting notes that update the
          household when life moves — so nurture feels human at 150 families.
        </p>
      </header>

      {error && (
        <p className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
          {error}
        </p>
      )}

      <ul className="grid gap-4 sm:grid-cols-2">
        {clients.map((c, i) => (
          <li
            key={c.slug}
            className={`animate-rise rounded-xl border border-line bg-white/80 p-5 shadow-sm ${
              i === 1 ? "animate-rise-delay-1" : i >= 2 ? "animate-rise-delay-2" : ""
            }`}
          >
            <Link href={`/clients/${c.slug}`} className="block">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="display text-xl font-semibold text-ink">{c.displayName}</h2>
                  <p className="text-sm text-muted">
                    {c.city}, {c.state} · score {c.score}
                  </p>
                </div>
                <span className="rounded-full bg-paper-2 px-2 py-0.5 text-[10px] font-medium text-ink-soft">
                  {c.childCount} kids · {c.meetingCount} meetings
                </span>
              </div>
              <p className="mt-3 text-sm text-ink-soft">
                <span className="font-medium text-ink">{c.linkedIn.title}</span>
                <span className="text-muted"> · {c.linkedIn.company}</span>
              </p>
              <p className="mt-2 line-clamp-2 text-xs text-muted">
                {c.persona.decisionStyle}
                {c.persona.concerns[0] ? ` · ${c.persona.concerns[0]}` : ""}
              </p>
              {(c.tags.length > 0 || c.updateCount > 0) && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {c.updateCount > 0 && (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-900">
                      {c.updateCount} profile updates
                    </span>
                  )}
                  {c.tags.map((t) => (
                    <span
                      key={t}
                      className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-900"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
