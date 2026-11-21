"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Markets", hint: "News → assets" },
  { href: "/inbox", label: "Inbox", hint: "All channels" },
  { href: "/today", label: "Life & pay", hint: "Dates and raises" },
  { href: "/clients", label: "Clients", hint: "People & CRM" },
];

export default function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="flex h-full w-56 shrink-0 flex-col bg-ink text-paper">
        <div className="px-5 pb-4 pt-6">
          <p className="text-[10px] uppercase tracking-[0.22em] text-emerald-200/70">Sherpas</p>
          <Link href="/" className="display mt-1 block text-xl font-semibold leading-tight">
            First to know
          </Link>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3">
          {LINKS.map((l) => {
            const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-lg px-3 py-2.5 transition ${
                  active ? "bg-accent text-white" : "text-emerald-50/80 hover:bg-white/10"
                }`}
              >
                <span className="block text-sm font-semibold">{l.label}</span>
                <span className={`block text-[11px] ${active ? "text-emerald-50" : "text-emerald-100/50"}`}>
                  {l.hint}
                </span>
              </Link>
            );
          })}
        </nav>
        <p className="px-5 pb-5 text-[11px] leading-relaxed text-emerald-100/50">
          Drafts stay here until you approve. Nothing is sent on its own.
        </p>
      </aside>
      <div className="min-h-0 min-w-0 flex-1 overflow-auto">{children}</div>
    </div>
  );
}
