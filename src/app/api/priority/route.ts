import { NextRequest, NextResponse } from "next/server";
import { ensureStore } from "@/lib/store";
import { findSlot, isoDate, type Task } from "@/lib/dayTasks";
import { buildCandidates, loadFamilyFeatures } from "@/lib/priority/features";
import { CONFIG, prioritize, scheduleByPriority } from "@/lib/priority/model";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * GET  /api/priority                -> ranked board, approval queue, recap and a proposed agenda
 * POST /api/priority { tasks: Task[] } -> same, but the agenda avoids the advisor's existing calls/meetings
 * Optional ?today=YYYY-MM-DD to replay another day, and ?event=<signal id> to pick which market event is "today"
 * (default: the most recent one), e.g. ?event=replay-liberation-day-tariffs-announced.
 */
async function run(req: NextRequest, existing: Task[]) {
  const today = req.nextUrl.searchParams.get("today") ?? isoDate(new Date());
  const store = await ensureStore();
  const families = loadFamilyFeatures();
  const event = req.nextUrl.searchParams.get("event") ?? undefined; // signal id to treat as today's market event
  const candidates = buildCandidates(store.signals, store.drafts, today, event);
  const result = prioritize(candidates, families, today);

  const taken = existing
    .filter((t) => (t.type === "llamada" || t.type === "reunion") && !t.done)
    .map((t) => ({ date: t.date ?? today, time: t.time }));
  const agenda = scheduleByPriority(result.tasks, (slug, range, takenNow) =>
    findSlot(
      slug,
      range,
      takenNow.map((s, i) => ({ id: `t${i}`, title: "", slug: "", note: "", done: false, type: "reunion", ...s })),
      new Date(`${today}T08:00`),
    ),
    taken,
  );

  return NextResponse.json({
    ok: true,
    today,
    families,
    config: CONFIG,
    ...result,
    agenda,
  });
}

export async function GET(req: NextRequest) {
  try {
    return await run(req, []);
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "Priority failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as { tasks?: Task[] };
    return await run(req, body.tasks ?? []);
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "Priority failed" }, { status: 500 });
  }
}
