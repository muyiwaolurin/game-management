# Player Goal Tracking — Design Spec

**Date:** 2026-06-04
**Status:** Approved

## Overview

Add per-player goal tracking to the live game. A goal button on each on-field player row lets the coach log a goal in one tap. Goals appear on the row, in the stats panel, and in the end summary.

## Scope

- Live game view (on-field players only)
- Stats panel
- End summary (including share text)
- Setup and bench players: out of scope

## Data Model

Add `goals: 0` to player objects in `app.jsx` in:
- `addPlayer()`
- `loadSample()` handler
- `addLate()`

### `logGoal(id)` handler — `app.jsx`

- Finds player by id, increments `p.goals`
- Appends to game log: `{ type: 'goal', clock, half, playerNum: p.number, playerName: p.name }`
- Shows toast: `"Goal logged"`

`logGoal` is passed down: `App` → `LiveGame` → field `PlayerRow`.

## Live View UI

### `PlayerRow` — `components.jsx`

New optional prop: `onGoal`. When provided:
- Renders a small goal button to the left of the playtime block
- `onClick` on the button calls `onGoal(player.id)` with `e.stopPropagation()` to avoid triggering substitution row selection
- Shows goal count as a badge on the button; hidden (or shows `0`) when count is zero — display `p.goals` always so coach can see the tally

### `LiveGame` — `live.jsx`

- Accept `onGoal` prop
- Pass `onGoal={(id) => onGoal(id)}` to each field `PlayerRow` only (bench rows get no `onGoal`)

## Stats Panel & End Summary — `stats.jsx`

### `StatHead`

Add a `Goals` column after `Subs`: `<span className="c-num" style={{ flex: '0 0 30px' }}>Goals</span>`

### `StatRow`

Add corresponding cell: `<span className="c-num" style={{ flex: '0 0 30px', color: 'var(--pd-blue-600)' }}>{p.goals || 0}</span>`

Both `StatsPanel` and `EndSummary` use `StatHead` and `StatRow`, so goals appear in both automatically.

### Share text — `EndSummary`

Update per-player line to include goals:
```
#7 Avery B.: 12:34 played, 1 sub, 2 goals
```

## Styles — `styles.css`

Add `.goal-btn` — a small compact button styled consistently with the row:
- `border: 1px solid var(--pd-border)`, `border-radius: var(--pd-radius-md)`
- `background: #fff`, hover: `var(--pd-ghost-hover)`
- `font-size: 11px`, `font-weight: bold`, `display: flex`, `align-items: center`, `gap: 3px`
- `padding: 3px 6px`, `cursor: pointer`, `flex: 0 0 auto`, `white-space: nowrap`

## Implementation Touch Points

| File | Change |
|---|---|
| `app.jsx` | `goals: 0` in 3 player init sites; `logGoal` handler; pass `onGoal` to `LiveGame` |
| `live.jsx` | Accept + pass `onGoal` to field `PlayerRow`s only |
| `components.jsx` | `onGoal` prop on `PlayerRow`; goal button + count rendered left of ptime |
| `stats.jsx` | Goals column in `StatHead`/`StatRow`; goals in share text |
| `styles.css` | `.goal-btn` style |

## Constraints

- No new files
- `e.stopPropagation()` on goal button click — must not interfere with substitution selection
- Goals default to `0`; `p.goals || 0` used defensively in render
