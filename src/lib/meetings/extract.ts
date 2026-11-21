import type { LifeEventType, ProfileUpdate } from "../types";

export interface ExtractedEvent {
  eventType: LifeEventType;
  summary: string;
  fieldsChanged: string[];
  source: "meeting";
}

const PATTERNS: {
  type: LifeEventType;
  re: RegExp;
  fields: string[];
  summary: (m: RegExpMatchArray, text: string) => string;
}[] = [
  {
    type: "child_born",
    re: /\b(had a (?:baby|child)|gave birth|newborn|baby (?:boy|girl)|our (?:son|daughter) was born|named (?:him|her) ([A-Z][a-z]+)|baby named ([A-Z][a-z]+))\b/i,
    fields: ["household", "childCount", "insurance", "college_goals"],
    summary: (m) => {
      const name = m[2] || m[3];
      return name
        ? `New child reported in meeting — named ${name}. Review life insurance, emergency fund and dependent benefits.`
        : "New child reported in meeting. Review life insurance, emergency fund and dependent benefits.";
    },
  },
  {
    type: "promotion",
    re: /\b(promoted|promotion|new title|made (?:VP|director|partner)|raise of \$?([\d,]+)|salary (?:went|increased) to \$?([\d,]+))\b/i,
    fields: ["income", "tax_filing", "savings_rate"],
    summary: (m, text) => {
      const amt = m[2] || m[3];
      return amt
        ? `Promotion / pay change mentioned (≈$${amt}). Revisit savings rate and tax withholding.`
        : `Career step-up mentioned: "${text.slice(0, 120)}…". Revisit income and plan contributions.`;
    },
  },
  {
    type: "job_change",
    re: /\b(new job|switching (?:jobs|companies)|accepted an offer|starting at|left (?:my|the) (?:job|company)|joining )\b/i,
    fields: ["employer", "income", "401k", "rsus"],
    summary: () =>
      "Job change mentioned. Update employer, benefits, 401(k) and equity/RSU assumptions.",
  },
  {
    type: "layoff_risk",
    re: /\b(layoffs?|laid off|RIFs?|job (?:is )?at risk|worried about (?:my )?job|restructuring)\b/i,
    fields: ["emergency_fund", "cash_runway", "employer_risk"],
    summary: () =>
      "Employer / layoff risk raised. Prioritize cash runway and avoid forced selling of investments.",
  },
  {
    type: "home_intent",
    re: /\b(looking at houses|house hunting|making an offer|buying a (?:home|house)|toured a place|earnest money)\b/i,
    fields: ["goals", "cash", "liquidity"],
    summary: () =>
      "Home-purchase intent discussed. Align down-payment cash and investment sales with the plan.",
  },
  {
    type: "marriage",
    re: /\b(getting married|engaged|wedding next|we got married)\b/i,
    fields: ["household", "tax_filing_status", "beneficiaries"],
    summary: () =>
      "Marriage / engagement mentioned. Check filing status, beneficiaries and joint goals.",
  },
  {
    type: "inheritance",
    re: /\b(inheritance|inherited|trust distribution|parent (?:passed|died)|estate )\b/i,
    fields: ["assets", "tax", "investable"],
    summary: () =>
      "Inheritance or estate event mentioned. Update assets and tax planning.",
  },
  {
    type: "college_plan",
    re: /\b(529|college fund|tuition|campus visits|applying to colleges)\b/i,
    fields: ["goals", "education"],
    summary: () => "College funding conversation. Confirm 529 / goal dates in the plan.",
  },
  {
    type: "health",
    re: /\b(diagnosis|surgery|disability|health scare|medical leave)\b/i,
    fields: ["insurance", "cash_flow"],
    summary: () =>
      "Health event mentioned. Review disability cover, HSA and short-term cash needs.",
  },
];

function findBabyName(transcript: string): string | undefined {
  const named = transcript.match(
    /\b(?:named|name(?:d)? (?:is|her|him))\s+([A-Z][a-z]+)\b/,
  );
  return named?.[1];
}

