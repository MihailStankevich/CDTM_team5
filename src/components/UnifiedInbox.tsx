"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Channel, ChatMessage } from "@/lib/types";

interface Thread {
  slug: string;
  channel: Channel;
  displayName: string;
}

const CHANNEL_LABEL: Record<Channel, string> = {
  email: "Email",
  whatsapp: "WhatsApp",
  telegram: "Telegram",
};

export default function UnifiedInbox() {
  const params = useSearchParams();
  const router = useRouter();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [slug, setSlug] = useState<string | null>(params.get("slug"));
  const [draft, setDraft] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Channel | "all">("all");

  const load = useCallback(async (nextSlug: string | null) => {
    const q = nextSlug ? `?slug=${nextSlug}` : "";
    const res = await fetch(`/api/inbox${q}`);
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || "Failed");
    setThreads(data.threads);
    if (nextSlug) setMessages(data.messages);
    else setMessages([]);
    if (!nextSlug && data.threads[0]) {
      setSlug(data.threads[0].slug);
    }
  }, []);

  useEffect(() => {
    const initial = params.get("slug");
    load(initial).catch((e) => setError(e.message));
  }, [load, params]);

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/inbox?slug=${slug}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setMessages(d.messages);
      })
      .catch(() => undefined);
  }, [slug]);

  const visibleThreads = useMemo(
    () => threads.filter((t) => filter === "all" || t.channel === filter),
    [threads, filter],
  );

  const active = threads.find((t) => t.slug === slug) ?? null;

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
      body: JSON.stringify({
        action: "inbound",
        slug,
        channel: active.channel,
        text: draft,
      }),
    });
    const data = await res.json();
    if (!data.ok) {
      setError(data.error || "Failed");
      return;
    }
    setDraft("");
    setMessages((prev) => [...prev, data.message]);
    setNote(
      data.updates?.length
        ? `Saved to the thread and updated the profile (${data.updates.length} fact${data.updates.length === 1 ? "" : "s"}).`
        : "Saved to the thread. No new life event in that message.",
    );
  }

  return (
    <div className="flex h-full min-h-0">
      <section className="flex w-80 shrink-0 flex-col border-r border-line bg-white">
        <div className="border-b border-line px-4 py-4">
          <h1 className="display text-xl font-semibold">Inbox</h1>
          <p className="mt-1 text-xs text-muted">Every client channel, one list.</p>
          <div className="mt-3 flex flex-wrap gap-1">
            {(["all", "whatsapp", "email", "telegram"] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setFilter(c)}
                className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                  filter === c ? "bg-ink text-paper" : "bg-paper-2 text-ink-soft"
                }`}
              >
                {c === "all" ? "All" : CHANNEL_LABEL[c]}
              </button>
            ))}
          </div>
        </div>
        <ul className="flex-1 overflow-auto">
          {visibleThreads.map((t) => (
            <li key={t.slug}>
              <button
                type="button"
                onClick={() => select(t.slug)}
                className={`w-full border-b border-line/70 px-4 py-3 text-left ${
                  t.slug === slug ? "bg-paper" : "hover:bg-paper/60"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold">{t.displayName}</span>
                  <span className="text-[10px] uppercase tracking-wide text-muted">
                    {CHANNEL_LABEL[t.channel]}
                  </span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex min-w-0 flex-1 flex-col bg-paper/40">
        {active ? (
          <>
            <header className="flex items-center justify-between border-b border-line bg-white px-5 py-3">
              <div>
                <p className="text-sm font-semibold">{active.displayName}</p>
                <p className="text-xs text-muted">{CHANNEL_LABEL[active.channel]}</p>
              </div>
              <Link href={`/clients/${active.slug}`} className="text-xs font-semibold text-accent hover:underline">
                Open profile
              </Link>
            </header>
            <div className="flex-1 space-y-3 overflow-auto px-5 py-4">
              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.direction === "out" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-lg rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                      m.direction === "out"
                        ? "bg-accent text-white"
                        : "border border-line bg-white text-ink"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{m.body}</p>
                    <p className={`mt-1 text-[10px] ${m.direction === "out" ? "text-emerald-50" : "text-muted"}`}>
                      {m.direction === "out" ? "You" : "Client"} ·{" "}
                      {new Date(m.at).toLocaleString()}
                      {m.nurtureId ? " · approved draft" : ""}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-line bg-white px-5 py-3">
              {note && <p className="mb-2 text-xs text-ok">{note}</p>}
              {error && <p className="mb-2 text-xs text-danger">{error}</p>}
              <p className="mb-2 text-[11px] text-muted">
                Log what the client just said. A promotion, a baby, or a layoff worry updates their profile.
              </p>
              <div className="flex gap-2">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={2}
                  placeholder={`Message from ${active.displayName} on ${CHANNEL_LABEL[active.channel]}…`}
                  className="min-w-0 flex-1 rounded-lg border border-line bg-paper px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={sendInbound}
                  className="self-end rounded-lg bg-ink px-3 py-2 text-sm font-semibold text-paper"
                >
                  Log & update
                </button>
              </div>
            </div>
          </>
        ) : (
          <p className="p-8 text-sm text-muted">Pick a conversation.</p>
        )}
      </section>
    </div>
  );
}
