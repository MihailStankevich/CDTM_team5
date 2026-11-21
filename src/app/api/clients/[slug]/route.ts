import { NextRequest, NextResponse } from "next/server";
import { getClientCrm, updateNotes } from "@/lib/crm/store";
import { getLinkedInSim } from "@/lib/linkedin/sim";
import { getProfile } from "@/lib/profiles";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ slug: string }> },
) {
  const { slug } = await ctx.params;
  const profile = getProfile(slug);
  if (!profile) {
    return NextResponse.json({ ok: false, error: "Unknown family" }, { status: 404 });
  }
  const crm = getClientCrm(slug);
  return NextResponse.json({
    ok: true,
    profile,
    crm,
    linkedIn: getLinkedInSim(slug, profile),
    household: [
      ...profile.members.map((m) => ({
        firstName: m.firstName,
        age: m.age,
        role: m.role,
        riskProfile: m.riskProfile,
        source: "plan" as const,
      })),
      ...crm.extraMembers.map((m) => ({
        firstName: m.firstName,
        age: m.age,
        role: m.role,
        riskProfile: "",
        source: "meeting" as const,
        note: m.note,
      })),
    ],
  });
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ slug: string }> },
) {
  const { slug } = await ctx.params;
  if (!getProfile(slug)) {
    return NextResponse.json({ ok: false, error: "Unknown family" }, { status: 404 });
  }
  const body = (await req.json()) as { notes?: string };
  if (typeof body.notes === "string") {
    const crm = updateNotes(slug, body.notes);
    return NextResponse.json({ ok: true, crm });
  }
  return NextResponse.json({ ok: false, error: "Nothing to update" }, { status: 400 });
}
