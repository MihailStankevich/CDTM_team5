import type { ClientProfile, FamilyImpact, MessageDraft, NewsSignal } from "../types";

function firstName(profile: ClientProfile): string {
  return profile.members.find((m) => m.role === "client")?.firstName ?? profile.displayName;
}

function partnerName(profile: ClientProfile): string | null {
  return profile.members.find((m) => m.role === "co-client")?.firstName ?? null;
}

function childNames(profile: ClientProfile): string[] {
  return profile.members.filter((m) => m.role === "child").map((m) => m.firstName);
}

function nearestGoal(profile: ClientProfile) {
  const goals = [...profile.goals].sort((a, b) => a.monthsAway - b.monthsAway);
  return goals.find((g) => !/vacation/i.test(g.name)) ?? goals[0] ?? null;
}

/** Names or a goal word that must appear, so two notes cannot be swapped. */
function requiredPhrases(profile: ClientProfile): string[] {
  const partner = partnerName(profile);
  const kids = childNames(profile);
  if (partner && kids.length) return [partner, ...kids];
  if (partner) return [partner];
  if (kids.length) return kids;
  const goal = nearestGoal(profile);
  if (goal) return [goal.name];
  return [profile.city];
}

function howToSound(profile: ClientProfile): string {
  const style = profile.persona.decisionStyle.toLowerCase();
  const partner = partnerName(profile);
  const name = firstName(profile);
  if (style.includes("validator")) {
    return "Short. Lead with the dollar figure. She checks a number before she acts. End by asking her to confirm it. Do not offer a call.";
  }
  if (style.includes("dual") && partner) {
    return `Plain enough for both ${name} and ${partner}. No jargon. Say what you would leave as it is.`;
  }
  if (partner) {
    return `Warm and unhurried. Use ${partner}'s name as someone who decides with ${name}. Do not say stay calm or stay the course.`;
  }
  return "Direct and short. One consequence for the plan. Do not offer a call.";
}

/** Facts that are true of this household and not of the others. */
export function clientCard(profile: ClientProfile) {
  return {
    name: firstName(profile),
    household: profile.displayName,
    mustContain: requiredPhrases(profile),
    howToSound: howToSound(profile),
  };
}

function personalFallback(profile: ClientProfile, touches: string[]): string {
  const name = firstName(profile);
  const partner = partnerName(profile);
  const fact = (touches[0] ?? "This headline touches a fund on the plan.").replace(/\s+/g, " ").trim();
  const style = profile.persona.decisionStyle.toLowerCase();
  const who = requiredPhrases(profile).join(" and ");
  let close = "Nothing changes unless you tell me you want it to.";
  if (style.includes("validator")) {
    close = "If the figure looks wrong, say so and I will pull the account before we touch anything.";
  } else if (style.includes("dual") && partner) {
    close = `Same note for you and ${partner}. I would leave the plan as it is.`;
  } else if (partner) {
    close = `No move tonight. You and ${partner} can look at it if you want.`;
  }
  return [`Hi ${name},`, "", `${fact} This one is about ${who}.`, "", close].join("\n");
}

const noteCache = new Map<string, { subject: string; body: string }>();

function withV1(raw: string): string {
  const trimmed = raw.replace(/\/$/, "");
  return trimmed.endsWith("/v1") ? trimmed : `${trimmed}/v1`;
}

/** Team key talks to the Sherpas proxy. A plain OpenAI key talks to OpenAI. */
function llmAuth(): { url: string; key: string } | null {
  const team = process.env.TEAM_KEY || process.env.SHERPAS_LLM_API_KEY;
  if (team) {
    return {
      key: team,
      url: withV1(
        process.env.SHERPAS_LLM_BASE_URL ||
          process.env.LLM_PROXY_URL ||
          "https://llm-hackathon.sherpaswealth.com/v1",
      ),
    };
  }
  const openai = process.env.OPENAI_API_KEY;
  if (openai) {
    return {
      key: openai,
      url: withV1(process.env.OPENAI_BASE_URL || "https://api.openai.com/v1"),
    };
  }
  return null;
}

export function modelConfigured(): boolean {
  return llmAuth() !== null;
}

