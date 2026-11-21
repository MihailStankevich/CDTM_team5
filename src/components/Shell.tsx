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
    <div className="relative flex h-screen overflow-hidden bg-navy">
      {/* ambient light so the glass has something to refract */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -left-40 -top-40 h-[560px] w-[560px] rounded-full opacity-40 blur-[120px]"
          style={{ background: "#5a67d8", animation: "drift 18s ease-in-out infinite" }}
        />
        <div
          className="absolute -right-32 top-1/4 h-[480px] w-[480px] rounded-full opacity-25 blur-[120px]"
          style={{ background: "var(--lav)", animation: "drift 24s ease-in-out infinite reverse" }}
        />
        <div
          className="absolute bottom-[-180px] left-1/3 h-[380px] w-[380px] rounded-full opacity-[0.14] blur-[120px]"
          style={{ background: "var(--lime)", animation: "drift 30s ease-in-out infinite" }}
        />
      </div>

      <aside className="relative z-30 flex w-[84px] shrink-0 flex-col items-center py-5">
        <Link
          href="/"
          title="First to know"
          className="glass flex h-12 w-12 items-center justify-center !rounded-2xl text-lg font-bold text-lime"
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
                    ? "bg-lime text-navy shadow-[0_6px_20px_rgba(188,214,0,0.3)]"
                    : "text-white/55 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon size={19} strokeWidth={active ? 2.4 : 1.8} />
                <span className="pointer-events-none absolute left-14 z-50 whitespace-nowrap rounded-lg bg-navy-2 px-2.5 py-1 text-[11px] font-medium text-white opacity-0 shadow-xl ring-1 ring-white/10 transition group-hover:opacity-100">
                  {l.label}
                </span>
              </Link>
            );
          })}
        </nav>
        <p
          className="mt-auto text-[9px] font-medium uppercase tracking-[0.3em] text-white/30"
          style={{ writingMode: "vertical-rl" }}
        >
          Sherpas
        </p>
      </aside>

      <main className="relative z-10 min-h-0 min-w-0 flex-1 overflow-auto">{children}</main>
    </div>
  );
}
