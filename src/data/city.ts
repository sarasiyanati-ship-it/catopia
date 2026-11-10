import type { BuildingDef, Site, Vec2, Vec3 } from '../simulation/types';

// ─────────────────────────────────────────────────────────────
// City layout: a 3×3 block diorama. Four streets (x=±7, z=±7) frame a
// central plaza where the daemon's shrine stands. Everything is hand-placed
// so the miniature reads clearly from the isometric camera.
// ─────────────────────────────────────────────────────────────

export const ISLAND_HALF = 21;
export const ROAD_LINES = [
  { axis: 'x' as const, v: -7 }, // vertical street, x = -7
  { axis: 'x' as const, v: 7 },
  { axis: 'z' as const, v: -7 }, // horizontal street, z = -7
  { axis: 'z' as const, v: 7 },
];
export const ROAD_EXTENT = 19.5;
export const ROAD_WIDTH = 2.3;
export const SHRINE: Vec3 = { x: 0, y: 0, z: 0 };
export const DAEMON_HOME: Vec3 = { x: 0, y: 6.2, z: 0 };

// facing: front of building looks along (sin rot, cos rot)
const F = { pz: 0, nz: Math.PI, px: Math.PI / 2, nx: -Math.PI / 2 };

type Lot = { x: number; z: number; rot: number };
const LOT = {
  nwA: { x: -16, z: -10.5, rot: F.pz }, nwB: { x: -10.5, z: -16, rot: F.px },
  nA: { x: -2.8, z: -10.5, rot: F.pz }, nB: { x: 2.8, z: -10.5, rot: F.pz },
  neA: { x: 16, z: -10.5, rot: F.pz }, neB: { x: 10.5, z: -16, rot: F.nx },
  wA: { x: -10.5, z: -2.8, rot: F.px }, wB: { x: -10.5, z: 2.8, rot: F.px },
  eA: { x: 10.5, z: -2.8, rot: F.nx }, eB: { x: 10.5, z: 2.8, rot: F.nx },
  swA: { x: -16, z: 10.5, rot: F.nz }, swB: { x: -10.5, z: 16, rot: F.px },
  sA: { x: -2.8, z: 10.5, rot: F.nz }, sB: { x: 2.8, z: 10.5, rot: F.nz },
  seA: { x: 16, z: 10.5, rot: F.nz }, seB: { x: 10.5, z: 16, rot: F.nx },
} satisfies Record<string, Lot>;

function door(l: Lot, d: number): Vec2 {
  return { x: l.x + Math.sin(l.rot) * (d / 2 + 0.25), z: l.z + Math.cos(l.rot) * (d / 2 + 0.25) };
}

function b(id: string, kind: BuildingDef['kind'], name: string, l: Lot, w: number, d: number, h: number, color: string, roofColor: string): BuildingDef {
  return { id, kind, name, pos: { x: l.x, z: l.z }, rot: l.rot, w, d, h, color, roofColor, door: door(l, d) };
}

export const BUILDINGS: BuildingDef[] = [
  b('bakery', 'bakery', 'Sunny Bun Bakery', LOT.nA, 3.2, 3.2, 2.8, '#ffd6e0', '#ff8fab'),
  b('office', 'office', 'Bureau of Paperwork', LOT.nB, 3.2, 3.2, 5.4, '#c9e4ff', '#7fb2f0'),
  b('workshop', 'workshop', 'Hammer & Plank Workshop', LOT.eA, 3.3, 3.2, 3.0, '#d8f3c4', '#8cc97a'),
  b('fishmarket', 'fishmarket', 'Blue Wave Fish Market', LOT.wA, 3.3, 3.2, 2.6, '#cdf2f4', '#5fc6cf'),
  b('grocery', 'grocery', 'Corner Grocery', LOT.sA, 3.2, 3.2, 2.8, '#fff1bf', '#ffb84d'),
  b('homestore', 'homestore', 'Cozy Home Store', LOT.sB, 3.3, 3.2, 3.2, '#ead9ff', '#a98bf0'),
  b('h0', 'house', 'Hanna’s House', LOT.nwA, 3.0, 3.0, 2.3, '#fff0d6', '#ff9f80'),
  b('h1', 'house', 'Otto’s House', LOT.nwB, 3.0, 3.0, 2.3, '#ffe1ec', '#e57a9a'),
  b('h2', 'house', 'Lotte’s House', LOT.neA, 3.0, 3.0, 2.3, '#e5f4ff', '#6fa8dc'),
  b('h3', 'house', 'Klara’s House', LOT.neB, 3.0, 3.0, 2.6, '#f2ffe4', '#7cbf6b'),
  b('h4', 'house', 'Fritz’s House', LOT.wB, 3.0, 3.0, 2.3, '#f6ead8', '#c9a27e'),
  b('h5', 'house', 'Emil’s House', LOT.eB, 3.0, 3.0, 2.3, '#e9e6ff', '#8f86d9'),
  b('h6', 'house', 'Selma’s House', LOT.swA, 3.0, 3.0, 2.6, '#fff6c9', '#e8b84a'),
  b('h7', 'house', 'Theo’s House', LOT.swB, 3.0, 3.0, 2.3, '#ffe4d1', '#f08c5a'),
  b('h8', 'house', 'Ida’s House', LOT.seA, 3.0, 3.0, 2.3, '#e3fff0', '#5fbf8f'),
  b('h9', 'house', 'Paul’s House', LOT.seB, 3.0, 3.0, 2.3, '#f0f0f0', '#9aa5b8'),
];
export const BUILDING_BY_ID: Record<string, BuildingDef> = Object.fromEntries(BUILDINGS.map((x) => [x.id, x]));

