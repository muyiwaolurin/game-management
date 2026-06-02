/* app.jsx — Playtime root. Owns all game state, the clock tick, session
   persistence, phase routing, and tweak wiring. */

const { useState, useEffect, useRef } = React;

let _uid = 0;
const uid = () => `p${Date.now().toString(36)}${(_uid++).toString(36)}${Math.random().toString(36).slice(2, 5)}`;

const STORAGE_KEY = 'playtime_state_v1';

function freshState() {
  return {
    phase: 'setup',
    config: { teamName: '', opponent: '', fieldSize: 7, halfMin: 25 },
    players: [],
    gameSec: 0,
    halfSec: 0,
    half: 1,
    period: 'firstHalf', // firstHalf | halftime | secondHalf
    running: false,
    log: [],
    notes: '',
  };
}

function loadState() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) return { ...freshState(), ...JSON.parse(raw), running: false };
  } catch (e) {}
  return freshState();
}

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "colorScheme": "Traffic light",
  "subMode": "Both",
  "showPos": true
}/*EDITMODE-END*/;

const SCHEME_MAP = { 'Traffic light': 'traffic', 'Fairness bars': 'bars', 'Minimal': 'minimal' };
const SUB_MAP = { 'Tap to select': 'tap', 'On-deck list': 'ondeck', 'Both': 'both' };

