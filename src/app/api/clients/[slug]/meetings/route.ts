import { NextRequest, NextResponse } from "next/server";
import { addMeeting, applyUpdates, getClientCrm } from "@/lib/crm/store";
import {
  DEMO_TRANSCRIPTS,
  extractLifeEventsHeuristic,
  extractLifeEventsWithLlm,
  toProfileUpdates,
} from "@/lib/meetings/extract";
import { llmAuth } from "@/lib/draft/generator";
import { getProfile } from "@/lib/profiles";
import type { MeetingRecord } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ slug: string }> },
) {
  const { slug } = await ctx.params;
  if (!getProfile(slug)) {
    return NextResponse.json({ ok: false, error: "Unknown family" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, meetings: getClientCrm(slug).meetings });
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ slug: string }> },
) {
  const { slug } = await ctx.params;
  if (!getProfile(slug)) {
    return NextResponse.json({ ok: false, error: "Unknown family" }, { status: 404 });
  }

  const contentType = req.headers.get("content-type") || "";
  let title = "Advisor meeting";
  let transcript = "";
  let audioFileName: string | undefined;
  let transcriptSource: MeetingRecord["transcriptSource"] = "upload_text";
  let useDemo = false;

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    title = String(form.get("title") || title);
    useDemo = String(form.get("demo") || "") === "true";
    const text = form.get("transcript");
    if (typeof text === "string" && text.trim()) {
      transcript = text.trim();
      transcriptSource = "upload_text";
    }
    const file = form.get("audio");
    if (file && typeof file !== "string" && file.size > 0) {
      audioFileName = file.name;
      // Whisper via proxy if available; otherwise keep any pasted transcript
      const whispered = await tryWhisper(file);
      if (whispered) {
        transcript = whispered;
        transcriptSource = "whisper";
      } else if (!transcript) {
        transcript = `[Audio received: ${file.name}, ${(file.size / 1024).toFixed(0)} KB. Transcription API unavailable — paste transcript or use demo.]`;
        transcriptSource = "upload_text";
      }
    }
  } else {
    const body = (await req.json()) as {
      title?: string;
      transcript?: string;
      demo?: boolean;
    };
    title = body.title || title;
    useDemo = Boolean(body.demo);
    if (body.transcript?.trim()) {
      transcript = body.transcript.trim();
      transcriptSource = "upload_text";
    }
  }

  if (useDemo || !transcript) {
    const demo = DEMO_TRANSCRIPTS[slug];
    if (demo) {
      title = demo.title;
      transcript = demo.transcript;
      transcriptSource = "demo";
    }
  }

  if (!transcript.trim()) {
    return NextResponse.json(
      { ok: false, error: "Provide transcript, audio, or demo=true" },
      { status: 400 },
    );
  }

  let events = extractLifeEventsHeuristic(transcript);
  const llmEvents = await extractLifeEventsWithLlm(transcript);
  if (llmEvents && llmEvents.length) {
    // Prefer union by eventType
    const byType = new Map(events.map((e) => [e.eventType, e]));
    for (const e of llmEvents) byType.set(e.eventType, e);
    events = [...byType.values()];
    if (transcriptSource === "upload_text") transcriptSource = "llm";
  }

  const meetingId = `mtg-${slug}-${Date.now()}`;
  const meeting: MeetingRecord = {
    id: meetingId,
    slug,
    createdAt: new Date().toISOString(),
    title,
    audioFileName,
    transcript,
    transcriptSource,
    extractedEvents: events,
    appliedUpdateIds: [],
  };

  addMeeting(slug, meeting);
  const updates = toProfileUpdates(slug, meetingId, events);
  const crm = applyUpdates(slug, updates);

  return NextResponse.json({
    ok: true,
    meeting,
    updates,
    crm,
  });
}

async function tryWhisper(file: File): Promise<string | null> {
  const auth = llmAuth();
  if (!auth) return null;

  try {
    const form = new FormData();
    form.append("file", file, file.name);
    form.append("model", "whisper-1");
    const res = await fetch(`${auth.url}/audio/transcriptions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${auth.key}` },
      body: form,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { text?: string };
    return data.text?.trim() || null;
  } catch {
    return null;
  }
}