/** Writes one note for this household. Returns null when no model key is set or the call fails. */
export async function writeClientNote(input: {
  cacheKey: string;
  situation: string;
  about: ReturnType<typeof clientCard>;
  happened: string;
  facts: string[];
}): Promise<{ subject: string; body: string } | null> {
  const cached = noteCache.get(input.cacheKey);
  if (cached) return cached;

  const auth = llmAuth();
  if (!auth) return null;

  const facts = input.facts
    .map((fact) => fact.replace(/\bsimulated\b/gi, "").replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .slice(0, 4);
  let reminder = "";

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(`${auth.url}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.key}`,
        },
        signal: AbortSignal.timeout(12000),
        body: JSON.stringify({
          model: process.env.SHERPAS_LLM_MODEL || "gpt-4o-mini",
          temperature: 0.4,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content:
                "You write one note to one household. Another client gets the same headline, so the note must become nonsense if the names are swapped. Use only the card and the holding facts. Do not add a vacation, a job, an age, or any amount that is not in the facts. Do not use a person's name unless it is the client or listed in mustContain. 4 to 6 sentences. No bullets. Work every mustContain string into a sentence about them, then explain the holding in words with the amounts given. The last sentence follows howToSound and nothing else. Do not write \"I wanted to\", \"feel free\", \"stay calm\", \"stay the course\", or \"long-term goals\". Never say simulated or demo. Return JSON {\"subject\":\"\",\"body\":\"\"}. Subject is for this person, not the headline.",
            },
            {
              role: "user",
              content: JSON.stringify({
                about: input.about,
                situation: input.situation,
                whatHappened: input.happened.slice(0, 400),
                holdingsThisTouches: facts,
                reminder,
              }),
            },
          ],
        }),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const raw = data.choices?.[0]?.message?.content;
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { subject?: string; body?: string };
      const body = parsed.body?.trim();
      if (!body) return null;
      const allowed = `${input.about.name} ${input.about.mustContain.join(" ")}`;
      const strangers = ["Melanie", "Liam", "Josh", "Ethan", "Ava", "Emily", "Oliver", "Sophia", "Nora", "Michael", "Daniel", "Samantha", "Timothy"].filter(
        (person) => body.includes(person) && !allowed.includes(person),
      );
      const missing = input.about.mustContain.filter((phrase) => !body.toLowerCase().includes(phrase.toLowerCase()));
      if ((missing.length || strangers.length) && attempt === 0) {
        const bits = [
          missing.length ? `Include: ${missing.join(", ")}.` : "",
          strangers.length ? `Remove ${strangers.join(", ")}. They are not this client.` : "",
        ].filter(Boolean);
        reminder = bits.join(" ");
        continue;
      }
      const written = {
        subject: parsed.subject?.trim() || `${input.about.name}: ${input.situation.slice(0, 72)}`,
        body,
      };
      noteCache.set(input.cacheKey, written);
      return written;
    } catch {
      return null;
    }
  }
  return null;
}

export async function mapPool<T>(items: T[], limit: number, worker: (item: T) => Promise<void>) {
  let index = 0;
  async function run() {
    while (index < items.length) {
      const current = items[index];
      index += 1;
      await worker(current);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => run()));
}

export function generateDraft(
  signal: NewsSignal,
  impact: FamilyImpact,
  profile: ClientProfile,
): MessageDraft {
  const name = firstName(profile);
  const subject =
    signal.moment === "rule"
      ? `${name}: what the 2027 tax updates mean for you`
      : `${name}: ${signal.headline.slice(0, 72)}${signal.headline.length > 72 ? "…" : ""}`;

  const body = personalFallback(profile, impact.touches_this_family);

  return {
    id: `draft-${signal.id}-${impact.slug}`,
    signalId: signal.id,
    slug: impact.slug,
    displayName: impact.displayName,
    subject,
    body,
    status: "pending",
    impactScore: impact.score,
    touches: impact.touches_this_family,
    reasons: impact.reasons,
  };
}

export async function composeDraft(
  draft: MessageDraft,
  signal: NewsSignal,
  profile: ClientProfile,
): Promise<MessageDraft> {
  const written = await writeClientNote({
    cacheKey: `personal5:${draft.id}:${signal.headline}:${draft.touches.join("|").slice(0, 160)}`,
    situation: signal.headline,
    about: clientCard(profile),
    happened: signal.what_happened,
    facts: draft.touches,
  });
  if (!written) return draft;
  return { ...draft, subject: written.subject, body: written.body };
}
