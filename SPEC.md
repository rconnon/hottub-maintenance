# Joel’s Hot Tub Water Manager
## Codex Implementation Specification (`SPEC.md`)

### 1. Product Goal

Build a **single-file, self-contained HTML application** that helps Joel safely maintain the water in his specific hot tub.

The app should answer three questions extremely well:

1. **Is the water okay right now?**
2. **What should I do next?**
3. **When do I need to test, clean, shock, or refill again?**

The app should guide Joel through water testing, diagnose readings, sequence corrective actions, track maintenance history, guide fresh fills, and help him avoid unnecessary chemical additions.

The operating philosophy is:

> **TEST → DIAGNOSE → CORRECT ONE THING → CIRCULATE → RETEST**

The app’s job is **not** to maximize chemical use. Its job is to help Joel add as little as necessary, in the correct order, based on measured conditions.

---

# 2. Joel’s Spa Profile

Preload this profile:

```javascript
const SPA_PROFILE = {
  ownerName: "Joel",
  manufacturer: "Canadian Hot Tubs",
  model: "Algonquin",
  volumeGallons: 600,
  volumeLitres: 2270,
  sanitizerSystem: "bromine",
  ionizer: false,
  dispenserType: "floating bromine tablet dispenser",
  regularBathers: 5,
  typicalUse: "weekly",
  household: "2 adults + 3 kids"
};
```

---

# 3. Water Chemistry Targets

Use these as configurable defaults:

```javascript
const SPA_TARGETS = {
  bromine: {
    min: 3,
    max: 5
  },

  pH: {
    min: 7.2,
    idealMin: 7.4,
    idealMax: 7.6,
    max: 7.8
  },

  alkalinity: {
    min: 80,
    max: 120
  },

  hardness: {
    min: 150,
    max: 250
  }
};
```

Important:

- These are the **spa targets**.
- The Hach strip has coarser measurement increments.
- Do not invent precision the test strip cannot provide.

---

# 4. Technical Requirements

Deliver as:

> `index.html`

Requirements:

- One single HTML file
- No build process
- No server
- No account/login
- Vanilla HTML/CSS/JavaScript preferred
- No frameworks required
- No external fonts
- No CDN
- No analytics
- No API calls
- No internet dependency
- Fully usable offline
- Mobile-first
- Works when opened directly as a file
- Persist state in `localStorage`
- Export/import state as JSON
- Responsive on phone, tablet, desktop

Do not minify source code.

Organize and heavily comment the JavaScript.

---

# 5. Navigation

Use a mobile-first bottom tab bar:

1. **Today**
2. **Test Water**
3. **Maintenance**
4. **History**
5. **Settings**

Default launch screen:

> **Today**

If a fresh-fill workflow is in progress, reopening the app should resume that workflow instead.

---

# 6. Today Dashboard

The Today screen should immediately answer:

> **Is the hot tub okay right now?**

Top status states:

### GREEN
**Water looks good**

### AMBER
**Water needs attention**

### RED
**Do not use yet**

### GRAY
**Test water first**

Below the status, explain why.

Example:

> Bromine is low at approximately 2 ppm. Restore sanitizer before using the tub.

or:

> Water is balanced and the latest sanitizer reading is current.

---

# 7. Chemistry Dashboard Cards

Show four cards:

## Bromine
- Latest value
- Approximate marker if strip-based
- Target
- Last tested
- Trend
- Status

## pH
- Latest value
- Target
- Last tested
- Trend
- Status

## Total Alkalinity
- Latest value
- Target
- Last tested
- Trend
- Status

## Total Hardness
- Latest value
- Target
- Last tested
- Trend
- Status

Never show false precision.

Example:

> Hardness: **~250 ppm**

not:

> Hardness: **218 ppm**

if the result came from the strip.

---

# 8. Primary Dashboard Actions

Large primary buttons:

- **TEST WATER**
- **CAN WE USE IT?**
- **WE USED THE HOT TUB**
- **FRESH FILL / WATER CHANGE**

---

# 9. “Can We Use It?” Engine

When tapped, evaluate:

- Bromine reading
- pH reading
- Reading freshness
- Water clarity
- Recent chemical addition
- Any active fresh-fill workflow
- Any known unsafe condition

Results:

### YES
> Latest water readings are within normal operating ranges.

### TEST FIRST
> Your sanitizer reading is too old to rely on. Test before using the spa.

### NOT YET
> Bromine is below the normal operating range.

Do not rely only on color. Always show text.

---

# 10. Test Kit Profile

Joel uses:

> **Hach Pool & Spa Test Strips**

The bottle directions are:

1. Dip a strip into the water.
2. Remove immediately.
3. Hold the strip level for **15 seconds**.
4. **Do not shake excess water from the strip.**
5. Compare pads to the bottle chart.

The bottle compares pads in this order:

1. Total Hardness
2. Total Chlorine
3. Total Bromine
4. Free Chlorine
5. pH
6. Total Alkalinity
7. Cyanuric Acid

For Joel’s bromine spa, hide chlorine and cyanuric acid from the normal workflow.

Use this test-kit definition:

```javascript
const HACH_TEST_KIT = {
  id: "hach_pool_spa_6way",
  name: "Hach Pool & Spa Test Strips",
  readDelaySeconds: 15,

  instructions: {
    dip: "Dip strip into water and remove immediately.",
    wait: "Hold strip level for 15 seconds.",
    warning: "Do not shake excess water from strip."
  },

  parameters: {
    hardness: {
      label: "Total Hardness",
      unit: "ppm",
      values: [0, 100, 250, 500, 1000]
    },

    bromine: {
      label: "Total Bromine",
      unit: "ppm",
      values: [0, 1, 2, 5, 10, 20]
    },

    pH: {
      label: "pH",
      values: [6.2, 6.8, 7.2, 7.8, 8.4]
    },

    alkalinity: {
      label: "Total Alkalinity",
      unit: "ppm",
      values: [0, 40, 80, 120, 180, 240]
    }
  },

  hiddenParameters: [
    "totalChlorine",
    "freeChlorine",
    "cyanuricAcid"
  ]
};
```

---

# 11. Test Water UX

Do not start with text fields.

Use a guided interaction.

## Step 1 — Prepare strip

Screen:

> **Test your water**

> Grab one Hach Pool & Spa test strip.

