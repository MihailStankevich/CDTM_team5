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

  const body = [
    `Hi ${name},`,
    "",
    tone.opener,
    "",
    `Headline: ${signal.headline}`,
    "",
    "What it means for you:",
    ...bullets,
    "",
    tone.closer,
    "",
    "— Your advisor (draft for approval)",
  ].join("\n");

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

export async function maybePolishWithLlm(
  draft: MessageDraft,
  signal: NewsSignal,
): Promise<MessageDraft> {
  const apiKey = process.env.SHERPAS_LLM_API_KEY || process.env.OPENAI_API_KEY;
  const baseUrl =
    process.env.SHERPAS_LLM_BASE_URL || "https://llm-hackathon.sherpaswealth.com/v1";

  if (!apiKey) return draft;

  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.SHERPAS_LLM_MODEL || "gpt-4o-mini",
        temperature: 0.4,
        messages: [
          {
            role: "system",
            content:
              "You rewrite advisor-to-client messages. Keep facts and dollar amounts unchanged. Warm, concise, US English. No promises about future returns. Return only the message body.",
          },
          {
            role: "user",
            content: `News: ${signal.headline}\n\nDraft:\n${draft.body}`,
          },
        ],
      }),
    });
    if (!res.ok) return draft;
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const polished = data.choices?.[0]?.message?.content?.trim();
    if (!polished) return draft;
    return { ...draft, body: polished };
  } catch {
    return draft;
  }
}