/** Convert building-local (lx, lz) to world xz. Local +z is the front. */
export function localToWorld(bd: BuildingDef, lx: number, lz: number): Vec2 {
  const c = Math.cos(bd.rot), s = Math.sin(bd.rot);
  return { x: bd.pos.x + lx * c + lz * s, z: bd.pos.z - lx * s + lz * c };
}

// Human street furniture that can be "catified".
export const BENCHES: { id: string; x: number; z: number; rot: number }[] = [
  { id: 'bench-p1', x: -3.9, z: -3.9, rot: Math.PI / 4 },
  { id: 'bench-p2', x: -3.9, z: 3.9, rot: (3 * Math.PI) / 4 },
  { id: 'bench-p3', x: 3.9, z: 3.9, rot: (-3 * Math.PI) / 4 },
  { id: 'bench-s1', x: -14.5, z: -5.4, rot: Math.PI },
  { id: 'bench-s2', x: 14.5, z: -5.4, rot: Math.PI },
  { id: 'bench-s3', x: -14.5, z: 5.4, rot: 0 },
  { id: 'bench-s4', x: 14.5, z: 5.4, rot: 0 },
];
export const LAMPS: { id: string; x: number; z: number }[] = [
  { id: 'lamp-1', x: -8.6, z: -8.6 }, { id: 'lamp-2', x: 8.6, z: -8.6 },
  { id: 'lamp-3', x: -8.6, z: 8.6 }, { id: 'lamp-4', x: 8.6, z: 8.6 },
  { id: 'lamp-5', x: -5.6, z: -2.4 }, { id: 'lamp-6', x: 5.6, z: 2.4 },
  { id: 'lamp-7', x: 2.4, z: -5.6 }, { id: 'lamp-8', x: -2.4, z: 5.6 },
];
export const TREES: { x: number; z: number; s: number }[] = [
  { x: -19, z: -4.5, s: 1 }, { x: -19, z: 4.5, s: 0.9 }, { x: 19, z: -4.5, s: 0.95 }, { x: 19, z: 4.5, s: 1.05 },
  { x: -4.5, z: -19, s: 0.9 }, { x: 4.5, z: -19, s: 1 }, { x: -4.5, z: 19, s: 1.05 }, { x: 4.5, z: 19, s: 0.9 },
  { x: -19.3, z: -19.3, s: 0.8 }, { x: 19.3, z: 19.3, s: 0.85 }, { x: 19.3, z: -13.5, s: 0.8 }, { x: -13.5, z: 19.3, s: 0.8 },
  { x: -19.3, z: 13.5, s: 0.75 }, { x: 13.5, z: -19.3, s: 0.8 },
];
export const FOUNTAIN_POS: Vec3 = { x: 3.9, y: 0, z: -3.9 };

