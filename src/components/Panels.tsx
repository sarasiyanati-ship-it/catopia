import { useState, type ReactNode } from 'react';
import { CAT_DEFS, CITIZEN_DEFS, LAZY_ID } from '../data/characters';
import { BUILDING_BY_ID, SITE_BY_ID } from '../data/city';
import { ITEMS, VISITOR_OFFERS } from '../data/items';
import { TYPE_BY_ID } from '../data/transformTypes';
import { RES_EMOJI } from '../daemon/brain';
import { fmtHour } from '../simulation/log';
import { useStore } from '../simulation/store';
import type { NeedKey, Thought } from '../simulation/types';
import { NEED_KEYS, RES_KEYS } from '../simulation/types';
import { siteLabel } from '../simulation/world';

const NEED_ICON: Record<NeedKey, string> = { hunger: '🐟', comfort: '🛋️', play: '🧶', rest: '💤', safety: '📦', curiosity: '🔍' };
const ACT_LABEL: Record<string, string> = {
  sleeping: 'sleeping', waking: 'waking up', commuting: 'walking to work', working: 'working', lazing: 'avoiding work',
  toShop: 'going shopping', shopping: 'shopping', goingHome: 'walking home', eating: 'eating at home', relaxing: 'relaxing',
  toShrine: 'bringing an offering', offering: 'making an offering', servant: 'serving the cats', resting: 'resting',
};
const GOAL_COLOR: Record<string, string> = {
  wellbeing: '#ff9f6b', transform: '#5fc6cf', survive: '#9aa3b5', whim: '#b69cff', fairness: '#ff8fab', novelty: '#8fd18b', demand: '#ffd166', chaos: '#e0d4ff', base: '#ccc',
};

function Bar({ v, color }: { v: number; color: string }) {
  return <div className="bar"><div style={{ width: `${Math.max(0, Math.min(100, v))}%`, background: color }} /></div>;
}

function Panel({ title, onClose, children, className = '' }: { title: string; onClose: () => void; children: ReactNode; className?: string }) {
  return (
    <div className={`panel card ${className}`}>
      <div className="panel-head"><h3>{title}</h3><button className="x" onClick={onClose}>✕</button></div>
      <div className="panel-body">{children}</div>
    </div>
  );
}

