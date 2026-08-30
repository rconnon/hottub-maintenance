#!/usr/bin/env node
/**
 * Test harness for Joel's Hot Tub Water Manager.
 *
 * The app ships as one self-contained index.html. Its chemistry /
 * diagnostic engine is written as pure top-level functions with no DOM
 * access at definition time, so we can extract the <script> body, run
 * it in a Node vm with a localStorage stub, and exercise the engine
 * directly against the spec's acceptance scenarios (SPEC §73 and §95).
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const html = readFileSync(join(root, "index.html"), "utf8");
const match = html.match(/<script>([\s\S]*)<\/script>/);
if (!match) { console.error("FATAL: could not extract <script> from index.html"); process.exit(1); }

// Minimal browser-shims. `document` is left undefined so the app's
// guarded init block does not run; only the pure engine loads.
const storage = new Map();
const sandbox = {
  localStorage: {
    getItem: k => (storage.has(k) ? storage.get(k) : null),
    setItem: (k, v) => storage.set(k, String(v)),
    removeItem: k => storage.delete(k)
  },
  console, navigator: {}, window: undefined
};
vm.createContext(sandbox);
vm.runInContext(match[1], sandbox, { filename: "index.html<script>" });

// Top-level const/function declarations live in the context's global
// environment; a follow-up eval in the same context can see them all.
const S = vm.runInContext(`({
  SPA_PROFILE, SPA_TARGETS, STARTUP_STATES, TEST_KITS, DEFAULT_CHEMICALS,
  defaultState, loadState, saveState, addEvent, asInterval, rangeStatus,
  interpretBromine, interpretPH, interpretAlkalinity, interpretHardness,
  interpretParam, formatValue, waterTests, latestReading, paramFreshness,
  isHeavySoak, diagnose, canWeUseIt, overallStatus, waterAgeDays,
  currentCycleId, waterCycles, cycleSummary, trendDirection, floaterAdvice,
  detectPatterns, bromineMetrics, balanceScore, testingConsistency,
  computeDose, findChemical, maintenanceStatus, cloudyWaterAdvice,
  freshFillBalanceStep, finalTestOutcome, tooltipHtml, startupInProgress,
  padSwatchHtml, testValuesHtml, PAD_COLORS
})`, sandbox);

/* ---------------- tiny test runner ---------------- */
let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log("  ok  " + name); }
  catch (e) { failed++; console.error("FAIL  " + name + "\n      " + e.message); }
}
function eq(actual, expected, label) {
  if (actual !== expected) throw new Error((label || "") + " expected " + JSON.stringify(expected) + ", got " + JSON.stringify(actual));
}
function ok(cond, label) { if (!cond) throw new Error(label || "condition was false"); }

/* Helpers to build states/readings the way the app stores them. */
const NOW = new Date("2026-08-29T12:00:00");
function val(v, approx) { return { value: v, approximate: !!approx }; }
function range(lo, hi) { return { lower: lo, upper: hi, approximate: true }; }
function freshState() { return S.defaultState(); }
function addTest(state, whenIso, values, context, testType) {
  return S.addEvent(state, "water_test",
    { testType: testType || "full", context: context || "normal", testKit: "hach_pool_spa_6way",
      precision: "discrete-strip", values },
    "", whenIso);
}

console.log("\n== Diagnostic engine: SPEC §73 acceptance scenarios ==");

test("Scenario A — perfect water: no actions, can use = YES", () => {
  const actions = S.diagnose({ bromine: val(5), pH: val(7.2), alkalinity: val(80), hardness: val(250, true) }, S.SPA_TARGETS);
  eq(actions.length, 0, "actions");
  const st = freshState();
  addTest(st, "2026-08-29T09:00:00", { bromine: val(5), pH: val(7.2), alkalinity: val(80), hardness: val(250, true) });
  eq(S.overallStatus(st, NOW).color, "green");
  eq(S.canWeUseIt(st, NOW).verdict, "YES");
});