Button:

> **I’M READY**

---

## Step 2 — Dip

Screen:

> Dip one strip into the hot-tub water and remove it immediately.

Button:

> **I DIPPED THE STRIP**

On tap, immediately begin a 15-second countdown.

---

## Step 3 — 15-second timer

Display large timer:

```text
HOLD STRIP LEVEL

00:15

Do not shake excess water off.
```

Disable result entry during countdown.

At zero:

> **READY TO READ**

If supported without additional permission, optionally vibrate or play a subtle tone.

---

# 12. Strip Reading Order

After 15 seconds, show results in the physical pad sequence relevant to Joel:

1. Total Hardness
2. Total Bromine
3. pH
4. Total Alkalinity

Explain:

> We skip chlorine and cyanuric acid because this spa uses bromine.

---

# 13. Exact Test Entry Controls

No typing should be required.

## Total Hardness

Selectable tiles:

- 0
- 100
- 250
- 500
- 1000 ppm

## Total Bromine

Selectable tiles:

- 0
- 1
- 2
- 5
- 10
- 20 ppm

## pH

Selectable tiles:

- 6.2
- 6.8
- 7.2
- 7.8
- 8.4

## Total Alkalinity

Selectable tiles:

- 0
- 40
- 80
- 120
- 180
- 240 ppm

Use approximate chart colors if desired, but always show the number prominently.

Do not depend on color alone.

---

# 14. “Between Two Colors” Support

Every parameter should include:

> **Looks between two colors**

Then allow adjacent choices.

Example:

```javascript
{
  lower: 80,
  upper: 120,
  approximate: true
}
```

Display:

> Alkalinity: **~80–120 ppm**

Do not silently convert to a midpoint.

Diagnostic behavior:

- If entire interval is within target → treat as in range.
- If interval crosses a target boundary → treat as borderline.
- Avoid recommending a large correction based on an ambiguous result.

---

# 15. Quick vs Full Test

When Joel taps **Test Water**, offer:

## Quick Check
Measures:
- Bromine
- pH

Use for routine checks.

## Full Test
Measures:
- Hardness
- Bromine
- pH
- Alkalinity

Use weekly and after a refill.

Both still use the exact 15-second Hach procedure.

---

# 16. Test Context

Every test should optionally record:

```javascript
{
  context: "normal" |
           "before_soak" |
           "after_soak" |
           "after_chemicals" |
           "fresh_fill"
}
```

Default:

> Normal / no recent use

This context should affect interpretation of trends.

A low sanitizer reading immediately after five bathers should not automatically trigger the same floater recommendation as repeated low readings under normal conditions.

---

# 17. Data Precision

Every reading must record how it was measured.

Example:

```javascript
{
  timestamp: "...",
  testKit: "hach_pool_spa_6way",
  precision: "discrete-strip",
  values: {
    hardness: 250,
    bromine: 5,
    pH: 7.2,
    alkalinity: 80
  }
}
```

For range-based selections:

```javascript
{
  bromine: {
    lower: 2,
    upper: 5,
    approximate: true
  }
}
```

---

# 18. Bromine Interpretation

Spa target:

> **3–5 ppm**

However, the strip only provides:

> 0 / 1 / 2 / 5 / 10 / 20

Interpret as:

| Strip reading | Status | Behavior |
|---|---|---|
| 0 | Red | Very low, block use |
| 1 | Red | Too low, block use |
| 2 | Amber | Below normal, restore sanitizer before normal use |
| 5 | Green | Ideal measurable result |
| 10 | Amber/Red | High, do not add sanitizer, retest before use |
| 20 | Red | Very high, do not use |

Do not ask Joel to “enter 3 ppm” because the kit cannot display it.

---

# 19. pH Interpretation

Strip values:

- 6.2
- 6.8
- 7.2
- 7.8
- 8.4

Interpret:

| Reading | Status |
|---|---|
| 6.2 | Red |
| 6.8 | Amber |
| 7.2 | Green |
| 7.8 | Green |
| 8.4 | Red/Amber |

Underlying acceptable target remains:

> 7.2–7.8

---

# 20. Alkalinity Interpretation

Strip values:

- 0
- 40
- 80
- 120
- 180
- 240 ppm

Target:

> 80–120 ppm

Interpret:

- 80 → Green
- 120 → Green
- 40 → Low
- 180 → High
- 240 → Very high

---

# 21. Hardness Interpretation

Strip values:

- 0
- 100
- 250
- 500
- 1000 ppm

Operational target:

> approximately 150–250 ppm

Important:

Because the strip cannot resolve 150–200 ppm precisely:

- 250 should generally be considered acceptable
- 100 indicates low
- 500+ indicates high
- Never invent a value between strip buckets

Display 250 as:

> **~250 ppm**

---

# 22. Diagnostic Priority Engine

Core priority order:

1. Sanitizer safety
2. Total alkalinity
3. pH
4. Calcium/total hardness
5. Shock/oxidation
6. Maintenance items

The app should normally recommend **one corrective chemistry action at a time**.

Do not tell Joel to adjust alkalinity, pH, hardness, and bromine simultaneously.

---

# 23. Diagnostic Pseudocode

```javascript
function diagnose(reading, appState) {
  const actions = [];

  // 1. SANITIZER
  if (reading.bromine <= 1) {
    actions.push({
      priority: 1,
      severity: "red",
      parameter: "bromine",
      title: "Restore bromine",
      message: "Bromine is too low for normal spa use.",
      blocksUse: true
    });
  } else if (reading.bromine === 2) {
    actions.push({
      priority: 1,
      severity: "amber",
      parameter: "bromine",
      title: "Bromine is below target",
      message: "Restore bromine before normal use.",
      blocksUse: true
    });
  } else if (reading.bromine >= 10) {
    actions.push({
      priority: 1,
      severity: "red",
      parameter: "bromine",
      title: "Bromine is high",
      message: "Do not add more sanitizer. Allow the level to fall and retest.",
      blocksUse: true
    });
  }

  // 2. ALKALINITY
  if (reading.alkalinity < 80 || reading.alkalinity > 120) {
    actions.push({
      priority: 2,
      severity: "amber",
      parameter: "alkalinity",
      title: "Correct alkalinity first",
      blocksPHAdjustment: true
    });
  }

  // 3. PH
  const alkInRange =
    reading.alkalinity >= 80 &&
    reading.alkalinity <= 120;

  if (
    alkInRange &&
    (reading.pH < 7.2 || reading.pH > 7.8)
  ) {
    actions.push({
      priority: 3,
      severity: "amber",
      parameter: "pH",
      title: "Correct pH"
    });
  }

  // 4. HARDNESS
  if (reading.hardness <= 100 || reading.hardness >= 500) {
    actions.push({
      priority: 4,
      severity: "info",
      parameter: "hardness"
    });
  }

  return actions.sort((a, b) => a.priority - b.priority);
}
```

