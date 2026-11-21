// Run: npm run test:priority
// Reproduces the worked example in the team's prioritisation doc with the real case figures.
import { test } from "node:test";
import assert from "node:assert/strict";
import { prioritize, prioritizeTask, scheduleByPriority, updateAcceptance, CONFIG } from "../src/lib/priority/model.ts";

const TODAY = "2026-11-21";

const fam = (slug, o) => ({
  slug,
  displayName: slug,
  state: "TX",
  timeZone: "America/Chicago",
  adults: ["A"],
  decisionStyle: "COLLABORATOR",
  anchor: "",
  misaligned: false,
  daysSinceContact: 45,
  aiAccept: { alpha: 3, beta: 2 },
  ...o,
});

const families = [
  fam("samantha-lewis", { aum: 415000, decisionStyle: "VALIDATOR", anchor: "DUTY", adults: ["Samantha"], aiAccept: { alpha: 2, beta: 3 }, timeZone: "America/New_York" }),
  fam("michael-carter", { aum: 172000, anchor: "FREEDOM", adults: ["Michael"] }),
  fam("timothy-melanie-weah", { aum: 360000, anchor: "PROTECTION", misaligned: true, adults: ["Timothy", "Melanie"], timeZone: "America/Los_Angeles" }),
  fam("daniel-emily-johnson", { aum: 344000, decisionStyle: "DUAL", anchor: "PROTECTION", misaligned: true, adults: ["Daniel", "Emily"], timeZone: "America/Denver" }),
];

const task = (id, slug, o) => ({
  id,
  slug,
  kind: "message",
  column: "needs_attention",
  title: id,
  detail: "",
  topic: "general",
  dollars: null,
  deadline: null,
  immediate: false,
  severity: "MODERATE",
  givesAdvice: false,
  bigDecision: false,
  personalNumbers: false,
  sources: [],
  ...o,
});

const candidates = [
  task("sam-retire", "samantha-lewis", { kind: "concern", topic: "depletion", dollars: 1448673, deadline: "2026-12-31", severity: "CRITICAL", givesAdvice: true, personalNumbers: true }),
  task("mic-home", "michael-carter", { kind: "goal", topic: "home", dollars: 113300, deadline: "2027-01-01", severity: "SIGNIFICANT", bigDecision: true, personalNumbers: true }),
  task("mic-drop", "michael-carter", { topic: "market", dollars: 14500, immediate: true, severity: "SIGNIFICANT", personalNumbers: true }),
  task("weah-cash", "timothy-melanie-weah", { kind: "opportunity", column: "new_opportunity", topic: "debt", dollars: 60222.5, severity: "MODERATE", personalNumbers: true }),
  task("sam-ss", "samantha-lewis", { topic: "tax", dollars: 484, deadline: "2027-01-01", severity: "INFO" }),
  task("joh-ctc", "daniel-emily-johnson", { topic: "tax", dollars: 200, deadline: "2027-01-01", severity: "INFO" }),
];

const byId = (r) => Object.fromEntries(r.tasks.map((t) => [t.id, t]));

test("scores match the worked example", () => {
  const t = byId(prioritize(candidates, families, TODAY));
  assert.deepEqual(
    ["sam-retire", "mic-home", "mic-drop", "weah-cash", "sam-ss", "joh-ctc"].map((id) => t[id].score),
    [88, 81, 78, 54, 39, 38],
  );
});

test("contributions add up to the score", () => {
  for (const t of prioritize(candidates, families, TODAY).tasks) {
    const sum = Object.values(t.contributions).reduce((a, b) => a + b, 0);
    assert.ok(Math.abs(sum - t.score) <= 0.6, `${t.id}: ${sum} vs ${t.score}`);
  }
});

test("automation levels follow the rules", () => {
  const t = byId(prioritize(candidates, families, TODAY));
  assert.equal(t["sam-retire"].automation, "in_person");
  assert.equal(t["mic-home"].automation, "in_person");
  assert.equal(t["mic-drop"].automation, "confirm");
  assert.equal(t["weah-cash"].automation, "confirm");
  assert.equal(t["sam-ss"].automation, "confirm"); // VALIDATOR, acceptance 0.4
  assert.equal(t["joh-ctc"].automation, "auto");
});

test("small changes go to the recap and DUAL families reach both adults", () => {
  const t = byId(prioritize(candidates, families, TODAY));
  assert.equal(t["joh-ctc"].channel, "recap");
  assert.deepEqual(t["joh-ctc"].recipients, ["Daniel", "Emily"]);
  assert.equal(t["sam-retire"].channel, "meeting");
});

test("Michael's market drop is folded into the home conversation", () => {
  const t = byId(prioritize(candidates, families, TODAY));
  assert.equal(t["mic-drop"].foldedInto, "mic-home");
});

test("meetings are planned before the deadline minus the lead time", () => {
  const t = byId(prioritize(candidates, families, TODAY));
  assert.ok(t["mic-home"].meeting.latestDate <= "2026-12-18");
  assert.equal(t["sam-retire"].meeting.latestDate, "2026-11-23");
});

test("agenda books the highest score first, one conversation per family", () => {
  const r = prioritize(candidates, families, TODAY);
  const slots = ["2026-11-23 09:00", "2026-11-23 10:00", "2026-11-24 09:00"];
  const stub = (_slug, _range, taken) => {
    const free = slots.find((s) => !taken.some((x) => `${x.date} ${x.time}` === s));
    return free ? { date: free.slice(0, 10), time: free.slice(11) } : null;
  };
  const { booked } = scheduleByPriority(r.tasks, stub);
  assert.deepEqual(booked.map((b) => b.taskId), ["sam-retire", "mic-home"]);
  assert.equal(booked[0].time, "09:00");
});

test("ranking is stable when weights move 5 points", () => {
  const base = prioritize(candidates, families, TODAY).tasks.map((t) => t.id).slice(0, 3);
  const keys = Object.keys(CONFIG.weights);
  const original = { ...CONFIG.weights };
  let stable = 0;
  let total = 0;
  for (const a of keys)
    for (const b of keys) {
      if (a === b) continue;
      Object.assign(CONFIG.weights, original);
      CONFIG.weights[a] += 0.05;
      CONFIG.weights[b] -= 0.05;
      const top = [...candidates]
        .map((c) => prioritizeTask(c, families.find((f) => f.slug === c.slug), TODAY))
        .sort((x, y) => y.score - x.score)
        .map((t) => t.id)
        .slice(0, 3);
      total++;
      if (new Set(top).size === 3 && top.every((id) => ["sam-retire", "mic-home", "mic-drop"].includes(id))) stable++;
    }
  Object.assign(CONFIG.weights, original);
  assert.ok(base.length === 3);
  assert.ok(stable / total >= 0.9, `${stable}/${total}`);
});

test("one request for a human stops automation", () => {
  const after = updateAcceptance({ alpha: 3, beta: 2 }, true);
  assert.equal(after.alpha / (after.alpha + after.beta), 0.5);
});