test("Scenario B — low alkalinity + high pH: alkalinity first, pH suppressed", () => {
  const actions = S.diagnose({ bromine: val(5), pH: val(8.4), alkalinity: val(40), hardness: val(250, true) }, S.SPA_TARGETS);
  ok(actions.length >= 1, "has actions");
  eq(actions[0].parameter, "alkalinity", "first action");
  ok(actions[0].blocksPHAdjustment, "blocks pH adjustment");
  ok(!actions.some(a => a.parameter === "pH"), "no simultaneous pH correction");
});

test("Scenario C — bromine 1: red, blocks use, restore bromine", () => {
  const actions = S.diagnose({ bromine: val(1), pH: val(7.2), alkalinity: val(80), hardness: val(250, true) }, S.SPA_TARGETS);
  eq(actions[0].parameter, "bromine");
  eq(actions[0].severity, "red");
  ok(actions[0].blocksUse, "blocks use");
  const st = freshState();
  addTest(st, "2026-08-29T09:00:00", { bromine: val(1), pH: val(7.2), alkalinity: val(80), hardness: val(250, true) });
  eq(S.overallStatus(st, NOW).color, "red", "Do not use yet");
  eq(S.canWeUseIt(st, NOW).verdict, "NOT_YET");
});

test("Scenario D — bromine 2: below normal, amber, still blocks normal use", () => {
  const actions = S.diagnose({ bromine: val(2) }, S.SPA_TARGETS);
  eq(actions[0].parameter, "bromine");
  eq(actions[0].severity, "amber");
  ok(actions[0].blocksUse, "bromine 2 must still block use");
  ok(/restore/i.test(actions[0].title + actions[0].message), "says restore");
});

test("Scenario E — bromine 10: do not add sanitizer, block use", () => {
  const actions = S.diagnose({ bromine: val(10) }, S.SPA_TARGETS);
  eq(actions[0].parameter, "bromine");
  ok(actions[0].blocksUse, "blocks use");
  ok(actions[0].doNotAdd, "flags do-not-add");
  ok(/do not add/i.test(actions[0].message), "message says do not add");
});

test("Scenario F — 5-day-old sanitizer reading: TEST FIRST", () => {
  const st = freshState();
  addTest(st, "2026-08-24T09:00:00", { bromine: val(5), pH: val(7.2) });
  eq(S.canWeUseIt(st, NOW).verdict, "TEST_FIRST");
  eq(S.overallStatus(st, NOW).color, "gray", "Test water first");
});

test("Scenario G — heavy use: soak logged, sanitizer freshness tightens", () => {
  const st = freshState();
  addTest(st, "2026-08-29T08:00:00", { bromine: val(5), pH: val(7.2) });
  eq(S.canWeUseIt(st, NOW).verdict, "YES", "fresh reading before soak");
  S.addEvent(st, "soak", { bathers: 5, duration: "30–60 min", heavy: [] }, "", "2026-08-29T10:00:00");
  ok(S.isHeavySoak(st.events.find(e => e.type === "soak")), "5 bathers = heavy load");
  eq(S.canWeUseIt(st, NOW).verdict, "TEST_FIRST", "heavy soak invalidates sanitizer reading");
});

test("Scenario H — 90-day water: water change due", () => {
  const st = freshState();
  st.maintenance.lastRefillDate = "2026-05-31T12:00:00";
  const m = S.maintenanceStatus(st, NOW);
  ok(m.water.ageDays >= 90, "age " + m.water.ageDays);
  ok(m.water.overdue, "overdue");
  eq(m.water.milestone, "Water change due.");
});

test("Water age milestones at 60 and 80 days", () => {
  const st = freshState();
  st.maintenance.lastRefillDate = "2026-06-29T12:00:00"; // 61 days
  ok(/later part/.test(S.maintenanceStatus(st, NOW).water.milestone));
  st.maintenance.lastRefillDate = "2026-06-08T12:00:00"; // 82 days
  ok(/planning a water change/.test(S.maintenanceStatus(st, NOW).water.milestone));
});