---

# 24. Action Card

The Today screen should always have:

## What should I do?

Example:

> ### Do this first
> **Correct total alkalinity**
>
> Current: 40 ppm  
> Target: 80–120 ppm
>
> Correct alkalinity before adjusting pH.
>
> After adjustment:
> 1. Circulate water.
> 2. Wait according to the product label.
> 3. Retest alkalinity.
> 4. Only then evaluate pH.

Only surface one primary action whenever possible.

---

# 25. Chemical Inventory

Preload Joel’s existing products.

## SpaLife Brominating Tabs

```javascript
{
  id: "spalife_brominating_tabs",
  name: "SpaLife Brominating Tabs",
  role: "maintenance sanitizer",
  type: "bromine tablets",
  delivery: "floating dispenser"
}
```

Purpose:

> Slow-release bromine used to maintain sanitizer level.

---

## Regal Spa Brom Granules

```javascript
{
  id: "regal_brom_granules",
  name: "Regal Spa Brom Granules",
  role: "fast sanitizer correction",
  type: "bromine granules"
}
```

Purpose:

> Fast-acting bromine used to establish or restore sanitizer level.

---

## Aquarius Spa Shock — Chlorine Free

```javascript
{
  id: "aquarius_chlorine_free_shock",
  name: "Aquarius Spa Shock",
  role: "oxidizer",
  type: "non-chlorine shock"
}
```

Purpose:

> Oxidizes bather waste and supports the bromine system.

---

## Aqua Cal Hardness Treatment

```javascript
{
  id: "aqua_cal",
  name: "Aqua Cal Hardness Treatment",
  role: "hardness increaser",
  type: "calcium hardness increaser"
}
```

---

## Hach Pool & Spa Test Strips

```javascript
{
  id: "hach_pool_spa_6way",
  name: "Hach Pool & Spa Test Strips",
  role: "testing"
}
```

---

# 26. Missing Chemical Placeholders

Create configurable placeholders for:

- Alkalinity increaser
- pH increaser
- pH decreaser

Initial status:

> Not configured

Each can later store:

```javascript
{
  brand: "",
  name: "",
  unit: "g",
  referenceVolume: null,
  labelDose: null,
  effectPerDose: null,
  notes: ""
}
```

---

# 27. Chemical Dosing Safety

Do not hardcode universal doses.

Only calculate a dose if the user has configured the actual label instructions for that exact product.

Generic volume scaling may use:

```text
requiredDose =
labelDose × spaVolume / labelReferenceVolume
```

If the label also defines a ppm effect, support proportional scaling.

Until configured, display:

> Follow the product label for approximately **2,270 L / 600 US gallons**.

Permanent warning on chemical screens:

> **Never premix spa chemicals or combine concentrated chemicals together. Add products separately and follow the product label.**

Chemical handling should be treated as an adult task.

---

# 28. Fresh Fill / Startup Wizard

This is a first-class feature.

Primary action:

> **FRESH FILL / START NEW WATER**

The app should guide Joel through the entire water startup process.

Never dump all adjustments on him at once.

Required order:

1. Refill
2. Initial untreated-water test
3. Alkalinity
4. pH
5. Hardness
6. Bromine
7. Final verification
8. Begin normal maintenance

---

# 29. Fresh Fill State Machine

Use explicit states:

```javascript
const STARTUP_STATES = [
  "refill",
  "initial_test",
  "alkalinity",
  "ph",
  "hardness",
  "bromine",
  "final_test",
  "complete"
];
```

Persist current state to `localStorage`.

On reopening:

> **Continue fresh-fill setup**

---

# 30. Fresh Fill Step 1 — Refill

Screen:

> ### Refill the Algonquin
>
> Fill the hot tub to its normal operating level.

Checklist:

- Tub filled
- Filter installed
- Pumps/circulation running
- No balancing chemicals added yet

Button:

> **WATER IS CIRCULATING**

On tap:

```javascript
lastRefillDate = now;
waterAgeDays = 0;
startupMode = true;
startupState = "initial_test";
```

---

# 31. Fresh Fill Step 2 — Initial Test

Prompt:

> **Before adding anything, test the untreated fill water.**

Run the full Hach test workflow:

1. Dip strip
2. Remove immediately
3. Hold level for 15 seconds
4. Read:
   - Hardness
   - Bromine
   - pH
   - Alkalinity

Context:

```javascript
context = "fresh_fill";
```

Do not recommend four changes at once.

---

# 32. Fresh Fill Step 3 — Alkalinity

Target:

> **80–120 ppm**

If in range:

> ✓ Alkalinity looks good.

Continue.

If low:

> **Correct alkalinity first.**

Explain:

> Alkalinity helps stabilize pH. Correcting pH first can cause you to chase the reading.

If label dosing is configured:

> Show a scaled amount for 2,270 L / 600 gallons.

Otherwise:

> Use the product label for 2,270 L / 600 gallons.

Button:

> **I ADDED ALKALINITY INCREASER**

Then:

> Circulate according to the chemical label.

Button:

> **RETEST ALKALINITY**

Run the same 15-second strip procedure but ask only for alkalinity.

Do not advance until:
- reading is acceptable, or
- user explicitly chooses “Skip for now”

---

# 33. Fresh Fill Step 4 — pH

Only after alkalinity is acceptable:

> **Now check pH.**

Target:

> 7.2–7.8

If in range:

> ✓ pH looks good. No pH chemical required.

If low/high:

Recommend configured pH product.

Use:

> Adjust → circulate → retest

Do not mark complete just because chemical was added.

A new reading should close the step.

---

# 34. Fresh Fill Step 5 — Hardness

Evaluate hardness after pH.

If 250 ppm:

> ✓ Hardness is acceptable.

