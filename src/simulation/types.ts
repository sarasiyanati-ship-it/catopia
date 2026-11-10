// ─────────────────────────────────────────────────────────────
// CATOPIA — shared simulation types.
// The simulation layer is pure TypeScript (no Three.js / React), so it can
// run headless (see scripts/simtest.ts) and be rendered by any front-end.
// ─────────────────────────────────────────────────────────────

export type NeedKey = 'hunger' | 'comfort' | 'play' | 'rest' | 'safety' | 'curiosity';
export const NEED_KEYS: NeedKey[] = ['hunger', 'comfort', 'play', 'rest', 'safety', 'curiosity'];

/** Abstract building materials the daemon extracts from offerings. */
export type ResKey = 'food' | 'soft' | 'wood' | 'toy' | 'plant' | 'box' | 'deco' | 'house' | 'labor';
export const RES_KEYS: ResKey[] = ['food', 'soft', 'wood', 'toy', 'plant', 'box', 'deco', 'house', 'labor'];

export interface Vec2 { x: number; z: number }
export interface Vec3 { x: number; y: number; z: number }

export interface ItemDef {
  id: string;
  name: string;
  emoji: string;
  /** Shelf price in coins. */
  price: number;
  /** Spiritual energy the daemon gains when this is offered. */
  energy: number;
  /** Materials the daemon gets out of it. */
  yields: Partial<Record<ResKey, number>>;
  /** Human hunger relief when eaten at home (only human food). */
  edible?: number;
  /** Which shop sells it (none = cannot be bought). */
  shop?: 'grocery' | 'home';
  /** Is it something citizens consider furniture of their home? */
  furniture?: boolean;
  /** Safety note shown in the UI (e.g. human food is NOT fed to cats). */
  note?: string;
  color: string;
}

export interface Personality {
  label: string;      // "generous", "lazy" ...
  generosity: number; // 0..1 offers valuable things
  diligence: number;  // 0..1 probability to go to work
  caution: number;    // 0..1 keeps savings, protects food
  ambition: number;   // 0..1 offers what the daemon wishes, chases wages
  anxiety: number;    // 0..1 reacts to a sleepy daemon
  catLove: number;    // 0..1 happy about cat transformations
  cheer: number;      // 0..1 baseline happiness
}

export type CitizenActivity =
  | 'sleeping' | 'waking' | 'commuting' | 'working' | 'lazing' | 'toShop' | 'shopping'
  | 'goingHome' | 'eating' | 'relaxing' | 'toShrine' | 'offering' | 'servant' | 'resting';

export interface OfferingRecord {
  day: number;
  hour: number;
  citizenId: number; // -1 = the visitor (user)
  itemId: string;
  energy: number;
  wishMatch: boolean;
}

export interface Mover {
  pos: Vec3;
  path: Vec3[];
  segFrom: Vec3 | null;
  heading: number;
  speed: number; // units per sim-hour
  moving: boolean;
}

export interface Citizen extends Mover {
  id: number;
  name: string;
  job: string;
  workplaceId: string;
  homeId: string;
  personality: Personality;
  wage: number;
  money: number;
  hunger: number;    // 0 = full, 100 = starving
  happiness: number; // 0..100
  inventory: string[];
  offeringHistory: OfferingRecord[];
  activity: CitizenActivity;
  activityUntil: number; // absolute sim hour
  indoors: boolean;
  ownsHouse: boolean;
  isServant: boolean;
  servantTask: string | null;
  servantCatId: number | null;
  plan: {
    wake: number; workStart: number; workEnd: number; offerHour: number;
    goesToWork: boolean; shop: 'grocery' | 'home'; worked: boolean;
    offered: boolean; shopped: boolean; ate: boolean; servantNextTask: number;
    offerEarly: boolean; extraStop: boolean; forgot: boolean;
  };
  thought: string; // emoji shown above head
  diary: string[];
  colors: { shirt: string; pants: string; hair: string; skin: string };
  daysWithoutWork: number;
}

export type CatActivity =
  | 'idle' | 'walking' | 'sleeping' | 'playing' | 'eating' | 'hiding' | 'exploring'
  | 'lounging' | 'inspecting' | 'demanding' | 'carried';

export interface Cat extends Mover {
  id: number;
  name: string;
  breed: string;
  description: string;
  needs: Record<NeedKey, number>;          // satisfaction 0..100
  decay: Record<NeedKey, number>;          // satisfaction lost per hour
  prefs: Record<NeedKey, number>;          // importance weights
  activity: CatActivity;
  activityUntil: number;
  targetSpotId: string | null;
  focusNeed: NeedKey | null;
  thought: string;
  happiness: number;
  size: number;
  colors: { body: string; accent: string; eyes: string; pattern: 'solid' | 'calico' | 'tabby' | 'tux' };
  favoriteTags: string[];
  inspected: string[]; // placed ids this cat already inspected
}

