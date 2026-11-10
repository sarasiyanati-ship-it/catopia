// ─────────────────────────────────────────────────────────────
// The simulation clock. Advances the world in fixed sub-steps so results are
// identical regardless of frame rate (deterministic given the seed).
// ─────────────────────────────────────────────────────────────

import { LAZY_ID } from '../data/characters';
import { DAEMON_HOME } from '../data/city';
import { decide, fallAsleep, maybeDemand, receiveOffering, reflect, updatePending } from '../daemon/brain';
import { updateCat } from './cats';
import { planDay, updateCitizen } from './citizens';
import { addEvent, fx } from './log';
import { rand } from './rng';
import type { SimState } from './types';

export const STEP = 0.025; // sim-hours per fixed step

/** Decay of the daemon's energy per hour (it costs energy just to exist). */
function metabolism(h: number) { return h >= 22 || h < 6 ? 2.2 : 1.5; }

function crossed(prev: number, now: number, mark: number) {
  return prev < mark && now >= mark;
}

function onNewDay(s: SimState) {
  // Weather: mostly sunny, sometimes rain (which keeps citizens home).
  const r = rand(s);
  s.weather = s.day >= 3 && r < 0.16 ? 'rainy' : r < 0.35 ? 'cloudy' : 'sunny';
  if (s.weather === 'rainy') addEvent(s, 'rain', '🌧️', `Day ${s.day}: rain`, 'Rainy days keep many citizens at home — fewer offerings will reach the shrine.', false);
  for (const c of s.citizens) planDay(s, c);
  // Fish Fridays decree: a free fish for everyone every 5th day.
  if (s.daemon.decrees.some((d) => d.id === 'fishFriday') && s.day % 5 === 0) for (const c of s.citizens) if (!c.isServant) c.inventory.push('fish');
}

export function step(s: SimState, dt: number) {
  if (!s.flags.started) { s.flags.started = true; for (const c of s.citizens) planDay(s, c); }
  const prevHour = s.hour;
  const prevDay = s.day;
  s.time += dt;
  s.day = Math.floor(s.time / 24) + 1;
  s.hour = s.time - (s.day - 1) * 24;
  if (s.day !== prevDay) onNewDay(s);
  const ph = s.day !== prevDay ? -1 : prevHour;

  // Scheduled beats
  if (crossed(ph, s.hour, 8.5)) maybeDemand(s);
  if (crossed(ph, s.hour, 23)) {
    // Dream whispers last for one following day.
    if (s.daemon.dreamBoost > 0) {
      if (s.flags.dreamAged) { s.daemon.dreamBoost = 0; s.flags.dreamAged = false; } else s.flags.dreamAged = true;
    }
    reflect(s);
  }
  if (crossed(ph, s.hour, 19)) {
    // Servants offer their labour daily instead of an item.
    for (const c of s.citizens) if (c.isServant) {
      receiveOffering(s, c.id, 'labor', 12);
      c.plan.offered = true;
    }
  }

  for (const c of s.citizens) updateCitizen(s, c, dt);
  for (const cat of s.cats) updateCat(s, cat, dt);
  updateDaemon(s, dt);
}

function updateDaemon(s: SimState, dt: number) {
  const d = s.daemon;
  // Fly smoothly towards the target.
  const k = Math.min(1, dt * 5);
  d.pos.x += (d.target.x - d.pos.x) * k;
  d.pos.y += (d.target.y - d.pos.y) * k;
  d.pos.z += (d.target.z - d.pos.z) * k;

  if (!d.awake) {
    if (d.mood !== 'dormant') d.mood = 'asleep';
    if (Math.floor(s.time * 2) !== Math.floor((s.time - dt) * 2)) fx(s, { kind: 'zzz', to: { ...d.pos } });
    return;
  }
  d.energy -= metabolism(s.hour) * dt;
  if (d.energy <= 0) { fallAsleep(s); return; }
  if (d.energy < 15 && d.mood === 'calm') d.mood = 'sleepy';

  if (d.pending) { updatePending(s); return; }
  if (d.mood === 'delighted' && s.time > d.nextDecision - 0.6) d.mood = 'calm';
  // The daemon is active from early morning until late evening; at night it dreams.
  if (s.hour >= 6.5 && s.hour < 22.5 && s.time >= d.nextDecision) {
    d.mood = 'thinking';
    decide(s);
  }
  if (s.hour >= 22.5 || s.hour < 6.5) {
    d.target = { ...DAEMON_HOME };
    if (d.mood !== 'delighted') d.mood = 'calm';
  }
}

/** Run many steps instantly (used by Next Day / demo jumps / tests). */
export function fastForward(s: SimState, hours: number, until?: (s: SimState) => boolean) {
  const n = Math.ceil(hours / STEP);
  for (let i = 0; i < n; i++) {
    step(s, STEP);
    if (until && until(s)) break;
  }
  s.fx.length = 0;
}

export function hoursUntilNextMorning(s: SimState) {
  return 24 - s.hour + 6;
}

export const isLazyServant = (s: SimState) => s.citizens[LAZY_ID].isServant;
