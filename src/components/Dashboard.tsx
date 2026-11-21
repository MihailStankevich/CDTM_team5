"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Channel, NurtureItem } from "@/lib/types";

interface Workspace {
  nurture: NurtureItem[];
  counts: { waiting: number; nurture: number };
}

const KIND = {
  market_calm: { label: "Calm the drop", blurb: "They should hear it from you, not from the headline." },
  milestone: { label: "Life dates", blurb: "Birthdays and ages already in the plan." },
  career: { label: "Pay & role", blurb: "Income or title looks different from the plan." },
  chat: { label: "From chat", blurb: "Something they already told you." },
} as const;

const CHANNEL_LABEL: Record<Channel, string> = {
  email: "Email",
  whatsapp: "WhatsApp",
  telegram: "Telegram",
};

export default function Dashboard() {
  const [data, setData] = useState<Workspace | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch("/api/workspace")
      .then((r) => r.json())
      .then((d) => {
        if (!d.ok) throw new Error(d.error || "Failed");
        setData(d);
      })
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const groups = useMemo(() => {
    const nurture = data?.nurture ?? [];
    return (["milestone", "career"] as const)
      .map((kind) => ({ kind, items: nurture.filter((n) => n.kind === kind) }))
      .filter((g) => g.items.length);
  }, [data]);

  async function act(action: "approve" | "dismiss" | "sync", nurtureId?: string) {
    setBusy(nurtureId ?? action);
    setError(null);
    try {
      const res = await fetch("/api/inbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, nurtureId }),
      });
      const d = await res.json();
      if (!d.ok) throw new Error(d.error || "Failed");
      if (action === "sync") {
        setNote(
          d.applied
            ? `Chats updated ${d.applied} fact(s) on client profiles.`
            : "Chats read — no new life events this pass.",
        );
      }
      if (action === "approve") setNote("Approved. It is in their inbox.");
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted">Advisor workspace</p>
          <h1 className="display mt-1 text-3xl font-semibold tracking-tight">Life and pay</h1>
          <p className="mt-2 max-w-xl text-sm text-muted">
            Dates and pay changes worth a note. Market messages stay on Markets.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => act("sync")}
            disabled={busy === "sync"}
            className="rounded-lg border border-line bg-white px-3 py-2 text-sm font-semibold hover:bg-paper-2 disabled:opacity-50"
          >
            {busy === "sync" ? "Reading chats…" : "Update profiles from chats"}
          </button>
          <Link
            href="/inbox"
            className="rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white hover:bg-accent-deep"
          >
            Open inbox
          </Link>
        </div>
      </header>

      {error && (
        <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
          {error}
        </p>
      )}
      {note && (
        <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {note}
        </p>
      )}

      <section className="mt-6 grid grid-cols-2 gap-3">
        {[
          { label: "Waiting on you", value: data?.counts.waiting ?? "—" },
          { label: "Notes to approve", value: data?.counts.nurture ?? "—" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-line bg-white px-4 py-3">
            <p className="text-[11px] uppercase tracking-wide text-muted">{s.label}</p>
            <p className="display mt-1 text-2xl font-semibold">{s.value}</p>
          </div>
        ))}
      </section>

      <section className="mt-8">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="display text-xl font-semibold">Notes to approve</h2>
          <Link href="/" className="text-sm font-medium text-accent hover:underline">
            Market, sector, and legislation drafts are on Markets →
          </Link>
        </div>
        {!data ? (
          <p className="text-sm text-muted">Loading the book…</p>
        ) : groups.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line bg-white px-4 py-8 text-sm text-muted">
            Queue is clear. New drops, birthdays, and chat facts will land here.
          </p>
        ) : (
          <div className="space-y-6">
            {groups.map((group) => (
              <div key={group.kind}>
                <div className="mb-2">
                  <h3 className="text-sm font-semibold text-ink">{KIND[group.kind].label}</h3>
                  <p className="text-xs text-muted">{KIND[group.kind].blurb}</p>
                </div>
                <ul className="grid gap-3 lg:grid-cols-2">
                  {group.items.map((item) => (
                    <li key={item.id} className="flex flex-col rounded-xl border border-line bg-white p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold">{item.displayName}</p>
                          <p className="mt-0.5 text-xs text-muted">
                            {CHANNEL_LABEL[item.channel]} · {item.tone}
                          </p>
                        </div>
                        <span className="rounded-full bg-paper-2 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-ink-soft">
                          {item.channel}
                        </span>
                      </div>
                      <p className="mt-2 text-sm font-medium text-ink">{item.title}</p>
                      <p className="mt-1 text-xs text-muted">{item.why}</p>
                      <pre className="mt-3 max-h-36 overflow-auto whitespace-pre-wrap rounded-lg bg-paper px-3 py-2 font-sans text-xs leading-relaxed text-ink-soft">
                        {item.body}
                      </pre>
                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          disabled={busy === item.id}
                          onClick={() => act("approve", item.id)}
                          className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent-deep disabled:opacity-50"
                        >
                          Approve into {CHANNEL_LABEL[item.channel]}
                        </button>
                        <button
                          type="button"
                          onClick={() => act("dismiss", item.id)}
                          className="rounded-md px-3 py-1.5 text-xs font-medium text-muted hover:text-danger"
                        >
                          Dismiss
                        </button>
                        <Link
                          href={`/clients/${item.slug}`}
                          className="ml-auto self-center text-xs font-medium text-accent hover:underline"
                        >
                          Profile
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
