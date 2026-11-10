// ─────────────────────────────────────────────────────────────
// UI store (Zustand). The simulation state itself is a plain mutable object
// (fast to update every frame); React components either read it directly
// inside useFrame, or re-render on the throttled `tick` counter.
// ─────────────────────────────────────────────────────────────

import { create } from 'zustand';
import { LAZY_ID } from '../data/characters';
import { visitorOffer } from './citizens';
import { fastForward, step as stepFn, STEP } from './engine';
import { addEvent } from './log';
import type { SimEvent, SimState, Vec3 } from './types';
import { createInitialState } from './world';

export const DEFAULT_SEED = 20261109;
/** At 1× speed one daytime sim-hour lasts 3 real seconds; nights pass 4× faster. */
export const SEC_PER_HOUR = 3;

export type Selection =
  | { kind: 'citizen'; id: number }
  | { kind: 'cat'; id: number }
  | { kind: 'daemon' }
  | { kind: 'building'; id: string }
  | null;

type Panel = 'thoughts' | 'history' | 'offer' | 'demo' | 'roster' | 'about' | null;

interface Store {
  sim: SimState;
  seed: number;
  speed: number;
  playing: boolean;
  tick: number;
  selected: Selection;
  panel: Panel;
  thoughtsOpen: boolean;
  autoCamera: boolean;
  showreel: boolean;
  focus: { pos: Vec3; dist: number; id: number } | null;
  toasts: SimEvent[];
  lastSeenEvent: number;
  setSpeed: (n: number) => void;
  togglePlay: () => void;
  select: (s: Selection) => void;
  setPanel: (p: Panel) => void;
  toggleThoughts: () => void;
  toggleAutoCamera: () => void;
  toggleShowreel: () => void;
  focusOn: (pos: Vec3, dist?: number) => void;
  dismissToast: (id: number) => void;
  advance: (realDt: number) => void;
  refresh: () => void;
  nextDay: () => void;
  offer: (itemId: string) => void;
  reset: (seed?: number) => void;
  demo: (kind: 'lazy' | 'starve' | 'days3' | 'utopia') => void;
}

function seedFromUrl(): number {
  try {
    const v = new URLSearchParams(window.location.search).get('seed');
    if (v && !Number.isNaN(Number(v))) return Number(v);
  } catch { /* ignore */ }
  return DEFAULT_SEED;
}

let acc = 0;
let refreshAcc = 0;
const initialSeed = typeof window !== 'undefined' ? seedFromUrl() : DEFAULT_SEED;

export const useStore = create<Store>((set, get) => ({
  sim: createInitialState(initialSeed),
  seed: initialSeed,
  speed: 1,
  playing: true,
  tick: 0,
  selected: null,
  panel: null,
  thoughtsOpen: true,
  autoCamera: true,
  showreel: false,
  focus: null,
  toasts: [],
  lastSeenEvent: 0,

  setSpeed: (speed) => set({ speed }),
  togglePlay: () => set((s) => ({ playing: !s.playing })),
  select: (selected) => {
    set({ selected });
    const sim = get().sim;
    if (selected?.kind === 'citizen') get().focusOn(sim.citizens[selected.id].pos, 14);
    if (selected?.kind === 'cat') get().focusOn(sim.cats[selected.id].pos, 12);
    if (selected?.kind === 'daemon') get().focusOn(sim.daemon.pos, 18);
  },
  setPanel: (panel) => set((s) => ({ panel: s.panel === panel ? null : panel })),
  toggleThoughts: () => set((s) => ({ thoughtsOpen: !s.thoughtsOpen })),
  toggleAutoCamera: () => set((s) => ({ autoCamera: !s.autoCamera })),
  toggleShowreel: () => set((s) => ({ showreel: !s.showreel, speed: !s.showreel ? 2 : s.speed, panel: null })),
  focusOn: (pos, dist = 16) => set((s) => ({ focus: { pos: { ...pos }, dist, id: (s.focus?.id ?? 0) + 1 } })),
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  /** Called every frame by the 3D scene. */
  advance: (realDt) => {
    const st = get();
    if (!st.playing) return;
    const sim = st.sim;
    const night = sim.hour >= 22 || sim.hour < 6;
    acc += (Math.min(realDt, 0.1) * st.speed * (night ? 4 : 1)) / SEC_PER_HOUR;
    let n = 0;
    while (acc >= STEP && n < 400) {
      acc -= STEP;
      n++;
      stepFn(sim, STEP);
    }
    refreshAcc += realDt;
    if (refreshAcc > 0.25) { refreshAcc = 0; get().refresh(); }
  },

  /** Throttled UI refresh: bump tick, surface new story events as toasts. */
  refresh: () => {
    const st = get();
    const sim = st.sim;
    const fresh = sim.events.filter((e) => e.id > st.lastSeenEvent && e.important);
    const lastId = sim.events.length ? sim.events[sim.events.length - 1].id : st.lastSeenEvent;
    const patch: Partial<Store> = { tick: st.tick + 1, lastSeenEvent: lastId };
    if (fresh.length) {
      patch.toasts = [...st.toasts, ...fresh].slice(-4);
      const withPos = [...fresh].reverse().find((e) => e.pos && e.kind !== 'intro');
      if (withPos && st.autoCamera && withPos.pos) {
        set(patch);
        get().focusOn(withPos.pos, withPos.kind === 'wake' || withPos.kind === 'sleep' || withPos.kind === 'wakeAgain' ? 20 : 15);
        return;
      }
    }
    set(patch);
  },

  nextDay: () => {
    const sim = get().sim;
    const target = (sim.day) * 24 + 6.2; // tomorrow 06:12
    fastForward(sim, target - sim.time);
    acc = 0;
    set({ lastSeenEvent: sim.events.length ? sim.events[sim.events.length - 1].id : 0 });
    get().refresh();
  },

  offer: (itemId) => {
    visitorOffer(get().sim, itemId);
    set({ panel: null });
    get().refresh();
  },

  reset: (seed) => {
    const sd = seed ?? get().seed;
    acc = 0;
    set({ sim: createInitialState(sd), seed: sd, selected: null, toasts: [], lastSeenEvent: 0, tick: 0, panel: null, focus: null });
    get().refresh();
  },

  demo: (kind) => {
    const sim = get().sim;
    if (kind === 'lazy') {
      // Fast-forward until the lazy citizen becomes the cats' servant, then show him at work.
      fastForward(sim, 24 * 14, (s) => s.citizens[LAZY_ID].isServant);
      const toMorning = (sim.day) * 24 + 9.3 - sim.time;
      fastForward(sim, toMorning);
      set({ selected: { kind: 'citizen', id: LAZY_ID } });
      get().focusOn(sim.citizens[LAZY_ID].pos, 11);
    } else if (kind === 'starve') {
      sim.skipOfferingsDay = sim.day;
      for (const c of sim.citizens) { c.plan.forgot = true; c.plan.offered = true; }
      sim.daemon.energy = Math.min(sim.daemon.energy, 5);
      addEvent(sim, 'demo', '🍂', 'The citizens forget their offerings', 'A strange forgetfulness spreads through the city. Nobody brings anything to the shrine today…', true, { x: 0, y: 3, z: 0 });
    } else if (kind === 'days3') {
      fastForward(sim, 72);
    } else if (kind === 'utopia') {
      fastForward(sim, 24 * 20, (s) => !!s.flags.utopia);
    }
    acc = 0;
    set({ panel: null, lastSeenEvent: kind === 'starve' ? get().lastSeenEvent : (sim.events.length ? sim.events[sim.events.length - 1].id : 0) });
    get().refresh();
  },
}));

