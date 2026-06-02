/* components.jsx — shared UI atoms for Playtime.
   Depends on window.Icon, window.fmtClock, window.balanceOf. */

// ── PlayerRow ──
// scheme: 'traffic' | 'minimal' | 'bars'  (playtime color-coding tweak)
// select: '' | 'sel' | 'sel-out' | 'sel-in'
function PlayerRow({ player, scheme = 'traffic', select = '', showPos = true, dim = false, onClick, rightSlot }) {
  const bal = window.balanceOf(player);
  const ratio = Math.max(0, Math.min(1, bal.ratio));
  const pos = player.position;
  const selCls = select ? select : '';
  return (
    <div
      className={`prow ${bal.cls} scheme-${scheme} ${selCls} ${dim ? 'dim' : ''}`}
      onClick={onClick}
    >
      <div className="stripe"></div>
      <div className={`jersey ${pos === 'GK' ? 'gk' : ''}`}>{player.number}</div>
      <div className="pinfo">
        <div className="pname">{player.name}</div>
        <div className="pmeta">
          {scheme === 'minimal' ? <span className="dotbal"></span> : null}
          {showPos ? (
            <span className={`pos-tag ${pos ? 'pos-' + pos : 'pos-none'}`}>{pos || '—'}</span>
          ) : null}
          {player.late ? (
            <span className="late-tag">
              <window.Icon name="timer" size={10} /> LATE
            </span>
          ) : null}
        </div>
      </div>
      {rightSlot ? rightSlot : (
        <div className="ptime">
          <div className="pt-big">{window.fmtClock(player.playSec)}</div>
          {scheme === 'bars' ? (
            <div className="fairbar" style={{ width: 42 }}>
              <i style={{ width: `${ratio * 100}%` }}></i>
            </div>
          ) : (
            <div className="pt-lbl">played</div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Bottom drawer ──
function Drawer({ title, sub, onClose, children, footer }) {
  return (
    <>
      <div className="scrim" onClick={onClose}></div>
      <div className="drawer" role="dialog">
        <div className="dh">
          <div style={{ flex: '1 1 auto' }}>
            <div className="dt">{title}</div>
            {sub ? <div className="ds">{sub}</div> : null}
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <window.Icon name="close" size={18} />
          </button>
        </div>
        <div className="db">{children}</div>
        {footer ? <div className="df">{footer}</div> : null}
      </div>
    </>
  );
}

// ── Toast ──
function Toast({ icon, children }) {
  return (
    <div className="toast">
      {icon ? <window.Icon name={icon} size={15} /> : null}
      {children}
    </div>
  );
}

// ── Swap preview card (used in sub + rotation drawers) ──
function SwapCard({ out, inn }) {
  const Icon = window.Icon;
  return (
    <div className="swap-card">
      <div className="swap-side out">
        <span className={`jersey ${out.position === 'GK' ? 'gk' : ''}`} style={{ width: 28, height: 28, flex: '0 0 28px', fontSize: 13 }}>{out.number}</span>
        <div style={{ minWidth: 0 }}>
          <div className="lbl">Coming off</div>
          <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{out.name}</div>
        </div>
      </div>
      <Icon name="arrowRight" size={20} style={{ color: 'var(--pd-gray-400)' }} />
      <div className="swap-side in">
        <span className={`jersey ${inn.position === 'GK' ? 'gk' : ''}`} style={{ width: 28, height: 28, flex: '0 0 28px', fontSize: 13, background: 'var(--pd-green-600)' }}>{inn.number}</span>
        <div style={{ minWidth: 0 }}>
          <div className="lbl">Going on</div>
          <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{inn.name}</div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { PlayerRow, Drawer, Toast, SwapCard });
