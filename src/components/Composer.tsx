"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { Check, ChevronRight, Sparkles } from "lucide-react";
import type { Channel } from "@/lib/types";
import { Avatar, ChannelIcon, CHANNEL } from "./ui";

export interface ComposerProps {
  slug: string;
  name: string;
  channel: Channel;
  /** short bullets: why this client, why now */
  why: string[];
  subject?: string;
  body: string;
  tone?: string;
  header?: ReactNode;
  approved?: boolean;
  busy?: boolean;
  approveLabel?: string;
  onApprove: (edit: { subject: string; body: string }) => void;
  onSave?: (edit: { subject: string; body: string }) => void;
  onDismiss?: () => void;
}

export default function Composer(p: ComposerProps) {
  const [subject, setSubject] = useState(p.subject ?? "");
  const [body, setBody] = useState(p.body);

  useEffect(() => {
    setSubject(p.subject ?? "");
    setBody(p.body);
  }, [p.slug, p.subject, p.body]);

  const dirty = body !== p.body || subject !== (p.subject ?? "");

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3">
        <Avatar name={p.name} size={44} />
        <div className="min-w-0">
          <p className="truncate text-base font-semibold">{p.name}</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-white/55">
            <ChannelIcon channel={p.channel} size={12} /> {CHANNEL[p.channel].label}
            {p.tone && (
              <>
                <span className="text-white/25">·</span>
                <Sparkles size={11} className="text-lime" /> {p.tone}
              </>
            )}
          </p>
        </div>
      </div>

      {p.header}

      {p.why.length > 0 && (
        <ul className="mt-5 space-y-2">
          {p.why.slice(0, 3).map((w) => (
            <li key={w} className="flex items-start gap-2.5 text-[13px] leading-snug text-white/75">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-lime" />
              {w}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-5 flex min-h-0 flex-1 flex-col gap-2.5">
        {p.channel === "email" && (
          <input
            className="field !py-2 font-medium"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject"
          />
        )}
        <textarea
          className="field min-h-[200px] flex-1 resize-none !leading-relaxed"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
      </div>

      {p.approved ? (
        <div className="mt-4 flex items-center gap-2 rounded-2xl bg-lime/15 px-4 py-3 text-sm font-medium text-lime">
          <Check size={16} /> Approved — ready in {CHANNEL[p.channel].label}
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={p.busy}
            className="btn btn-primary"
            onClick={() => p.onApprove({ subject, body })}
          >
            <Check size={15} /> {p.approveLabel ?? "Approve & send"}
          </button>
          {p.onSave && dirty && (
            <button type="button" className="btn btn-ghost" onClick={() => p.onSave?.({ subject, body })}>
              Save edit
            </button>
          )}
          {p.onDismiss && (
            <button type="button" className="btn btn-quiet" onClick={p.onDismiss}>
              Dismiss
            </button>
          )}
          <Link
            href={`/clients/${p.slug}`}
            className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-lav hover:text-white"
          >
            Profile <ChevronRight size={14} />
          </Link>
        </div>
      )}
      <p className="mt-3 text-[10px] text-white/35">Nothing is sent without your approval.</p>
    </div>
  );
}
