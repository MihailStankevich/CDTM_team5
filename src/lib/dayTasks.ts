// Advisor tasks, stored in this browser. Shared by the day planner and the dashboard scheduling buttons.
export type TaskType = "reunion" | "llamada" | "seguimiento" | "nota";
export type ClientStatus = "pendiente" | "aceptada" | "cambio";
export interface Task {
  id: string; time: string; title: string; slug: string; type: TaskType; note: string; done: boolean;
  date?: string; // YYYY-MM-DD; missing = today
  status?: ClientStatus; // client's answer to a proposed call/meeting
  proposal?: { date: string; time: string }; // slot the client proposes instead
  sentAt?: number;
}
export type Range = "hoy" | "semana" | "mes";
export const TASKS_KEY = "advisor-day-tasks-v2";
export const TASKS_EVENT = "advisor-tasks-changed";

// Simulated client availability (weekday 1=Mon..5=Fri, hours). Replace with the client's real calendar later.
export const CLIENT_AVAILABILITY: Record<string, { days: number[]; hours: string[] }> = {
  "michael-carter": { days: [1, 2, 3, 4, 5], hours: ["08:30", "13:00", "18:30"] },
  "daniel-emily-johnson": { days: [2, 4, 6], hours: ["10:00", "17:00"] },
  "samantha-lewis": { days: [1, 3, 5], hours: ["09:00", "12:00", "16:00"] },
  "timothy-melanie-weah": { days: [1, 2, 3, 4, 5], hours: ["19:00"] },
};
const DEFAULT_AV = { days: [1, 2, 3, 4, 5], hours: ["10:00", "12:00", "16:00"] };

export const isoDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const taskDate = (t: Task, now = new Date()) => t.date ?? isoDate(now);

/** First slot within the range that fits the client's availability and doesn't clash with an existing timed task. */
export function findSlot(slug: string, range: Range, tasks: Task[], now = new Date(), skip = 0): { date: string; time: string } | null {
  const av = CLIENT_AVAILABILITY[slug] ?? DEFAULT_AV;
  const end = new Date(now);
  if (range === "semana") end.setDate(now.getDate() + (7 - ((now.getDay() + 6) % 7)) - 1);
  if (range === "mes") end.setMonth(now.getMonth() + 1, 0);
  const taken = new Set(tasks.filter((t) => t.type === "llamada" || t.type === "reunion").map((t) => `${taskDate(t, now)} ${t.time}`));
  const nowHm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  let found = 0;
  for (const d = new Date(now); isoDate(d) <= isoDate(end); d.setDate(d.getDate() + 1)) {
    const wd = d.getDay() === 0 ? 7 : d.getDay();
    if (!av.days.includes(wd)) continue;
    for (const h of av.hours) {
      const date = isoDate(d);
      if (date === isoDate(now) && h <= nowHm) continue;
      if (taken.has(`${date} ${h}`)) continue;
      if (found++ === skip) return { date, time: h };
    }
  }
  return null;
}

function read(seed: Task[]): Task[] {
  const raw = localStorage.getItem(TASKS_KEY);
  return raw ? JSON.parse(raw) : seed;
}
function write(list: Task[]) {
  localStorage.setItem(TASKS_KEY, JSON.stringify(list));
  window.dispatchEvent(new Event(TASKS_EVENT));
}

export function addTask(t: Omit<Task, "id" | "done">, seed: Task[]) {
  const list = read(seed);
  list.push({ ...t, id: String(Date.now()), done: false });
  write(list);
}

/** Books a call/meeting in a free slot and "notifies" the client. Returns the slot or null when none fits. */
export function proposeToClient(slug: string, type: "llamada" | "reunion", range: Range, title: string, note: string, seed: Task[]) {
  const list = read(seed);
  const slot = findSlot(slug, range, list);
  if (!slot) return null;
  list.push({ id: String(Date.now()), title, slug, type, note, done: false, ...slot, status: "pendiente", sentAt: Date.now() });
  write(list);
  return slot;
}

// Simulated client replies (no real client app yet): after a few seconds most accept, some propose another slot.
const PROPOSES_CHANGE = new Set(["samantha-lewis"]);
export function simulateReplies(seed: Task[], now = Date.now()) {
  const list = read(seed);
  let changed = false;
  for (const t of list) {
    if (t.status !== "pendiente" || !t.sentAt || now - t.sentAt < 5000) continue;
    changed = true;
    if (PROPOSES_CHANGE.has(t.slug)) {
      const alt = findSlot(t.slug, "mes", list.filter((x) => x.id !== t.id), new Date(), 1);
      if (alt) { t.status = "cambio"; t.proposal = alt; continue; }
    }
    t.status = "aceptada";
  }
  if (changed) write(list);
}

/** Upcoming (today or later), not-done call/meeting for a client, if any. */
export function scheduledFor(slug: string, tasks: Task[], now = new Date()): Task | undefined {
  const today = isoDate(now);
  return tasks
    .filter((t) => t.slug === slug && !t.done && (t.type === "llamada" || t.type === "reunion") && taskDate(t, now) >= today)
    .sort((a, b) => `${taskDate(a, now)}${a.time}`.localeCompare(`${taskDate(b, now)}${b.time}`))[0];
}

/** Appends client requests to the notes of their scheduled call/meeting (once each). */
export function mergeIntoNotes(task: Task, texts: string[], seed: Task[]) {
  const list = read(seed);
  const t = list.find((x) => x.id === task.id);
  if (!t) return;
  const missing = texts.filter((x) => !t.note.includes(x));
  if (!missing.length) return;
  t.note = [t.note, ...missing.map((x) => `• ${x}`)].filter(Boolean).join("\n");
  write(list);
}

/** Upcoming calls/meetings the client hasn't confirmed yet. */
export const isUnconfirmed = (t: Task, now = new Date()) =>
  (t.type === "llamada" || t.type === "reunion") && !t.done && t.status !== "aceptada" && t.status !== "cambio" && taskDate(t, now) >= isoDate(now);

/** Sends a reminder: client is asked again and (simulated) answers by accepting or proposing a new slot. */
export function remind(ids: string[], seed: Task[]) {
  const list = read(seed);
  for (const t of list) if (ids.includes(t.id)) { t.status = "pendiente"; t.sentAt = Date.now(); }
  write(list);
}
