// Initial state, transformation spots, and applying architecture changes.

import { CAT_DEFS, CITIZEN_DEFS } from '../data/characters';
import { BUILDING_BY_ID, DAEMON_HOME, SITES, SITE_BY_ID, TREES, BENCHES, FOUNTAIN_POS, localToWorld } from '../data/city';
import { TYPE_BY_ID, WHIMS } from '../data/transformTypes';
import { addEvent, fx } from './log';
import type { Cat, Citizen, NeedKey, Placed, ResKey, SimState, Site, Spot, Vec2, Vec3 } from './types';
import { RES_KEYS } from './types';

export const UTOPIA_TARGET = 380; // catness points that count as 100 % feline utopia
export const HOMELESS_SPOT: Vec2 = { x: -5.3, z: 5.0 };

const zeroRes = () => Object.fromEntries(RES_KEYS.map((k) => [k, 0])) as Record<ResKey, number>;

export function createInitialState(seed: number): SimState {
  const citizens: Citizen[] = CITIZEN_DEFS.map((d, i) => {
    const home = BUILDING_BY_ID[d.homeId];
    return {
      id: i, name: d.name, job: d.job, workplaceId: d.workplaceId, homeId: d.homeId,
      personality: d.personality, wage: d.wage, money: d.money, hunger: 20, happiness: 60 + d.personality.cheer * 20,
      inventory: [...d.inventory], offeringHistory: [],
      pos: { x: home.door.x, y: 0, z: home.door.z }, path: [], segFrom: null, heading: home.rot, speed: 13, moving: false,
      activity: 'sleeping', activityUntil: 0, indoors: true, ownsHouse: true, isServant: false, servantTask: null, servantCatId: null,
      plan: { wake: 6, workStart: 8, workEnd: 16, offerHour: 19, goesToWork: true, shop: 'grocery', worked: false, offered: false,
              shopped: false, ate: false, servantNextTask: 0, offerEarly: false, extraStop: false, forgot: false },
      thought: '💤', diary: [], colors: d.colors, daysWithoutWork: 0,
    };
  });
  const cats: Cat[] = CAT_DEFS.map((d, i) => ({
    id: i, name: d.name, breed: d.breed, description: d.description,
    needs: { hunger: 65, comfort: 55, play: 50, rest: 70, safety: 55, curiosity: 50 },
    decay: { ...d.decay }, prefs: { ...d.prefs },
    pos: { x: d.start.x, y: 0, z: d.start.z }, path: [], segFrom: null, heading: i, speed: 10, moving: false,
    activity: 'idle', activityUntil: 0, targetSpotId: null, focusNeed: null, thought: '', happiness: 55, size: d.size,
    colors: d.colors, favoriteTags: d.favoriteTags, inspected: [],
  }));
  const s: SimState = {
    seed, rngState: seed >>> 0, time: 5.5, day: 1, hour: 5.5,
    citizens, cats,
    daemon: {
      energy: 0, awake: false, pos: { x: 0, y: 2.9, z: 0 }, target: { x: 0, y: 2.9, z: 0 }, mood: 'dormant',
      resources: zeroRes(), houseQueue: [], foodStock: 4,
      whim: WHIMS[0], wish: 'soft', dreamBoost: 0, nextDecision: 0, pending: null,
      memory: { offerings: [], energyByDay: [], actionCounts: {}, recentTypes: [], neglect: {}, trust: {}, journal: [], sleeps: 0 },
      decrees: [],
    },
    placed: [], usedSites: {}, houseState: Object.fromEntries(CITIZEN_DEFS.map((d) => [d.homeId, 'human' as const])),
    events: [], thoughts: [], fx: [], flags: {}, demand: null,
    counters: { event: 0, thought: 0, fx: 0, placed: 0 },
    skipOfferingsDay: -1, servantLog: [], version: 0, weather: 'sunny', history: [],
  };
  addEvent(s, 'intro', '🏙️', 'A perfectly ordinary human city',
    'Ten citizens. Six cats. One dormant daemon sleeping in the shrine. Nobody suspects a thing.', true, { x: 0, y: 0, z: 0 });
  return s;
}

