import { NextResponse } from "next/server";
import { allMessages, readInbox } from "@/lib/inbox/state";
import { THREADS } from "@/lib/inbox/seed";
import { buildNurture } from "@/lib/nurture/build";
import { loadAllProfiles } from "@/lib/profiles";

export const dynamic = "force-dynamic";

export async function GET() {
  const profiles = loadAllProfiles();
  const inbox = readInbox();
  const nurture = buildNurture(profiles).filter(
    (n) => !inbox.dismissedIds.includes(n.id) && !inbox.approvedIds.includes(n.id),
  );
  const messages = allMessages();
  const threads = THREADS.map((t) => {
    const profile = profiles.find((p) => p.slug === t.slug);
    const msgs = messages.filter((m) => m.slug === t.slug);
    const last = msgs[msgs.length - 1];
    const waiting = last?.direction === "in";
    return {
      ...t,
      displayName: profile?.displayName ?? t.slug,
      score: profile?.score ?? 0,
      waiting,
      last,
      count: msgs.length,
    };
  });

  const counts = {
    email: threads.filter((t) => t.channel === "email").length,
    whatsapp: threads.filter((t) => t.channel === "whatsapp").length,
    telegram: threads.filter((t) => t.channel === "telegram").length,
    waiting: threads.filter((t) => t.waiting).length,
    nurture: nurture.length,
  };

  return NextResponse.json({
    ok: true,
    nurture,
    threads,
    counts,
    sources: [
      {
        name: "News",
        status: "Live wires",
        detail:
          "Headlines pulled now from Yahoo Finance, CNBC, and Google News on rates, technology, trade, and tax. A story stays on the desk only if it touches a fund or a rule on a plan. Past shocks in the case files are optional.",
      },
      {
        name: "Funds & holdings",
        status: "From the plan",
        detail:
          "Tickers, sectors, and past drawdowns come from investment-analysis.json. We do not scrape live fund NAVs.",
      },
      {
        name: "LinkedIn",
        status: "Simulated",
        detail:
          "Employer, title, and posts are simulated per family. The challenge forbids scraping real people.",
      },
      {
        name: "Chats",
        status: "Simulated inbox",
        detail:
          "WhatsApp, email, and Telegram threads are demo conversations in one advisor inbox. Inbound text updates the client record the same way a meeting transcript does.",
      },
    ],
  });
}
