# Joel's Hot Tub Water Manager

A single-file, offline-capable web app that helps Joel safely maintain the water
in his Canadian Hot Tubs **Algonquin** (600 gal / 2,270 L, bromine sanitizer).

**Launch it:** https://rconnon.github.io/hottub-maintenance/ — works on desktop
and mobile browsers. Add it to your phone's home screen for one-tap access.
All data stays on the device in `localStorage`; no account, no server, no
internet required after first load. You can also just open `index.html`
directly as a file.

## What it does

> **TEST → DIAGNOSE → CORRECT ONE THING → CIRCULATE → RETEST**

- **Today dashboard** — is the water okay right now, and the single most
  important next action.
- **Guided Hach strip testing** — the exact bottle procedure with a 15-second
  hold timer, no-typing tile entry, and "between two colors" range support.
- **Prioritized diagnosis** — sanitizer safety first, alkalinity before pH,
  one correction at a time, never a dose without configured label data.
- **Fresh fill wizard** — a recipe-style walkthrough from untreated fill water
  to balanced bromine water, resumable if the app is closed mid-setup.
- **Maintenance tracking** — shock cadence, filter rinse/clean/replace, water
  age with 90-day change cycle, bromine floater manager.
- **History & trends** — every test timestamped, per-parameter charts with
  target bands, maintenance-event overlays, water-cycle comparison, and
  deterministic pattern detection (e.g. "bromine drops after family use").
- **Backup** — full JSON export/import of all raw history.

## Development

Everything lives in `index.html` (vanilla HTML/CSS/JS, heavily commented, no
build step, no dependencies). The chemistry/diagnostic engine is written as
pure DOM-free functions so the Node test harness can exercise it directly:

```sh
node tests/run-tests.mjs
```

The tests implement the acceptance scenarios from `SPEC.md` (A–R). CI runs
them on every PR.
