import { applyUpdates } from "../crm/store";
import { allMessages, readInbox, writeInbox } from "./state";
import { extractLifeEventsHeuristic, toProfileUpdates } from "../meetings/extract";

/** Pull new facts out of inbound chats (and approved replies are ignored). */
export function syncChatsIntoCrm(): { applied: number; skipped: number } {
  const state = readInbox();
  const inbound = allMessages().filter(
    (m) => m.direction === "in" && !state.ingestedIds.includes(m.id),
  );

  let applied = 0;
  for (const message of inbound) {
    const events = extractLifeEventsHeuristic(message.body);
    if (events.length) {
      const updates = toProfileUpdates(message.slug, `chat-${message.id}`, events).map(
        (u) => ({
          ...u,
          source: "manual" as const,
          summary: `${u.summary} (from ${message.channel} chat)`,
        }),
      );
      applyUpdates(message.slug, updates);
      applied += updates.length;
    }
    state.ingestedIds.push(message.id);
  }
  writeInbox(state);
  return { applied, skipped: inbound.length - applied };
}
