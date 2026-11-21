import { NextResponse } from "next/server";
import { loadAllProfiles } from "@/lib/profiles";

export const dynamic = "force-dynamic";

export async function GET() {
  const profiles = loadAllProfiles().map((p) => ({
    slug: p.slug,
    displayName: p.displayName,
    city: p.city,
    state: p.state,
    score: p.score,
    taxFilingStatus: p.taxFilingStatus,
    salaryTotal: p.salaryTotal,
    techWeight: p.techWeight,
    investableApprox: p.investableApprox,
    tickers: p.tickers,
    childCount: p.childCount,
    goals: p.goals,
    persona: {
      decisionStyle: p.persona.decisionStyle,
      riskOrientation: p.persona.riskOrientation,
      concerns: p.persona.concerns.slice(0, 3),
    },
  }));
  return NextResponse.json({ ok: true, profiles });
}