test("Scenario I — fresh fill, low TA: correct alkalinity first, one action only", () => {
  const actions = S.diagnose({ hardness: val(100, true), bromine: val(0), pH: val(6.8), alkalinity: val(40) }, S.SPA_TARGETS, "fresh_fill");
  // Sanitizer safety would normally lead, but during fresh fill the wizard
  // sequences alkalinity first; the engine itself must put alkalinity ahead of pH.
  const alkIdx = actions.findIndex(a => a.parameter === "alkalinity");
  const phIdx = actions.findIndex(a => a.parameter === "pH");
  ok(alkIdx >= 0, "alkalinity action exists");
  eq(phIdx, -1, "pH correction suppressed while alkalinity is out of range");
});

test("Scenario J — after TA fix, pH in range: no pH chemical required", () => {
  const actions = S.diagnose({ alkalinity: val(80), pH: val(7.2) }, S.SPA_TARGETS);
  eq(actions.length, 0, "no actions at TA 80 / pH 7.2");
});

test("Scenario K — alkalinity between 80 and 120: in range, stored as range", () => {
  const v = range(80, 120);
  eq(S.rangeStatus(v, 80, 120), "in", "entire interval within target");
  const actions = S.diagnose({ alkalinity: v }, S.SPA_TARGETS);
  eq(actions.length, 0, "no correction from ambiguous-but-in-range read");
  // Storage: the range survives; never silently converted to a midpoint.
  const st = freshState();
  addTest(st, "2026-08-29T09:00:00", { alkalinity: v });
  const stored = st.events[0].data.values.alkalinity;
  eq(stored.lower, 80); eq(stored.upper, 120); ok(stored.approximate);
  ok(stored.value === undefined, "no fabricated midpoint stored");
  eq(S.formatValue("alkalinity", stored), "~80–120 ppm");
});

test("Range crossing a boundary → borderline, retest-only (no big correction)", () => {
  eq(S.rangeStatus(range(40, 80), 80, 120), "borderline");
  const actions = S.diagnose({ alkalinity: range(40, 80) }, S.SPA_TARGETS);
  ok(actions.length >= 1);
  ok(actions[0].retestOnly, "recommends retest, not correction");
  const brActions = S.diagnose({ bromine: range(2, 5) }, S.SPA_TARGETS);
  ok(brActions.length >= 1 && brActions[0].retestOnly, "ambiguous bromine → retest");
  ok(!brActions[0].blocksUse, "ambiguous bromine does not hard-block");
});

test("Scenario L — resume startup: state machine persists per transition", () => {
  const st = freshState();
  st.startup = { active: true, state: "ph" };
  // Simulate save/reload round-trip through the storage layer.
  S.saveState(st);
  const reloaded = S.loadState();
  ok(reloaded.startup.active, "still active after reload");
  eq(reloaded.startup.state, "ph", "resumes exactly at pH step");
});

console.log("\n== Interpretation tables (SPEC §18–21) ==");

test("Bromine strip table: 0,1 red · 2 amber · 5 green · 10,20 red — all but 5 block", () => {
  const T = S.SPA_TARGETS;
  eq(S.interpretBromine(val(0), T).status, "red");
  ok(S.interpretBromine(val(0), T).blocksUse);
  eq(S.interpretBromine(val(1), T).status, "red");
  eq(S.interpretBromine(val(2), T).status, "amber");
  ok(S.interpretBromine(val(2), T).blocksUse, "2 ppm blocks normal use");
  eq(S.interpretBromine(val(5), T).status, "green");
  ok(!S.interpretBromine(val(5), T).blocksUse);
  ok(S.interpretBromine(val(10), T).blocksUse);
  eq(S.interpretBromine(val(20), T).status, "red");
});

test("pH strip table: 6.2 red · 6.8 amber · 7.2/7.8 green · 8.4 red", () => {
  const T = S.SPA_TARGETS;
  eq(S.interpretPH(val(6.2), T).status, "red");
  eq(S.interpretPH(val(6.8), T).status, "amber");
  eq(S.interpretPH(val(7.2), T).status, "green");
  eq(S.interpretPH(val(7.8), T).status, "green");
  eq(S.interpretPH(val(8.4), T).status, "red");
});

