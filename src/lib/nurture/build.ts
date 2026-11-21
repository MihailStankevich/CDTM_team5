import { messagesFor } from "../inbox/state";
import { getLinkedInSim } from "../linkedin/sim";
import type { ClientProfile, NurtureItem } from "../types";
import { firstName, voiceFor } from "../voice";

function money(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function calmCopy(profile: ClientProfile): NurtureItem | null {
  if (profile.equityValue <= 0) return null;
  const worst = [...profile.drawdowns].sort(
    (a, b) => a.drawdownPct - b.drawdownPct,
  )[0];
  if (!worst || worst.drawdownPct > -0.03) return null;

  const voice = voiceFor(profile);
  const name = firstName(profile);
  const drop = Math.abs(worst.drawdownPct);
  const dollars = drop * profile.investableApprox;
  const recovered = worst.recoveryDays
    ? ` It took about ${worst.recoveryDays} days to recover last time.`
    : "";

  const soft =
    profile.score < 40
      ? `Your cash for near-term goals is the part I would not leave in the market if this keeps going. The long-term sleeve can stay.`
      : `This is inside the range the plan was built for. I would not sell the long-term mix because of a headline.`;

  return {
    id: `calm-${profile.slug}`,
    slug: profile.slug,
    displayName: profile.displayName,
    kind: "market_calm",
    channel: voice.channel,
    tone: voice.label,
    title: "Market drop — send calm, not a trade",
    why: `Worst recent shock in their book: ${worst.eventTitle} (${(drop * 100).toFixed(1)}%).`,
    subject: `${name}, I already looked — your plan expected this`,
    body: [
      `Hi ${name},`,
      "",
      `I saw the move before you had to ask. In a shock like "${worst.eventTitle}", your mix fell about ${(drop * 100).toFixed(1)}% — roughly ${money(dollars)} on today's ${money(profile.investableApprox)} book.${recovered}`,
      "",
      soft,
      "",
      voice.signoff,
    ].join("\n"),
  };
}

function milestoneCopy(profile: ClientProfile): NurtureItem | null {
  const kids = profile.members.filter((m) => m.role === "child");
  if (!kids.length) return null;

  const urgent =
    kids.find((k) => k.age >= 17 && k.age <= 19) ??
    kids.find((k) => k.age >= 15 && k.age <= 16) ??
    kids.find((k) => k.age >= 10 && k.age <= 12) ??
    kids.find((k) => k.age >= 24 && k.age < 26);

  if (!urgent) return null;

  const voice = voiceFor(profile);
  const name = firstName(profile);
  const yearsTo18 = Math.max(0, 18 - urgent.age);

  let why = "";
  let line = "";
  if (urgent.age >= 18 && urgent.age < 20) {
    why = `${urgent.firstName} is ${urgent.age}. Student loans and accounts in their name are live.`;
    line = `${urgent.firstName} is ${urgent.age}. A lender can already offer a student loan. If you co-sign, that debt lands on your plan — I'd rather we decide that before an application goes in.`;
  } else if (urgent.age >= 15) {
    why = `${urgent.firstName} is ${urgent.age} — about ${yearsTo18} year(s) until 18.`;
    line = `${urgent.firstName} is ${urgent.age}, so adulthood (and the option to borrow in their own name) is about ${yearsTo18} year(s) out. Worth mapping what stays in your name versus theirs, without changing the investment mix yet.`;
  } else if (urgent.age >= 24) {
    why = `${urgent.firstName} is ${urgent.age}. Family health cover often ends at 26.`;
    line = `${urgent.firstName} is ${urgent.age}. Family health cover often drops at 26 — that's ${26 - urgent.age} year(s). I'd rather flag it now than the month it happens.`;
  } else {
    why = `${urgent.firstName} is ${urgent.age}. College funding window is open.`;
    line = `${urgent.firstName} is ${urgent.age}. College is close enough that contributions still have time to compound, and far enough that we don't need a dramatic change this week.`;
  }

  return {
    id: `milestone-${profile.slug}-${urgent.firstName}`,
    slug: profile.slug,
    displayName: profile.displayName,
    kind: "milestone",
    channel: voice.channel,
    tone: voice.label,
    title: `${urgent.firstName} is ${urgent.age} — life date, not a market date`,
    why,
    subject: `${name}, a date in the family before it becomes urgent`,
    body: [`Hi ${name},`, "", line, "", voice.signoff].join("\n"),
  };
}

function careerCopy(profile: ClientProfile): NurtureItem | null {
  const linked = getLinkedInSim(profile.slug, profile);
  const promoted = /senior|vp|director/i.test(linked.title);
  const chat = messagesFor(profile.slug).some(
    (m) => m.direction === "in" && /promot|raise|senior|new job/i.test(m.body),
  );
  if (!promoted && !chat) return null;

  const voice = voiceFor(profile);
  const name = firstName(profile);
  const fromChat = chat
    ? "They already told you in chat."
    : "Simulated LinkedIn shows a title above the role assumed in the plan.";

  return {
    id: `career-${profile.slug}`,
    slug: profile.slug,
    displayName: profile.displayName,
    kind: "career",
    channel: voice.channel,
    tone: voice.label,
    title: "Pay may have stepped up — offer a plan update",
    why: `${fromChat} Title on file: ${linked.title} at ${linked.company}.`,
    subject: `${name}, if the raise is real we should rebase the plan`,
    body: [
      `Hi ${name},`,
      "",
      `I noticed the step up (${linked.title}). If pay is higher, the investment plan, the tax withholding, and how much of the raise gets saved should change together — otherwise the extra income just disappears into spending.`,
      "",
      `Your plan still assumes about ${money(profile.salaryTotal)} of salary. Tell me the new number and I'll update it.`,
      "",
      voice.signoff,
    ].join("\n"),
  };
}

export function buildNurture(profiles: ClientProfile[]): NurtureItem[] {
  const items: NurtureItem[] = [];
  for (const profile of profiles) {
    const calm = calmCopy(profile);
    const mile = milestoneCopy(profile);
    const career = careerCopy(profile);
    if (calm) items.push(calm);
    if (mile) items.push(mile);
    if (career) items.push(career);
  }
  const order = { market_calm: 0, milestone: 1, career: 2, chat: 3 };
  return items.sort((a, b) => order[a.kind] - order[b.kind]);
}
