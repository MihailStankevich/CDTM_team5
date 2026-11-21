import type { Channel, ClientProfile } from "./types";

export interface Voice {
  label: string;
  channel: Channel;
  signoff: string;
}

const CHANNEL: Record<string, Channel> = {
  "michael-carter": "whatsapp",
  "daniel-emily-johnson": "email",
  "samantha-lewis": "telegram",
  "timothy-melanie-weah": "telegram",
};

export function voiceFor(profile: ClientProfile): Voice {
  const style = profile.persona.decisionStyle.toLowerCase();
  const channel = CHANNEL[profile.slug] ?? "email";
  if (profile.score >= 70) {
    return {
      label: "Direct, short — high-confidence household",
      channel,
      signoff: "Reply if you want this on the next agenda. Otherwise I'll leave the plan as is.",
    };
  }
  if (style.includes("collaborator") || profile.score < 40) {
    return {
      label: "Warm, no pressure — still wants advice",
      channel,
      signoff: "Nothing you need to do tonight. Reply if you want to walk through it together.",
    };
  }
  return {
    label: "Plain and personal",
    channel,
    signoff: "Happy to adjust the plan if this changes anything for you.",
  };
}

export function firstName(profile: ClientProfile): string {
  return profile.members.find((m) => m.role === "client")?.firstName ?? profile.displayName;
}
