/* setup.jsx — pre-game roster builder + game configuration.
   Coach starts empty and adds players, tags positions, picks starters. */

const { useState: useStateSetup, useRef: useRefSetup } = React;

const POSITIONS = ['GK', 'DEF', 'MID', 'FWD'];

function Stepper({ value, min, max, step = 1, onChange, suffix }) {
  return (
    <div className="stepper">
      <button type="button" onClick={() => onChange(Math.max(min, value - step))}>−</button>
      <span className="val">{value}{suffix || ''}</span>
      <button type="button" onClick={() => onChange(Math.min(max, value + step))}>+</button>
    </div>
  );
}

function PosPick({ value, onChange, size }) {
  return (
    <div className="pos-pick">
      {POSITIONS.map((p) => (
        <button
          key={p}
          type="button"
          className={`${value === p ? 'on p-' + p : ''}`}
          onClick={() => onChange(value === p ? null : p)}
        >{p}</button>
      ))}
    </div>
  );
}

const SAMPLE = [
  ['Avery B.', null, null], ['Zeus C.', null, null], ['Nico C.', null, null], ['Cohen C.', null, null],
  ['Leo D.', null, null], ['Yazan M.', null, null], ['Rustin M.', null, null], ['Leo O.', null, null],
  ['Mateo T.', null, null], ['Emmett R.', null, null], ['Deacon R.', null, null], ['Denzel R.', null, null],
  ['Vihaan S.', null, null], ['Dante T.', null, null],
];

