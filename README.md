# Playtime — Coach Game Management

A browser-based game management tool for youth football coaches. Tracks player minutes in real time, suggests fair substitutions, and produces a shareable end-of-game summary.

No build step. No server. Open `index.html` and go.

---

## Features

**Setup**
- Configure team name, opponent, field size (4–11), and half length (5–45 min)
- Build a roster with jersey numbers and position tags (GK / DEF / MID / FWD)
- Mark starters — the rest go to the bench automatically
- Load a sample squad to try the app instantly

**Live game**
- Live clock per half with play/pause and reset controls
- Field and bench panes show every player with real-time playtime colour-coding
- Three colour schemes: Traffic light, Fairness bars, Minimal
- Two substitution modes: tap-to-select, on-deck list, or both
- Add late arrivals mid-game — their fair share is calculated from arrival time only
- Substitution log with timestamps

**Rotation engine**
- Fair-share algorithm: each present player accrues expected field time proportional to `fieldSize / numPresent` per second
- Suggests up to three swaps ranked by deficit from fair share; players who haven't played yet are always prioritised
- Respects position groups when positions are tagged (e.g. FWD for FWD)
- Never auto-pulls the goalkeeper
- Accept individual suggestions or apply all at once

**Analytics**
- Live stats panel: average play time, subs made, players who haven't been on
- Per-player table: % played (bar), play time, bench time, sub count
- Game notes field for coaching observations

**End of game**
- Full-time summary with team KPIs
- Print view
- Copy-to-clipboard share text

---

## File Structure

```
index.html          Entry point — mounts the app inside a scaled 667×375 landscape frame
app.jsx             Root component: game state, clock tick, session persistence, phase routing
engine.jsx          Pure game logic: fair-share accounting, balance classification, rotation algorithm
setup.jsx           Pre-game screen: roster builder and game configuration
live.jsx            Live game screen: scoreboard, field/bench panes, substitution drawers
stats.jsx           Coach analytics panel and end-of-game summary
components.jsx      Shared UI components (PlayerRow, Drawer, SwapCard, Toast, ...)
icons.jsx           SVG icon set
tweaks-panel.jsx    Settings panel (colour scheme, sub mode, position display)
tokens.css          Design tokens (colours, spacing, shadows)
styles.css          Component styles
```

---

## Getting Started

1. Open `index.html` in any modern browser (Chrome, Safari, Firefox, Edge).
2. Set your team name, opponent, field size, and half length.
3. Add players or click **Add sample squad**.
4. Click **Start Game**.

No installation, no dependencies to install — React 18, ReactDOM, and Babel are loaded from CDN.

---

## How Playtime Fairness Works

Every second the clock runs, each present player accrues an **expected** share of field time:

```
expInc = min(1, fieldSize / numPresent)
```

A player who arrives late only starts accruing from their arrival second, so they are never penalised for missing the start.

The **balance ratio** (`playSec / expSec`) drives colour coding:

| Ratio | Colour |
|-------|--------|
| >= 90% | Green |
| 72–89% | Yellow |
| < 72% | Red |

The rotation engine ranks bench players by deficit (`expSec - playSec`) and matches them against the most-overplayed field players (excluding GK). Position matching is applied when positions are tagged.

---

## Session Persistence

State is saved to `sessionStorage` on every change. Refreshing the page restores the game in a paused state. Closing the tab clears the session.

---

## Tech Stack

| | |
|---|---|
| UI | React 18 (UMD via unpkg) |
| JSX | Babel Standalone 7 |
| Styles | Vanilla CSS with design tokens |
| Storage | sessionStorage |
| Build | None |
