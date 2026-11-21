import { NextRequest, NextResponse } from "next/server";
import { applyUpdates } from "@/lib/crm/store";
import { allMessages, messagesFor, readInbox, writeInbox } from "@/lib/inbox/state";
import { THREADS } from "@/lib/inbox/seed";
import { syncChatsIntoCrm } from "@/lib/inbox/sync";
import { extractLifeEventsHeuristic, toProfileUpdates } from "@/lib/meetings/extract";
import { buildNurture } from "@/lib/nurture/build";
import { loadAllProfiles } from "@/lib/profiles";
import type { Channel, ChatMessage } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug");
  const profiles = loadAllProfiles();
  const messages = slug ? messagesFor(slug) : allMessages();
  return NextResponse.json({
    ok: true,
    threads: THREADS.map((t) => ({
      ...t,
      displayName: profiles.find((p) => p.slug === t.slug)?.displayName ?? t.slug,
    })),
    messages,
  });
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    action?: "sync" | "inbound" | "approve" | "dismiss";
    slug?: string;
    channel?: Channel;
    text?: string;
    nurtureId?: string;
  };

  if (body.action === "sync") {
    const result = syncChatsIntoCrm();
    return NextResponse.json({ ok: true, ...result });
  }

  if (body.action === "dismiss" && body.nurtureId) {
    const state = readInbox();
    if (!state.dismissedIds.includes(body.nurtureId)) state.dismissedIds.push(body.nurtureId);
    writeInbox(state);
    return NextResponse.json({ ok: true });
  }

  if (body.action === "approve" && body.nurtureId) {
    const profiles = loadAllProfiles();
    const item = buildNurture(profiles).find((n) => n.id === body.nurtureId);
    if (!item) {
      return NextResponse.json({ ok: false, error: "Suggestion not found" }, { status: 404 });
    }
    const state = readInbox();
    if (!state.approvedIds.includes(item.id)) {
      const message: ChatMessage = {
        id: `out-${item.id}-${Date.now()}`,
        slug: item.slug,
        channel: item.channel,
        direction: "out",
        at: new Date().toISOString(),
        body: item.body,
        nurtureId: item.id,
      };
      state.extraMessages.push(message);
      state.approvedIds.push(item.id);
      writeInbox(state);
    }
    return NextResponse.json({ ok: true, channel: item.channel, slug: item.slug });
  }

  if (body.action === "inbound" && body.slug && body.text?.trim()) {
    const thread = THREADS.find((t) => t.slug === body.slug);
    const channel = body.channel ?? thread?.channel ?? "email";
    const message: ChatMessage = {
      id: `in-${body.slug}-${Date.now()}`,
      slug: body.slug,
      channel,
      direction: "in",
      at: new Date().toISOString(),
      body: body.text.trim(),
    };
    const state = readInbox();
    state.extraMessages.push(message);
    writeInbox(state);

    const events = extractLifeEventsHeuristic(message.body);
    const updates = toProfileUpdates(body.slug, `chat-${message.id}`, events).map((u) => ({
      ...u,
      source: "manual" as const,
      summary: `${u.summary} (from ${channel} chat)`,
    }));
    if (updates.length) applyUpdates(body.slug, updates);
    if (!state.ingestedIds.includes(message.id)) {
      state.ingestedIds.push(message.id);
      writeInbox(state);
    }
    return NextResponse.json({ ok: true, message, updates });
  }

  return NextResponse.json({ ok: false, error: "Unknown action" }, { status: 400 });
}
