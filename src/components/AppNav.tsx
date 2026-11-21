"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "News inbox" },
  { href: "/clients", label: "Clients" },
];

export default function AppNav() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-line/70 bg-ink text-paper">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3">
        <Link href="/" className="display text-lg font-semibold tracking-tight">
          First to know
        </Link>
        <div className="flex items-center gap-1">
          {LINKS.map((l) => {
            const active =
              l.href === "/"
                ? pathname === "/"
                : pathname === l.href || pathname.startsWith(`${l.href}/`);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                  active
                    ? "bg-accent text-white"
                    : "text-emerald-50/80 hover:bg-ink-soft hover:text-white"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