function SetupScreen({ config, setConfig, players, onAdd, onUpdate, onRemove, onToggleStarter, onStart, onLoadSample, notify }) {
  const [nm, setNm] = useStateSetup('');
  const [num, setNum] = useStateSetup('');
  const [pos, setPos] = useStateSetup(null);
  const nameRef = useRefSetup(null);

  const starters = players.filter((p) => p.onField);
  const bench = players.filter((p) => !p.onField);
  const Icon = window.Icon;

  const nextNum = () => {
    const used = new Set(players.map((p) => p.number));
    let n = 1; while (used.has(n)) n++; return n;
  };

  function submitAdd(e) {
    e && e.preventDefault();
    const name = nm.trim();
    if (!name) { nameRef.current && nameRef.current.focus(); return; }
    const number = num.trim() === '' ? nextNum() : parseInt(num, 10);
    if (players.some((p) => p.number === number)) { notify(`Number ${number} is taken`); return; }
    onAdd(name, number, pos);
    setNm(''); setNum(''); setPos(null);
    nameRef.current && nameRef.current.focus();
  }

  const canStart = players.length >= 2 && starters.length >= 1;

  return (
    <div className="setup">
      <div className="setup-top">
        <div className="brand-mark">
          <Icon name="whistle" size={20} color="#fff" />
        </div>
        <div className="wm">
          <div className="t">Playtime</div>
          <div className="s">Game Setup · Build Your Squad</div>
        </div>
        <div className="spacer"></div>
        <div style={{ textAlign: 'right', marginRight: 4 }}>
          <div style={{ fontSize: 11, color: 'var(--pd-blue-200)', letterSpacing: '.04em' }}>STARTERS</div>
          <div style={{ fontSize: 15, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
            {starters.length} / {config.fieldSize}
          </div>
        </div>
        <window.FullscreenBtn />
        <button className="btn success" disabled={!canStart} onClick={onStart} style={{ height: 38 }}>
          <Icon name="play" size={16} /> Start Game
        </button>
      </div>

      <div className="setup-body">
        {/* config column */}
        <div className="setup-col form">
          <div className="field-grp">
            <label>Your Team</label>
            <input className="inp" value={config.teamName} placeholder="e.g. Riverside Rovers"
              onChange={(e) => setConfig({ teamName: e.target.value })} />
          </div>
          <div className="field-grp">
            <label>Opponent</label>
            <input className="inp" value={config.opponent} placeholder="e.g. Westside FC"
              onChange={(e) => setConfig({ opponent: e.target.value })} />
          </div>
          <div className="row2">
            <div className="field-grp" style={{ flex: 1 }}>
              <label>On Field</label>
              <Stepper value={config.fieldSize} min={4} max={11}
                onChange={(v) => setConfig({ fieldSize: v })} />
            </div>
            <div className="field-grp" style={{ flex: 1 }}>
              <label>Half Length</label>
              <Stepper value={config.halfMin} min={5} max={45} step={5} suffix="m"
                onChange={(v) => setConfig({ halfMin: v })} />
            </div>
          </div>
          <div className="field-grp">
            <label>Format</label>
            <div style={{ fontSize: 12, color: 'var(--pd-text-subtle)', lineHeight: 1.5 }}>
              Two halves of {config.halfMin} min · {config.fieldSize}v{config.fieldSize} · halftime break between.
            </div>
          </div>
          <div style={{ marginTop: 'auto', paddingTop: 8, borderTop: '1px solid var(--pd-border)' }}>
            <div style={{ fontSize: 11, color: 'var(--pd-text-subtle)', lineHeight: 1.5, display: 'flex', gap: 6 }}>
              <Icon name="alert" size={14} style={{ flex: '0 0 14px', marginTop: 1, color: 'var(--pd-orange-500)' }} />
              <span>Session only. Refreshing the page resets the game.</span>
            </div>
          </div>
        </div>

        {/* roster column */}
        <div className="setup-col roster">
          <div className="roster-head">
            <span className="rt">Roster</span>
            <span className="muted" style={{ fontSize: 12 }}>
              {players.length} {players.length === 1 ? 'player' : 'players'} · {bench.length} on bench
            </span>
          </div>

          <form className="add-row" onSubmit={submitAdd}>
            <input className="inp" style={{ flex: '0 0 52px', textAlign: 'center' }} value={num}
              placeholder="#" inputMode="numeric"
              onChange={(e) => setNum(e.target.value.replace(/[^0-9]/g, '').slice(0, 2))} />
            <input ref={nameRef} className="inp" style={{ flex: '1 1 auto' }} value={nm}
              placeholder="Player name" onChange={(e) => setNm(e.target.value)} />
            <PosPick value={pos} onChange={setPos} />
            <button type="submit" className="btn primary sm" style={{ flex: '0 0 auto' }}>
              <Icon name="plus" size={15} /> Add
            </button>
          </form>

          {players.length === 0 ? (
            <div className="empty">
              <Icon name="accountPlus" size={40} className="e-ic" />
              <div className="e-t">No players yet</div>
              <div className="e-s">Add players above with a name and jersey number. The first {config.fieldSize} become your starters.</div>
              <button className="btn sm" style={{ marginTop: 6 }} onClick={onLoadSample}>
                <Icon name="account" size={14} /> Add sample squad
              </button>
            </div>
          ) : (
            <div className="rlist">
              {players.map((p) => (
                <div className="rl-item" key={p.id}>
                  <span className={`jersey ${p.position === 'GK' ? 'gk' : ''}`}>
                    <input
                      value={p.number ?? ''}
                      placeholder="#"
                      inputMode="numeric"
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 2);
                        onUpdate(p.id, { number: val === '' ? null : parseInt(val, 10) });
                      }}
                      onBlur={() => {
                        if (p.number !== null && players.filter((x) => x.id !== p.id).some((x) => x.number === p.number)) {
                          notify(`Number ${p.number} is taken`);
                          onUpdate(p.id, { number: null });
                        }
                      }}
                    />
                  </span>
                  <div className="rl-name">
                    <input value={p.name} onChange={(e) => onUpdate(p.id, { name: e.target.value })} />
                  </div>
                  <PosPick value={p.position} onChange={(v) => onUpdate(p.id, { position: v })} />
                  <button
                    className={`start-toggle ${p.onField ? 'on' : ''}`}
                    onClick={() => onToggleStarter(p.id)}
                  >{p.onField ? 'Starter' : 'Bench'}</button>
                  <button className="trash" onClick={() => onRemove(p.id)} aria-label="Remove">
                    <Icon name="trash" size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { SetupScreen, POSITIONS, SAMPLE });