export function extractLifeEventsHeuristic(transcript: string): ExtractedEvent[] {
  const found: ExtractedEvent[] = [];
  const seen = new Set<LifeEventType>();

  for (const p of PATTERNS) {
    const m = transcript.match(p.re);
    if (!m || seen.has(p.type)) continue;
    seen.add(p.type);
    let summary = p.summary(m, transcript);
    if (p.type === "child_born") {
      const babyName = m[2] || m[3] || findBabyName(transcript);
      if (babyName) {
        summary = `New child reported in meeting — named ${babyName}. Review life insurance, emergency fund and dependent benefits.`;
      }
    }
    found.push({
      eventType: p.type,
      summary,
      fieldsChanged: p.fields,
      source: "meeting",
    });
  }

  if (!seen.has("child_born")) {
    const babyName = findBabyName(transcript);
    if (
      babyName &&
      /\b(baby|newborn|son|daughter|child|gave birth)\b/i.test(transcript)
    ) {
      found.push({
        eventType: "child_born",
        summary: `New child reported in meeting — named ${babyName}. Review life insurance, emergency fund and dependent benefits.`,
        fieldsChanged: ["household", "childCount", "insurance", "college_goals"],
        source: "meeting",
      });
    }
  }

  return found;
}

export async function extractLifeEventsWithLlm(
  transcript: string,
): Promise<ExtractedEvent[] | null> {
  const apiKey = process.env.SHERPAS_LLM_API_KEY || process.env.OPENAI_API_KEY || process.env.TEAM_KEY;
  const baseUrl =
    process.env.SHERPAS_LLM_BASE_URL ||
    process.env.LLM_PROXY_URL ||
    "https://llm-hackathon.sherpaswealth.com/v1";

  if (!apiKey) return null;

  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.SHERPAS_LLM_MODEL || "gpt-4o-mini",
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              'Extract life events from an advisor-client meeting transcript. Return JSON {"events":[{"eventType":"child_born|job_change|promotion|layoff_risk|home_intent|marriage|divorce|inheritance|health|college_plan|other","summary":"one sentence","fieldsChanged":["household"]}]} . Only real new facts. Empty array if none.',
          },
          { role: "user", content: transcript.slice(0, 8000) },
        ],
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const raw = data.choices?.[0]?.message?.content;
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      events?: { eventType: LifeEventType; summary: string; fieldsChanged?: string[] }[];
    };
    return (parsed.events ?? []).map((e) => ({
      eventType: e.eventType,
      summary: e.summary,
      fieldsChanged: e.fieldsChanged ?? [],
      source: "meeting" as const,
    }));
  } catch {
    return null;
  }
}

export function toProfileUpdates(
  slug: string,
  meetingId: string,
  events: ExtractedEvent[],
): ProfileUpdate[] {
  const now = new Date().toISOString();
  return events.map((e, i) => ({
    id: `upd-${meetingId}-${i}`,
    slug,
    createdAt: now,
    source: "meeting",
    eventType: e.eventType,
    summary: e.summary,
    fieldsChanged: e.fieldsChanged,
    meetingId,
    approved: true,
  }));
}

export const DEMO_TRANSCRIPTS: Record<string, { title: string; transcript: string }> = {
  "michael-carter": {
    title: "Q4 check-in — home + career",
    transcript: `Advisor: Good to see you, Michael. How are things in Austin?
Michael: Busy. We toured three houses last weekend — we're house hunting hard for that January 2027 purchase. Also, I got promoted to Senior PM last month; the raise is about $20,000 and more RSUs.
Advisor: Congrats. Anything else changing in the household?
Michael: Not yet — still single — but my mom mentioned a small inheritance might come through next year. And honestly I'm watching layoffs at a few peer teams; my job isn't at risk today but I want a bigger cash cushion.`,
  },
  "daniel-emily-johnson": {
    title: "Family update — new baby",
    transcript: `Advisor: Emily, Daniel — what's new since the plan review?
Emily: Big news — we had a baby! Our daughter was born in October, named Nora. Oliver and Sophia are adjusting.
Daniel: We're thinking about life insurance again, and whether the emergency fund is enough with three kids.
Advisor: We'll update the household and protection gaps. Any job changes?
Daniel: Same employers. Emily is considering a shorter schedule for six months.`,
  },
  "samantha-lewis": {
    title: "College + second home",
    transcript: `Advisor: Samantha, how are the teens?
Samantha: Campus visits start this spring — we're applying to colleges for the older one. I also looked at a condo in Naples; not making an offer yet but I'm house hunting for that 2030 second home. Work is stable; no promotion this cycle.`,
  },
  "timothy-melanie-weah": {
    title: "Cash, card, and employer chatter",
    transcript: `Advisor: Timothy, Melanie — priorities this month?
Melanie: The card at 18% still bothers me. Liam's school enrollment is done.
Timothy: There are layoffs at two neighboring SF startups. My job is fine, but job at risk talk is everywhere. We also talked about another child someday — not pregnant, just thinking.
Advisor: Let's shore up cash runway first.`,
  },
};