export type SiteKind =
  | 'bench' | 'lamp' | 'roof' | 'facade' | 'tunnel' | 'door' | 'bridge'
  | 'walkway' | 'yard' | 'plaza' | 'fountain' | 'house';

export interface Site {
  id: string;
  kind: SiteKind;
  pos: Vec3;
  rot: number;
  buildingId?: string;
  pair?: [string, string];
  /** walkway / bridge endpoints */
  a?: Vec3;
  b?: Vec3;
  approach?: Vec2[];
}

export interface BuildingDef {
  id: string;
  kind: 'house' | 'bakery' | 'office' | 'workshop' | 'fishmarket' | 'grocery' | 'homestore';
  name: string;
  pos: Vec2;
  rot: number;  // y rotation, front faces +z local
  w: number;
  d: number;
  h: number;
  color: string;
  roofColor: string;
  door: Vec2;   // world door point
}

export interface Spot {
  id: string;
  placedId: string;
  pos: Vec3;
  approach?: Vec2[];
  needs: Partial<Record<NeedKey, number>>;
  label: string;
}

export interface Placed {
  id: string;
  typeId: string;
  siteId: string;
  day: number;
  hour: number;
  bornAt: number; // absolute sim hour (for pop-in animation & novelty)
  pos: Vec3;
  rot: number;
  a?: Vec3;
  b?: Vec3;
  buildingId?: string;
  reason: string;
  uses: number; // how often cats used it (daemon memory)
  spots: Spot[];
}

export interface Thought {
  id: number;
  day: number;
  hour: number;
  kind: 'decision' | 'perception' | 'reflection' | 'sleep' | 'wake' | 'offering' | 'servant';
  title: string;
  lines: string[];
  candidates?: { label: string; emoji: string; score: number; parts: Record<string, number>; chosen: boolean }[];
  goals?: Record<string, number>;
  unexpected?: boolean;
}

export interface SimEvent {
  id: number;
  day: number;
  hour: number;
  kind: string;
  title: string;
  text: string;
  emoji: string;
  pos?: Vec3;
  important: boolean;
}

/** One-shot visual effects the renderer consumes (offering orbs, bursts). */
export interface Fx {
  id: number;
  kind: 'offering' | 'burst' | 'build' | 'zzz' | 'heart';
  from?: Vec3;
  to?: Vec3;
  emoji?: string;
  color?: string;
}

export interface DaemonState {
  energy: number;
  awake: boolean;
  pos: Vec3;
  target: Vec3;
  mood: 'dormant' | 'calm' | 'thinking' | 'flying' | 'casting' | 'delighted' | 'sleepy' | 'asleep';
  resources: Record<ResKey, number>;
  houseQueue: { houseId: string; citizenId: number }[];
  foodStock: number;
  whim: { id: string; label: string; tags: string[]; emoji: string };
  wish: ResKey;
  dreamBoost: number;
  nextDecision: number; // absolute hour
  pending: null | {
    typeId: string; siteId: string; reason: string; castAt: number; doneAt: number;
  };
  memory: {
    offerings: OfferingRecord[];
    energyByDay: number[];      // offering energy received per day
    actionCounts: Record<string, number>;
    recentTypes: string[];
    neglect: Record<number, number>;
    trust: Record<number, { total: number; count: number; stingy: number }>;
    journal: { day: number; text: string }[];
    sleeps: number;
  };
  decrees: { id: string; title: string; text: string; day: number }[];
}

export interface Demand {
  catId: number;
  text: string;
  typeId: string;
  day: number;
  fulfilled: boolean;
}

export interface SimState {
  seed: number;
  rngState: number;
  time: number;      // absolute sim hours since Day 1, 00:00
  day: number;
  hour: number;
  citizens: Citizen[];
  cats: Cat[];
  daemon: DaemonState;
  placed: Placed[];
  usedSites: Record<string, string>; // siteId -> placedId
  houseState: Record<string, 'human' | 'castle' | 'hotel'>;
  events: SimEvent[];
  thoughts: Thought[];
  fx: Fx[];
  flags: Record<string, boolean>;
  demand: Demand | null;
  counters: { event: number; thought: number; fx: number; placed: number };
  skipOfferingsDay: number; // demo: citizens forget offerings on this day
  servantLog: string[];
  version: number; // bumps when geometry changes
  weather: "sunny" | "cloudy" | "rainy";
  history: { day: number; progress: number; catHappiness: number; energy: number }[];
}
