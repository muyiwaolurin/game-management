# CSV Game Cache — Design Spec

**Date:** 2026-06-04
**Status:** Approved

## Overview

When a game starts, append a snapshot of the game config and roster to a flat CSV stored in `localStorage`. Rows accumulate across sessions. A clear action in the Tweaks panel lets the coach wipe the history.

## Data Shape

**localStorage key:** `playtime_game_log`

**CSV columns:**

| Column | Description |
|---|---|
| `game_id` | Short unique ID generated at game start (e.g. `pt_abc123`) |
| `timestamp` | ISO 8601 datetime (e.g. `2026-06-04T14:32:00`) |
| `team_name` | From game config |
| `opponent` | From game config |
| `field_size` | Number of players on field |
| `half_min` | Half length in minutes |
| `player_name` | Player name (first name + last initial format) |
| `player_number` | Jersey number (may be empty) |
| `player_position` | Position tag (GK/DEF/MID/FWD, may be empty) |
| `is_starter` | `true` if player started on field, `false` if bench |

One row per player. Game-level fields repeat on each player row. Header row is written once when the key does not yet exist. All fields containing commas are double-quoted.

**Example:**
```
game_id,timestamp,team_name,opponent,field_size,half_min,player_name,player_number,player_position,is_starter
pt_abc123,2026-06-04T14:32:00,Riverside,Westside FC,7,25,Avery B.,,,true
pt_abc123,2026-06-04T14:32:00,Riverside,Westside FC,7,25,Zeus C.,,,false
```

## Architecture

### `appendGameToCSV(config, players)` — new helper in `app.jsx`

- Generates a `game_id` using the existing `uid()` function
- Captures `timestamp` via `new Date().toISOString()`
- Reads `localStorage.getItem('playtime_game_log')`
- If null/empty, prepends the header row
- Appends one CSV row per player in `players` array
- Writes result back via `localStorage.setItem('playtime_game_log', ...)`
- Escapes any field containing a comma by wrapping in double quotes

### `startGame()` — modified in `app.jsx`

- Calls `appendGameToCSV(S.config, S.players)` before setting phase to `'live'`

### Tweaks panel — modified in `tweaks-panel.jsx`

- New `TweakSection` labelled `"Game History"`
- Single button: `"Clear saved history"`
- On click: `localStorage.removeItem('playtime_game_log')` + toast notification `"Game history cleared"`

## Constraints

- No new files
- No backend or file system access — localStorage only
- Does not affect game runtime or clock behaviour
- Clear action has no confirmation dialog — toast feedback is sufficient
