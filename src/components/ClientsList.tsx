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
  salaryTotal: number;
  investableApprox: number;
  taxFilingStatus: string;
  techWeight: number;
  tickers: string[];
  nextGoal: { name: string; date: string } | null;
  members: { firstName: string; age: number; role: string }[];
  linkedIn: { title: string };
  persona: { decisionStyle: string; riskOrientation: string; concerns: string[] };
}

function filing(value: string) {
  return value
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const money = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

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
    <div className="mx-auto max-w-6xl px-6 py-8">
      <h1 className="display text-3xl font-semibold">Clients</h1>
      <p className="mt-1 text-sm text-muted">{clients.length || "—"} households</p>
      {error && <p className="mt-4 text-sm text-rose-800">{error}</p>}
      <ul className="mt-6 grid gap-4 lg:grid-cols-2">
        {clients.map((c) => (
          <li key={c.slug}>
            <Link
              href={`/clients/${c.slug}`}
              className="block h-full rounded-xl border border-line bg-white p-4 hover:border-accent"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-ink">{c.displayName}</p>
                  <p className="text-sm text-muted">
                    {c.city}, {c.state}
                    {c.taxFilingStatus ? ` · ${filing(c.taxFilingStatus)}` : ""}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs uppercase tracking-wide text-muted">Score</p>
                  <p className="text-lg font-semibold tabular-nums">{c.score}</p>
                </div>
              </div>
              <p className="mt-3 text-sm">{c.linkedIn.title}</p>
              <p className="mt-2 text-sm text-ink-soft">
                {c.members.map((m) => `${m.firstName} ${m.age}`).join(" · ")}
              </p>
              <dl className="mt-3 grid grid-cols-3 gap-2 text-sm">
                <div>
                  <dt className="text-[11px] uppercase tracking-wide text-muted">Salary</dt>
                  <dd className="font-medium">{money(c.salaryTotal)}</dd>
                </div>
                <div>
                  <dt className="text-[11px] uppercase tracking-wide text-muted">Invested</dt>
                  <dd className="font-medium">{money(Math.round(c.investableApprox))}</dd>
                </div>
                <div>
                  <dt className="text-[11px] uppercase tracking-wide text-muted">Next</dt>
                  <dd className="font-medium">{c.nextGoal?.name ?? "—"}</dd>
                </div>
              </dl>
              <p className="mt-3 text-xs text-muted">{c.tickers.slice(0, 6).join(" · ")}</p>
              {c.persona.concerns[0] && (
                <p className="mt-2 line-clamp-2 text-sm text-ink-soft">{c.persona.concerns[0]}</p>
              )}
              {(c.tags.length > 0 || c.updateCount > 0) && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {c.tags.map((t) => (
                    <span key={t} className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-900">
                      {t}
                    </span>
                  ))}
                  {c.updateCount > 0 && (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-900">
                      {c.updateCount} updates
                    </span>
                  )}
                </div>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
