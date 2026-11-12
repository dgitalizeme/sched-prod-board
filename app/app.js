import { ack, fetchIncidents } from './api.js';

const list = document.querySelector('[data-testid="incident-list"]');
const empty = document.querySelector('[data-testid="empty"]');
const bar = document.querySelector('[data-testid="new-bar"]');
const sha = document.querySelector('meta[name="build"]').content;
document.querySelector('[data-testid="build-sha"]').textContent = sha;

const acked = new Set();
let shown = [];
let pending = [];
let refreshing = false;

const localTime = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

function esc(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function rowHtml(incident) {
  const mark = acked.has(incident.id) ? '<span data-testid="acked">acked</span>' : '';
  return `<li data-testid="incident-row" data-id="${esc(incident.id)}" class="row ${esc(incident.severity)}">
        <span class="id">${esc(incident.id)}</span>
        <span class="sev">${esc(incident.severity)}</span>
        <span class="what">${esc(incident.service)} · ${esc(incident.region)} · ${esc(incident.summary)}</span>
        <time datetime="${esc(incident.openedAt)}">${esc(localTime.format(new Date(incident.openedAt)))}</time>
        <button type="button" data-testid="ack" ${acked.has(incident.id) ? 'disabled' : ''}>Ack</button>
        ${mark}
      </li>`;
}

function applyPage(page) {
  const incoming = page.incidents ?? [];
  if (shown.length === 0 && pending.length === 0) {
    shown = incoming;
    return;
  }
  if (incoming.length === 0) return;
  const shownIds = new Set(shown.map((incident) => incident.id));
  const byId = new Map(incoming.map((incident) => [incident.id, incident]));
  const isDelta = incoming.every((incident) => !shownIds.has(incident.id));
  if (!isDelta) shown = shown.map((incident) => byId.get(incident.id) ?? incident);
  if (isDelta) {
    const have = new Set(pending.map((incident) => incident.id));
    const extra = incoming.filter((incident) => !have.has(incident.id));
    pending = [...extra, ...pending];
    return;
  }
  const next = [];
  const seen = new Set();
  for (const incident of incoming) {
    if (shownIds.has(incident.id) || seen.has(incident.id)) continue;
    seen.add(incident.id);
    next.push(incident);
  }
  pending = next;
}

function paintRow(row, incident) {
  row.className = `row ${incident.severity}`;
  row.querySelector('.sev').textContent = incident.severity;
  row.querySelector('.what').textContent = `${incident.service} · ${incident.region} · ${incident.summary}`;
  const time = row.querySelector('time');
  time.dateTime = incident.openedAt;
  time.textContent = localTime.format(new Date(incident.openedAt));
  const button = row.querySelector('[data-testid="ack"]');
  button.disabled = acked.has(incident.id);
  let mark = row.querySelector('[data-testid="acked"]');
  if (acked.has(incident.id)) {
    if (!mark) {
      mark = document.createElement('span');
      mark.dataset.testid = 'acked';
      mark.textContent = 'acked';
      row.append(mark);
    }
  } else {
    mark?.remove();
  }
}

function render() {
  const wanted = shown.map((incident) => incident.id);
  const current = [...list.querySelectorAll('[data-testid="incident-row"]')].map((row) => row.dataset.id);
  const sameOrder = wanted.length === current.length && wanted.every((id, index) => id === current[index]);
  if (!sameOrder) {
    list.innerHTML = shown.map(rowHtml).join('');
  } else {
    for (const incident of shown) {
      const row = list.querySelector(`[data-id="${CSS.escape(incident.id)}"]`);
      if (row) paintRow(row, incident);
    }
  }
  const hasRows = shown.length > 0;
  list.hidden = !hasRows;
  empty.hidden = hasRows;
  bar.hidden = pending.length === 0;
  bar.textContent = pending.length ? `${pending.length} new` : '';
}

function showBoard() {
  document.querySelector('[data-testid="loader"]')?.remove();
  render();
}

async function refresh() {
  if (refreshing) return;
  refreshing = true;
  try {
    const page = await fetchIncidents();
    applyPage(page);
    showBoard();
  } catch (error) {
    console.error(error);
  } finally {
    refreshing = false;
  }
}

list.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-testid="ack"]');
  if (!button || button.disabled) return;
  const row = button.closest('[data-testid="incident-row"]');
  const id = row?.dataset.id;
  if (!id || acked.has(id)) return;
  button.disabled = true;
  try {
    await ack(id);
    acked.add(id);
    render();
  } catch (error) {
    button.disabled = false;
    console.error(error);
  }
});

bar.addEventListener('click', () => {
  if (pending.length === 0) return;
  shown = [...pending, ...shown];
  pending = [];
  render();
});

await refresh();
setInterval(refresh, 2000);