function App() {
  const [S, setS] = useState(loadState);
  const [t, setTweak] = window.useTweaks(TWEAK_DEFAULTS);
  const [showStats, setShowStats] = useState(false);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  const scheme = SCHEME_MAP[t.colorScheme] || 'traffic';
  const subMode = SUB_MAP[t.subMode] || 'both';

  // persistence
  useEffect(() => {
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(S)); } catch (e) {}
  }, [S]);

  // warn before leaving with a game in progress
  useEffect(() => {
    const h = (e) => {
      if (S.phase === 'live' || S.players.length) { e.preventDefault(); e.returnValue = ''; }
    };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [S.phase, S.players.length]);

  // notify helper
  function notify(msg, icon) {
    setToast({ msg, icon, id: Date.now() });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 1900);
  }
  useEffect(() => { window.__ptNotify = notify; }, []);

  // ── the clock ──
  useEffect(() => {
    if (!S.running || S.phase !== 'live' || S.period === 'halftime') return;
    const id = setInterval(() => {
      setS((s) => {
        if (!s.running) return s;
        const halfLen = s.config.halfMin * 60;
        const halfSec = s.halfSec + 1;
        const players = window.tickPlayers(s.players, s.config.fieldSize);
        const done = halfSec >= halfLen;
        return { ...s, gameSec: s.gameSec + 1, halfSec, players, running: done ? false : s.running };
      });
    }, 1000);
    return () => clearInterval(id);
  }, [S.running, S.phase, S.period]);

  const patch = (p) => setS((s) => ({ ...s, ...p }));

  // ── setup handlers ──
  function setConfig(p) { setS((s) => ({ ...s, config: { ...s.config, ...p } })); }

  function addPlayer(name, number, position) {
    setS((s) => {
      const starters = s.players.filter((p) => p.onField).length;
      const onField = starters < s.config.fieldSize;
      const np = {
        id: uid(), name, number, position: position || null,
        onField, present: true, late: false, arrivalSec: 0,
        playSec: 0, benchSec: 0, expSec: 0, subCount: 0, everOnField: onField,
      };
      return { ...s, players: [...s.players, np] };
    });
  }
  function updatePlayer(id, p) {
    setS((s) => ({ ...s, players: s.players.map((pl) => (pl.id === id ? { ...pl, ...p } : pl)) }));
  }
  function removePlayer(id) {
    setS((s) => ({ ...s, players: s.players.filter((pl) => pl.id !== id) }));
  }
  function toggleStarter(id) {
    setS((s) => {
      const pl = s.players.find((x) => x.id === id);
      if (!pl) return s;
      if (!pl.onField) {
        const starters = s.players.filter((x) => x.onField).length;
        if (starters >= s.config.fieldSize) { notify(`Only ${s.config.fieldSize} can start`); return s; }
        return { ...s, players: s.players.map((x) => (x.id === id ? { ...x, onField: true, everOnField: true } : x)) };
      }
      return { ...s, players: s.players.map((x) => (x.id === id ? { ...x, onField: false } : x)) };
    });
  }
  function loadSample() {
    setS((s) => {
      const players = window.SAMPLE.map(([name, number, position], i) => ({
        id: uid(), name, number, position,
        onField: i < s.config.fieldSize, present: true, late: false, arrivalSec: 0,
        playSec: 0, benchSec: 0, expSec: 0, subCount: 0, everOnField: i < s.config.fieldSize,
      }));
      return { ...s, players };
    });
  }

  function startGame() {
    setS((s) => ({ ...s, phase: 'live', period: 'firstHalf', half: 1, gameSec: 0, halfSec: 0, running: true, log: [] }));
  }

  // ── live handlers ──
  function toggleClock() { setS((s) => ({ ...s, running: !s.running })); }
  function resetClock() { setS((s) => ({ ...s, halfSec: 0, running: false })); notify('Half clock reset'); }

  function advancePeriod() {
    setS((s) => {
      if (s.period === 'firstHalf') return { ...s, period: 'halftime', running: false };
      if (s.period === 'halftime') { notify('Second half — kickoff'); return { ...s, period: 'secondHalf', half: 2, halfSec: 0, running: true }; }
      return { ...s, phase: 'summary', running: false };
    });
  }

  function makeSub(outId, inId) {
    setS((s) => {
      const out = s.players.find((p) => p.id === outId);
      const inn = s.players.find((p) => p.id === inId);
      if (!out || !inn) return s;
      const players = s.players.map((p) => {
        if (p.id === outId) return { ...p, onField: false, subCount: p.subCount + 1 };
        if (p.id === inId) return { ...p, onField: true, everOnField: true, subCount: p.subCount + 1 };
        return p;
      });
      const log = [{ type: 'sub', clock: window.fmtClock(s.halfSec), half: s.half, outNum: out.number, outName: out.name, inNum: inn.number, inName: inn.name }, ...s.log];
      return { ...s, players, log };
    });
    notify('Substitution logged', 'swap');
  }

  function sendOn(inId) {
    setS((s) => {
      const inn = s.players.find((p) => p.id === inId);
      if (!inn) return s;
      const onField = s.players.filter((p) => p.onField).length;
      if (onField >= s.config.fieldSize) { notify('Field is full'); return s; }
      const players = s.players.map((p) => (p.id === inId ? { ...p, onField: true, everOnField: true, subCount: p.subCount + 1 } : p));
      const log = [{ type: 'on', clock: window.fmtClock(s.halfSec), half: s.half, inNum: inn.number, inName: inn.name }, ...s.log];
      return { ...s, players, log };
    });
    notify('Player sent on', 'arrowUp');
  }

  function addLate(name, number, position) {
    setS((s) => {
      const np = {
        id: uid(), name, number, position: position || null,
        onField: false, present: true, late: true, arrivalSec: s.gameSec,
        playSec: 0, benchSec: 0, expSec: 0, subCount: 0, everOnField: false,
      };
      const log = [{ type: 'arrival', clock: window.fmtClock(s.halfSec), half: s.half, inNum: number, inName: name }, ...s.log];
      return { ...s, players: [...s.players, np], log };
    });
    notify('Late arrival added', 'accountPlus');
  }

  function endGame() { setS((s) => ({ ...s, phase: 'summary', running: false })); }
  function newGame() { setS((s) => ({ ...freshState(), config: s.config })); setShowStats(false); }
  function reopen() { setS((s) => ({ ...s, phase: 'live' })); }
  function setNotes(v) { setS((s) => ({ ...s, notes: v })); }

  // ── render ──
  return (
    <>
      {S.phase === 'setup' ? (
        <window.SetupScreen
          config={S.config} setConfig={setConfig} players={S.players}
          onAdd={addPlayer} onUpdate={updatePlayer} onRemove={removePlayer}
          onToggleStarter={toggleStarter} onStart={startGame} onLoadSample={loadSample}
          notify={notify}
        />
      ) : S.phase === 'live' ? (
        <>
          <window.LiveGame
            config={S.config} players={S.players} gameSec={S.gameSec} halfSec={S.halfSec}
            period={S.period} running={S.running} scheme={scheme} subMode={subMode} showPos={t.showPos}
            onToggleClock={toggleClock} onReset={resetClock} onAdvancePeriod={advancePeriod}
            onSub={makeSub} onSendOn={sendOn} onAddLate={addLate}
            onOpenStats={() => setShowStats(true)} onEndGame={endGame} notify={notify} log={S.log}
          />
          {showStats ? (
            <window.StatsPanel players={S.players} gameSec={S.gameSec} config={S.config}
              notes={S.notes} setNotes={setNotes} log={S.log} onClose={() => setShowStats(false)} />
          ) : null}
        </>
      ) : (
        <window.EndSummary players={S.players} gameSec={S.gameSec} config={S.config}
          notes={S.notes} log={S.log} onNewGame={newGame} onReopen={reopen} />
      )}

      {toast ? <window.Toast key={toast.id} icon={toast.icon}>{toast.msg}</window.Toast> : null}

      {/* Tweaks */}
      <window.TweaksPanel>
        <window.TweakSection label="Playtime color-coding" />
        <window.TweakRadio label="Scheme" value={t.colorScheme}
          options={['Traffic light', 'Fairness bars', 'Minimal']}
          onChange={(v) => setTweak('colorScheme', v)} />
        <window.TweakSection label="Substitutions" />
        <window.TweakRadio label="Interaction" value={t.subMode}
          options={['Tap to select', 'On-deck list', 'Both']}
          onChange={(v) => setTweak('subMode', v)} />
        <window.TweakSection label="Display" />
        <window.TweakToggle label="Show position tags" value={t.showPos}
          onChange={(v) => setTweak('showPos', v)} />
      </window.TweaksPanel>
    </>
  );
}

window.PlaytimeApp = App;
