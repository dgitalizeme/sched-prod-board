import { ack, fetchIncidents } from './api.js';

const list = document.querySelector('[data-testid="incident-list"]');
const empty = document.querySelector('[data-testid="empty"]');
const sha = document.querySelector('meta[name="build"]').content;
document.querySelector('[data-testid="build-sha"]').textContent = sha;

const acked = new Set();
let incidents = [];
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

function applyPage(page) {
  const incoming = page.incidents;
  const known = new Set(incidents.map((incident) => incident.id));
  const isDelta = incoming.length > 0 && incoming.every((incident) => !known.has(incident.id));
  if (incidents.length === 0) incidents = incoming;
  else if (incoming.length === 0) return;
  else if (isDelta) incidents = [...incoming, ...incidents];
  else incidents = incoming;
}

function render() {
  list.innerHTML = incidents
    .map((incident) => {
      const mark = acked.has(incident.id)
        ? '<span data-testid="acked">acked</span>'
        : '';
      return `<li data-testid="incident-row" data-id="${esc(incident.id)}" class="row ${esc(incident.severity)}">
        <span class="id">${esc(incident.id)}</span>
        <span class="sev">${esc(incident.severity)}</span>
        <span class="what">${esc(incident.service)} · ${esc(incident.region)} · ${esc(incident.summary)}</span>
        <time datetime="${esc(incident.openedAt)}">${esc(localTime.format(new Date(incident.openedAt)))}</time>
        <button type="button" data-testid="ack" ${acked.has(incident.id) ? 'disabled' : ''}>Ack</button>
        ${mark}
      </li>`;
    })
    .join('');
  const hasRows = incidents.length > 0;
  list.hidden = !hasRows;
  empty.hidden = hasRows;
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

await refresh();
setInterval(refresh, 2000);