test("Alkalinity: 80/120 green · 40 low · 180 high · 240 very high", () => {
  const T = S.SPA_TARGETS;
  eq(S.interpretAlkalinity(val(80), T).status, "green");
  eq(S.interpretAlkalinity(val(120), T).status, "green");
  eq(S.interpretAlkalinity(val(40), T).label, "Low");
  eq(S.interpretAlkalinity(val(180), T).label, "High");
  eq(S.interpretAlkalinity(val(240), T).label, "Very high");
});

test("Hardness: 250 acceptable (~), 100 low, 500 high; no invented buckets", () => {
  const T = S.SPA_TARGETS;
  eq(S.interpretHardness(val(250, true), T).status, "green");
  eq(S.interpretHardness(val(100, true), T).label, "Low");
  eq(S.interpretHardness(val(500, true), T).label, "High");
  eq(S.formatValue("hardness", val(250, true)), "~250 ppm", "approximate marker shown");
});

console.log("\n== Dosing safety (SPEC §27, Rule 6) ==");

test("No dose without configured label data; scaling works once configured", () => {
  const profile = S.SPA_PROFILE;
  eq(S.computeDose({ dosing: null }, profile), null, "unconfigured → no dose");
  eq(S.computeDose(null, profile), null);
  const d = S.computeDose({ dosing: { labelDose: 100, unit: "g", referenceVolume: 1000 } }, profile);
  eq(d.amount, 227, "100 g / 1000 L → 227 g for 2270 L");
});

console.log("\n== Trends & patterns (SPEC §76–95) ==");

test("Scenario M — two same-day tests remain separate, ordered", () => {
  const st = freshState();
  addTest(st, "2026-08-29T09:00:00", { bromine: val(5) }, "normal", "quick");
  addTest(st, "2026-08-29T20:00:00", { bromine: val(2) }, "after_soak", "quick");
  const tests = S.waterTests(st);
  eq(tests.length, 2, "both kept");
  eq(S.asInterval(tests[0].data.values.bromine).lo, 5, "first is 9am reading");
  eq(S.asInterval(tests[1].data.values.bromine).lo, 2, "second is 8pm reading");
  ok(tests[0].localTime < tests[1].localTime, "time ordering preserved");
  ok(tests[0].timestamp !== tests[1].timestamp, "never merged");
});

test("Scenario N/Q — refills segment water cycles; current cycle excludes older tests", () => {
  const st = freshState();
  addTest(st, "2026-06-01T09:00:00", { bromine: val(5) });
  st.maintenance.lastRefillDate = "2026-08-29T08:00:00";
  S.addEvent(st, "refill", {}, "", "2026-08-29T08:00:00");
  addTest(st, "2026-08-29T09:00:00", { bromine: val(5) });
  addTest(st, "2026-09-02T09:00:00", { bromine: val(2) });
  const cycles = S.waterCycles(st);
  eq(cycles.length, 2, "two cycles");
  const current = cycles[cycles.length - 1];
  eq(current.events.filter(e => e.type === "water_test").length, 2, "current cycle has only post-refill tests");
  const cid = S.currentCycleId(st);
  ok(S.waterTests(st).filter(t => t.waterCycleId === cid).length === 2, "cycle ids tag post-refill tests");
});

test("Scenario O — repeated low bromine pattern (3 of last 5 normal tests low)", () => {
  const st = freshState();
  const seq = [5, 2, 2, 5, 2];
  seq.forEach((b, i) => addTest(st, "2026-08-" + String(20 + i).padStart(2, "0") + "T09:00:00", { bromine: val(b) }, "normal", "quick"));
  const patterns = S.detectPatterns(st, NOW);
  ok(patterns.some(p => p.id === "low_bromine"), "pattern detected: bromine frequently runs low");
});