If 100 ppm:

> Hardness appears low.

Identify:

> Aqua Cal Hardness Treatment

Use label-based dosing only.

If 500+:

> Hardness is high. Do not add hardness increaser.

Do not invent complicated chemical hardness-lowering procedures.

---

# 35. Fresh Fill Step 6 — Establish Bromine

After basic balance is acceptable:

> **Establish sanitizer**

Explain product roles:

### Regal Brom Granules
Fast bromine correction.

### SpaLife Brominating Tabs
Slow ongoing bromine maintenance.

Target:

> 3–5 ppm

Because the Hach strip’s ideal measurable point is 5 ppm:

> Aim for a strip result around **5 ppm**.

Use label directions for Regal granules.

Then retest.

Once 5 ppm is reached:

> ✓ Bromine established.

Then record floater setup:

- Number of tablets
- Floater opening
- Date loaded

---

# 36. Fresh Fill Step 7 — Final Verification

Require another full Hach test.

Example:

```text
FINAL WATER CHECK

Bromine       5 ppm      ✓
pH            7.2        ✓
Alkalinity    80 ppm     ✓
Hardness      ~250 ppm   ✓
```

Then:

> **WATER SETUP COMPLETE**

Button:

> **START NORMAL MAINTENANCE**

Record:

```javascript
{
  type: "startup_complete",
  timestamp: now
}
```

---

# 37. Fresh Fill Progress UI

Always show progress:

```text
Fresh Fill Setup

✓ Refill
✓ Initial test
✓ Alkalinity
● pH
○ Hardness
○ Bromine
○ Final test
```

---

# 38. Retest Mode

After any correction, offer a dedicated retest.

Example:

> **RETEST ALKALINITY**

Workflow:

1. Dip fresh strip
2. Remove immediately
3. Hold level 15 sec
4. Ask only for Total Alkalinity

Do not force a full test after every correction.

---

# 39. Bromine Floater Manager

Track:

- Number of tablets
- Opening setting
- Date loaded
- Current bromine
- Previous bromine
- Trend
- Consecutive in-range/out-of-range readings

Example:

```text
BROMINE DISPENSER

3 tablets
Opening: 4 / 10
Loaded: 5 days ago
```

---

# 40. Floater Adjustment Logic

Do not overreact to one reading.

Require preferably at least two consecutive normal-context readings before suggesting a permanent floater adjustment.

### Repeated low bromine
> Bromine supply may be too low. After restoring sanitizer, slightly increase the floater opening.

### Stable around 5 ppm
> Floater setting appears correct.

### Repeated high bromine
> Reduce the floater opening slightly.

Ignore or downweight readings taken immediately after a heavy soak when evaluating floater performance.

---

# 41. “We Used the Hot Tub” Mode

Button:

> **WE USED THE HOT TUB**

Ask:

## Number of bathers
- 1
- 2
- 3
- 4
- 5
- 6+

Default:
> 5

## Duration
- <15 min
- 15–30 min
- 30–60 min
- 60+ min

## Heavy use?
Options:
- Kids playing
- Guests
- Multiple soak cycles
- Long soak

Save as a `soak` event.

---

# 42. Bather Load Logic

For this tub:

> 5 bathers in 600 gallons = high bather load

After a family soak:

> Five bathers place a significant organic load on 600 gallons of water.

Recommend:

> Check sanitizer after use or as part of the normal post-use maintenance routine.

Also surface shock status.

Do not automatically require shock after every use unless configured.

---

# 43. Shock / Oxidation Tracker

Default cadence:

> Weekly

Also recommend after unusually heavy use.

Dashboard card:

```text
OXIDATION / SHOCK

Last completed: 6 days ago
Due tomorrow
```

Button:

> **SHOCK COMPLETED**

Record timestamp.

Use Joel’s configured product:

> Aquarius Spa Shock — Chlorine Free

Do not calculate dose unless product label dosage is configured.

---

# 44. Testing Cadence

Default routine:

## Quick test
Bromine + pH

Frequency:
> 2–3 times per week

Also:
> Before planned use if sanitizer has not been checked recently.

## Full test
Hardness + bromine + pH + alkalinity

Frequency:
> Weekly

---

# 45. Test Freshness

Per-parameter freshness should be tracked separately.

Example:

```text
Bromine
5 ppm
Tested today ✓

pH
7.2
Tested today ✓

Alkalinity
80 ppm
Tested 6 days ago

Hardness
~250 ppm
Tested 20 days ago
```

Suggested defaults:

- Bromine >3 days old → quick check due
- pH >3 days old → quick check due
- Full chemistry >7 days old → weekly full test due
- Hardness can age more gracefully than sanitizer

After heavy use, reduce sanitizer freshness tolerance.

---

# 46. Maintenance Timers

Track:

## Filter rinse
Default:
> Every 14 days

## Deep filter clean
Default:
> Every 30 days

## Filter replacement
Default:
> Every 10 months

Configurable:
> 9–12 months

## Water change
Default:
> Every 90 days

Configurable:
- 60
- 90
- 120
- Custom

---

# 47. Water Age

Dashboard:

```text
WATER AGE
42 / 90 days
```

Milestones:

### 60 days
> Water is entering the later part of its normal service cycle.

### 80 days
> Consider planning a water change soon.

### 90 days
> Water change due.

If water is:
- persistently foamy
- cloudy
- difficult to balance
- consuming sanitizer unusually quickly

and is already older, increase refill recommendation priority.

---

# 48. Drain / Refill Workflow

Button:

> **START WATER CHANGE**

Steps:

1. Record current water age
2. Drain tub
3. Clean interior according to manufacturer instructions
4. Inspect / clean filter
5. Refill
6. Start circulation
7. Test untreated fill water
8. Balance alkalinity
9. Balance pH
10. Check hardness
11. Establish bromine
12. Resume floater
13. Final test
14. Start new 90-day water cycle

Reset:

```javascript
lastRefillDate = now;
waterAgeDays = 0;
```

---

# 49. Filter Maintenance

Dashboard cards:

## Filter rinse
Show:
- Last rinse
- Due date

## Deep clean
Show:
- Last deep clean
- Due date

## Filter replacement
Show:
- Filter age
- Replacement due

Record events:

```text
filter_rinse
filter_clean
filter_replace
```

---

# 50. Water Appearance Diagnostics

