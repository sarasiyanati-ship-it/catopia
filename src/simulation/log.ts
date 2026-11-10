// Narrative events, daemon thoughts and visual effects queues.
import type { Fx, SimEvent, SimState, Thought, Vec3 } from './types';

export function fmtHour(h: number): string {
  const hh = Math.floor(h) % 24;
  const mm = Math.floor((h - Math.floor(h)) * 60);
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

export function addEvent(s: SimState, kind: string, emoji: string, title: string, text: string, important = false, pos?: Vec3): SimEvent {
  const e: SimEvent = { id: ++s.counters.event, day: s.day, hour: s.hour, kind, emoji, title, text, important, pos };
  s.events.push(e);
  if (s.events.length > 400) s.events.splice(0, s.events.length - 400);
  return e;
}

/** Fire a story beat only the first time it happens. */
export function onceEvent(s: SimState, flag: string, kind: string, emoji: string, title: string, text: string, pos?: Vec3) {
  if (s.flags[flag]) return;
  s.flags[flag] = true;
  addEvent(s, kind, emoji, title, text, true, pos);
}

export function think(s: SimState, t: Omit<Thought, 'id' | 'day' | 'hour'>): Thought {
  const th: Thought = { id: ++s.counters.thought, day: s.day, hour: s.hour, ...t };
  s.thoughts.push(th);
  if (s.thoughts.length > 150) s.thoughts.splice(0, s.thoughts.length - 150);
  return th;
}

export function fx(s: SimState, f: Omit<Fx, 'id'>) {
  s.fx.push({ id: ++s.counters.fx, ...f });
  if (s.fx.length > 60) s.fx.splice(0, s.fx.length - 60);
}

export function diary(s: SimState, citizenIdx: number, text: string) {
  const c = s.citizens[citizenIdx];
  c.diary.push(`Day ${s.day}, ${fmtHour(s.hour)} — ${text}`);
  if (c.diary.length > 40) c.diary.shift();
}
