/* live.jsx — the live game: scoreboard, field + bench panes, substitutions,
   rotation suggestions, add-late, period flow. */

const { useState: useStateLive, useMemo: useMemoLive } = React;

const POS_RANK = { GK: 0, DEF: 1, MID: 2, FWD: 3, null: 4, undefined: 4 };
function sortField(a, b) {
  const r = (POS_RANK[a.position] ?? 4) - (POS_RANK[b.position] ?? 4);
  return r !== 0 ? r : a.number - b.number;
}

function LiveGame({
  config, players, gameSec, halfSec, period, running,
  scheme, subMode, showPos = true,
  onToggleClock, onReset, onAdvancePeriod,
  onSub, onSendOn, onAddLate, onGoal, onOpenStats, onEndGame, notify, log,
}) {
  const Icon = window.Icon;
  const { PlayerRow, Drawer, SwapCard } = window;

  const [tab, setTab] = useStateLive('bench');
  const [selOut, setSelOut] = useStateLive(null);
  const [selIn, setSelIn] = useStateLive(null);
  const [showRotate, setShowRotate] = useStateLive(false);
  const [showLate, setShowLate] = useStateLive(false);
  const [menu, setMenu] = useStateLive(false);

  const present = players.filter((p) => p.present);
  const field = present.filter((p) => p.onField).sort(sortField);
  const bench = present.filter((p) => !p.onField).sort((a, b) => a.number - b.number);
  const fieldFull = field.length >= config.fieldSize;

  const halfLen = config.halfMin * 60;
  const halfComplete = halfSec >= halfLen;
  const warn = !halfComplete && halfLen - halfSec <= 60 && period !== 'halftime';

  const showOnDeck = subMode === 'ondeck' || subMode === 'both';
  const benchSelectable = subMode === 'tap' || subMode === 'both';

  // on-deck: bench players most behind fair share
  const onDeck = useMemoLive(() => {
    return bench
      .map((p) => ({ p, b: window.balanceOf(p), never: !p.everOnField }))
      .filter((x) => x.never || x.b.deficit > 2)
      .sort((a, b) => (Number(b.never) - Number(a.never)) || (b.b.deficit - a.b.deficit))
      .slice(0, 4)
      .map((x) => x.p);
  }, [players]);

  const outP = selOut ? players.find((p) => p.id === selOut) : null;
  const inP = selIn ? players.find((p) => p.id === selIn) : null;

  function tapField(p) {
    setSelOut((cur) => (cur === p.id ? null : p.id));
  }
  function tapBench(p) {
    setSelIn((cur) => (cur === p.id ? null : p.id));
  }
  function clearSel() { setSelOut(null); setSelIn(null); }

  function confirmSwap() {
    onSub(selOut, selIn);
    clearSel();
  }
  function confirmSendOn() {
    onSendOn(selIn);
    clearSel();
  }

  // drawer mode for selection
  const drawerMode = (inP && outP) ? 'swap' : (inP && !outP && !fieldFull) ? 'sendon' : null;

  const half = config.halfMin;
  const halfLabel = period === 'halftime' ? 'Halftime' : period === 'secondHalf' ? '2nd Half' : '1st Half';

  return (
    <div className="app">
      {/* ── scoreboard ── */}
      <div className="scorebar">
        <div className="sb-team">
          <div className="name">{config.teamName || 'Your Team'}</div>
          <div className="opp">vs {config.opponent || 'Opponent'}</div>
        </div>
        <span className={`sb-half ${period === 'halftime' ? 'break' : ''}`}>{halfLabel}</span>

        <div className="sb-clock">
          {period === 'halftime' ? (
            <>
              <div className="clock-face">
                <div className="time" style={{ fontSize: 22, color: 'var(--pd-orange-300)' }}>HALF</div>
                <div className="sub">break</div>
              </div>
              <button className="sbtn go lg" onClick={onAdvancePeriod}>
                <Icon name="play" size={16} /> 2nd Half
              </button>
            </>
          ) : (
            <>
              <div className="clock-face">
                <div className={`time ${warn ? 'warn' : ''}`}>{window.fmtClock(halfSec)}</div>
                <div className="sub">{halfLabel} · {half}:00</div>
              </div>
              <div className="clock-ctrls">
                {halfComplete ? (
                  <button className="sbtn go lg" onClick={onAdvancePeriod}>
                    <Icon name={period === 'secondHalf' ? 'flag' : 'whistle'} size={16} />
                    {period === 'secondHalf' ? 'Full Time' : 'Halftime'}
                  </button>
                ) : (
                  <>
                    <button className={`sbtn lg ${running ? 'pause' : 'go'}`} onClick={onToggleClock}>
                      <Icon name={running ? 'pause' : 'play'} size={18} />
                    </button>
                    <button className="sbtn" onClick={onReset} aria-label="Reset clock">
                      <Icon name="reset" size={16} />
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>

        <div className="sb-actions">
          <button className="sbtn solid" onClick={() => setShowRotate(true)}>
            <Icon name="bolt" size={15} /> Rotate
          </button>
          <button className="sbtn" onClick={onOpenStats} aria-label="Stats">
            <Icon name="poll" size={17} />
          </button>
          <window.FullscreenBtn />
          <div style={{ position: 'relative' }}>
            <button className="sbtn" onClick={() => setMenu((m) => !m)} aria-label="Menu">
              <Icon name="dots" size={17} />
            </button>
            {menu ? (
              <div style={{ position: 'absolute', top: 44, right: 0, background: '#fff', borderRadius: 8, boxShadow: 'var(--pd-shadow-xl)', padding: 5, zIndex: 90, minWidth: 150 }}>
                <button className="btn ghost block" style={{ justifyContent: 'flex-start', color: 'var(--pd-red-600)' }}
                  onClick={() => { setMenu(false); onEndGame(); }}>
                  <Icon name="flag" size={15} /> End Game
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* ── body ── */}
      <div className="body">
        {/* field pane */}
        <div className="pane field">
          <div className="pane-head">
            <Icon name="field" size={15} stroke style={{ color: 'var(--pd-green-600)' }} />
            <span className="ph-title">On Field</span>
            <span className="spacer"></span>
            <span className={`ph-count ${fieldFull ? 'full' : ''} ${field.length > config.fieldSize ? 'over' : ''}`}>
              {field.length}/{config.fieldSize}
            </span>
          </div>
          <div className="list">
            {field.length === 0 ? (
              <div className="empty"><div className="e-s">No players on the field.</div></div>
            ) : field.map((p) => (
              <PlayerRow key={p.id} player={p} scheme={scheme} showPos={showPos}
                select={selOut === p.id ? 'sel-out' : ''}
                onClick={() => tapField(p)}
                onGoal={onGoal} />
            ))}
          </div>
        </div>

        {/* bench pane */}
        <div className="pane bench">
          <div className="tabs">
            <button className={`tab ${tab === 'bench' ? 'active' : ''}`} onClick={() => setTab('bench')}>
              <Icon name="bench" size={15} /> Bench <span className="tcount">{bench.length}</span>
            </button>
            <button className={`tab ${tab === 'history' ? 'active' : ''}`} onClick={() => setTab('history')}>
              <Icon name="swap" size={15} /> Subs <span className="tcount">{log.length}</span>
            </button>
          </div>

          {tab === 'bench' ? (
            <>
              {showOnDeck && onDeck.length ? (
                <div className="ondeck">
                  <div className="od-head">
                    <Icon name="arrowUp" size={13} style={{ color: 'var(--pd-green-600)' }} />
                    <span className="od-t">Next On</span>
                    <span className="muted" style={{ fontSize: 10 }}>· tap to send on</span>
                  </div>
                  <div className="od-chips">
                    {onDeck.map((p) => (
                      <div key={p.id} className={`od-chip ${selIn === p.id ? 'sel-in' : ''}`}
                        onClick={() => tapBench(p)}>
                        <span className="num">{p.number}</span>
                        <span className="nm">{window.firstName(p.name)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="list">
                {bench.length === 0 ? (
                  <div className="empty">
                    <Icon name="bench" size={32} className="e-ic" />
                    <div className="e-s">Everyone's on the field. Add a late arrival below.</div>
                  </div>
                ) : bench.map((p) => (
                  <PlayerRow key={p.id} player={p} scheme={scheme} showPos={showPos}
                    select={selIn === p.id ? 'sel-in' : ''}
                    onClick={() => tapBench(p)} />
                ))}
              </div>

              <div className="bench-foot">
                <button className="btn sm" style={{ flex: 1 }} onClick={() => setShowLate(true)}>
                  <Icon name="accountPlus" size={15} /> Add Late
                </button>
                <button className="btn primary sm" style={{ flex: 1 }} onClick={() => setShowRotate(true)}>
                  <Icon name="bolt" size={15} /> Suggest Rotation
                </button>
              </div>
            </>
          ) : (
            <div className="list">
              {log.length === 0 ? (
                <div className="empty">
                  <Icon name="swap" size={32} className="e-ic" />
                  <div className="e-s">No substitutions yet. Subs you make will be logged here with a timestamp.</div>
                </div>
              ) : log.map((e, i) => (
                <div className="log-item" key={i}>
                  <span className="log-time">{e.clock}</span>
                  <div className="log-swap">
                    {e.type === 'arrival' ? (
                      <>
                        <span className="log-badge">arrived</span>
                        <span className="pin"><Icon name="accountPlus" size={13} /> #{e.inNum} {e.inName}</span>
                      </>
                    ) : e.type === 'on' ? (
                      <span className="pin"><Icon name="arrowUp" size={13} /> #{e.inNum} {e.inName} on</span>
                    ) : (
                      <>
                        <span className="pout"><Icon name="arrowDown" size={13} /> #{e.outNum} {window.firstName(e.outName)}</span>
                        <Icon name="arrowRight" size={14} className="arr" />
                        <span className="pin"><Icon name="arrowUp" size={13} /> #{e.inNum} {window.firstName(e.inName)}</span>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── selection sub drawer ── */}
      {drawerMode === 'swap' ? (
        <Drawer title="Confirm Substitution" sub={`At ${window.fmtClock(halfSec)} · ${halfLabel}`} onClose={clearSel}
          footer={<>
            <button className="btn block" onClick={clearSel}>Cancel</button>
            <button className="btn success block" onClick={confirmSwap}><Icon name="swap" size={15} /> Confirm Sub</button>
          </>}>
          <SwapCard out={outP} inn={inP} />
        </Drawer>
      ) : drawerMode === 'sendon' ? (
        <Drawer title="Send Player On" sub={`Field has room (${field.length}/${config.fieldSize})`} onClose={clearSel}
          footer={<>
            <button className="btn block" onClick={clearSel}>Cancel</button>
            <button className="btn success block" onClick={confirmSendOn}><Icon name="arrowUp" size={15} /> Send On</button>
          </>}>
          <div className="swap-card" style={{ justifyContent: 'flex-start' }}>
            <span className={`jersey ${inP.position === 'GK' ? 'gk' : ''}`} style={{ background: 'var(--pd-green-600)' }}>{inP.number}</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{inP.name}</div>
              <div style={{ fontSize: 11, color: 'var(--pd-text-subtle)' }}>Goes on with no one coming off</div>
            </div>
          </div>
        </Drawer>
      ) : null}

      {/* ── add late drawer ── */}
      {showLate ? (
        <AddLateDrawer existing={players} onClose={() => setShowLate(false)}
          onAdd={(name, number, position) => { onAddLate(name, number, position); setShowLate(false); }}
          notify={notify} clock={window.fmtClock(halfSec)} halfLabel={halfLabel} />
      ) : null}

      {/* ── rotation drawer ── */}
      {showRotate ? (
        <RotationDrawer players={players} config={config} onClose={() => setShowRotate(false)}
          onApply={(outId, inId) => onSub(outId, inId)} notify={notify} />
      ) : null}
    </div>
  );
}

// ── Add Late ──
const { useState: useStateAL, useRef: useRefAL } = React;
function AddLateDrawer({ existing, onAdd, onClose, notify, clock, halfLabel }) {
  const Icon = window.Icon;
  const [nm, setNm] = useStateAL('');
  const [num, setNum] = useStateAL('');
  const [pos, setPos] = useStateAL(null);
  function submit() {
    const name = nm.trim();
    if (!name) { notify('Enter a player name'); return; }
    const number = num.trim() === '' ? (() => { const u = new Set(existing.map((p) => p.number)); let n = 1; while (u.has(n)) n++; return n; })() : parseInt(num, 10);
    if (existing.some((p) => p.number === number)) { notify(`Number ${number} is taken`); return; }
    onAdd(name, number, pos);
  }
  return (
    <window.Drawer title="Add Late Player" sub={`Joins the bench · arrival logged at ${clock}`} onClose={onClose}
      footer={<>
        <button className="btn block" onClick={onClose}>Cancel</button>
        <button className="btn primary block" onClick={submit}><Icon name="accountPlus" size={15} /> Add to Bench</button>
      </>}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <input className="inp" style={{ flex: '0 0 60px', textAlign: 'center' }} value={num} placeholder="#"
          inputMode="numeric" onChange={(e) => setNum(e.target.value.replace(/[^0-9]/g, '').slice(0, 2))} />
        <input className="inp" style={{ flex: 1 }} value={nm} placeholder="Player name" autoFocus
          onChange={(e) => setNm(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} />
      </div>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: 'var(--pd-text-secondary)', marginBottom: 5 }}>Position (optional)</div>
      <window.PosPickInline value={pos} onChange={setPos} />
      <div style={{ fontSize: 11, color: 'var(--pd-text-subtle)', marginTop: 10, lineHeight: 1.5 }}>
        Late arrivals are tracked proportionally — their fair share counts only from now, so rotation won't penalize them for missing the start.
      </div>
    </window.Drawer>
  );
}

// inline position picker (reuses setup styles)
function PosPickInline({ value, onChange }) {
  return (
    <div className="pos-pick" style={{ gap: 6 }}>
      {window.POSITIONS.map((p) => (
        <button key={p} type="button" style={{ fontSize: 11, padding: '6px 12px' }}
          className={`${value === p ? 'on p-' + p : ''}`}
          onClick={() => onChange(value === p ? null : p)}>{p}</button>
      ))}
    </div>
  );
}

// ── Rotation suggestions ──
const { useState: useStateRot, useMemo: useMemoRot } = React;
function RotationDrawer({ players, config, onClose, onApply, notify }) {
  const Icon = window.Icon;
  const respectPos = players.some((p) => p.position);
  const initial = useMemoRot(
    () => window.suggestRotation(players, config.fieldSize, { max: 3, respectPos }),
    []
  );
  const [states, setStates] = useStateRot(() => initial.map(() => 'pending')); // pending|accepted|dismissed

  function accept(i, s) {
    const out = players.find((p) => p.id === s.outId);
    const inn = players.find((p) => p.id === s.inId);
    if (!out || !out.onField || !inn || inn.onField) { notify('That swap is no longer valid'); return; }
    onApply(s.outId, s.inId);
    setStates((st) => st.map((v, j) => (j === i ? 'accepted' : v)));
  }
  function dismiss(i) { setStates((st) => st.map((v, j) => (j === i ? 'dismissed' : v))); }

  const pendingCount = states.filter((s) => s === 'pending').length;
  function applyAll() {
    initial.forEach((s, i) => { if (states[i] === 'pending') accept(i, s); });
  }

  return (
    <window.Drawer title="Suggested Rotation"
      sub={respectPos ? 'Balances minutes · respects positions' : 'Balances minutes by least play time'}
      onClose={onClose}
      footer={initial.length && pendingCount > 1 ? (
        <>
          <button className="btn block" onClick={onClose}>Done</button>
          <button className="btn success block" onClick={applyAll}><Icon name="check" size={15} /> Apply All ({pendingCount})</button>
        </>
      ) : (
        <button className="btn block" onClick={onClose}>Done</button>
      )}>
      {initial.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '14px 8px', color: 'var(--pd-text-subtle)' }}>
          <Icon name="check" size={28} style={{ color: 'var(--pd-green-500)' }} />
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--pd-text-default)', marginTop: 6 }}>Minutes look balanced</div>
          <div style={{ fontSize: 11, marginTop: 3 }}>No substitutions needed right now. Check back in a few minutes.</div>
        </div>
      ) : initial.map((s, i) => {
        const out = players.find((p) => p.id === s.outId);
        const inn = players.find((p) => p.id === s.inId);
        if (!out || !inn) return null;
        const st = states[i];
        return (
          <div key={i} className={`sugg ${st === 'dismissed' ? 'dismissed' : ''} ${st === 'accepted' ? 'accepted' : ''}`}>
            <div className="sx">
              <div className="swline">
                <span style={{ color: 'var(--pd-red-600)' }}>#{out.number} {window.firstName(out.name)}</span>
                <Icon name="arrowRight" size={14} style={{ color: 'var(--pd-gray-400)' }} />
                <span style={{ color: 'var(--pd-green-700)' }}>#{inn.number} {window.firstName(inn.name)}</span>
              </div>
              <div className="swhy">{s.reason}</div>
            </div>
            <div className="sact">
              {st === 'pending' ? (
                <>
                  <button className="icon-btn no" onClick={() => dismiss(i)} aria-label="Dismiss"><Icon name="close" size={16} /></button>
                  <button className="icon-btn ok" onClick={() => accept(i, s)} aria-label="Accept"><Icon name="check" size={16} /></button>
                </>
              ) : st === 'accepted' ? (
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--pd-green-600)', display: 'inline-flex', alignItems: 'center', gap: 3 }}><Icon name="check" size={14} /> Done</span>
              ) : (
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--pd-gray-400)' }}>Dismissed</span>
              )}
            </div>
          </div>
        );
      })}
    </window.Drawer>
  );
}

Object.assign(window, { LiveGame, PosPickInline });
