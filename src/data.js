// Demo data: 25 people in five teams, ten weeks of project work, a few people booked
// beyond their capacity and a pool of work nobody has picked up yet. Built from a fixed
// seed so every visit shows the same plan.

export const PROJECTS = {
  Atlas: '#2d6bff',
  Beacon: '#1b9e77',
  Compass: '#d95f02',
  Delta: '#7570b3',
  Support: '#8a949e',
};

const TEAMS = {
  Design: [['Amara Okafor', 'Design lead'], ['Jonas Weber', 'Product designer'], ['Mei Tanaka', 'UX researcher'], ['Lucia Romero', 'Visual designer']],
  Frontend: [['Priya Nair', 'Tech lead'], ['Tom Hughes', 'Engineer'], ['Sana Qureshi', 'Engineer'], ['Elias Berg', 'Engineer'], ['Chloe Martin', 'Engineer'], ['Dev Patel', 'Engineer']],
  Backend: [['Grace Liu', 'Tech lead'], ['Marcus Cole', 'Engineer'], ['Ines Duarte', 'Engineer'], ['Oleg Petrov', 'Engineer'], ['Hannah Fox', 'Engineer'], ['Kofi Mensah', 'Engineer'], ['Yara Haddad', 'Engineer']],
  Data: [['Noah Fischer', 'Data lead'], ['Aiko Sato', 'Analyst'], ['Ben Carter', 'Data engineer'], ['Fatima Zahra', 'Analyst']],
  Quality: [['Rosa Alvarez', 'QA lead'], ['Liam Brooks', 'Test engineer'], ['Zoe Kim', 'Test engineer'], ['Victor Huang', 'Test engineer']],
};

const WORK = {
  Design: ['Research sprint', 'Wireframes', 'Visual design', 'Design review', 'Prototype', 'Usability test'],
  Frontend: ['Dashboard UI', 'Checkout flow', 'Component library', 'Accessibility fixes', 'Search page', 'Settings screens'],
  Backend: ['Orders API', 'Auth service', 'Billing integration', 'Queue workers', 'Search index', 'Audit log'],
  Data: ['Event tracking', 'Funnel analysis', 'Pipeline build', 'Reporting model', 'Data quality checks'],
  Quality: ['Regression suite', 'Load test', 'Release testing', 'Test automation', 'Exploratory testing'],
};

let seed = 20261010;
const rand = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
const pick = (list) => list[Math.floor(rand() * list.length)];

const START = Date.UTC(2026, 9, 5); // Monday 5 October 2026
const DAY = 86400000;
export const WEEKS = 10;
const iso = (dayIndex) => new Date(START + dayIndex * DAY).toISOString().slice(0, 10);
// Working-day index n (0 = first Monday) to calendar day index, skipping weekends.
const workday = (n) => Math.floor(n / 5) * 7 + (n % 5);

export const resources = [];
export const events = [];
let eventId = 1;

function add(resourceId, name, project, fromWork, toWork) {
  events.push({ id: 'e' + eventId++, resourceId, name, project, startDate: iso(workday(fromWork)), endDate: iso(workday(toWork)) });
}

const projectNames = Object.keys(PROJECTS).slice(0, 4);
const OVERBOOKED = new Set(['Priya Nair', 'Marcus Cole', 'Aiko Sato', 'Liam Brooks']);
const totalDays = WEEKS * 5;

for (const [team, people] of Object.entries(TEAMS)) {
  for (const [name, role] of people) {
    const id = name.toLowerCase().replace(/[^a-z]+/g, '-');
    resources.push({ id, name, role, team, capacity: 1 });
    let cursor = Math.floor(rand() * 3);
    while (cursor < totalDays - 2) {
      const length = 3 + Math.floor(rand() * 6);
      const end = Math.min(cursor + length - 1, totalDays - 1);
      const project = pick(projectNames);
      add(id, `${pick(WORK[team])} (${project})`, project, cursor, end);
      cursor = end + 1 + (rand() < 0.3 ? Math.floor(rand() * 3) : 0);
    }
    if (OVERBOOKED.has(name)) {
      // A second piece of work laid across an existing one: two jobs at once for a stretch.
      for (let k = 0; k < 2; k += 1) {
        const from = 8 + k * 22 + Math.floor(rand() * 6);
        add(id, `${pick(WORK[team])} (Support)`, 'Support', from, from + 6 + Math.floor(rand() * 4));
      }
    }
  }
}

// Work nobody has picked up yet. Drag a bar onto a person to assign it.
resources.push({ id: 'unassigned', name: 'Unassigned', role: 'Needs an owner', team: 'Unassigned', capacity: 99 });
const UNASSIGNED = [
  ['Partner API review', 'Beacon', 12, 16], ['Onboarding emails', 'Atlas', 14, 18], ['Mobile layout audit', 'Compass', 20, 25],
  ['Data export tool', 'Delta', 22, 28], ['Security checklist', 'Atlas', 30, 33], ['Help centre refresh', 'Beacon', 33, 38],
  ['Rate limiting', 'Delta', 36, 40], ['Release notes', 'Compass', 42, 44], ['Performance budget', 'Atlas', 46, 49],
  ['Pilot customer calls', 'Beacon', 5, 8], ['Backlog grooming', 'Compass', 9, 10], ['Launch rehearsal', 'Delta', 44, 48],
];
for (const [name, project, from, to] of UNASSIGNED) add('unassigned', name, project, from, to);