// ── Daemon thoughts ──────────────────────────────────────────
function ThoughtCard({ th, full }: { th: Thought; full?: boolean }) {
  const maxScore = Math.max(0.5, ...(th.candidates ?? []).map((c) => c.score));
  return (
    <div className={`thought kind-${th.kind} ${th.unexpected ? 'unexpected' : ''}`}>
      <div className="thought-meta">Day {th.day} · {fmtHour(th.hour)} · {th.kind}{th.unexpected ? ' · 🎲 surprise' : ''}</div>
      <div className="thought-title">{th.title}</div>
      {(full ? th.lines : th.lines.slice(-2)).map((l, i) => <div key={i} className="thought-line">{l}</div>)}
      {full && th.goals && (
        <div className="goals">
          {Object.entries(th.goals).map(([k, v]) => (
            <span key={k} className="goal-chip" style={{ borderColor: GOAL_COLOR[k] }}>{k} <b>{v.toFixed(2)}</b></span>
          ))}
        </div>
      )}
      {full && th.candidates && (
        <div className="cands">
          <div className="cands-title">Options weighed (score = Σ goal weight × contribution + chaos):</div>
          {th.candidates.map((c, i) => (
            <div key={i} className={`cand ${c.chosen ? 'chosen' : ''}`}>
              <div className="cand-label">{c.chosen ? '▶ ' : ''}{c.emoji} {c.label}<b>{c.score.toFixed(2)}</b></div>
              <div className="stack">
                {Object.entries(c.parts).filter(([, v]) => v > 0.005).map(([k, v]) => (
                  <div key={k} title={`${k}: ${v.toFixed(2)}`} style={{ width: `${(v / maxScore) * 100}%`, background: GOAL_COLOR[k] ?? '#ccc' }} />
                ))}
              </div>
              {Object.entries(c.parts).some(([, v]) => v < -0.01) && (
                <div className="neg">{Object.entries(c.parts).filter(([, v]) => v < -0.01).map(([k, v]) => `${k} ${v.toFixed(2)}`).join(' · ')}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ThoughtsPanel() {
  useStore((s) => s.tick);
  const sim = useStore((s) => s.sim);
  const toggle = useStore((s) => s.toggleThoughts);
  const [tab, setTab] = useState<'now' | 'log' | 'memory'>('now');
  const d = sim.daemon;
  const latestDecision = [...sim.thoughts].reverse().find((t) => t.kind === 'decision' || t.kind === 'reflection' || t.kind === 'sleep' || t.kind === 'wake' || t.kind === 'servant');
  return (
    <Panel title="🧠 Daemon Thoughts" onClose={toggle} className="thoughts-panel">
      <div className="sim-badge">⚙️ Simulated intelligence — a transparent, rule-based utility agent (weighted goals + memory + seeded chance). Not a real AI model.</div>
      <div className="daemon-status">
        <div><span className="muted">State</span> <b>{d.awake ? `awake (${d.mood})` : d.mood === 'dormant' ? 'dormant' : 'asleep 😴'}</b></div>
        <div><span className="muted">Energy</span> <b>{Math.round(d.energy)}⚡</b></div>
        <div><span className="muted">Whim</span> <b>{d.whim.emoji} {d.whim.label}</b></div>
        <div><span className="muted">Wishes for</span> <b>{RES_EMOJI[d.wish]} {d.wish}</b></div>
      </div>
      <div className="tabs">
        {(['now', 'log', 'memory'] as const).map((t) => <button key={t} className={`tab ${tab === t ? 'on' : ''}`} onClick={() => setTab(t)}>{t === 'now' ? 'Reasoning' : t === 'log' ? 'Thought log' : 'Memory'}</button>)}
      </div>
      {tab === 'now' && (latestDecision ? <ThoughtCard th={latestDecision} full /> : <div className="muted pad">The daemon is dormant. It is waiting for the first offering…</div>)}
      {tab === 'log' && <div className="log">{[...sim.thoughts].reverse().slice(0, 40).map((t) => <ThoughtCard key={t.id} th={t} />)}</div>}
      {tab === 'memory' && (
        <div className="memory">
          <h4>📓 Journal</h4>
          {d.memory.journal.length ? [...d.memory.journal].reverse().map((j, i) => <div key={i} className="mem-line">{j.text}</div>) : <div className="muted">No nights reflected yet.</div>}
          <h4>😿 Neglected cats</h4>
          {sim.cats.map((c) => <div key={c.id} className="mem-line">{c.name}: {d.memory.neglect[c.id] ?? 0} day(s)</div>)}
          <h4>🧾 Offerings remembered per citizen</h4>
          {sim.citizens.map((c) => {
            const tr = d.memory.trust[c.id];
            return <div key={c.id} className="mem-line">{c.name.split(' ')[0]}: {tr ? `${tr.count} offerings, worth ${tr.total} coins${tr.stingy >= 3 ? ' — stingy!' : ''}` : '—'}</div>;
          })}
          <h4>🏗 Actions taken</h4>
          <div className="mem-line">{Object.entries(d.memory.actionCounts).map(([k, v]) => `${TYPE_BY_ID[k]?.emoji ?? (k === 'rest' ? '🧘' : k === 'feed' ? '🐟' : '🌙')}×${v}`).join('  ')}</div>
          <h4>💤 Times fallen asleep</h4>
          <div className="mem-line">{d.memory.sleeps}</div>
        </div>
      )}
    </Panel>
  );
}

// ── selection info ───────────────────────────────────────────
export function InfoPanel() {
  useStore((s) => s.tick);
  const sim = useStore((s) => s.sim);
  const sel = useStore((s) => s.selected);
  const select = useStore((s) => s.select);
  if (!sel) return null;
  const close = () => select(null);

  if (sel.kind === 'citizen') {
    const c = sim.citizens[sel.id];
    const def = CITIZEN_DEFS[sel.id];
    const inv: Record<string, number> = {};
    c.inventory.forEach((i) => (inv[i] = (inv[i] ?? 0) + 1));
    return (
      <Panel title={`${c.isServant ? '🐾 ' : ''}${c.name}`} onClose={close} className="info-panel">
        <div className="tagline">{c.job} · <i>{c.personality.label}</i>{sel.id === LAZY_ID ? ' · the lazy one' : ''}</div>
        <div className="bio">{def.bio}</div>
        <div className="kv"><span>Now</span><b>{c.isServant && c.servantTask ? `serving the cats (${c.servantTask})` : ACT_LABEL[c.activity] ?? c.activity} {c.thought}</b></div>
        <div className="kv"><span>Home</span><b>{c.ownsHouse ? BUILDING_BY_ID[c.homeId].name : c.isServant ? 'broom closet of the cat castle' : 'a cardboard box behind the square'}</b></div>
        <div className="kv"><span>Money</span><b>💰 {Math.round(c.money)}</b></div>
        <div className="kv"><span>Wage</span><b>{c.wage} / day {c.daysWithoutWork ? `· skipped work ${c.daysWithoutWork}×` : ''}</b></div>
        <div className="kv"><span>Hunger</span><Bar v={c.hunger} color="#ff9f6b" /></div>
        <div className="kv"><span>Happiness</span><Bar v={c.happiness} color="#8fd18b" /></div>
        <h4>Possessions ({c.inventory.length})</h4>
        <div className="chips">{Object.entries(inv).map(([k, n]) => <span key={k} className="chip" title={ITEMS[k].name}>{ITEMS[k].emoji} {ITEMS[k].name}{n > 1 ? ` ×${n}` : ''}</span>)}{!c.inventory.length && <span className="muted">nothing at all</span>}</div>
        <h4>Offering history</h4>
        <div className="chips">{c.offeringHistory.slice(-14).map((o, i) => <span key={i} className="chip" title={`Day ${o.day}`}>{ITEMS[o.itemId].emoji} d{o.day}</span>)}{!c.offeringHistory.length && <span className="muted">none yet</span>}</div>
        <h4>Diary</h4>
        <div className="diary">{[...c.diary].reverse().slice(0, 8).map((l, i) => <div key={i}>{l}</div>)}</div>
        {c.isServant && <><h4>Servant log 😩</h4><div className="diary">{[...sim.servantLog].reverse().slice(0, 6).map((l, i) => <div key={i}>{l}</div>)}</div></>}
      </Panel>
    );
  }
  if (sel.kind === 'cat') {
    const c = sim.cats[sel.id];
    return (
      <Panel title={`${c.name}`} onClose={close} className="info-panel">
        <div className="tagline">{c.breed} · <i>{CAT_DEFS[sel.id].trait}</i></div>
        <div className="bio">{c.description}</div>
        <div className="kv"><span>Now</span><b>{c.activity} {c.thought}</b></div>
        <div className="kv"><span>Happiness</span><Bar v={c.happiness} color="#ffd166" /></div>
        <h4>Needs (satisfaction · importance)</h4>
        {NEED_KEYS.map((k) => (
          <div key={k} className="kv"><span>{NEED_ICON[k]} {k} <small className="muted">×{c.prefs[k].toFixed(1)}</small></span><Bar v={c.needs[k]} color={c.needs[k] < 35 ? '#ff6b8a' : '#8ec5ff'} /></div>
        ))}
        <div className="kv"><span>Loves</span><b>{c.favoriteTags.join(', ')}</b></div>
        <div className="kv"><span>Neglect memory</span><b>{sim.daemon.memory.neglect[c.id] ?? 0} day(s)</b></div>
        <div className="kv"><span>Inspected</span><b>{c.inspected.length} new structures</b></div>
      </Panel>
    );
  }
  if (sel.kind === 'daemon') {
    const d = sim.daemon;
    return (
      <Panel title="👁️ The Daemon" onClose={close} className="info-panel">
        <div className="bio">A floating cat-spirit, tiny urban god and whimsical architect. It lives on offerings — without them, it falls asleep.</div>
        <div className="kv"><span>State</span><b>{d.awake ? d.mood : 'asleep'}</b></div>
        <div className="kv"><span>Energy</span><Bar v={d.energy} color="#b69cff" /></div>
        <div className="kv"><span>Whim today</span><b>{d.whim.emoji} {d.whim.label}</b></div>
        <div className="kv"><span>Wishes for</span><b>{RES_EMOJI[d.wish]} {d.wish}</b></div>
        <div className="kv"><span>Offerings remembered</span><b>{d.memory.offerings.length}</b></div>
        <h4>Materials</h4>
        <div className="chips">{RES_KEYS.map((k) => <span key={k} className="chip">{RES_EMOJI[k]} {k} {d.resources[k]}</span>)}</div>
        <h4>Decrees</h4>
        {d.decrees.length ? d.decrees.map((x) => <div key={x.id} className="mem-line">📜 <b>{x.title}</b> — {x.text}</div>) : <div className="muted">None yet.</div>}
      </Panel>
    );
  }
  const b = BUILDING_BY_ID[sel.id];
  const owner = CITIZEN_DEFS.findIndex((c) => c.homeId === sel.id);
  const workers = CITIZEN_DEFS.filter((c) => c.workplaceId === sel.id).map((c) => c.name.split(' ')[0]);
  const attached = sim.placed.filter((p) => p.buildingId === sel.id || SITE_BY_ID[p.siteId].pair?.includes(sel.id));
  const state = sim.houseState[sel.id];
  return (
    <Panel title={state && state !== 'human' ? `${state === 'castle' ? '🏰 Cat Castle' : '🏨 Cat Hotel'} (formerly ${b.name})` : b.name} onClose={close} className="info-panel">
      <div className="kv"><span>Type</span><b>{b.kind === 'house' ? 'Home' : b.kind === 'grocery' || b.kind === 'homestore' ? 'Shop & workplace' : 'Workplace'}</b></div>
      {owner >= 0 && <div className="kv"><span>Owner</span><b>{state && state !== 'human' ? `formerly ${CITIZEN_DEFS[owner].name} — now the cats'` : CITIZEN_DEFS[owner].name}</b></div>}
      {workers.length > 0 && <div className="kv"><span>Workers</span><b>{workers.join(', ')}</b></div>}
      <h4>Cat transformations here</h4>
      {attached.length ? attached.map((p) => <div key={p.id} className="mem-line">{TYPE_BY_ID[p.typeId].emoji} <b>{TYPE_BY_ID[p.typeId].name}</b> · day {p.day} · used {p.uses}× <div className="muted small">Why: {p.reason}</div></div>) : <div className="muted">Still entirely human. For now.</div>}
    </Panel>
  );
}

// ── residents list ───────────────────────────────────────────
export function RosterPanel() {
  useStore((s) => s.tick);
  const sim = useStore((s) => s.sim);
  const select = useStore((s) => s.select);
  const setPanel = useStore((s) => s.setPanel);
  return (
    <Panel title="👥 Residents" onClose={() => setPanel(null)} className="roster-panel">
      <h4>Citizens</h4>
      {sim.citizens.map((c) => (
        <button key={c.id} className="roster-row" onClick={() => select({ kind: 'citizen', id: c.id })}>
          <span className="dot" style={{ background: c.colors.shirt }} />
          <span className="r-name">{c.name}{c.id === LAZY_ID ? ' 🛋️' : ''}{c.isServant ? ' 🐾' : ''}</span>
          <span className="r-meta">{c.personality.label} · 💰{Math.round(c.money)} · 📦{c.inventory.length}</span>
          <span className="r-th">{c.thought}</span>
        </button>
      ))}
      <h4>Cats</h4>
      {sim.cats.map((c) => (
        <button key={c.id} className="roster-row" onClick={() => select({ kind: 'cat', id: c.id })}>
          <span className="dot" style={{ background: c.colors.body, border: '1px solid #ccc' }} />
          <span className="r-name">{c.name}</span>
          <span className="r-meta">{CAT_DEFS[c.id].trait} · {Math.round(c.happiness)}% happy</span>
          <span className="r-th">{c.thought}</span>
        </button>
      ))}
      <button className="roster-row" onClick={() => select({ kind: 'daemon' })}><span className="dot" style={{ background: '#b69cff' }} /><span className="r-name">The Daemon</span><span className="r-meta">{Math.round(sim.daemon.energy)}⚡</span></button>
    </Panel>
  );
}

// ── history ──────────────────────────────────────────────────
export function HistoryPanel() {
  useStore((s) => s.tick);
  const sim = useStore((s) => s.sim);
  const setPanel = useStore((s) => s.setPanel);
  const focusOn = useStore((s) => s.focusOn);
  const [tab, setTab] = useState<'build' | 'story'>('build');
  const days = [...new Set(sim.placed.map((p) => p.day))].sort((a, b) => b - a);
  const hist = sim.history;
  const W = 300, H = 70;
  const pts = (f: (h: (typeof hist)[number]) => number) => hist.map((h, i) => `${(i / Math.max(1, hist.length - 1)) * W},${H - f(h) * H}`).join(' ');
  return (
    <Panel title="📜 City Transformation History" onClose={() => setPanel(null)} className="history-panel">
      {hist.length > 1 && (
        <svg className="chart" viewBox={`0 0 ${W} ${H + 4}`} preserveAspectRatio="none">
          <polyline points={pts((h) => h.progress)} fill="none" stroke="#5fc6cf" strokeWidth="2.5" />
          <polyline points={pts((h) => h.catHappiness / 100)} fill="none" stroke="#ff9f6b" strokeWidth="2.5" />
        </svg>
      )}
      {hist.length > 1 && <div className="legend"><span style={{ color: '#5fc6cf' }}>━ city transformed</span> <span style={{ color: '#ff9f6b' }}>━ cat happiness</span> (per night)</div>}
      <div className="tabs">
        <button className={`tab ${tab === 'build' ? 'on' : ''}`} onClick={() => setTab('build')}>Architecture ({sim.placed.length})</button>
        <button className={`tab ${tab === 'story' ? 'on' : ''}`} onClick={() => setTab('story')}>Story events</button>
      </div>
      {tab === 'build' && (days.length ? days.map((day) => (
        <div key={day}>
          <h4>Day {day}</h4>
          {sim.placed.filter((p) => p.day === day).map((p) => (
            <button key={p.id} className="hist-row" onClick={() => focusOn(p.pos, 13)}>
              <span>{TYPE_BY_ID[p.typeId].emoji}</span>
              <span><b>{TYPE_BY_ID[p.typeId].name}</b> <span className="muted">· {siteLabel(SITE_BY_ID[p.siteId])} · {fmtHour(p.hour)}</span><div className="muted small">{p.reason}</div></span>
            </button>
          ))}
        </div>
      )) : <div className="muted pad">No transformations yet. The city is still entirely human.</div>)}
      {tab === 'story' && [...sim.events].reverse().filter((e) => e.important || ['transform', 'pawn', 'servantTask', 'rain', 'catLoves'].includes(e.kind)).slice(0, 80).map((e) => (
        <button key={e.id} className="hist-row" onClick={() => e.pos && focusOn(e.pos, 14)}>
          <span>{e.emoji}</span>
          <span><b>{e.title}</b> <span className="muted">· Day {e.day} {fmtHour(e.hour)}</span><div className="muted small">{e.text}</div></span>
        </button>
      ))}
    </Panel>
  );
}

// ── offering dialog ──────────────────────────────────────────
export function OfferPanel() {
  const offer = useStore((s) => s.offer);
  const setPanel = useStore((s) => s.setPanel);
  const wish = useStore((s) => s.sim.daemon.wish);
  return (
    <Panel title="🎁 Offer an item to the daemon" onClose={() => setPanel(null)} className="offer-panel">
      <div className="muted">You are a visitor to the city. Your offering gives the daemon energy and materials. Today it wishes for <b>{RES_EMOJI[wish]} {wish}</b> (+40% energy).</div>
      <div className="offer-grid">
        {VISITOR_OFFERS.map((id) => {
          const it = ITEMS[id];
          const match = (it.yields[wish] ?? 0) > 0;
          return (
            <button key={id} className={`offer-item ${match ? 'match' : ''}`} onClick={() => offer(id)} title={it.note ?? ''}>
              <span className="oi-emoji">{it.emoji}</span>
              <span className="oi-name">{it.name}</span>
              <span className="oi-meta">+{Math.round(it.energy * (match ? 1.4 : 1))}⚡ {Object.entries(it.yields).map(([k, v]) => `${RES_EMOJI[k as keyof typeof RES_EMOJI]}${v}`).join(' ')}</span>
              {it.edible && <span className="oi-note">human food · not for cats</span>}
            </button>
          );
        })}
      </div>
    </Panel>
  );
}

// ── demo scenarios ───────────────────────────────────────────
export function DemoPanel() {
  const demo = useStore((s) => s.demo);
  const setPanel = useStore((s) => s.setPanel);
  const reset = useStore((s) => s.reset);
  const seed = useStore((s) => s.seed);
  const [seedInput, setSeedInput] = useState(String(seed));
  return (
    <Panel title="🎬 Demo scenarios" onClose={() => setPanel(null)} className="demo-panel">
      <div className="muted">Jump to key moments. The simulation is deterministic: the same seed always produces the same story.</div>
      <button className="demo-btn" onClick={() => demo('lazy')}><b>🛋️→🐾 The lazy citizen’s downfall</b><span>Fast-forward until Fritz has offered everything — even his house — and becomes the cats’ servant.</span></button>
      <button className="demo-btn" onClick={() => demo('starve')}><b>😴 Starve the daemon</b><span>Citizens forget today’s offerings. Watch the daemon fall asleep; use “Offer an item” to wake it.</span></button>
      <button className="demo-btn" onClick={() => demo('days3')}><b>⏩ Skip 3 days</b><span>See how far the transformation has progressed.</span></button>
      <button className="demo-btn" onClick={() => demo('utopia')}><b>👑 Jump to CATOPIA</b><span>Fast-forward until the feline utopia is complete.</span></button>
      <div className="seed-row">
        <label>Seed <input value={seedInput} onChange={(e) => setSeedInput(e.target.value)} /></label>
        <button className="btn" onClick={() => reset(Number(seedInput) || 1)}>Restart with seed</button>
      </div>
    </Panel>
  );
}

export function AboutPanel() {
  const setPanel = useStore((s) => s.setPanel);
  return (
    <Panel title="CATOPIA — The City That Belongs to Cats" onClose={() => setPanel(null)} className="about-panel">
      <p><b>Pandaemonium – Nonsense Daemon</b> · Bauhaus-Universität Weimar</p>
      <p><b>Theme 4:</b> The city is adapting to non-human users.<br /><b>Constraint 9:</b> Your daemon lives on offerings. Without them it falls asleep.</p>
      <p>Ten citizens work, shop and bring one offering a day to a dormant shrine. The daemon awakens, perceives what the six cats need, remembers who was neglected, and spends its energy rebuilding the city — bench by bench, roof by roof — into a feline utopia. If the offerings stop, it falls asleep and so does the transformation.</p>
      <p className="sim-badge">All “intelligence” here is a local simulation: a weighted-utility decision system with memory and seeded randomness. No real AI, sensors or network services are used.</p>
      <p className="muted">Controls: drag to orbit · scroll to zoom · right-drag to pan · click anyone to inspect · Space play/pause · 1/2/5 speed · N next day · T thoughts.</p>
    </Panel>
  );
}
