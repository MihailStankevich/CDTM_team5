import type { Channel, ChatMessage } from "../types";

export interface ThreadMeta {
  slug: string;
  channel: Channel;
  displayHint: string;
}

export const THREADS: ThreadMeta[] = [
  { slug: "michael-carter", channel: "whatsapp", displayHint: "Michael · WhatsApp" },
  { slug: "daniel-emily-johnson", channel: "email", displayHint: "Johnson household · Email" },
  { slug: "samantha-lewis", channel: "telegram", displayHint: "Samantha · Telegram" },
  { slug: "timothy-melanie-weah", channel: "whatsapp", displayHint: "Weah household · WhatsApp" },
];

/** Simulated client threads. Not connected to real WhatsApp, email, or Telegram. */
export const SEED_MESSAGES: ChatMessage[] = [
  {
    id: "seed-michael-1",
    slug: "michael-carter",
    channel: "whatsapp",
    direction: "out",
    at: "2026-10-02T15:10:00.000Z",
    body: "Michael — quick note that the 2027 home cash and the 401(k) are still competing for the same dollars. We can sequence them whenever you want.",
  },
  {
    id: "seed-michael-2",
    slug: "michael-carter",
    channel: "whatsapp",
    direction: "in",
    at: "2026-11-18T18:42:00.000Z",
    body: "Hey — I got promoted to Senior PM. The raise is about $20,000 plus more RSUs. Also still house hunting for January. Should we change the investment plan?",
  },
  {
    id: "seed-johnson-1",
    slug: "daniel-emily-johnson",
    channel: "email",
    direction: "in",
    at: "2026-11-12T14:05:00.000Z",
    body: "Hi — Emily here. Oliver asked about college this week (he's 11) and the card at 24.9% is stressing me more than the market. Also, we had a baby — our daughter was born in October, named Nora.",
  },
  {
    id: "seed-samantha-1",
    slug: "samantha-lewis",
    channel: "telegram",
    direction: "in",
    at: "2026-11-19T11:20:00.000Z",
    body: "Ethan is 18 and a lender already emailed him about a student loan. Ava has two years. I don't want this to land on my balance sheet by surprise. Second home can wait.",
  },
  {
    id: "seed-weah-1",
    slug: "timothy-melanie-weah",
    channel: "whatsapp",
    direction: "in",
    at: "2026-11-20T09:15:00.000Z",
    body: "Timothy: two startups on my floor announced layoffs. My job is fine today but I want the cash cushion bigger before we touch investments. The 18% card is still there.",
  },
  {
    id: "seed-weah-2",
    slug: "timothy-melanie-weah",
    channel: "whatsapp",
    direction: "out",
    at: "2026-11-20T09:40:00.000Z",
    body: "Heard. I'll put cash runway ahead of any portfolio tweak and come back with a number before we sell anything.",
  },
];
