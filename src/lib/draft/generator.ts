import type { ClientProfile, FamilyImpact, MessageDraft, NewsSignal } from "../types";

function firstName(profile: ClientProfile): string {
  return profile.members.find((m) => m.role === "client")?.firstName ?? profile.displayName;
}

function toneHint(profile: ClientProfile): { opener: string; closer: string } {
  const style = profile.persona.decisionStyle.toLowerCase();
  const risk = profile.persona.riskOrientation.toLowerCase();

  if (style.includes("collaborator") || style.includes("low")) {
    return {
      opener: "I wanted to reach you first with a short note — nothing you need to act on today.",
      closer:
        "Happy to walk through what this means for your plan whenever it suits you. Just reply to this message.",
    };
  }
  if (risk.includes("conservative") || risk.includes("cautious")) {
    return {
      opener: "Markets moved in a way that often feels uncomfortable. Here is the calm version for your plan.",
      closer: "Your plan already anticipates swings like this. Reply if you want a quick check-in.",
    };
  }
  return {
    opener: "A quick, personal update on something in the news that touches your plan.",
    closer: "No action needed unless you want to review. Reply anytime.",
  };
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

/** Writes the client note from facts. Returns null when no model key is set. */
export async function writeClientNote(input: {
  cacheKey: string;
  clientName: string;
  voice: string;
  situation: string;
  facts: string[];
}): Promise<{ subject: string; body: string } | null> {
  const cached = noteCache.get(input.cacheKey);
  if (cached) return cached;

  const auth = llmAuth();
  if (!auth) return null;

  try {
    const res = await fetch(`${auth.url}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${auth.key}`,
      },
      signal: AbortSignal.timeout(1500),
      body: JSON.stringify({
        model: process.env.SHERPAS_LLM_MODEL || "gpt-4o-mini",
        temperature: 0.5,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You write the short note a US financial advisor would actually send this client. Use only the facts provided. Do not invent numbers, employers, or family events. Never say the data is simulated, synthetic, or a demo. 4 to 6 sentences, plain speech, no headings, no bullet labels, no sign-off that says draft. Match the voice. Return JSON {\"subject\":\"\",\"body\":\"\"}.",
          },
          {
            role: "user",
            content: JSON.stringify({
              client: input.clientName,
              voice: input.voice,
              situation: input.situation,
              facts: input.facts
                .map((fact) => fact.replace(/\bsimulated\b/gi, "").replace(/\s+/g, " ").trim())
                .filter(Boolean)
                .slice(0, 5),
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
    if (!parsed.body?.trim()) return null;
    const written = {
      subject: parsed.subject?.trim() || input.situation.slice(0, 80),
      body: parsed.body.trim(),
    };
    noteCache.set(input.cacheKey, written);
    return written;
  } catch {
    return null;
  }
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
  const tone = toneHint(profile);
  const bullets = impact.touches_this_family.slice(0, 3).map((t) => `• ${t}`);

  const subject =
    signal.moment === "rule"
      ? `${name}: what the 2027 tax updates mean for you`
      : `${name}: ${signal.headline.slice(0, 72)}${signal.headline.length > 72 ? "…" : ""}`;

  const body = [`Hi ${name},`, "", ...bullets, "", tone.closer].join("\n");

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
  const name = firstName(profile);
  const written = await writeClientNote({
    cacheKey: `${draft.id}:${signal.headline}:${draft.touches.join("|").slice(0, 160)}`,
    clientName: name,
    voice: toneHint(profile).opener,
    situation: signal.headline,
    facts: draft.touches,
  });
  if (!written) return draft;
  return { ...draft, subject: written.subject, body: written.body };
}
