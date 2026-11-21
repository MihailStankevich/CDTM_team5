// SIMULATED. The case files hold no contact history or AI-acceptance data.
// Replace with the CRM's last-interaction date and real message outcomes.

/** Days since the advisor last spoke with each family. Samantha matches the "no meeting for 7 months" alert. */
export const LAST_CONTACT_DAYS: Record<string, number> = {
  "michael-carter": 20,
  "daniel-emily-johnson": 35,
  "samantha-lewis": 210,
  "timothy-melanie-weah": 60,
};

/** Outcomes of past automatic messages: read without asking for a person, or asked to talk to a human. */
export const AI_HISTORY: Record<string, { read: number; askedForHuman: number }> = {
  "michael-carter": { read: 2, askedForHuman: 0 },
  "daniel-emily-johnson": { read: 1, askedForHuman: 0 },
  "samantha-lewis": { read: 0, askedForHuman: 1 },
  "timothy-melanie-weah": { read: 1, askedForHuman: 0 },
};
