// ─────────────────────────────────────────────────────────────
// Cats: autonomous need-driven agents. Each cat feels six needs decaying at
// personal rates, picks the most urgent one (weighted by personality), then
// looks for the best place in the CURRENT city to satisfy it. As the daemon
// builds cat architecture, better places appear — and the cats notice.
// ─────────────────────────────────────────────────────────────

import { TYPE_BY_ID } from '../data/transformTypes';
import { addEvent, fx } from './log';
import { advance, route } from './paths';
import { rand, randRange } from './rng';
import type { Cat, CatActivity, NeedKey, SimState, Spot } from './types';
import { NEED_KEYS } from './types';
import { allSpots, catHappiness, spotById } from './world';

const ACTIVITY_FOR: Record<NeedKey, CatActivity> = {
  hunger: 'eating', comfort: 'lounging', play: 'playing', rest: 'sleeping', safety: 'hiding', curiosity: 'exploring',
};
const NEED_EMOJI: Record<NeedKey, string> = { hunger: '🐟', comfort: '🛋️', play: '🧶', rest: '💤', safety: '📦', curiosity: '🔍' };
export { NEED_EMOJI };

function isNight(h: number) { return h >= 21.5 || h < 6; }
const FOOD_SPOTS = new Set(['base:bowl']);

export function updateCat(s: SimState, cat: Cat, dtH: number) {
  const h = s.hour;
  // Needs decay (slower for the need being actively satisfied).
  for (const k of NEED_KEYS) {
    let rate = cat.decay[k] * 0.8;
    if (k === 'rest' && isNight(h)) rate *= 0.6;
    if (s.weather === 'rainy' && (k === 'safety' || k === 'comfort')) rate *= 1.3;
    if (cat.focusNeed === k && cat.activity !== 'walking') rate = 0;
    cat.needs[k] = Math.max(0, cat.needs[k] - rate * dtH);
  }
  cat.happiness = catHappiness(cat);

  if (cat.activity === 'carried') {
    if (s.time >= cat.activityUntil + 0.5) { cat.activity = 'idle'; cat.pos.y = 0; }
    return;
  }

  if (cat.activity === 'demanding') {
    // Marches to the shrine and yowls at the daemon.
    if (!cat.path.length && Math.hypot(cat.pos.x, cat.pos.z) > 3) { cat.path = route(cat.pos, { x: -1.6, y: 0, z: 2.2 }); cat.segFrom = null; }
    advance(cat, dtH);
    if (s.time >= cat.activityUntil && !cat.path.length) { cat.activity = 'idle'; cat.thought = '😾'; }
    return;
  }

  if (cat.activity === 'walking') {
    if (advance(cat, dtH)) arrive(s, cat);
    return;
  }

  // Performing an activity at a spot.
  if (cat.activity !== 'idle' && s.time < cat.activityUntil) {
    const spot = cat.targetSpotId ? findSpot(s, cat.targetSpotId) : null;
    if (spot) {
      for (const k of NEED_KEYS) {
        const strength = spot.needs[k] ?? 0;
        if (!strength) continue;
        const main = k === cat.focusNeed ? 40 : 10;
        cat.needs[k] = Math.min(100, cat.needs[k] + strength * main * dtH);
      }
    } else if (cat.focusNeed) {
      cat.needs[cat.focusNeed] = Math.min(100, cat.needs[cat.focusNeed] + 6 * dtH);
    }
    return;
  }

  chooseNext(s, cat);
}

const findSpot = spotById;

