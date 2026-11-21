import { NextRequest, NextResponse } from "next/server";
import { ingest, rescore } from "@/lib/store";
import type { IngestMode } from "@/lib/pipeline";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as { mode?: IngestMode | "rescore" };
    if (body.mode === "rescore") {
      const store = await rescore();
      return NextResponse.json({
        ok: true,
        meta: store.meta,
        signalCount: store.signals.length,
        draftCount: store.drafts.length,
        signals: store.signals,
        drafts: store.drafts,
      });
    }
    const mode: IngestMode =
      body.mode === "rss" || body.mode === "both" || body.mode === "replay"
        ? body.mode
        : "rss";

    const store = await ingest(mode);
    return NextResponse.json({
      ok: true,
      meta: store.meta,
      signalCount: store.signals.length,
      draftCount: store.drafts.length,
      signals: store.signals,
      drafts: store.drafts,
      impactsBySignal: store.impactsBySignal,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Ingest failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function GET() {
  const store = await ingest("replay");
  return NextResponse.json({
    ok: true,
    meta: store.meta,
    signals: store.signals,
    drafts: store.drafts,
    impactsBySignal: store.impactsBySignal,
  });
}
