import { NextResponse } from "next/server";
import { getClientCrm } from "@/lib/crm/store";
import { getLinkedInSim } from "@/lib/linkedin/sim";
import { loadAllProfiles } from "@/lib/profiles";

export const dynamic = "force-dynamic";

export async function GET() {
  const profiles = loadAllProfiles().map((p) => {
    const crm = getClientCrm(p.slug);
    return {
      slug: p.slug,
      displayName: p.displayName,
      city: p.city,
      state: p.state,
      score: p.score,
      members: p.members,
      childCount: p.childCount + crm.extraMembers.filter((m) => m.role === "child").length,
      salaryTotal: p.salaryTotal,
      techWeight: p.techWeight,
      tags: crm.tags,
      updateCount: crm.updates.length,
      meetingCount: crm.meetings.length,
      linkedIn: getLinkedInSim(p.slug, p),
      persona: {
        decisionStyle: p.persona.decisionStyle,
        riskOrientation: p.persona.riskOrientation,
        concerns: p.persona.concerns.slice(0, 3),
      },
    };
  });
  return NextResponse.json({ ok: true, clients: profiles });
}
