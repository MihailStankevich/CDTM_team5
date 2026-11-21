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
      investableApprox: p.investableApprox,
      taxFilingStatus: p.taxFilingStatus,
      techWeight: p.techWeight,
      tickers: p.tickers,
      nextGoal: p.goals.find((g) => g.monthsAway >= 0) ?? p.goals[0] ?? null,
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