// ── progress & cats ──────────────────────────────────────────
export function cityProgress(s: SimState): number {
  const pts = s.placed.reduce((a, p) => a + TYPE_BY_ID[p.typeId].catness, 0);
  return Math.min(1, pts / UTOPIA_TARGET);
}

export function catHappiness(c: Cat): number {
  let sum = 0, w = 0;
  for (const k of Object.keys(c.needs) as NeedKey[]) { sum += c.needs[k] * c.prefs[k]; w += c.prefs[k]; }
  return sum / w;
}

export function avgCatHappiness(s: SimState): number {
  return s.cats.reduce((a, c) => a + c.happiness, 0) / s.cats.length;
}

// ── sites ────────────────────────────────────────────────────
/** Is a site free and structurally possible right now? */
export function siteAvailable(s: SimState, site: Site): boolean {
  if (s.usedSites[site.id]) return false;
  if (site.buildingId && site.kind !== 'house' && s.houseState[site.buildingId] && s.houseState[site.buildingId] !== 'human') return false;
  if (site.pair && site.pair.some((b) => s.houseState[b] && s.houseState[b] !== 'human')) return false;
  return true;
}

export function siteLabel(site: Site): string {
  const bname = site.buildingId ? BUILDING_BY_ID[site.buildingId].name : '';
  switch (site.kind) {
    case 'bench': return 'a human bench';
    case 'lamp': return 'a street lamp';
    case 'roof': return `the roof of ${bname}`;
    case 'facade': return `the facade of ${bname}`;
    case 'tunnel': return `a wall of ${bname}`;
    case 'door': return `the front of ${bname}`;
    case 'bridge': return `between ${BUILDING_BY_ID[site.pair![0]].name} and ${BUILDING_BY_ID[site.pair![1]].name}`;
    case 'walkway': return 'above a street';
    case 'yard': return 'a quiet yard';
    case 'plaza': return 'the central square';
    case 'fountain': return 'the square’s corner';
    case 'house': return bname;
  }
}

// ── spots: where cats can satisfy needs ──────────────────────
function spotsFor(p: Placed, site: Site): Spot[] {
  const t = TYPE_BY_ID[p.typeId];
  const mk = (suffix: string, pos: Vec3, approach?: Vec2[], needs = t.needs): Spot =>
    ({ id: `${p.id}:${suffix}`, placedId: p.id, pos, approach, needs, label: t.name });
  const P = site.pos;
  switch (t.id) {
    case 'catBed': return [mk('a', { x: P.x, y: 0.55, z: P.z })];
    case 'rooftopPlayground': return [mk('a', { x: P.x + 0.4, y: P.y + 0.35, z: P.z - 0.3 }, site.approach), mk('b', { x: P.x - 0.6, y: P.y + 0.35, z: P.z + 0.4 }, site.approach)];
    case 'climbingWall': {
      const bd = BUILDING_BY_ID[site.buildingId!];
      const out = localToWorld(bd, bd.w / 2 + 0.55, 0.4);
      return [mk('a', { x: out.x, y: bd.h * 0.62, z: out.z }, [bd.door])];
    }
    case 'skyBridge': case 'walkway': {
      const mid = { x: P.x, z: P.z };
      return [mk('a', { x: P.x, y: P.y + 0.3, z: P.z }, site.kind === 'walkway' ? [mid] : site.approach)];
    }
    case 'catTunnel': return [mk('a', { x: P.x, y: 0.1, z: P.z }, site.buildingId ? [BUILDING_BY_ID[site.buildingId].door] : undefined)];
    case 'sleepingGarden':
      return [0, 1, 2, 3].map((i) => {
        const a = Math.PI / 4 + (i * Math.PI) / 2 + 0.6;
        return mk(String(i), { x: Math.cos(a) * 4.4, y: 0.35, z: Math.sin(a) * 4.4 });
      });
    case 'catCastle': case 'catHotel': {
      const bd = BUILDING_BY_ID[site.buildingId!];
      const top = localToWorld(bd, 0.6, -0.3);
      return [mk('ground', { x: bd.door.x, y: 0.1, z: bd.door.z }), mk('top', { x: top.x, y: t.id === 'catCastle' ? 4.6 : 3.9, z: top.z }, [bd.door])];
    }
    default: return [mk('a', { x: P.x, y: 0.1, z: P.z }, site.approach)];
  }
}

