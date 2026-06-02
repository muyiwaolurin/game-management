/* engine.jsx — pure game logic for Playtime.
   Fair-share playtime accounting + the rotation recommendation algorithm.
   Everything here is side-effect free and exported to window. */

// ── formatters ──
function fmtClock(sec) {
  sec = Math.max(0, Math.floor(sec));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
function firstName(name) { return (name || '').trim().split(/\s+/)[0] || name; }
function pct(n) { return `${Math.round(n)}%`; }

// ── per-tick accounting ──
// Called once per game-second while the clock runs. Mutates a *copy* of players.
// numAvail = present players. Each present player accrues expected field-time of
// min(1, fieldSize / numAvail) per second — capped at 1 (can't be expected to play
// more than 100% of the time when short-handed). On-field players accrue playSec,
// benched players accrue benchSec. Late arrivals only start accruing once present,
// so fairness is proportional to availability automatically.
function tickPlayers(players, fieldSize) {
  const present = players.filter((p) => p.present);
  const numAvail = present.length || 1;
  const expInc = Math.min(1, fieldSize / numAvail);
  return players.map((p) => {
    if (!p.present) return p;
    const np = { ...p, expSec: p.expSec + expInc };
    if (p.onField) np.playSec = p.playSec + 1;
    else np.benchSec = p.benchSec + 1;
    return np;
  });
}

// ── balance classification (color coding) ──
// Compares actual play time to expected fair share.
function balanceOf(p) {
  if (!p.present) return { cls: 'bal-none', ratio: 0, deficit: 0 };
  if (p.expSec < 25) return { cls: 'bal-none', ratio: 1, deficit: 0 }; // too early to judge
  const ratio = p.playSec / p.expSec;
  const deficit = p.expSec - p.playSec; // seconds behind fair share
  let cls;
  if (ratio >= 0.9) cls = 'bal-green';
  else if (ratio >= 0.72) cls = 'bal-yellow';
  else cls = 'bal-red';
  return { cls, ratio, deficit };
}

// ── rotation engine ──
// Ranks overplayed field players to come OFF and underplayed bench players to come ON.
// Honors position groups when requested; never auto-pulls the keeper.
function suggestRotation(players, fieldSize, opts = {}) {
  const max = opts.max || 3;
  const respectPos = !!opts.respectPos;
  const present = players.filter((p) => p.present);
  const field = present.filter((p) => p.onField);
  const bench = present.filter((p) => !p.onField);
  if (!bench.length || !field.length) return [];

  const outs = field
    .filter((p) => p.position !== 'GK')
    .map((p) => ({ p, surplus: p.playSec - p.expSec }))
    .sort((a, b) => b.surplus - a.surplus);

  const ins = bench
    .filter((p) => p.position !== 'GK')
    .map((p) => ({ p, deficit: p.expSec - p.playSec, never: !p.everOnField }))
    .sort((a, b) => (Number(b.never) - Number(a.never)) || (b.deficit - a.deficit));

  const out = [];
  const usedOut = new Set();
  for (const inC of ins) {
    if (out.length >= max) break;
    // worth bringing on only if behind fair share or has never played
    if (inC.deficit <= 2 && !inC.never) continue;

    let pick = null;
    if (respectPos && inC.p.position) {
      pick = outs.find((o) => !usedOut.has(o.p.id) && o.p.position === inC.p.position);
    }
    if (!pick) pick = outs.find((o) => !usedOut.has(o.p.id));
    if (!pick) break;
    // the outgoing player should genuinely have more time than the incoming
    if (pick.p.playSec <= inC.p.playSec) continue;

    usedOut.add(pick.p.id);
    let reason;
    if (inC.never) reason = `${firstName(inC.p.name)} hasn't played yet`;
    else reason = `${firstName(inC.p.name)} is ${fmtClock(inC.deficit)} behind fair share`;
    if (respectPos && inC.p.position && inC.p.position === pick.p.position) {
      reason += ` · same ${inC.p.position}`;
    }
    out.push({ outId: pick.p.id, inId: inC.p.id, reason });
  }
  return out;
}

// ── team aggregates ──
function teamStats(players, gameSec) {
  const present = players.filter((p) => p.present);
  const playing = present.length || 1;
  const avgPlay = present.reduce((s, p) => s + p.playSec, 0) / playing;
  const neverPlayed = present.filter((p) => !p.everOnField);
  return { avgPlay, neverPlayed, present };
}

Object.assign(window, {
  fmtClock, firstName, pct, tickPlayers, balanceOf, suggestRotation, teamStats,
});