Optional test observations:

## Water appearance
- Clear
- Slightly cloudy
- Cloudy
- Very cloudy

## Foam
- None
- Minor
- Persistent

## Smell
- Normal
- Strong chemical smell
- Musty/unusual

## Surface
- Normal
- Slippery
- Scale visible

These observations supplement test readings but do not override them.

---

# 51. Cloudy Water Logic

If cloudy + bromine low:

> Restore sanitizer first.

If cloudy + sanitizer okay, evaluate:

1. Recent heavy bather load
2. Filter due for cleaning
3. pH
4. Hardness
5. Water age

Return ranked likely contributors.

---

# 52. Foam Logic

If persistent foam, evaluate:

- High bather load
- Detergent residue on swimwear
- Body products
- Dirty filter
- Old water

Preferred message:

> Persistent foam is usually better solved by addressing the cause than repeatedly adding defoamer.

Do not default to chemical defoamer recommendations.

---

# 53. History

Keep a chronological maintenance log.

Example:

```text
Aug 29
Refilled tub

Aug 29
Water test
Br: 5
pH: 7.2
TA: 80
Hardness: 250

Aug 30
5 bathers
35 minutes

Aug 30
Shock completed

Sep 4
Filter rinsed
```

Support notes.

---

# 54. Event Data Model

Use a generic event structure:

```javascript
{
  id,
  timestamp,
  type,
  data,
  notes
}
```

Supported event types:

```text
water_test
chemical_added
shock
soak
filter_rinse
filter_clean
filter_replace
drain_started
refill
startup_complete
floater_change
note
```

---

# 55. Trend Charts

Show simple trends for:

- Bromine
- pH
- Alkalinity
- Hardness

Ranges:
- 7 days
- 30 days
- 90 days
- All

Use:
- Canvas
or
- SVG

No external chart library.

---

# 56. Water Test Trend Intelligence

For bromine, compute metrics such as:

```javascript
averageBromineLast3Tests
consecutiveLowBromineTests
consecutiveHighBromineTests
```

Use only normal-context readings for floater tuning where practical.

Example:

> Bromine has been below target on 3 consecutive normal checks.

or:

> Bromine has been stable around 5 ppm for the last week.

---

# 57. Storage

Use:

```text
joelsHotTubApp_v1
```

Suggested structure:

```javascript
{
  version,
  spaProfile,
  testKit,
  targets,
  chemicalInventory,
  readings,
  events,
  maintenance,
  startupState,
  settings
}
```

---

# 58. Backup / Restore

Settings screen:

## Export Data
Download local app data as JSON.

## Import Data
Restore from JSON.

## Reset App
Require confirmation.

---

# 59. Settings

Editable settings:

- Spa name
- Volume gallons
- Volume litres
- Sanitizer type
- Test kit
- Bromine target
- pH target
- Alkalinity target
- Hardness target
- Shock interval
- Filter rinse interval
- Filter deep-clean interval
- Filter replacement interval
- Water change interval
- Chemical inventory
- Chemical label dosages
- Floater settings
- Test reminders

Preload Joel’s configuration.

---

# 60. Test Kit Extensibility

Support future test-kit types:

## Hach Test Strips
Discrete value entry.

## Drop Test Kit
Direct numerical entry.

## Digital Tester
Direct numerical entry.

## Other
Configurable.

Separate:

```javascript
SPA_TARGETS
TEST_KIT_CAPABILITIES
CHEMICAL_PRODUCTS
```

Do not couple app chemistry rules to one test kit.

---

# 61. UI Design

Visual direction:

- Clean
- Modern
- Calm
- Mobile-first
- Large cards
- Rounded corners
- Generous whitespace
- Clear typography
- Strong status hierarchy

Think:
- Apple Health
- Nest
- Tesla appliance-control feel

Avoid:
- Pool-store website
- Spreadsheet look
- Industrial control panel

Use system fonts.

Support dark/light mode via system preference.

---

# 62. Semantic Status

Use:

- Green = normal
- Amber = needs attention
- Red = do not use / significant issue
- Blue = maintenance/information
- Gray = unknown / not tested

Always include:
- icon
- text label

Do not rely on color alone.

---

# 63. Home Screen Example

```text
Good morning, Joel

ALGONQUIN
Water looks good ✓

Bromine
5 ppm
Ideal
Tested today

pH
7.2
In range
Tested today

Alkalinity
80 ppm
In range
Tested 6 days ago

Hardness
~250 ppm
In range
Tested 20 days ago


CAN WE USE IT?
YES ✓


NEXT ACTION
Full water test due tomorrow.


MAINTENANCE

Water
42 / 90 days

Shock
6 days ago
Due tomorrow

Filter rinse
11 days ago
Due in 3 days


[ TEST WATER ]

[ WE USED THE HOT TUB ]
```

---

# 64. Fresh Fill Screen Example

```text
JOEL'S ALGONQUIN

Fresh Water Setup

████████░░░░░░░░
3 of 7 steps

✓ Refill
✓ Initial test
✓ Alkalinity
● pH
○ Hardness
○ Bromine
○ Final test

CURRENT TASK

pH is 8.4
Target: 7.2–7.8

Correct pH before continuing.

[ VIEW INSTRUCTIONS ]

[ RETEST pH ]
```

---

# 65. Test Screen Example

```text
TEST WATER

Step 1 of 3

Dip one Hach strip into the water
and remove immediately.

[ I DIPPED IT ]
```

Then:

```text
HOLD STRIP LEVEL

00:15

Do not shake excess water off.
```

Then:

```text
MATCH YOUR STRIP

TOTAL HARDNESS
[ 0 ] [ 100 ] [ 250 ] [ 500 ] [ 1000 ]

TOTAL BROMINE
[ 0 ] [ 1 ] [ 2 ] [ 5 ] [ 10 ] [ 20 ]

pH
[ 6.2 ] [ 6.8 ] [ 7.2 ] [ 7.8 ] [ 8.4 ]

TOTAL ALKALINITY
[ 0 ] [ 40 ] [ 80 ] [ 120 ] [ 180 ] [ 240 ]

[ SAVE TEST ]
```

---

# 66. Test Result Example