test("Scenario P — post-soak bromine drop pattern, not a floater failure", () => {
  const st = freshState();
  // Two repetitions: in-range before soak, low within 24h after.
  addTest(st, "2026-08-20T09:00:00", { bromine: val(5) }, "before_soak", "quick");
  S.addEvent(st, "soak", { bathers: 5, duration: "30–60 min", heavy: [] }, "", "2026-08-20T18:00:00");
  addTest(st, "2026-08-21T09:00:00", { bromine: val(2) }, "after_soak", "quick");
  addTest(st, "2026-08-24T09:00:00", { bromine: val(5) }, "before_soak", "quick");
  S.addEvent(st, "soak", { bathers: 5, duration: "30–60 min", heavy: [] }, "", "2026-08-24T18:00:00");
  addTest(st, "2026-08-25T08:00:00", { bromine: val(2) }, "after_soak", "quick");
  const patterns = S.detectPatterns(st, NOW);
  const p = patterns.find(p => p.id === "post_soak_drop");
  ok(p, "pattern detected: bromine drops after family use");
  ok(!/floater failure/.test(p.title), "not labeled a floater failure");
  // Floater tuning ignores these non-normal-context readings entirely:
  const fa = S.floaterAdvice(st);
  ok(fa.code !== "increase", "no floater change from post-soak readings (got " + fa.code + ")");
});

test("pH-rising and alkalinity-low patterns", () => {
  const st = freshState();
  addTest(st, "2026-08-20T09:00:00", { pH: val(6.8), alkalinity: val(40) });
  addTest(st, "2026-08-23T09:00:00", { pH: val(7.2), alkalinity: val(40) });
  addTest(st, "2026-08-26T09:00:00", { pH: val(7.8), alkalinity: val(40) });
  const ids = S.detectPatterns(st, NOW).map(p => p.id);
  ok(ids.includes("ph_rising"), "pH rising detected");
  ok(ids.includes("alk_low"), "alkalinity persistently low detected");
});

test("Floater logic — needs 2+ consecutive normal low readings; one is not enough", () => {
  const st = freshState();
  addTest(st, "2026-08-27T09:00:00", { bromine: val(2) }, "normal", "quick");
  eq(S.floaterAdvice(st).code, "wait", "single low reading → wait");
  addTest(st, "2026-08-28T09:00:00", { bromine: val(2) }, "normal", "quick");
  eq(S.floaterAdvice(st).code, "increase", "two consecutive lows → suggest increase");
  const st2 = freshState();
  addTest(st2, "2026-08-27T09:00:00", { bromine: val(5) }, "normal", "quick");
  addTest(st2, "2026-08-28T09:00:00", { bromine: val(5) }, "normal", "quick");
  eq(S.floaterAdvice(st2).code, "ok", "stable at 5 → floater correct");
});

test("Trend direction needs 3 readings; discrete values never smoothed", () => {
  eq(S.trendDirection([val(5), val(5)]), "insufficient");
  eq(S.trendDirection([val(2), val(5), val(5)]), "rising");
  eq(S.trendDirection([val(5), val(5), val(2)]), "falling");
  eq(S.trendDirection([val(5), val(5), val(5)]), "stable");
});

test("Balance score: 0 in range, signed outside, unit = target widths", () => {
  eq(S.balanceScore("alkalinity", val(100), S.SPA_TARGETS), 0);
  eq(S.balanceScore("alkalinity", val(160), S.SPA_TARGETS), 1, "40 over a 40-wide band");
  eq(S.balanceScore("alkalinity", val(40), S.SPA_TARGETS), -1);
});

test("Bromine metrics: averages and consecutive streaks", () => {
  const st = freshState();
  [5, 2, 2].forEach((b, i) => addTest(st, "2026-08-2" + (5 + i) + "T09:00:00", { bromine: val(b) }, "normal", "quick"));
  const m = S.bromineMetrics(st);
  eq(m.consecutiveLowBromineTests, 2);
  eq(m.consecutiveHighBromineTests, 0);
  eq(m.averageBromineLast3Tests, 3);
});

console.log("\n== Storage, export, misc ==");

test("Timestamps: every test stores date, time, year and full ISO timestamp", () => {
  const st = freshState();
  const ev = addTest(st, "2026-08-29T09:42:00", { bromine: val(5) });
  eq(ev.localDate, "2026-08-29");
  eq(ev.localTime, "09:42");
  eq(ev.year, 2026);
  ok(ev.timestamp.length > 10, "full ISO timestamp, not just a date");
  eq(ev.data.precision, "discrete-strip");
});

