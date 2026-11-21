import { NextRequest, NextResponse } from "next/server";
import { approveAllForSignal, ensureStore, getStore, updateDraft } from "@/lib/store";
import type { DraftStatus } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  try {
    const store = await ensureStore();
    return NextResponse.json({
      ok: true,
      meta: store.meta,
      signals: store.signals,
      drafts: store.drafts,
      impactsBySignal: store.impactsBySignal,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Desk failed";
    return NextResponse.json({ ok: false, error: message, signals: [], drafts: [] }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  await ensureStore();
  const body = (await req.json()) as {
    id?: string;
    status?: DraftStatus;
    subject?: string;
    body?: string;
    approveAllSignalId?: string;
  };

  if (body.approveAllSignalId) {
    const n = approveAllForSignal(body.approveAllSignalId);
    return NextResponse.json({ ok: true, approved: n, drafts: getStore().drafts });
  }

  if (!body.id) {
    return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });
  }

  const draft = updateDraft(body.id, {
    subject: body.subject,
    body: body.body,
    status: body.status,
  });

  if (!draft) {
    return NextResponse.json({ ok: false, error: "draft not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, draft, drafts: getStore().drafts });
}