```text
TEST COMPLETE

Bromine      2 ppm       ⚠ LOW
pH           7.2         ✓
Alkalinity   80 ppm      ✓
Hardness     ~250 ppm    ✓

────────────────────

DO THIS FIRST

Restore bromine before using
the hot tub.

[ VIEW ACTION ]
```

---

# 67. Chemical Action Screen

Show:

## What to correct
Example:
> Total alkalinity is low.

## Current
> 40 ppm

## Target
> 80–120 ppm

## Product
> Configured alkalinity increaser

## Dose
If configured:
> Calculated amount for 2,270 L

If not:
> Follow the label dose for 2,270 L / 600 gallons.

## Then
> Circulate according to the product label and retest.

Buttons:
- **I ADDED IT**
- **RETEST**
- **CANCEL**

---

# 68. Safety Copy

Use concise, persistent safety copy in chemical workflows:

> Follow the product label.

> Never premix spa chemicals.

> Add chemicals separately.

> Keep chemicals secured away from children.

> Chemical handling is an adult task.

Avoid alarmist styling unless there is a genuinely unsafe reading.

---

# 69. “Why?” Education

Every major recommendation should have an expandable:

> **Why am I doing this?**

Examples:

## Alkalinity
> Alkalinity helps stabilize pH. If alkalinity is out of range, pH can be difficult to control.

## pH
> Proper pH helps protect bathers, equipment, and sanitizer effectiveness.

## Bromine
> Bromine provides the sanitizer residual that keeps spa water sanitary between uses.

Keep education concise.

---

# 70. Do Not Build in V1

Do not include:

- Accounts
- Cloud sync
- AI API
- Camera-based strip interpretation
- IoT sensor integration
- Automatic chemical dispenser integration
- Push notifications
- Weather
- Shopping
- Ads
- Manufacturer API
- Multi-spa support

---

# 71. Optional V2 Features

Architect for future support:

- Camera-assisted strip interpretation
- Bluetooth tester import
- Shared household sync
- Multi-spa profiles
- Automatic chemical inventory estimates
- Native notifications
- Cloud backup

None are required for v1.

---

# 72. Code Organization

Even in one file, keep clear sections:

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    /* CSS variables */
    /* reset */
    /* layout */
    /* cards */
    /* forms */
    /* navigation */
    /* responsive */
  </style>
</head>

<body>
  <div id="app"></div>

  <script>
    // Constants

    // Default spa profile

    // Target ranges

    // Test kit definitions

    // Chemical inventory

    // Storage

    // State model

    // Diagnostic engine

    // Fresh-fill state machine

    // Maintenance engine

    // Dose calculator

    // Test workflow

    // Rendering

    // Navigation

    // Event handlers

    // Charts

    // Import/export

    // App initialization
  </script>
</body>
</html>
```

---

# 73. Acceptance Tests

## Scenario A — Perfect water

Input:

```text
Bromine 5
pH 7.2
Alkalinity 80
Hardness 250
```

Expected:

> Water looks good.

> Can we use it? YES

---

## Scenario B — Low alkalinity and high pH

Input:

```text
Bromine 5
pH 8.4
Alkalinity 40
Hardness 250
```

Expected:

> Correct alkalinity first.

Do not recommend immediate pH correction.

---

## Scenario C — Low bromine

Input:

```text
Bromine 1
pH 7.2
Alkalinity 80
Hardness 250
```

Expected:

> Do not use yet.

> Restore bromine.

---

## Scenario D — Borderline bromine

Input:

```text
Bromine 2
```

Expected:

> Bromine is below normal.

> Restore sanitizer before normal use.

---

## Scenario E — High bromine

Input:

```text
Bromine 10
```

Expected:

> Do not add sanitizer.

> Allow bromine to fall and retest.

> Do not use yet.

---

## Scenario F — Old sanitizer reading

Last bromine test:
> 5 days ago

Expected:

> Test water before using.

---

## Scenario G — Heavy use

Input:

> 5 bathers  
> 45 minutes

Expected:

- Log high-bather-load event
- Recommend checking sanitizer
- Surface oxidation/shock status

---

## Scenario H — 90-day water

Water age:
> 90 days

Expected:

> Water change due.

---

## Scenario I — Fresh fill with low TA

Initial test:

```text
Hardness 100
Bromine 0
pH 6.8
Alkalinity 40
```

Expected:

> Correct alkalinity first.

Do not show simultaneous corrections.

---

## Scenario J — Alkalinity correction changes pH

Initial:

```text
TA 40
pH 6.8
```

After alkalinity adjustment:

```text
TA 80
pH 7.2
```

Expected:

> Alkalinity in range.

> pH now in range.

> No pH chemical required.

---

## Scenario K — Strip ambiguity

Input:

> Alkalinity appears between 80 and 120.

Expected:

> Alkalinity appears in range.

Do not store 100 as if measured.

---

## Scenario L — Resume startup

User closes app during pH step.

Expected on reopen:

> Continue fresh-fill setup

Resume exactly at pH step.

---

# 74. Core Product Principles

Codex should preserve these rules above all else:

### Rule 1
**Test before treating.**

### Rule 2
**Correct one major balance problem at a time.**

### Rule 3
**Alkalinity before pH.**

### Rule 4
**Sanitizer safety can override normal sequencing.**

### Rule 5
**Never invent test precision.**

### Rule 6
**Never calculate a chemical dose without configured label data.**

### Rule 7
**Avoid permanent floater changes based on one reading.**

### Rule 8
**Use the actual Hach strip workflow and its 15-second read timing.**

### Rule 9
**Fresh-fill setup should feel like following a recipe.**

### Rule 10
**The dashboard must always tell Joel the single most important next action.**

---

# 75. Definition of Done

V1 is complete when Joel can:

1. Open one offline HTML file on his phone.
2. See whether the water is ready to use.
3. Run a guided Hach strip test with the exact 15-second timer.
4. Enter readings without typing.
5. Receive a prioritized diagnosis.
6. Be guided through a fresh refill from untreated water to balanced bromine water.
7. Track bromine floater settings.
8. Log family soaking.
9. Track shock/oxidation.
10. Track filter maintenance.
11. Track water age and water changes.
12. See chemistry history and trends.
13. Export/import app state.
14. Use the app without internet access.
15. Never be instructed to mix concentrated chemicals or use an invented dose.

---

# 76. Chemistry Trends & Longitudinal Analysis

This is a **required V1 feature**, not an optional analytics enhancement.

Every water test must create a permanent timestamped chemistry record so Joel can see how the spa behaves over time and recognize recurring imbalance patterns.

The goal is not only to answer:

> “What is wrong today?”

but also:

> **“What keeps drifting out of balance, how quickly does it drift, and what usually happened before it changed?”**

---

# 77. Timestamp Every Test

Every water-test record must save the exact local:

- Date
- Time
- Year
- Test context
- Test type
- Measurement method
- All measurements taken

Example:

```javascript
{
  id: "test_...",
  timestamp: "2026-08-29T09:42:00-07:00",
  localDate: "2026-08-29",
  localTime: "09:42",
  year: 2026,

  testType: "full",
  context: "normal",
  testKit: "hach_pool_spa_6way",

  values: {
    bromine: {
      value: 5,
      unit: "ppm",
      approximate: false
    },

    pH: {
      value: 7.2,
      approximate: false
    },

    alkalinity: {
      value: 80,
      unit: "ppm",
      approximate: false
    },

    hardness: {
      value: 250,
      unit: "ppm",
      approximate: true
    }
  }
}
```

Do not store only a date.

Multiple tests on the same day must remain separate observations.

---

# 78. Human-Readable Test History

Every test should appear in History with its full date and time.

Example:

```text
Aug 29, 2026 · 9:42 AM
Full water test

