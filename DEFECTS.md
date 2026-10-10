# Defects found (remove before publishing)

Package: @toclocoinc/lattice-grid 1.98.2 from jsDelivr, modules/scheduler. Demo state at delivery: `npm run verify`
passes every check at 1440x900 and 1920x1080 except the last one per size (console warning, D1). Screenshots were
read by eye; the grouped, Day, Week, Month and Fit views showed no clipped names and no colliding axis labels.

## D1. Scheduler passes an unrecognised key to the grid and logs a warning (confirmed, reproducible)

- Steps: open the page from a fresh load (`npm run serve`, http://localhost:8000/). The page opens grouped by team.
  The same happens on any `createScheduler(host, { groupBy: 'team', ... })` call.
- API used: `createScheduler(host, { createGrid, resources, events, groupBy: 'team', ... })`. No grid options are
  passed by the demo, and the demo never sets `autoGroupColumnWidth`.
- Expected: no console output.
- Happened (both viewports, once per scheduler build):
  `warn: [lattice] 'autoGroupColumnWidth' is not a configuration key this grid recognises, so it had no effect. Check the spelling against the reference.`
  This is the only failing line in `tools/verify.mjs` ("no console errors or [lattice] warnings").
- Mechanism: in `modules/scheduler.esm.min.js` the grid config is built with
  `Ae != null && (Re.autoGroupColumnWidth = Ae)` and then `a.createGrid(e.gridHost, Re)`. In `lattice-grid.esm.min.js`
  the group column reads `U.config.autoGroupColumnWidth || 240`, so the grid does use the key, but the config-key
  list the warning checks against does not include it. The key is either missing from that list or the scheduler
  should not pass it.
- Note: the warning says the key "had no effect", while the grid code reads it, so the message itself looks wrong too.

## D2. Grouped view shows each team name twice and leaves a mostly empty Group column (observation, not a failure)

- Steps: load the page (grouped by Team) at 1440x900 or 1920x1080 and look at the first group.
- Expected: one place for the team label per group.
- Happened: "Backend (7)" appears in the grid's Group column and "Backend" again in the band across the timeline.
  The Group column is about 120px wide and empty on every person row (see `shots/1440-grouped.png`).
- Mechanism: not investigated; the grid's auto group column and the scheduler's own timeline group band both render.

## D3. Day and Fit presets give the same scale when the plan just fits (observation)

- Steps: open at 1440x900, press Day, then press Fit.
- API used: `scheduler.setZoom('day')` and `scheduler.setZoom('fit')` (as in `main.js`).
- Measured from `scheduler.getZoom().px`: at 1440x900 both report 13.93px a day, at 1920x1080 both report 20.88px a day,
  so the two buttons look identical on screen. Week reports 12px and Month 4px at both sizes.
- Expected: unclear. If the Day preset is meant to be a fixed day-level scale, it does not appear to be one here.
- Mechanism: not investigated.

## Not reproduced

Earlier defects in the grouped view (clipped group names, colliding axis labels, blank space after Fit at 1920) are
fixed in 1.98.2: no clipped names, no overlapping axis labels, and Fit fills the timeline to the right edge at 1920.
