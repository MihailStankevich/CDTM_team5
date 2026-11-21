"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { moneyShort } from "./ui";

interface Props {
  slug: string;
  taskNote: string;
  onNote: (v: string) => void;
  onClose: () => void;
}

interface NotesPayload {
  profile?: {
    displayName: string;
    city: string;
    childCount: number;
    salaryTotal: number;
    investableApprox: number;
    members?: { age?: number; riskProfile?: string }[];
    goals?: { name: string; date: string }[];
  };
  crm?: { notes?: string; personalFacts?: string[] };
}

export default function ClientNotesModal({ slug, taskNote, onNote, onClose }: Props) {
  const [d, setD] = useState<NotesPayload | null>(null);
  useEffect(() => {
    fetch(`/api/clients/${slug}`)
      .then((r) => r.json())
      .then(setD);
  }, [slug]);
  const p = d?.profile;
  const facts = d?.crm?.personalFacts ?? [];
  const goals = p?.goals ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="glass-strong max-h-[85vh] w-full max-w-lg overflow-y-auto p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg font-semibold">{p?.displayName ?? "Loading…"}</h3>
          <button type="button" onClick={onClose} className="text-white/50 hover:text-white" aria-label="Close">
            ✕
          </button>
        </div>
        {p && (
          <p className="mt-1 text-sm text-white/60">
            {p.members?.[0]?.age} · {p.city} · {p.childCount ? `${p.childCount} kids` : "no kids"} ·{" "}
            {p.members?.[0]?.riskProfile} · Income {moneyShort(p.salaryTotal)} · Invested{" "}
            {moneyShort(p.investableApprox)}
          </p>
        )}
        <section className="mt-4">
          <p className="eyebrow">Notes for this meeting</p>
          <textarea
            value={taskNote}
            onChange={(e) => onNote(e.target.value)}
            rows={3}
            placeholder="Add a note…"
            className="field mt-2"
          />
        </section>
        {(facts.length > 0 || d?.crm?.notes) && (
          <section className="mt-4">
            <p className="eyebrow">On their plan</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-white/80">
              {d?.crm?.notes && <li>{d.crm.notes}</li>}
              {facts.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </section>
        )}
        {goals.length > 0 && (
          <section className="mt-4">
            <p className="eyebrow">Goals</p>
            <ul className="mt-2 space-y-1 text-sm">
              {goals.slice(0, 4).map((g) => (
                <li key={g.name + g.date}>
                  {g.name} <span className="text-white/45">· {g.date}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
        <Link href={`/clients/${slug}`} className="mt-4 inline-block text-xs font-medium text-lime hover:underline">
          Open full profile →
        </Link>
      </div>
    </div>
  );
}