Bromine       5 ppm
pH            7.2
Alkalinity    80 ppm
Hardness      ~250 ppm
```

If another test occurs later that day:

```text
Aug 29, 2026 · 7:18 PM
Post-soak quick test

Bromine       2 ppm
pH            7.2
```

Never merge same-day tests into one value.

---

# 79. Dedicated “Trends” View

Add a prominent **Trends** section within History.

History screen tabs:

1. **Timeline**
2. **Trends**

The Trends screen should allow Joel to visualize chemical balance over time.

Default time-range selectors:

- 7 days
- 30 days
- 90 days
- Current water cycle
- 1 year
- All

“Current water cycle” means all tests since the most recent refill and should be the default view once enough data exists.

---

# 80. Individual Chemistry Trend Charts

Provide a separate line chart for each parameter:

- Bromine
- pH
- Total Alkalinity
- Total Hardness

Do **not** place all four chemicals on the same y-axis because they use incompatible units and scales.

Each chart should use:

- X axis = actual test date/time
- Y axis = measured value
- Every test result as a plotted point
- A line connecting results chronologically
- Tooltip/details on tap
- Target-range band
- Out-of-range point indicator

Example conceptual Bromine chart:

```text
BROMINE — CURRENT WATER CYCLE

10 ┤                  ●
 8 ┤                /
 5 ┤── TARGET ─●──●─────────●──
 3 ┤════════════════════════════
 2 ┤       ●
 1 ┤
 0 └────────────────────────────
    Aug 29  Sep 2  Sep 6  Sep 10
```

The shaded or visually distinct target region should represent:

> 3–5 ppm bromine

For the Hach test kit, remember that the measurable values are discrete.

---

# 81. Target Bands on Charts

Every chart must visually show the desired operating range.

Examples:

## Bromine
Target band:
> 3–5 ppm

## pH
Target band:
> 7.2–7.8

Optional visual inner ideal zone:
> 7.4–7.6

## Total Alkalinity
Target band:
> 80–120 ppm

## Hardness
Target band:
> approximately 150–250 ppm

This makes the graph useful without requiring Joel to remember target numbers.

---

# 82. Actual Time Spacing

Trend charts should reflect the **actual elapsed time between tests** where practical.

For example:

- A test on Monday
- Another on Tuesday
- Another 12 days later

should not visually appear as equally spaced events if the chart implementation supports true time scaling.

If using custom SVG/Canvas, convert timestamps to a numeric elapsed-time x position.

Do not aggregate measurements into weekly/monthly averages by default.

Joel should be able to see the actual observations.

---

# 83. Trend Chart Tooltips

Tapping/clicking a data point should show:

```text
Sep 6, 2026 · 8:17 AM

Bromine
2 ppm

Status
Below target

Context
Before soak

Water age
8 days
```

Where relevant also show nearby events:

```text
Previous event:
5 bathers · 42 min
11 hours earlier
```

This allows the chart to explain *why* a reading may have moved.

---

# 84. Overlay Maintenance Events

Add optional chart event markers for:

- Chemical addition
- Shock
- Soak
- Filter rinse
- Deep filter clean
- Refill
- Floater adjustment

Example:

```text
BROMINE

5 ┤ ●────●──────────────●
4 ┤        │ Shock
3 ┤
2 ┤          ●
1 ┤
  └───┬──────┬──────┬────
      Aug 29 Sep 2  Sep 5
```

The event markers should be subtle and toggleable:

> **Show maintenance events**

Default:
> On

This is important because the value of the trend feature is understanding relationships between chemistry and maintenance/use.

---

# 85. Water-Cycle Segmentation

A refill starts a new **water cycle**.

Each test should therefore store:

```javascript
waterCycleId: "cycle_2026_08_29"
```

All events after that refill belong to the same water cycle until the next refill.

Trends should support:

> Current water cycle

and comparison against previous cycles.

A refill should appear as a major divider in the all-time history.

---

# 86. Water-Cycle Summary

For each completed/current water cycle, calculate:

- Start date
- Current/end date
- Water age
- Number of tests
- Number of soak events
- Number of shocks
- Number of filter rinses
- Number of chemical corrections
- Percentage of bromine tests in range
- Percentage of pH tests in range
- Percentage of alkalinity tests in range
- Most frequently out-of-range parameter

Example:

```text
CURRENT WATER CYCLE
Aug 29 – Present
47 days

12 full/quick tests
6 family soaks

Bromine in range       75%
pH in range             92%
Alkalinity in range     83%

