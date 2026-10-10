import { resources, events, PROJECTS } from './src/data.js?v=20261010a';

const GRID = 'https://cdn.jsdelivr.net/npm/@toclocoinc/lattice-grid@1.98.1';
// Public, domain-bound key for toclocoinc.github.io; on localhost no key is needed.
const LICENCE = 'LG1.eyJ2IjoxLCJwIjoibGF0dGljZS1ncmlkIiwidCI6IlRPQ0xPQ08gSW5jIC0gcHVibGljIGRlbW9zIiwiZSI6IjIwMzAtMDEtMDEiLCJkIjpbInRvY2xvY29pbmMuZ2l0aHViLmlvIl19.9De42ua3aCGpiMB6EVRP7Tv-upUlDI-0T07rlSPzvCrsqg8t4YJi7SRnStEpAg48uzmcG7il1fR_TfwkUE7iCA';

const { createGrid, setLicence } = await import(GRID + '/lattice-grid.esm.min.js');
const { createScheduler } = await import(GRID + '/modules/scheduler.esm.min.js');
setLicence(LICENCE);

const $ = (id) => document.getElementById(id);
const host = $('scheduler');
// The plan runs ten weeks (70 days). "Fit" is the pixels-per-day that shows the whole plan, up to the
// scale where the axis labels weeks; "Day" is a scale wide enough for a label on every day. On a
// screen too wide for the whole plan at week labels, the page opens at the day scale instead.
const PLAN_DAYS = 70;
const GRID_WIDTH = 300;
const DAY_PX = 48;
const MAX_FIT_PX = 17;
const roomPx = () => Math.floor((host.clientWidth - GRID_WIDTH - 6) / PLAN_DAYS);
const fitPx = () => Math.max(6, Math.min(MAX_FIT_PX, roomPx()));
const state = { zoom: roomPx() > MAX_FIT_PX ? DAY_PX : fitPx(), groupBy: '', search: '', workload: true };
let scheduler = null;
let unsubscribe = [];

function describe(change) {
  const event = scheduler.events.get(change.id);
  const name = event ? event.name : 'Work';
  const person = (id) => (resources.find((r) => r.id === id) || {}).name || id;
  const fields = change.changes || {};
  if (change.action === 'reassign') return `${name}: now with ${person(fields.resourceId.to)}.`;
  if (change.action === 'resize') return `${name}: resized to ${fields.startDate ? fields.startDate.to : event.startDate} to ${fields.endDate ? fields.endDate.to : event.endDate}.`;
  if (change.action === 'move') return `${name}: moved to ${event.startDate}.`;
  return `${name}: ${change.action}.`;
}

function refreshReadouts() {
  $('undo').disabled = !scheduler.canUndo();
  $('redo').disabled = !scheduler.canRedo();
  const over = scheduler.workload ? scheduler.workload.overAllocated : [];
  const names = [...new Set(over.map((o) => (resources.find((r) => r.id === String(o.resource ?? o.key ?? o.id)) || {}).name || String(o.resource ?? o.key ?? o.id)))];
  $('over').textContent = names.length ? `Over-allocated: ${names.join(', ')}` : state.workload ? 'Nobody is over-allocated.' : '';
}

function showZoom(px) {
  const active = px === DAY_PX ? 'day' : px === fitPx() ? 'fit' : scheduler.getZoom().level;
  document.querySelectorAll('[data-zoom]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.zoom === active)));
}

function build(current) {
  unsubscribe.forEach((off) => off());
  if (scheduler) scheduler.destroy();
  scheduler = createScheduler(host, {
    createGrid,
    resources,
    events: current || events,
    fields: { resourceId: 'resourceId', startDate: 'startDate', endDate: 'endDate', name: 'name' },
    columns: [{ id: 'name', field: 'name', title: 'Person', layout: { width: 150 } }, { id: 'role', field: 'role', title: 'Role', layout: { width: 130 } }],
    zoom: state.zoom,
    date: '2026-10-05',
    rowHeight: 56,
    workload: state.workload,
    groupBy: state.groupBy || null,
    search: state.search,
    colorProperty: 'project',
    colorMap: PROJECTS,
    ariaLabel: 'Team plan by person',
  });
  unsubscribe = [
    scheduler.on('event:change', (change) => { $('status').textContent = describe(change); refreshReadouts(); }),
    scheduler.on('zoom:change', ({ px }) => { state.zoom = px; showZoom(px); }),
  ];
  showZoom(state.zoom);
  refreshReadouts();
}

build();
globalThis.__scheduler = () => scheduler;

document.querySelectorAll('[data-zoom]').forEach((b) => b.addEventListener('click', () => scheduler.setZoom({ fit: fitPx(), day: DAY_PX }[b.dataset.zoom] || b.dataset.zoom)));
$('group').addEventListener('change', (e) => { state.groupBy = e.target.value; scheduler.setGroupBy(state.groupBy || null); });
$('search').addEventListener('input', (e) => { state.search = e.target.value; scheduler.setSearch(state.search); });
$('undo').addEventListener('click', () => { scheduler.undo(); refreshReadouts(); });
$('redo').addEventListener('click', () => { scheduler.redo(); refreshReadouts(); });
$('workload').addEventListener('change', (e) => {
  state.workload = e.target.checked;
  const current = [];
  scheduler.events.forEach((row) => current.push({ ...row }));
  build(current);
});