function arrive(s: SimState, cat: Cat) {
  const spot = cat.targetSpotId ? findSpot(s, cat.targetSpotId) : null;
  const need = cat.focusNeed;
  if (!spot || !need) { cat.activity = 'idle'; return; }
  if (FOOD_SPOTS.has(spot.id)) {
    if (s.daemon.foodStock > 0) { s.daemon.foodStock--; }
    else if (need === 'hunger') { cat.thought = '😿'; cat.activity = 'idle'; cat.activityUntil = s.time + 0.3; return; }
  }
  const inspecting = spot.placedId && !cat.inspected.includes(spot.placedId);
  cat.activity = inspecting && need === 'curiosity' ? 'inspecting' : ACTIVITY_FOR[need];
  cat.activityUntil = s.time + randRange(s, 1.0, 2.4) * (cat.activity === 'sleeping' && isNight(s.hour) ? 2 : 1);
  cat.thought = cat.activity === 'inspecting' ? '❓' : NEED_EMOJI[need];
  if (spot.placedId) {
    const p = s.placed.find((x) => x.id === spot.placedId);
    if (p) {
      p.uses++;
      if (!cat.inspected.includes(p.id)) {
        cat.inspected.push(p.id);
        if (cat.favoriteTags.some((t) => TYPE_BY_ID[p.typeId].tags.includes(t))) {
          fx(s, { kind: 'heart', to: { x: cat.pos.x, y: cat.pos.y + 0.8, z: cat.pos.z } });
          cat.thought = '😻';
          if (!s.flags['love_' + cat.id]) {
            s.flags['love_' + cat.id] = true;
            addEvent(s, 'catLoves', '😻', `${cat.name} loves the new ${TYPE_BY_ID[p.typeId].name}`, `${cat.name} inspects it, sniffs it twice, and claims it forever.`, false, { ...cat.pos });
          }
        }
      }
    }
  }
}

function chooseNext(s: SimState, cat: Cat) {
  const night = isNight(s.hour);
  const urg = NEED_KEYS.map((k) => {
    let u = (100 - cat.needs[k]) * cat.prefs[k];
    if (night) u *= k === 'rest' ? 2.2 : k === 'comfort' ? 1.3 : 0.5;
    if (s.weather === 'rainy' && (k === 'safety' || k === 'rest')) u *= 1.3;
    return u + rand(s) * 18;
  });
  let need = NEED_KEYS[urg.indexOf(Math.max(...urg))];

  const spots = allSpots(s);
  // Curiosity pull: brand-new architecture attracts cats.
  const fresh = s.placed.filter((p) => s.time - p.bornAt < 20 && !cat.inspected.includes(p.id));
  if (fresh.length && rand(s) < 0.22 + cat.prefs.curiosity * 0.12) need = 'curiosity';

  let best: Spot | null = null, bestScore = 0.12;
  const crowd: Record<string, number> = {};
  for (const other of s.cats) if (other !== cat && other.targetSpotId) crowd[other.targetSpotId] = (crowd[other.targetSpotId] ?? 0) + 1;
  for (const sp of spots) {
    let v = sp.needs[need] ?? 0;
    if (!v && !(need === 'curiosity' && fresh.some((f) => f.id === sp.placedId))) continue;
    if (need === 'curiosity' && fresh.some((f) => f.id === sp.placedId)) v += 0.6;
    if (FOOD_SPOTS.has(sp.id) && s.daemon.foodStock <= 0) v *= 0.15;
    if (sp.placedId) {
      const p = s.placed.find((x) => x.id === sp.placedId);
      if (p && cat.favoriteTags.some((t) => TYPE_BY_ID[p.typeId].tags.includes(t))) v *= 1.35;
    }
    const d = Math.hypot(sp.pos.x - cat.pos.x, sp.pos.z - cat.pos.z);
    const score = v - d * 0.012 - (crowd[sp.id] ?? 0) * 0.25 + rand(s) * 0.12;
    if (score > bestScore) { bestScore = score; best = sp; }
  }

  cat.focusNeed = need;
  if (!best) {
    // Nothing in the city satisfies this need: wander aimlessly and complain.
    const tx = Math.max(-18, Math.min(18, cat.pos.x + randRange(s, -6, 6)));
    const tz = Math.max(-18, Math.min(18, cat.pos.z + randRange(s, -6, 6)));
    cat.path = route(cat.pos, { x: tx, y: 0, z: tz });
    cat.segFrom = null;
    cat.targetSpotId = null;
    cat.activity = 'walking';
    cat.thought = need === 'hunger' ? '😿' : '😾';
    return;
  }
  cat.targetSpotId = best.id;
  // Already standing on it?
  if (Math.hypot(best.pos.x - cat.pos.x, best.pos.z - cat.pos.z) < 0.3 && Math.abs(best.pos.y - cat.pos.y) < 0.3) { arrive(s, cat); return; }
  const startY = cat.pos.y;
  cat.path = route(cat.pos, best.pos, 0, best.approach);
  if (startY > 0.3) cat.path.unshift({ x: cat.pos.x + Math.sin(cat.heading) * 0.8, y: 0, z: cat.pos.z + Math.cos(cat.heading) * 0.8 });
  cat.segFrom = null;
  cat.activity = 'walking';
  cat.thought = NEED_EMOJI[need];
}
