"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Calendar, Radar, Search, Users } from "lucide-react";
import { Avatar, Empty, filing, moneyShort, PageHeader, Ring, Skeletons } from "./ui";

interface ClientRow {
  slug: string;
  displayName: string;
  city: string;
  state: string;
  score: number;
  childCount: number;
  tags: string[];
  updateCount: number;
  salaryTotal: number;
  investableApprox: number;
  taxFilingStatus: string;
  tickers: string[];
  nextGoal: { name: string; date: string; monthsAway: number } | null;
  members: { firstName: string; age: number; role: string }[];
  linkedIn: { title: string; recentActivity: { signal?: string }[] };
  persona: { concerns: string[] };
}

export default function ClientsList() {
  const [clients, setClients] = useState<ClientRow[] | null>(null);
  const [q, setQ] = useState("");
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

  const shown = useMemo(
    () =>
      (clients ?? []).filter((c) =>
        `${c.displayName} ${c.city} ${c.tags.join(" ")}`.toLowerCase().includes(q.toLowerCase()),
      ),
    [clients, q],
  );

  return (
    <div className="mx-auto max-w-[1240px] px-6 py-7 lg:px-8">
      <PageHeader
        eyebrow="Your book"
        title="Clients"
        subtitle={clients ? `${clients.length} households` : "Loading…"}
        actions={
          <label className="glass flex items-center gap-2 !rounded-full px-4 py-2">
            <Search size={14} className="text-ink/45" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name, city, tag"
              className="w-48 bg-transparent text-sm outline-none placeholder:text-ink/35"
            />
          </label>
        }
      />
      {error && <p className="mt-4 text-sm text-rose">{error}</p>}

      {!clients ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="skeleton h-56" />
          <div className="skeleton h-56" />
        </div>
      ) : shown.length === 0 ? (
        <div className="mt-6">
          <Empty icon={Users} title="No client matches" />
        </div>
      ) : (
        <ul className="mt-6 grid gap-4 md:grid-cols-2">
          {shown.map((c, i) => {
            const signals = c.linkedIn.recentActivity.filter((a) => a.signal).length;
            return (
              <li key={c.slug} className="animate-rise" style={{ animationDelay: `${i * 60}ms` }}>
                <Link href={`/clients/${c.slug}`} className="glass glass-hover block h-full p-5">
                  <div className="flex items-center gap-4">
                    <Avatar name={c.displayName} size={52} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-base font-semibold">{c.displayName}</p>
                      <p className="mt-0.5 truncate text-xs text-ink/50">
                        {c.city}, {c.state} · {filing(c.taxFilingStatus)}
                      </p>
                    </div>
                    <Ring value={c.score} size={54} label="Financial health score" />
                  </div>

                  <div className="mt-5 grid grid-cols-3 gap-2">
                    {[
                      ["Invested", moneyShort(c.investableApprox)],
                      ["Income", moneyShort(c.salaryTotal)],
                      ["Household", `${c.members.length} people`],
                    ].map(([k, v]) => (
                      <div key={k} className="rounded-2xl bg-black/[0.03] px-3 py-2.5">
                        <p className="text-[10px] uppercase tracking-wider text-ink/40">{k}</p>
                        <p className="mt-0.5 text-sm font-semibold tabular-nums">{v}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-1.5">
                    {c.nextGoal && (
                      <span className="chip">
                        <Calendar size={11} className="text-amber" />
                        {c.nextGoal.name}
                      </span>
                    )}
                    {signals > 0 && (
                      <span className="chip !text-ink">
                        <Radar size={11} /> {signals} social {signals === 1 ? "signal" : "signals"}
                      </span>
                    )}
                    {c.updateCount > 0 && (
                      <span className="chip !text-amber">{c.updateCount} new facts</span>
                    )}
                    {c.tags.map((t) => (
                      <span key={t} className="chip">
                        {t}
                      </span>
                    ))}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
