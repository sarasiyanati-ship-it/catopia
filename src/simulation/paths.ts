// Street-network routing. Humans walk along the four streets; cats use the
// same streets but may cut through yards and leap up to rooftops.

import { ROAD_EXTENT, ROAD_LINES } from '../data/city';
import type { Mover, Vec2, Vec3 } from './types';

type Line = (typeof ROAD_LINES)[number];
interface RoadPoint { line: Line; p: Vec2 }

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export function projectToRoad(p: Vec2): RoadPoint {
  let best: RoadPoint | null = null;
  let bestD = Infinity;
  for (const line of ROAD_LINES) {
    const d = line.axis === 'x' ? Math.abs(p.x - line.v) : Math.abs(p.z - line.v);
    if (d < bestD) {
      bestD = d;
      best = {
        line,
        p: line.axis === 'x' ? { x: line.v, z: clamp(p.z, -ROAD_EXTENT, ROAD_EXTENT) } : { x: clamp(p.x, -ROAD_EXTENT, ROAD_EXTENT), z: line.v },
      };
    }
  }
  return best!;
}

function intersect(a: Line, b: Line): Vec2 {
  return a.axis === 'x' ? { x: a.v, z: b.v } : { x: b.v, z: a.v };
}

function roadRoute(a: RoadPoint, b: RoadPoint): Vec2[] {
  if (a.line === b.line) return [b.p];
  if (a.line.axis !== b.line.axis) return [intersect(a.line, b.line), b.p];
  // Parallel streets: cross over on the perpendicular street that is shortest.
  const along = (rp: RoadPoint) => (rp.line.axis === 'x' ? rp.p.z : rp.p.x);
  const crossers = ROAD_LINES.filter((l) => l.axis !== a.line.axis);
  let best = crossers[0];
  let bestD = Infinity;
  for (const c of crossers) {
    const d = Math.abs(along(a) - c.v) + Math.abs(along(b) - c.v);
    if (d < bestD) { bestD = d; best = c; }
  }
  return [intersect(a.line, best), intersect(b.line, best), b.p];
}

/** Lateral offset so citizens don't all walk on the same line. */
function offsetPoint(p: Vec2, lane: number): Vec2 {
  return { x: p.x + lane * 0.33, z: p.z + lane * 0.33 };
}

/** Full route from → to via streets. `approach` = extra waypoints before the target. */
export function route(from: Vec2, to: Vec3, lane = 0, approach?: Vec2[]): Vec3[] {
  const entry = approach && approach.length ? approach[0] : to;
  const ra = projectToRoad(from);
  const rb = projectToRoad(entry);
  const pts: Vec2[] = [ra.p, ...roadRoute(ra, rb)];
  const out: Vec3[] = pts.map((p) => {
    const q = offsetPoint(p, lane);
    return { x: q.x, y: 0, z: q.z };
  });
  for (const ap of approach ?? []) out.push({ x: ap.x, y: 0, z: ap.z });
  out.push({ ...to });
  // drop tiny segments
  const cleaned: Vec3[] = [];
  let last: Vec2 = from;
  for (const p of out) {
    if (Math.hypot(p.x - last.x, p.z - last.z) > 0.05 || p.y !== 0) { cleaned.push(p); last = p; }
  }
  return cleaned;
}

/** Advance a mover along its path. Returns true when the path is complete. */
export function advance(m: Mover, dtH: number): boolean {
  if (!m.path.length) { m.moving = false; return true; }
  m.moving = true;
  let budget = m.speed * dtH;
  while (budget > 0 && m.path.length) {
    const t = m.path[0];
    if (!m.segFrom) m.segFrom = { ...m.pos };
    const dx = t.x - m.pos.x, dz = t.z - m.pos.z;
    const dist = Math.hypot(dx, dz);
    const segLen = Math.max(0.001, Math.hypot(t.x - m.segFrom.x, t.z - m.segFrom.z));
    if (dist > 0.001) m.heading = Math.atan2(dx, dz);
    if (dist <= budget) {
      m.pos.x = t.x; m.pos.z = t.z; m.pos.y = t.y;
      budget -= dist;
      m.path.shift();
      m.segFrom = null;
    } else {
      m.pos.x += (dx / dist) * budget;
      m.pos.z += (dz / dist) * budget;
      const frac = 1 - (dist - budget) / segLen;
      const dy = t.y - m.segFrom.y;
      // Height changes become cartoon leaps.
      m.pos.y = m.segFrom.y + dy * frac + (Math.abs(dy) > 0.2 ? Math.sin(Math.PI * frac) * 1.4 : 0);
      budget = 0;
    }
  }
  if (!m.path.length) { m.moving = false; return true; }
  return false;
}

export const dist2 = (a: Vec2, b: Vec2) => Math.hypot(a.x - b.x, a.z - b.z);
