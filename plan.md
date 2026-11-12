# sched-prod incident board — plan

The on-call board for sched-prod. One page, one list: tonight's incidents, newest first, so on-call sees
what just broke and takes it.

## Flows

| flow | who | what happens |
|------|-----|--------------|
| `open-board` | on-call | opens the board; sees tonight's incidents |
| `ack-incident` | on-call | picks an incident on the board and acks it — "I've got this one" |
| `watch-board` | on-call | keeps the board open; the rows on screen hold still, and a "N new" bar brings in incidents that arrived |

## Requirements

- **R1** The rows on screen hold still. Incidents that arrive while the board is open wait on a "N new" bar (`data-testid="new-bar"`). A click on the bar brings them in at the top, newest first. Product decided this on 2026-11-12 after the 00:12 recording.
- **R2** Each incident row has an **Ack** button. Ack sends the ack (`api.ack(id)`) and the ack stays on that row.
- **R3** Show a loader until incidents load. An empty answer shows the empty state, and the loader is gone.
- **R4** The board asks for what is current every 2 seconds while open. That refresh does not move or remove the rows already on screen.
- **R5** Times show in the viewer's local time; day before month for EU locales (dd/mm).
- **R6** The page names its build: `<meta name="build" content="<git sha>">` in the head and the same sha in the footer.

## Hooks (pinned — tests and the replay rely on them)

| `data-testid` | element |
|---------------|---------|
| `board` | the board's main area |
| `loader` | the loader (gone once incidents load) |
| `empty` | what shows when there are no incidents |
| `new-bar` | the "N new" bar. A click brings in incidents that arrived while the list was holding still |
| `incident-list` | the list |
| `incident-row` | one incident row, with `data-id="<incident id>"` |
| `ack` | the Ack button in a row |
| `acked` | the acked mark in a row |
| `build-sha` | the sha in the footer |

## Done

Every issue in `issues/` delivered, deployed to a public https address, and shown working.
