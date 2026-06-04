# Jersey Number Modal Editor — Design Spec

**Date:** 2026-06-04
**Status:** Approved

## Overview

Replace the cramped inline jersey-badge input (setup roster list) with a tap-to-edit pattern: the badge becomes a button, tapping it opens a simple centered modal with a large number input and confirm/cancel actions.

## Scope

Setup screen only. Live game view is out of scope.

## Interaction Model

- The jersey `<span>` in `.rl-item` becomes a `<button>` with identical visual styling (same classes, same appearance).
- Tapping it opens the modal by setting `editingNumId` to the player's id.
- `editingNumVal` (string) tracks the input value inside the modal, pre-filled with the player's current number or empty string if null.
- The inline `<input>` added to the badge in the previous iteration is removed entirely.

## Modal Structure

Rendered inside `SetupScreen`, conditional on `editingNumId !== null`.

**Layout:** Scrim (full-screen semi-transparent overlay) + centered card.

**Card contents:**
- Label: "Jersey Number"
- Single `<input>` — large font, centered, `inputMode="numeric"`, max 2 digits, auto-focused
- Two buttons: **Cancel** (ghost) and **Confirm** (primary)

**Behaviour:**
- Scrim click → cancel (close without saving)
- Cancel → close without saving, clear `editingNumId` and `editingNumVal`
- Confirm → validate, then either save+close or stay open with toast:
  - Parse input as integer; empty input saves as `null`
  - If number conflicts with another player (`players.filter(x => x.id !== editingNumId).some(x => x.number === parsed)`), call `notify('Number X is taken')` and keep modal open
  - Otherwise call `onUpdate(editingNumId, { number: parsed })` and close

## State

Both values are local to `SetupScreen` via `useStateSetup`:

| State | Type | Initial |
|---|---|---|
| `editingNumId` | `string \| null` | `null` |
| `editingNumVal` | `string` | `''` |

## Implementation Touch Points

### `setup.jsx`
- Add `editingNumId` and `editingNumVal` state
- Replace jersey `<span>` with `<button>` (same class names); `onClick` sets both state values
- Remove inline `<input>` from inside the badge (revert previous approach)
- Add modal JSX at the bottom of `SetupScreen` return block

### `styles.css`
- `.num-modal` — `position: absolute; inset: 0; z-index: 90; display: flex; align-items: center; justify-content: center;` with a semi-transparent scrim background
- `.num-modal .card` — small centered white card: padding, border-radius (`var(--pd-radius-xl)`), shadow (`var(--pd-shadow-2xl)`), min-width 220px
- `.num-modal .card .nm-input` — large centered number input (font-size ~32px, tabular-nums, width 100%, text-align center, border, border-radius)
- `.num-modal .card .nm-label` — small uppercase label above the input
- `.num-modal .card .nm-actions` — flex row with Cancel + Confirm buttons, gap

## Constraints

- No new files
- Reuse `.btn`, `.btn.primary`, `.btn.ghost` for modal buttons
- Reuse `var(--pd-blackAlpha-500)` for scrim background (consistent with existing drawer scrim)