/** Spots that exist without any daemon intervention (the human city). */
export function baseSpots(s: SimState): Spot[] {
  const out: Spot[] = [];
  out.push({ id: 'base:bowl', placedId: '', pos: { x: 1.2, y: 0, z: 2.2 }, needs: { hunger: 0.9 }, label: 'Shrine food bowl' });
  const fm = BUILDING_BY_ID.fishmarket.door;
  out.push({ id: 'base:scraps', placedId: '', pos: { x: fm.x + 0.6, y: 0, z: fm.z + 0.9 }, needs: { hunger: 0.4 }, label: 'Fish market leftovers' });
  for (const b of BENCHES) if (!s.usedSites[b.id]) out.push({ id: `base:${b.id}`, placedId: '', pos: { x: b.x, y: 0.45, z: b.z }, needs: { rest: 0.35, comfort: 0.25 }, label: 'Hard human bench' });
  TREES.slice(0, 8).forEach((t, i) => out.push({ id: `base:tree${i}`, placedId: '', pos: { x: t.x + 0.7, y: 0, z: t.z + 0.4 }, needs: { safety: 0.3, rest: 0.2 }, label: 'Under a tree' }));
  out.push({ id: 'base:square', placedId: '', pos: { x: -1.5, y: 0, z: -4.4 }, needs: { play: 0.25, curiosity: 0.2 }, label: 'Open square' });
  out.push({ id: 'base:street', placedId: '', pos: { x: 7, y: 0, z: 14 }, needs: { curiosity: 0.25, play: 0.15 }, label: 'Busy street' });
  return out;
}

// Cached per geometry version — cats query spots every tick.
const spotCache = new WeakMap<SimState, { v: number; list: Spot[]; byId: Map<string, Spot> }>();
export function allSpots(s: SimState): Spot[] {
  return spotIndex(s).list;
}
export function spotById(s: SimState, id: string): Spot | null {
  return spotIndex(s).byId.get(id) ?? null;
}
function spotIndex(s: SimState) {
  let c = spotCache.get(s);
  if (!c || c.v !== s.version) {
    const list = [...baseSpots(s), ...s.placed.flatMap((p) => p.spots)];
    c = { v: s.version, list, byId: new Map(list.map((x) => [x.id, x])) };
    spotCache.set(s, c);
  }
  return c;
}

// ── applying a transformation ────────────────────────────────
export function applyTransformation(s: SimState, typeId: string, siteId: string, reason: string): Placed {
  const site = SITE_BY_ID[siteId];
  const t = TYPE_BY_ID[typeId];
  const p: Placed = {
    id: `p${++s.counters.placed}`, typeId, siteId, day: s.day, hour: s.hour, bornAt: s.time,
    pos: { ...site.pos }, rot: site.rot, a: site.a, b: site.b, buildingId: site.buildingId, reason, spots: [], uses: 0,
  };
  p.spots = spotsFor(p, site);

  if (t.site === 'house' && site.buildingId) {
    // The house is absorbed: anything previously attached to it melts into the new cat building.
    const bid = site.buildingId;
    s.houseState[bid] = typeId === 'catCastle' ? 'castle' : 'hotel';
    const doomed = s.placed.filter((q) => {
      const qs = SITE_BY_ID[q.siteId];
      return qs.buildingId === bid || (qs.pair && qs.pair.includes(bid));
    });
    for (const q of doomed) delete s.usedSites[q.siteId];
    s.placed = s.placed.filter((q) => !doomed.includes(q));
    s.daemon.houseQueue = s.daemon.houseQueue.filter((h) => h.houseId !== bid);
  }
  s.placed.push(p);
  s.usedSites[siteId] = p.id;
  s.version++;
  fx(s, { kind: 'build', to: { x: site.pos.x, y: site.pos.y + 0.5, z: site.pos.z }, color: '#ffd6ff', emoji: t.emoji });
  return p;
}

export const SHRINE_BOWL = { x: 1.2, z: 2.2 };
export const FOUNTAIN = FOUNTAIN_POS;
export const DAEMON_REST = DAEMON_HOME;
