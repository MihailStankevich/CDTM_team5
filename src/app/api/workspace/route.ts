import { NextResponse } from "next/server";
import { allMessages, readInbox } from "@/lib/inbox/state";
import { THREADS } from "@/lib/inbox/seed";
import { mapPool, writeClientNote } from "@/lib/draft/generator";
import { buildNurture } from "@/lib/nurture/build";
import { loadAllProfiles } from "@/lib/profiles";

export const dynamic = "force-dynamic";

export async function GET() {
  const profiles = loadAllProfiles();
  const inbox = readInbox();
  const nurture = buildNurture(profiles).filter(
    (n) => !inbox.dismissedIds.includes(n.id) && !inbox.approvedIds.includes(n.id),
  );

  await mapPool(nurture, 3, async (item) => {
    const profile = profiles.find((p) => p.slug === item.slug);
    const name =
      profile?.members.find((m) => m.role === "client")?.firstName ?? item.displayName;
    const written = await writeClientNote({
      cacheKey: `${item.id}:${item.why}`,
      clientName: name,
      voice: item.tone,
      situation: item.title,
      facts: [item.why, ...item.body.split("\n").filter((line) => line && !line.startsWith("Hi "))],
    });
    if (!written) return;
    item.subject = written.subject;
    item.body = written.body;
  });
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
  });
}
