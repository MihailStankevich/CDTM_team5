"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Inbox, Users } from "lucide-react";

const LINKS = [
  { href: "/", label: "Today", icon: Home },
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/clients", label: "Clients", icon: Users },
];

export default function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden bg-paper md:flex-row">
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -left-40 -top-40 h-[560px] w-[560px] rounded-full opacity-50 blur-[120px]"
          style={{ background: "#e4e7ff", animation: "drift 18s ease-in-out infinite" }}
        />
        <div
          className="absolute -right-32 top-1/4 h-[480px] w-[480px] rounded-full opacity-40 blur-[120px]"
          style={{ background: "#f3e9ff", animation: "drift 24s ease-in-out infinite reverse" }}
        />
      </div>

      <aside className="relative z-30 hidden w-[84px] shrink-0 flex-col items-center py-5 md:flex">
        <Link
          href="/"
          title="First to know"
          className="glass flex h-12 w-12 items-center justify-center !rounded-2xl text-lg font-bold text-ink"
        >
          S
        </Link>
        <nav className="relative z-40 mt-8 flex flex-col gap-1.5 p-2">
          <div aria-hidden className="glass pointer-events-none absolute inset-0 !rounded-full" />
          {LINKS.map((l) => {
            const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
            const Icon = l.icon;
            return (
              <Link
                key={l.href}
                href={l.href}
                title={l.label}
                className={`group relative z-10 flex h-11 w-11 items-center justify-center rounded-full transition ${
                  active
                    ? "bg-ink text-white shadow-[0_6px_18px_rgba(28,28,30,0.16)]"
                    : "text-ink/45 hover:bg-black/5 hover:text-ink"
                }`}
              >
                <Icon size={19} strokeWidth={active ? 2.4 : 1.8} />
                <span className="pointer-events-none absolute left-14 z-50 whitespace-nowrap rounded-lg bg-white px-2.5 py-1 text-[11px] font-medium text-ink opacity-0 shadow-lg ring-1 ring-black/10 transition group-hover:opacity-100">
                  {l.label}
                </span>
              </Link>
            );
          })}
        </nav>
        <p
          className="mt-auto text-[9px] font-medium uppercase tracking-[0.3em] text-ink/30"
          style={{ writingMode: "vertical-rl" }}
        >
          Sherpas
        </p>
      </aside>

      <div className="relative z-10 flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-2.5 px-4 pb-1 pt-[max(0.75rem,env(safe-area-inset-top))] md:hidden">
          <Link href="/" className="glass flex h-9 w-9 items-center justify-center !rounded-xl text-sm font-bold text-ink">
            S
          </Link>
          <p className="text-sm font-semibold">First to know</p>
        </header>
        <main className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto pb-[calc(4.75rem+env(safe-area-inset-bottom))] md:pb-0">
          {children}
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-black/5 bg-white/85 px-2 backdrop-blur-xl md:hidden">
        <div className="mx-auto flex max-w-lg pb-[env(safe-area-inset-bottom)]">
          {LINKS.map((l) => {
            const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
            const Icon = l.icon;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium ${
                  active ? "text-ink" : "text-ink/40"
                }`}
              >
                <Icon size={20} strokeWidth={active ? 2.4 : 1.8} />
                {l.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
