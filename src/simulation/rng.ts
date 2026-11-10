// Deterministic seeded randomness (mulberry32).
// The RNG state lives inside SimState, so a whole simulation is reproducible
// from its seed: same seed + same user actions = same city.

import type { SimState } from './types';

export function mulberry(state: number): [number, number] {
  let t = (state + 0x6d2b79f5) | 0;
  const next = t;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, next];
}

/** Uniform float in [0, 1). Advances the simulation's RNG. */
export function rand(s: SimState): number {
  const [v, next] = mulberry(s.rngState);
  s.rngState = next;
  return v;
}

export function randRange(s: SimState, a: number, b: number): number {
  return a + (b - a) * rand(s);
}

export function pick<T>(s: SimState, arr: T[]): T {
  return arr[Math.floor(rand(s) * arr.length) % arr.length];
}

export function chance(s: SimState, p: number): boolean {
  return rand(s) < p;
}

/** Weighted pick; weights may be any non-negative numbers. */
export function weightedPick<T>(s: SimState, items: T[], weights: number[]): T {
  const total = weights.reduce((a, b) => a + Math.max(0, b), 0);
  if (total <= 0) return items[0];
  let r = rand(s) * total;
  for (let i = 0; i < items.length; i++) {
    r -= Math.max(0, weights[i]);
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

/** Stable hash of a string → number (for cosmetic per-entity variation). */
export function hashStr(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967296;
}