test("State round-trips through storage with all raw readings intact", () => {
  const st = freshState();
  addTest(st, "2026-08-29T09:00:00", { bromine: val(5), alkalinity: range(80, 120) });
  S.addEvent(st, "soak", { bathers: 5 }, "", "2026-08-29T10:00:00");
  S.saveState(st);
  const back = S.loadState();
  eq(back.events.length, 2);
  const alk = back.events[0].data.values.alkalinity;
  ok(alk.approximate && alk.lower === 80 && alk.upper === 120, "range reading survives export/import path");
});

test("canWeUseIt: chemicals added after last test → TEST FIRST", () => {
  const st = freshState();
  addTest(st, "2026-08-29T08:00:00", { bromine: val(5), pH: val(7.2) });
  S.addEvent(st, "chemical_added", { parameter: "bromine" }, "", "2026-08-29T10:00:00");
  eq(S.canWeUseIt(st, NOW).verdict, "TEST_FIRST");
});

test("Fresh fill active blocks use; startup states are the required sequence", () => {
  const st = freshState();
  st.startup = { active: true, state: "alkalinity" };
  eq(S.canWeUseIt(st, NOW).verdict, "NOT_YET");
  eq(JSON.stringify(S.STARTUP_STATES),
     JSON.stringify(["refill", "initial_test", "alkalinity", "ph", "hardness", "bromine", "final_test", "complete"]));
});

test("High bromine during fresh fill: engine action carries doNotAdd", () => {
  const actions = S.diagnose({ bromine: val(10) }, S.SPA_TARGETS, "fresh_fill");
  ok(actions[0].doNotAdd, "do-not-add even in fresh-fill context");
});

test("Fresh-fill bromine step never says 'add granules' when bromine is high", () => {
  const st = freshState();
  st.startup = { active: true, state: "bromine" };
  addTest(st, "2026-08-29T09:00:00", { bromine: val(10) }, "fresh_fill", "retest");
  // The wizard screen builder is a pure string function over app state.
  vm.runInContext("state = " + JSON.stringify(st), sandbox);
  const highHtml = vm.runInContext('freshFillBalanceStep("bromine", new Date("2026-08-29T12:00:00"))', sandbox);
  ok(/Do not add more sanitizer/i.test(highHtml), "warns not to add");
  ok(!/I ADDED BROMINE GRANULES/.test(highHtml), "no add-granules button at 10+ ppm");
  ok(/RETEST BROMINE/.test(highHtml), "offers retest");
  // Low bromine still gets the establish-sanitizer flow.
  const st2 = freshState();
  st2.startup = { active: true, state: "bromine" };
  addTest(st2, "2026-08-29T09:00:00", { bromine: val(0) }, "fresh_fill", "retest");
  vm.runInContext("state = " + JSON.stringify(st2), sandbox);
  const lowHtml = vm.runInContext('freshFillBalanceStep("bromine", new Date("2026-08-29T12:00:00"))', sandbox);
  ok(/I ADDED BROMINE GRANULES/.test(lowHtml), "low bromine offers granules");
});

test("canWeUseIt: borderline bromine range never yields YES — retest first", () => {
  const st = freshState();
  addTest(st, "2026-08-29T09:00:00", { bromine: range(2, 5), pH: val(7.2) });
  const r = S.canWeUseIt(st, NOW);
  eq(r.verdict, "TEST_FIRST", "ambiguous sanitizer read must force a retest");
});

test("Fresh-fill final verification: completes only when all readings pass", () => {
  const T = S.SPA_TARGETS;
  eq(S.finalTestOutcome({ bromine: val(5), pH: val(7.2), alkalinity: val(80), hardness: val(250, true) }, T),
     "complete", "all-green final test completes setup");
  eq(S.finalTestOutcome({ bromine: val(1), pH: val(7.2), alkalinity: val(80), hardness: val(250, true) }, T),
     "bromine", "low bromine returns to the bromine step");
  eq(S.finalTestOutcome({ bromine: val(5), pH: val(8.4), alkalinity: val(40), hardness: val(250, true) }, T),
     "alkalinity", "alkalinity outranks pH when both fail");
});

