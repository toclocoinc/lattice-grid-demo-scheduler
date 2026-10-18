import { resources, events, PROJECTS } from './src/data.js?v=20261012a';

const GRID = 'https://cdn.latticegrid.dev/lattice-grid@1.107.0';
// Public, domain-bound key for toclocoinc.github.io; on localhost no key is needed.
const LICENCE = 'LG1.eyJ2IjoxLCJwIjoibGF0dGljZS1ncmlkIiwidCI6IlRPQ0xPQ08gSW5jIC0gcHVibGljIGRlbW9zIiwiZSI6IjIwMzAtMDEtMDEiLCJkIjpbInRvY2xvY29pbmMuZ2l0aHViLmlvIl19.9De42ua3aCGpiMB6EVRP7Tv-upUlDI-0T07rlSPzvCrsqg8t4YJi7SRnStEpAg48uzmcG7il1fR_TfwkUE7iCA';

const { createGrid, setLicence } = await import(GRID + '/lattice-grid.esm.min.js');
const { createScheduler } = await import(GRID + '/modules/scheduler.esm.min.js');
setLicence(LICENCE);

const $ = (id) => document.getElementById(id);
const host = $('scheduler');
const state = { zoom: 'fit', groupBy: 'team', search: '', workload: true };
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

function showZoom() {
  const active = scheduler.getZoom().level;
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
    resourceWidth: 440,
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
    scheduler.on('zoom:change', ({ px }) => { state.zoom = scheduler.getZoom().level; showZoom(); }),
  ];
  showZoom();
  refreshReadouts();
}

build();
globalThis.__scheduler = () => scheduler;

document.querySelectorAll('[data-zoom]').forEach((b) => b.addEventListener('click', () => scheduler.setZoom(b.dataset.zoom)));
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