// ── transformation sites ─────────────────────────────────────
function buildSites(): Site[] {
  const sites: Site[] = [];
  for (const bn of BENCHES) sites.push({ id: bn.id, kind: 'bench', pos: { x: bn.x, y: 0, z: bn.z }, rot: bn.rot });
  for (const l of LAMPS) sites.push({ id: l.id, kind: 'lamp', pos: { x: l.x, y: 0, z: l.z }, rot: 0 });

  for (const bd of BUILDINGS) {
    const roofApproach = [bd.door];
    sites.push({ id: `roof-${bd.id}`, kind: 'roof', pos: { x: bd.pos.x, y: bd.h, z: bd.pos.z }, rot: bd.rot, buildingId: bd.id, approach: roofApproach });
    const side = localToWorld(bd, bd.w / 2 + 0.05, 0);
    sites.push({ id: `facade-${bd.id}`, kind: 'facade', pos: { x: side.x, y: 0, z: side.z }, rot: bd.rot, buildingId: bd.id, approach: [bd.door] });
    const other = localToWorld(bd, -bd.w / 2 - 0.05, 0.2);
    sites.push({ id: `tunnel-${bd.id}`, kind: 'tunnel', pos: { x: other.x, y: 0, z: other.z }, rot: bd.rot, buildingId: bd.id, approach: [bd.door] });
    const cd = localToWorld(bd, 0.95, bd.d / 2 + 0.02);
    sites.push({ id: `door-${bd.id}`, kind: 'door', pos: { x: cd.x, y: 0, z: cd.z }, rot: bd.rot, buildingId: bd.id });
    if (bd.kind === 'house') sites.push({ id: `house-${bd.id}`, kind: 'house', pos: { x: bd.pos.x, y: 0, z: bd.pos.z }, rot: bd.rot, buildingId: bd.id });
  }

  // Rooftop-to-rooftop bridges (neighbours in the same block).
  const pairs: [string, string][] = [
    ['bakery', 'office'], ['grocery', 'homestore'], ['fishmarket', 'h4'], ['workshop', 'h5'],
    ['h0', 'h1'], ['h2', 'h3'], ['h6', 'h7'], ['h8', 'h9'],
  ];
  for (const [p, q] of pairs) {
    const A = BUILDING_BY_ID[p], B = BUILDING_BY_ID[q];
    const y = Math.min(A.h, B.h) + 0.05;
    sites.push({
      id: `bridge-${p}-${q}`, kind: 'bridge', rot: 0, pair: [p, q],
      pos: { x: (A.pos.x + B.pos.x) / 2, y, z: (A.pos.z + B.pos.z) / 2 },
      a: { x: A.pos.x, y, z: A.pos.z }, b: { x: B.pos.x, y, z: B.pos.z },
      approach: [A.door],
    });
  }

  // Elevated cat walkways above the streets → a second circulation network.
  const cuts = [[-19.5, -7], [-7, 7], [7, 19.5]];
  for (const line of ROAD_LINES) {
    cuts.forEach(([c0, c1], i) => {
      const y = 3.4;
      const a = line.axis === 'x' ? { x: line.v, y, z: c0 } : { x: c0, y, z: line.v };
      const bb = line.axis === 'x' ? { x: line.v, y, z: c1 } : { x: c1, y, z: line.v };
      sites.push({
        id: `walk-${line.axis}${line.v}-${i}`, kind: 'walkway', rot: 0,
        pos: { x: (a.x + bb.x) / 2, y, z: (a.z + bb.z) / 2 }, a, b: bb,
      });
    });
  }

  // Open yards inside the blocks — cat gardens, forts and feeding spots go here.
  const yards: { id: string; x: number; z: number; approach?: Vec2[] }[] = [
    { id: 'yard-nw-in', x: -11.2, z: -11.2 }, { id: 'yard-ne-in', x: 11.2, z: -11.2 },
    { id: 'yard-sw-in', x: -11.2, z: 11.2 }, { id: 'yard-se-in', x: 11.2, z: 11.2 },
    { id: 'yard-nw-out', x: -17, z: -17, approach: [{ x: -10.2, z: -10.2 }] },
    { id: 'yard-ne-out', x: 17, z: -17, approach: [{ x: 10.2, z: -10.2 }] },
    { id: 'yard-sw-out', x: -17, z: 17, approach: [{ x: -10.2, z: 10.2 }] },
    { id: 'yard-se-out', x: 17, z: 17, approach: [{ x: 10.2, z: 10.2 }] },
    { id: 'yard-n', x: 0, z: -16.3, approach: [{ x: 0, z: -9 }] },
    { id: 'yard-s', x: 0, z: 16.3, approach: [{ x: 0, z: 9 }] },
    { id: 'yard-w', x: -16.3, z: 0, approach: [{ x: -9, z: 0 }] },
    { id: 'yard-e', x: 16.3, z: 0, approach: [{ x: 9, z: 0 }] },
  ];
  for (const y of yards) sites.push({ id: y.id, kind: 'yard', pos: { x: y.x, y: 0, z: y.z }, rot: Math.atan2(-y.x, -y.z), approach: y.approach });

  sites.push({ id: 'plaza', kind: 'plaza', pos: { x: 0, y: 0, z: 0 }, rot: 0 });
  sites.push({ id: 'fountain', kind: 'fountain', pos: { ...FOUNTAIN_POS }, rot: 0 });
  return sites;
}

export const SITES: Site[] = buildSites();
export const SITE_BY_ID: Record<string, Site> = Object.fromEntries(SITES.map((s) => [s.id, s]));