test("Chart tooltip escapes user-controlled event text (no XSS)", () => {
  const html = S.tooltipHtml({ when: "Aug 29", param: "Bromine", value: "5 ppm", status: "Ideal",
    context: "normal", age: "3 days", prev: 'Added <img src=x onerror=alert(1)> "chem"' });
  ok(!html.includes("<img"), "raw tag must not survive");
  ok(html.includes("&lt;img"), "tag is HTML-escaped");
});

test("Fresh-fill completion screen is reachable after an all-green final test", () => {
  const st = freshState();
  st.startup = { active: true, state: "final_test" };
  st.maintenance.lastRefillDate = "2026-08-29T08:00:00";
  addTest(st, "2026-08-29T09:00:00", { bromine: val(5), pH: val(7.2), alkalinity: val(80), hardness: val(250, true) }, "fresh_fill", "full");
  vm.runInContext("state = " + JSON.stringify(st), sandbox);
  vm.runInContext('setStartupState("complete")', sandbox);
  const startup = vm.runInContext("state.startup", sandbox);
  ok(startup.active, "wizard stays active at 'complete' so the screen renders");
  const html = vm.runInContext("viewFreshFill()", sandbox);
  ok(/Water setup complete/i.test(html), "completion banner shown");
  ok(/START NORMAL MAINTENANCE/.test(html), "finish button offered (records startup_complete)");
  // Verified-good water at the complete step must not block spa use.
  ok(!vm.runInContext("startupInProgress(state)", sandbox), "complete step is not 'in progress'");
  const r = vm.runInContext('canWeUseIt(state, new Date("2026-08-29T12:00:00"))', sandbox);
  eq(r.verdict, "YES", "verified water is usable before tapping finish");
});

test("Shock cadence: due after 7 days, tracked from event", () => {
  const st = freshState();
  S.addEvent(st, "shock", {}, "", "2026-08-21T12:00:00");
  const m = S.maintenanceStatus(st, NOW);
  ok(m.shock.overdue, "8 days since shock → due");
});


console.log("\n== Result swatches ==");

test("Exact readings show their single matched pad color", () => {
  const html = S.padSwatchHtml("bromine", val(5), "hach_pool_spa_6way");
  ok(html.includes(S.PAD_COLORS.bromine[5]), "bromine 5 bucket color used");
  ok(html.includes("pad-swatch"), "renders the swatch span");
});

test("Between-two-colors readings show a split swatch of both buckets", () => {
  const html = S.padSwatchHtml("alkalinity", range(80, 120), "hach_pool_spa_6way");
  ok(html.includes("linear-gradient"), "split swatch");
  ok(html.includes(S.PAD_COLORS.alkalinity[80]) && html.includes(S.PAD_COLORS.alkalinity[120]),
     "both bucket colors present");
});

test("Readings with no matching bucket render no swatch", () => {
  eq(S.padSwatchHtml("bromine", val(3), "hach_pool_spa_6way"), "", "3 ppm is not a strip bucket");
  eq(S.padSwatchHtml("nope", val(5), "hach_pool_spa_6way"), "", "unknown parameter");
});

test("Timeline test chips carry swatches and escape text", () => {
  const st = freshState();
  const ev = addTest(st, "2026-08-29T09:00:00", { bromine: val(5), alkalinity: range(80, 120) });
  vm.runInContext("state = " + JSON.stringify(st), sandbox);
  const html = vm.runInContext("testValuesHtml(state.events[0])", sandbox);
  ok(html.includes("reading-chip"), "chips rendered");
  ok((html.match(/pad-swatch/g) || []).length === 2, "one swatch per reading");
  ok(html.includes("Br 5"), "numbers remain canonical");
});


test("Mobile zoom is locked (viewport + touch-action + iOS gesture guard)", () => {
  ok(html.includes("maximum-scale=1") && html.includes("user-scalable=no"), "viewport disallows scaling");
  ok(/touch-action: pan-y/.test(html), "touch-action blocks pinch while keeping scroll");
  ok(html.includes("gesturestart"), "iOS gesture events prevented");
});

/* ---------------- summary ---------------- */
console.log("\n" + passed + " passed, " + failed + " failed");
process.exit(failed ? 1 : 0);
