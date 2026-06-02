/* stats.jsx — Coach analytics slide-over + end-of-game summary card. */

const { useMemo: useMemoStats } = React;

function availableFor(p, gameSec) {
  return Math.max(1, gameSec - (p.arrivalSec || 0));
}

function StatRow({ p, gameSec }) {
  const avail = availableFor(p, gameSec);
  const pctPlayed = Math.min(100, (p.playSec / avail) * 100);
  const bal = window.balanceOf(p);
  return (
    <div className="st-row">
      <div className="c-name">
        <span className={`jersey ${p.position === 'GK' ? 'gk' : ''}`} style={{ width: 24, height: 24, flex: '0 0 24px', fontSize: 11 }}>{p.number}</span>
        <span className="nm">{p.name}</span>
        {!p.everOnField ? <span className="flag-never">never on</span> : null}
        {p.late ? <span className="late-tag" style={{ marginLeft: 2 }}>late</span> : null}
      </div>
      <div className="c-pct">
        <div className="pctbar"><i style={{ width: `${pctPlayed}%`, background: bal.cls === 'bal-red' ? 'var(--pd-red-500)' : bal.cls === 'bal-yellow' ? 'var(--pd-yellow-400)' : 'var(--pd-green-500)' }}></i></div>
        <div style={{ fontSize: 9.5, color: 'var(--pd-text-subtle)', marginTop: 2, textAlign: 'right' }}>{Math.round(pctPlayed)}%</div>
      </div>
      <span className="c-num" style={{ color: 'var(--pd-green-700)' }}>{window.fmtClock(p.playSec)}</span>
      <span className="c-num muted">{window.fmtClock(p.benchSec)}</span>
      <span className="c-num" style={{ flex: '0 0 30px' }}>{p.subCount || 0}</span>
    </div>
  );
}

function StatHead() {
  return (
    <div className="st-row head">
      <span className="c-name" style={{ paddingLeft: 2 }}>Player</span>
      <span className="c-pct">% Played</span>
      <span className="c-num" style={{ color: 'inherit' }}>Play</span>
      <span className="c-num">Bench</span>
      <span className="c-num" style={{ flex: '0 0 30px' }}>Subs</span>
    </div>
  );
}

function StatsPanel({ players, gameSec, config, notes, setNotes, log, onClose }) {
  const Icon = window.Icon;
  const present = players.filter((p) => p.present);
  const stats = window.teamStats(players, gameSec);
  const subCount = log.filter((e) => e.type === 'sub' || e.type === 'on').length;
  const rows = useMemoStats(
    () => [...present].sort((a, b) => a.playSec - b.playSec),
    [players]
  );

  return (
    <div className="statpanel">
      <div className="sp-head">
        <Icon name="poll" size={18} style={{ color: 'var(--pd-blue-500)' }} />
        <span className="spt">Coach Analytics</span>
        <span className="muted" style={{ marginLeft: 'auto', fontSize: 11 }}>Game {window.fmtClock(gameSec)}</span>
        <button className="icon-btn" onClick={onClose} style={{ marginLeft: 8 }} aria-label="Close">
          <Icon name="close" size={18} />
        </button>
      </div>

      <div className="sp-kpis">
        <div className="kpi">
          <div className="k-v" style={{ color: 'var(--pd-blue-600)' }}>{window.fmtClock(stats.avgPlay)}</div>
          <div className="k-l">Avg Play</div>
        </div>
        <div className="kpi">
          <div className="k-v">{subCount}</div>
          <div className="k-l">Subs Made</div>
        </div>
        <div className="kpi">
          <div className="k-v" style={{ color: stats.neverPlayed.length ? 'var(--pd-red-600)' : 'var(--pd-green-600)' }}>{stats.neverPlayed.length}</div>
          <div className="k-l">Never On</div>
        </div>
      </div>

      <div className="stat-table">
        <StatHead />
        {rows.map((p) => <StatRow key={p.id} p={p} gameSec={gameSec} />)}
      </div>

      <div className="notes-wrap">
        <label>Game Notes</label>
        <textarea value={notes} placeholder='e.g. "Jordan strong in 2nd half — try her at MID next week."'
          onChange={(e) => setNotes(e.target.value)} />
      </div>
    </div>
  );
}

// ── End-of-game summary overlay ──
function EndSummary({ players, gameSec, config, notes, log, onNewGame, onReopen }) {
  const Icon = window.Icon;
  const present = players.filter((p) => p.present);
  const stats = window.teamStats(players, gameSec);
  const subCount = log.filter((e) => e.type === 'sub' || e.type === 'on').length;
  const rows = [...present].sort((a, b) => b.playSec - a.playSec);

  function share() {
    const lines = [
      `${config.teamName || 'Team'} vs ${config.opponent || 'Opponent'} — Playtime Summary`,
      `Game time ${window.fmtClock(gameSec)} · ${subCount} subs · avg play ${window.fmtClock(stats.avgPlay)}`,
      '',
      ...rows.map((p) => `#${p.number} ${p.name}: ${window.fmtClock(p.playSec)} played, ${p.subCount || 0} subs${!p.everOnField ? ' (never on)' : ''}`),
    ];
    if (notes && notes.trim()) { lines.push('', `Notes: ${notes.trim()}`); }
    const text = lines.join('\n');
    if (navigator.clipboard) navigator.clipboard.writeText(text).catch(() => {});
    window.__ptNotify && window.__ptNotify('Summary copied to clipboard');
  }

  return (
    <div className="summary">
      <div className="sum-top">
        <div className="brand-mark" style={{ background: 'var(--pd-green-500)' }}>
          <Icon name="trophy" size={20} color="#fff" />
        </div>
        <div>
          <div className="st-title">Full Time</div>
          <div className="st-sub">{config.teamName || 'Your Team'} vs {config.opponent || 'Opponent'} · {window.fmtClock(gameSec)} played</div>
        </div>
        <div className="spacer"></div>
        <button className="sbtn" onClick={onReopen}><Icon name="back" size={15} /> Back</button>
        <button className="sbtn" onClick={() => window.print()}><Icon name="print" size={16} /> Print</button>
        <button className="sbtn" onClick={share}><Icon name="share" size={15} /> Share</button>
        <button className="sbtn go" onClick={onNewGame}><Icon name="refresh" size={15} /> New Game</button>
      </div>
      <div className="sum-body">
        <div className="sp-kpis" style={{ padding: 0, marginBottom: 12 }}>
          <div className="kpi"><div className="k-v" style={{ color: 'var(--pd-blue-600)' }}>{window.fmtClock(stats.avgPlay)}</div><div className="k-l">Avg Play Time</div></div>
          <div className="kpi"><div className="k-v">{present.length}</div><div className="k-l">Players Used</div></div>
          <div className="kpi"><div className="k-v">{subCount}</div><div className="k-l">Total Subs</div></div>
          <div className="kpi"><div className="k-v" style={{ color: stats.neverPlayed.length ? 'var(--pd-red-600)' : 'var(--pd-green-600)' }}>{stats.neverPlayed.length}</div><div className="k-l">Never Played</div></div>
        </div>
        <div className="sum-card">
          <StatHead />
          {rows.map((p) => <StatRow key={p.id} p={p} gameSec={gameSec} />)}
        </div>
        {notes && notes.trim() ? (
          <div className="sum-card" style={{ marginTop: 12, padding: '10px 14px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--pd-text-secondary)', marginBottom: 5 }}>Game Notes</div>
            <div style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--pd-text-default)', whiteSpace: 'pre-wrap' }}>{notes}</div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

Object.assign(window, { StatsPanel, EndSummary });
