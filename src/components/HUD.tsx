import { useEffect } from 'react';
import { RES_EMOJI } from '../daemon/brain';
import { fmtHour } from '../simulation/log';
import { useStore } from '../simulation/store';
import { RES_KEYS } from '../simulation/types';
import { avgCatHappiness, cityProgress } from '../simulation/world';

export function phaseOf(h: number) {
  if (h < 5) return { icon: '🌙', name: 'Night' };
  if (h < 8) return { icon: '🌅', name: 'Morning' };
  if (h < 16) return { icon: '☀️', name: 'Day' };
  if (h < 19) return { icon: '🌇', name: 'Afternoon' };
  if (h < 21.5) return { icon: '🌆', name: 'Evening' };
  return { icon: '🌙', name: 'Night' };
}

function Meter({ label, icon, value, color, sub }: { label: string; icon: string; value: number; color: string; sub?: string }) {
  return (
    <div className="meter" title={label}>
      <div className="meter-head"><span>{icon} {label}</span><b>{Math.round(value)}%</b></div>
      <div className="meter-bar"><div className="meter-fill" style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: color }} /></div>
      {sub && <div className="meter-sub">{sub}</div>}
    </div>
  );
}

export function TopBar() {
  useStore((s) => s.tick);
  const sim = useStore((s) => s.sim);
  const setPanel = useStore((s) => s.setPanel);
  const d = sim.daemon;
  const ph = phaseOf(sim.hour);
  const weather = sim.weather === 'rainy' ? '🌧️' : sim.weather === 'cloudy' ? '⛅' : '☀️';
  return (
    <div className="topbar">
      <button className="brand" onClick={() => setPanel('about')} title="About this project">
        <span className="brand-ears">▲▲</span>
        <span className="brand-name">CATOPIA</span>
        <span className="brand-sub">The City That Belongs to Cats</span>
      </button>
      <div className="clock card">
        <div className="clock-day">Day {sim.day}</div>
        <div className="clock-time">{ph.icon} {fmtHour(sim.hour)} <span className="muted">· {ph.name} {weather}</span></div>
      </div>
      <div className="meters card">
        <Meter label="Daemon energy" icon={d.awake ? '⚡' : '💤'} value={d.energy} color={d.awake ? 'linear-gradient(90deg,#b69cff,#ff9ec7)' : '#a9a3c4'}
          sub={d.awake ? `awake · ${d.mood}` : d.mood === 'dormant' ? 'dormant — waiting for offerings' : 'ASLEEP — needs offerings'} />
        <Meter label="Cat happiness" icon="😺" value={avgCatHappiness(sim)} color="linear-gradient(90deg,#ffd166,#ff9f6b)" />
        <Meter label="City transformed" icon="🐾" value={cityProgress(sim) * 100} color="linear-gradient(90deg,#8fd18b,#5fc6cf)" sub={`${sim.placed.length} cat structures`} />
      </div>
      <div className="res card" title="Materials the daemon has extracted from offerings">
        {RES_KEYS.filter((k) => k !== 'labor').map((k) => (
          <span key={k} className={d.resources[k] ? '' : 'dim'}>{RES_EMOJI[k]}<b>{d.resources[k]}</b></span>
        ))}
        <span title="Prepared cat meals">🍽️<b>{d.foodStock}</b></span>
      </div>
    </div>
  );
}

export function ControlBar() {
  const s = useStore();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      if (e.code === 'Space') { e.preventDefault(); useStore.getState().togglePlay(); }
      if (e.key === '1') useStore.getState().setSpeed(1);
      if (e.key === '2') useStore.getState().setSpeed(2);
      if (e.key === '5') useStore.getState().setSpeed(5);
      if (e.key === 'n') useStore.getState().nextDay();
      if (e.key === 't') useStore.getState().toggleThoughts();
      if (e.key === 'Escape') { useStore.getState().setPanel(null); useStore.getState().select(null); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  return (
    <div className="controlbar card">
      <button className="btn big" onClick={s.togglePlay} title="Play / Pause (Space)">{s.playing ? '⏸' : '▶'}</button>
      <div className="seg">
        {[1, 2, 5].map((n) => (
          <button key={n} className={`btn ${s.speed === n ? 'on' : ''}`} onClick={() => s.setSpeed(n)}>{n}×</button>
        ))}
      </div>
      <button className="btn" onClick={s.nextDay} title="Skip to tomorrow morning (N)">⏭ Next day</button>
      <span className="sep" />
      <button className="btn accent" onClick={() => s.setPanel('offer')}>🎁 Offer an item</button>
      <button className={`btn ${s.thoughtsOpen ? 'on' : ''}`} onClick={s.toggleThoughts} title="Daemon thoughts (T)">🧠 Thoughts</button>
      <button className={`btn ${s.panel === 'history' ? 'on' : ''}`} onClick={() => s.setPanel('history')}>📜 History</button>
      <button className={`btn ${s.panel === 'roster' ? 'on' : ''}`} onClick={() => s.setPanel('roster')}>👥 Residents</button>
      <span className="sep" />
      <button className={`btn ${s.panel === 'demo' ? 'on' : ''}`} onClick={() => s.setPanel('demo')}>🎬 Demo</button>
      <button className={`btn ${s.autoCamera ? 'on' : ''}`} onClick={s.toggleAutoCamera} title="Camera follows story events">🎥 Auto-cam</button>
      <button className={`btn ${s.showreel ? 'on' : ''}`} onClick={s.toggleShowreel} title="Slow cinematic orbit">🌀 Showreel</button>
      <button className="btn" onClick={() => { if (confirm('Reset the simulation to Day 1 (same seed)?')) s.reset(); }}>↺ Reset</button>
    </div>
  );
}

export function Toasts() {
  const toasts = useStore((s) => s.toasts);
  const dismiss = useStore((s) => s.dismissToast);
  const focusOn = useStore((s) => s.focusOn);
  useEffect(() => {
    if (!toasts.length) return;
    const t = setTimeout(() => dismiss(toasts[0].id), 7000);
    return () => clearTimeout(t);
  }, [toasts, dismiss]);
  return (
    <div className="toasts">
      {toasts.map((t) => (
        <div key={t.id} className="toast" onClick={() => { if (t.pos) focusOn(t.pos, 15); dismiss(t.id); }}>
          <div className="toast-emoji">{t.emoji}</div>
          <div>
            <div className="toast-title">{t.title}</div>
            <div className="toast-text">{t.text}</div>
            <div className="toast-meta">Day {t.day} · {fmtHour(t.hour)}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
