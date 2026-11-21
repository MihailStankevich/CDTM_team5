import fs from "fs";
import path from "path";
import { REPO_ROOT } from "../paths";
import type { ChatMessage, InboxState } from "../types";
import { SEED_MESSAGES } from "./seed";

const PATH = path.join(REPO_ROOT, "data", "inbox.json");
let memoryInbox: InboxState | null = null;

function empty(): InboxState {
  return { ingestedIds: [], dismissedIds: [], approvedIds: [], extraMessages: [] };
}

export function readInbox(): InboxState {
  if (memoryInbox) return memoryInbox;
  try {
    if (!fs.existsSync(PATH)) return empty();
    const parsed = JSON.parse(fs.readFileSync(PATH, "utf8")) as InboxState;
    return {
      ingestedIds: parsed.ingestedIds ?? [],
      dismissedIds: parsed.dismissedIds ?? [],
      approvedIds: parsed.approvedIds ?? [],
      extraMessages: parsed.extraMessages ?? [],
    };
  } catch {
    return empty();
  }
}

export function writeInbox(state: InboxState) {
  memoryInbox = state;
  try {
    const dir = path.dirname(PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(PATH, JSON.stringify(state, null, 2), "utf8");
  } catch {
    // Read-only on Vercel; memoryInbox keeps the demo working on this instance.
  }
}

export function allMessages(): ChatMessage[] {
  const extra = readInbox().extraMessages;
  return [...SEED_MESSAGES, ...extra].sort((a, b) => a.at.localeCompare(b.at));
}

export function messagesFor(slug: string): ChatMessage[] {
  return allMessages().filter((m) => m.slug === slug);
}