Most common issue:
Low bromine after family use
```

---

# 87. Pattern Detection Engine

The app should analyze accumulated tests for simple, explainable patterns.

Do not use opaque AI.

Use deterministic rules.

Examples:

### Pattern: repeated low bromine

If at least 3 of the last 5 normal-context bromine tests are below target:

> **Pattern detected: bromine frequently runs low.**

Possible explanation:

> Your bromine dispenser may not be keeping up with normal demand.

Suggested action:

> Review the floater setting after restoring bromine.

---

### Pattern: post-soak bromine drop

If bromine is repeatedly in range before family use and low within approximately 24 hours afterward:

> **Pattern detected: bromine drops after family use.**

Explanation:

> Five bathers create a high sanitizer demand in 600 gallons.

This should not automatically be treated as a floater failure.

---

### Pattern: pH rising

If at least 3 sequential pH readings trend upward:

> **Pattern detected: pH tends to rise between tests.**

Do not diagnose a cause with certainty.

Instead:

> Watch alkalinity and continue testing before making repeated large corrections.

---

### Pattern: alkalinity consistently high/low

If at least 3 consecutive readings remain outside the same side of the target:

> **Pattern detected: alkalinity has remained low across multiple tests.**

---

### Pattern: chemistry instability late in water cycle

If corrections/out-of-range tests increase after approximately 60+ days:

> **Pattern detected: water has become harder to maintain later in this water cycle.**

Suggest:

> Consider whether the next water change should occur earlier.

---

# 88. Trend Direction

For each chemistry dashboard card, show a small trend indicator based on recent tests:

Examples:

```text
Bromine
5 ppm
↑ rising

pH
7.8
↑ rising

Alkalinity
80 ppm
→ stable

Hardness
~250 ppm
→ stable
```

Trend categories:

- Rising
- Falling
- Stable
- Insufficient data

Do not calculate trend from only one reading.

Prefer at least 3 readings when available.

---

# 89. Do Not Mislead With Strip Precision

Trend charts must preserve the limitations of the Hach strips.

Examples:

If pH tests are:

```text
7.2
7.2
7.8
7.8
```

plot those exact discrete values.

Do not smooth them into fabricated values such as:

```text
7.35
7.52
```

If a reading was stored as a range, e.g.:

> 80–120 ppm alkalinity

the chart may:

- Plot a midpoint only for visual placement **if clearly marked as approximate**, or
- Preferably plot an error/range marker

but the underlying stored data must remain a range.

Never overwrite the original measurement.

---

# 90. Chart Range Behavior

Charts should autoscale sensibly while preserving target context.

Preferred defaults:

## Bromine
Y axis should at least include:
> 0–10 ppm

Expand to 20 if a 20 ppm result exists.

## pH
Y axis:
> 6.2–8.4

## Alkalinity
Y axis:
> 0–240 ppm

## Hardness
Y axis should adapt to observed strip buckets but maintain visibility of the 150–250 target band.

---

# 91. Multi-Chemistry Comparison View

In addition to individual charts, provide an optional normalized **Balance Overview** chart.

This chart should NOT plot raw ppm values together.

Instead normalize each test result into a common “distance from target” score.

Example:

```text
0 = center/in range
positive = above desired range
negative = below desired range
```

This lets Joel visually compare whether bromine, pH, alkalinity, and hardness are generally moving in or out of balance without mixing incompatible units.

Label clearly:

> **Balance Overview — normalized**

Do not present normalized values as chemical measurements.

This is secondary to the individual raw-value charts.

---

# 92. Trend Summary Card

At the top of Trends, generate a concise summary:

Example:

```text
LAST 30 DAYS

✓ pH has been stable
✓ Hardness has remained in range

⚠ Bromine was low on 3 of 8 tests
⚠ 2 low bromine readings followed family soaks

Most common imbalance:
Low bromine
```

Only state patterns supported by recorded history.

If insufficient data:

> Keep testing — trend insights will appear after several readings.

---

# 93. Testing Consistency Metric

Because trends are only useful with regular testing, optionally show:

```text
TESTING CONSISTENCY

Last 30 days
9 tests

Average interval:
3.2 days

✓ Good testing frequency
```

If testing gaps become large:

> Testing has been irregular, so trend conclusions are less reliable.

Do not shame or score the user.

---

# 94. Export Must Include Full Trend Data

JSON export must preserve:

- Every raw test
- Timestamp
- Date/time/year
- Test kit
- Measurement precision
- Test context
- Water cycle ID
- Related maintenance events
- Chemical additions
- Soak events

Never export only derived chart data.

Charts should always be reconstructable from the raw event history.

---

# 95. Trend Acceptance Tests

## Scenario M — Multiple tests same day

Tests:

```text
Aug 29, 2026 09:00
Bromine 5

Aug 29, 2026 20:00
Bromine 2
```

Expected:

- Both appear independently in History
- Both appear separately on trend chart
- Time ordering is preserved

---

## Scenario N — Current water cycle

Refill:
> Aug 29, 2026

Tests:
> Aug 29 through Oct 1

Expected:

Selecting **Current water cycle** graphs all results since Aug 29 and no previous-cycle readings.

---

## Scenario O — Repeated low bromine

Last five normal tests:

```text
5
2
2
5
2
```

Expected:

> Pattern detected: bromine frequently runs low.

---

## Scenario P — Post-family-soak pattern

Data repeatedly shows:

```text
Before soak: 5 ppm
5 bathers
Next test: 2 ppm
```

Expected after sufficient repetitions:

> Pattern detected: bromine commonly drops after family use.

Do not automatically label this a floater failure.

---

## Scenario Q — Refill segmentation

Refill #1:
> Aug 29

Refill #2:
> Nov 25

Expected:

- Two separate water-cycle records
- Current cycle graph begins Nov 25
- All-time graph contains a visible refill boundary

---

## Scenario R — Target bands

Bromine chart contains readings:

```text
1, 2, 5, 10
```

Expected:

- Every reading plotted
- 3–5 ppm target range visually indicated
- Low/high readings visibly distinguishable without relying solely on color

---

# 96. Updated V1 Definition of Done — Trend Requirements

In addition to the original V1 requirements, the app is not complete until Joel can:

16. See the exact date, time, and year of every test.
17. View every chemistry measurement historically.
18. Graph bromine, pH, alkalinity, and hardness independently over time.
19. See target operating ranges directly on each trend chart.
20. Filter trends by 7/30/90 days, current water cycle, 1 year, or all time.
21. Tap a chart point and see the corresponding test details.
22. See soak, shock, chemical, refill, and filter events alongside chemistry trends.
23. See simple deterministic pattern insights such as repeated low bromine or post-soak sanitizer drops.
24. Compare current and previous water cycles.
25. Preserve all raw historical readings in export/import.


