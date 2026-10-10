# Resource scheduler for a team plan

**Live demo:** https://toclocoinc.github.io/lattice-grid-demo-scheduler/

A resource scheduler built with [Lattice Grid](https://www.latticegrid.dev/scheduler/): people are rows in a grid on the left, their assignments are bars on a shared timeline on the right. It is plain JavaScript with no build step and no framework.

The plan is 25 people in five teams (Design, Frontend, Backend, Data and Quality) over ten weeks, with more than 200 assignments across four projects, a few people booked beyond their capacity and a row of work nobody has picked up yet. The page shows:

1. **Move and resize.** Drag a bar to a new date, or pull either edge to change its length. Changes snap to the zoom step.
2. **Reassign.** Drop a bar on another person's row. Try it on the Unassigned row at the bottom to give that work an owner.
3. **Workload.** The strip under each row shows how booked that person is in each period. Over-allocated periods turn red and the people affected are named above the chart. Switch it off and on with "Show workload".
4. **Group and search.** Group the people by team, or search by name, role or task; the rows and the bars narrow together.
5. **Zoom.** Fit, Day, Week and Month change the scale of the timeline. Undo and Redo step through your edits.

## Run it

```
npm ci
npm run serve        # http://localhost:8000/
npm run verify       # headless Chrome check of the steps at two screen sizes (needs Chrome)
```

The grid and the scheduler load from the published `@toclocoinc/lattice-grid` package on jsDelivr; change the version in `index.html` and `main.js` to move to a newer release. On `localhost` no licence key is needed; the key in `main.js` is the public one for `toclocoinc.github.io`.

`npm run verify` loads the page at 1440x900 and 1920x1080, drags to move, resize and reassign, checks zoom, grouping, search and the workload strip, fails on any console error or warning, and writes screenshots to `shots/`. Set `CHROME` to the path of your Chrome if it is not in the usual place.

## Files

- `index.html`: the page.
- `main.js`: loads the grid and the scheduler, applies the licence and wires the controls.
- `src/data.js`: the demo team, projects and assignments.
- `styles.css`: the page layout.
- `tools/serve.mjs`: a small static file server for local use.
- `tools/verify.mjs`: the headless Chrome check.

Licence: MIT for this demo's code. Lattice Grid itself is commercially licensed; see [latticegrid.dev/pricing](https://www.latticegrid.dev/pricing/).
