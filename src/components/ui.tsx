"use client";

import { useEffect, type ReactNode } from "react";
import {
  HeartHandshake,
  Mail,
  MessageCircle,
  Newspaper,
  Radar,
  Send,
  TrendingDown,
  X,
  type LucideIcon,
} from "lucide-react";
import type { Channel } from "@/lib/types";

/* ---------- formatters ---------- */
export const money = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

export const moneyShort = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);

export const pct = (n: number, d = 1) => `${(n * 100).toFixed(d)}%`;

export const filing = (v: string) =>
  v
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

export const plainOrg = (v: string) =>
  v
    .replace(/\s*\(\s*simulated\s*\)/gi, "")
    .replace(/\s*[—–-]+\s*simulated\b/gi, "")
    .replace(/\bsimulated\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

export const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 19 ? "Good afternoon" : "Good evening";
};

/* ---------- channels & feed kinds ---------- */
export const CHANNEL: Record<Channel, { label: string; icon: LucideIcon }> = {
  email: { label: "Email", icon: Mail },
  whatsapp: { label: "WhatsApp", icon: MessageCircle },
  telegram: { label: "Telegram", icon: Send },
};

export function ChannelIcon({ channel, size = 14 }: { channel: Channel; size?: number }) {
  const Icon = CHANNEL[channel].icon;
  return <Icon size={size} />;
}

export type FeedKind = "market" | "news" | "social" | "life" | "chat";

export const KIND: Record<FeedKind, { label: string; icon: LucideIcon; color: string }> = {
  market: { label: "Market drop", icon: TrendingDown, color: "var(--rose)" },
  news: { label: "News", icon: Newspaper, color: "var(--lav)" },
  social: { label: "Social signal", icon: Radar, color: "var(--lime)" },
  life: { label: "Life date", icon: HeartHandshake, color: "var(--amber)" },
  chat: { label: "From chat", icon: MessageCircle, color: "#ffffff" },
};

export function KindBadge({ kind }: { kind: FeedKind }) {
  const k = KIND[kind];
  const Icon = k.icon;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider"
      style={{ color: k.color, background: `color-mix(in srgb, ${k.color} 14%, transparent)` }}
    >
      <Icon size={11} />
      {k.label}
    </span>
  );
}

/* ---------- avatar ---------- */
const GRADS = [
  ["#aab4f0", "#5a67d8"],
  ["#bcd600", "#5f8f00"],
  ["#f5c26b", "#d9822b"],
  ["#ff8fa3", "#b83a7a"],
  ["#7fd6ff", "#3b6fd8"],
];

export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const parts = name.replace(/[&·]/g, " ").split(/\s+/).filter(Boolean);
  const initials = ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
  const g = GRADS[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % GRADS.length];
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-navy"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.36,
        background: `linear-gradient(135deg, ${g[0]}, ${g[1]})`,
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.4)",
      }}
    >
      {initials}
    </span>
  );
}

/* ---------- small visuals ---------- */
export function Ring({
  value,
  size = 56,
  label,
}: {
  value: number;
  size?: number;
  label?: string;
}) {
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, value));
  const color = v >= 70 ? "var(--lime)" : v >= 40 ? "var(--amber)" : "var(--rose)";
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} title={label}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={5} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={5}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - v / 100)}
          style={{ transition: "stroke-dashoffset 0.8s ease" }}
        />
      </svg>
      <span
        className="absolute inset-0 flex items-center justify-center font-semibold"
        style={{ fontSize: size * 0.3 }}
      >
        {Math.round(v)}
      </span>
    </div>
  );
}

export function Meter({ value, color = "var(--lime)" }: { value: number; color?: string }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
      <div
        className="h-full rounded-full"
        style={{ width: `${Math.max(3, Math.min(100, value * 100))}%`, background: color, transition: "width 0.6s" }}
      />
    </div>
  );
}

export function Dots({ level, max = 3 }: { level: number; max?: number }) {
  return (
    <span className="inline-flex gap-0.5" aria-label={`Impact ${level} of ${max}`}>
      {Array.from({ length: max }).map((_, i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 rounded-full"
          style={{ background: i < level ? "var(--lime)" : "rgba(255,255,255,0.18)" }}
        />
      ))}
    </span>
  );
}

const DONUT = ["#bcd600", "#aab4f0", "#f5c26b", "#ff8fa3", "#7fd6ff", "#8f7bff", "#5a67d8", "#ffffff"];
export const donutColor = (i: number) => DONUT[i % DONUT.length];

export function Donut({
  parts,
  size = 150,
  center,
}: {
  parts: { value: number }[];
  size?: number;
  center?: ReactNode;
}) {
  const total = parts.reduce((a, p) => a + p.value, 0) || 1;
  const r = size / 2 - 12;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={14} />
        {parts.map((p, i) => {
          const len = (p.value / total) * c;
          const el = (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={donutColor(i)}
              strokeWidth={14}
              strokeDasharray={`${Math.max(0, len - 3)} ${c}`}
              strokeDashoffset={-offset}
              strokeLinecap="round"
            />
          );
          offset += len;
          return el;
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{center}</div>
    </div>
  );
}

/* ---------- layout bits ---------- */
export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
}: {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="mt-1 text-[28px] font-semibold leading-tight tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1.5 text-sm text-white/55">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function Stat({
  label,
  value,
  icon: Icon,
  tone = "lav",
  hint,
}: {
  label: string;
  value: ReactNode;
  icon: LucideIcon;
  tone?: "lav" | "lime" | "amber" | "rose";
  hint?: string;
}) {
  const color = { lav: "var(--lav)", lime: "var(--lime)", amber: "var(--amber)", rose: "var(--rose)" }[tone];
  return (
    <div className="glass flex items-center gap-4 px-5 py-4">
      <span
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
        style={{ color, background: `color-mix(in srgb, ${color} 15%, transparent)` }}
      >
        <Icon size={20} />
      </span>
      <div className="min-w-0">
        <p className="text-2xl font-semibold leading-none tabular-nums">{value}</p>
        <p className="mt-1.5 truncate text-[11px] text-white/55">{label}</p>
        {hint && <p className="sr-only">{hint}</p>}
      </div>
    </div>
  );
}

export function Empty({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text?: string }) {
  return (
    <div className="glass flex flex-col items-center gap-2 px-6 py-14 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/8 text-lav">
        <Icon size={22} />
      </span>
      <p className="text-sm font-medium">{title}</p>
      {text && <p className="max-w-xs text-xs text-white/50">{text}</p>}
    </div>
  );
}

export function Toast({ tone, children }: { tone: "ok" | "error"; children: ReactNode }) {
  return (
    <div
      className={`animate-rise rounded-2xl px-4 py-2.5 text-xs font-medium ${
        tone === "ok" ? "bg-lime/15 text-lime" : "bg-rose/15 text-rose"
      }`}
    >
      {children}
    </div>
  );
}

export function Drawer({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="animate-fade absolute inset-0 bg-navy/60 backdrop-blur-sm" onClick={onClose} />
      <aside className="glass-strong animate-slide-in relative m-3 flex w-full max-w-[520px] flex-col overflow-hidden">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/70 hover:bg-white/20 hover:text-white"
        >
          <X size={16} />
        </button>
        {children}
      </aside>
    </div>
  );
}

export function Skeletons({ n = 3, h = 96 }: { n?: number; h?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="skeleton" style={{ height: h }} />
      ))}
    </div>
  );
}
