import fs from "fs";
import path from "path";
import { REPO_ROOT } from "../paths";
import type { ClientCrmState, CrmStore, MeetingRecord, ProfileUpdate } from "../types";

const CRM_PATH = path.join(REPO_ROOT, "data", "crm.json");
let memoryCrm: CrmStore | null = null;

function emptyClient(): ClientCrmState {
  return {
    notes: "",
    personalFacts: [],
    updates: [],
    meetings: [],
    extraMembers: [],
    tags: [],
  };
}

function ensureDir() {
  const dir = path.dirname(CRM_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

export function readCrm(): CrmStore {
  if (memoryCrm) return memoryCrm;
  try {
    if (!fs.existsSync(CRM_PATH)) return { bySlug: {} };
    return JSON.parse(fs.readFileSync(CRM_PATH, "utf8")) as CrmStore;
  } catch {
    return { bySlug: {} };
  }
}

export function writeCrm(store: CrmStore) {
  memoryCrm = store;
  try {
    ensureDir();
    fs.writeFileSync(CRM_PATH, JSON.stringify(store, null, 2), "utf8");
  } catch {
    // Vercel’s filesystem is read-only. The in-memory copy still serves this instance.
  }
}

export function getClientCrm(slug: string): ClientCrmState {
  const store = readCrm();
  return store.bySlug[slug] ?? emptyClient();
}

export function saveClientCrm(slug: string, state: ClientCrmState): ClientCrmState {
  const store = readCrm();
  store.bySlug[slug] = state;
  writeCrm(store);
  return state;
}

export function addMeeting(slug: string, meeting: MeetingRecord): ClientCrmState {
  const state = getClientCrm(slug);
  state.meetings = [meeting, ...state.meetings];
  return saveClientCrm(slug, state);
}

export function applyUpdates(
  slug: string,
  updates: ProfileUpdate[],
): ClientCrmState {
  const state = getClientCrm(slug);
  for (const u of updates) {
    if (state.updates.some((x) => x.id === u.id)) continue;
    state.updates = [u, ...state.updates];

    if (u.eventType === "child_born") {
      const nameMatch = u.summary.match(/named\s+([A-Z][a-z]+)/i);
      const childName = nameMatch?.[1] ?? "New child";
      if (!state.extraMembers.some((m) => m.firstName === childName && m.role === "child")) {
        state.extraMembers.push({
          firstName: childName,
          age: 0,
          role: "child",
          note: u.summary,
        });
      }
      if (!state.tags.includes("new-parent")) state.tags.push("new-parent");
      state.personalFacts.unshift(`Child: ${childName} — from meeting ${u.createdAt.slice(0, 10)}`);
    }

    if (u.eventType === "job_change" || u.eventType === "promotion") {
      state.personalFacts.unshift(u.summary);
      if (!state.tags.includes("career-change")) state.tags.push("career-change");
    }

    if (u.eventType === "layoff_risk") {
      if (!state.tags.includes("employer-risk")) state.tags.push("employer-risk");
      state.personalFacts.unshift(u.summary);
    }

    if (u.eventType === "home_intent") {
      if (!state.tags.includes("home-search")) state.tags.push("home-search");
      state.personalFacts.unshift(u.summary);
    }

    if (u.eventType === "inheritance" || u.eventType === "health" || u.eventType === "other") {
      state.personalFacts.unshift(u.summary);
    }

    // Link meeting
    if (u.meetingId) {
      const m = state.meetings.find((x) => x.id === u.meetingId);
      if (m && !m.appliedUpdateIds.includes(u.id)) {
        m.appliedUpdateIds.push(u.id);
      }
    }
  }
  // Cap facts
  state.personalFacts = state.personalFacts.slice(0, 40);
  return saveClientCrm(slug, state);
}

export function updateNotes(slug: string, notes: string): ClientCrmState {
  const state = getClientCrm(slug);
  state.notes = notes;
  return saveClientCrm(slug, state);
}
