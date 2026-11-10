// ─────────────────────────────────────────────────────────────
// THE DAEMON'S MIND — a transparent, simulated decision system.
//
// This is NOT a real AI / language model. It is a hand-written utility-based
// agent:  PERCEIVE → (MEMORY) → SCORE competing goals → ACT → REFLECT.
// Every score is visible in the "Daemon Thoughts" panel, and a small amount
// of seeded randomness ("chaos") plus a daily whim make it feel alive while
// staying explainable and reproducible.
// ─────────────────────────────────────────────────────────────

import { CAT_DEFS, CITIZEN_DEFS, LAZY_ID } from '../data/characters';
import { BUILDING_BY_ID, DAEMON_HOME, SITES, SITE_BY_ID } from '../data/city';
import { ITEMS } from '../data/items';
import { DEMANDS, TRANSFORM_TYPES, TYPE_BY_ID, WHIMS, type TransformType } from '../data/transformTypes';
import { addEvent, fx, onceEvent, think } from '../simulation/log';
import { chance, pick, rand } from '../simulation/rng';
import type { NeedKey, ResKey, SimState, Site } from '../simulation/types';
import { NEED_KEYS, RES_KEYS } from '../simulation/types';
import { applyTransformation, avgCatHappiness, cityProgress, siteAvailable, siteLabel } from '../simulation/world';

export const WAKE_THRESHOLD = 30;
const NEED_LABEL: Record<NeedKey, string> = { hunger: 'food', comfort: 'comfort', play: 'play', rest: 'rest', safety: 'safety', curiosity: 'curiosity' };
const RES_LABEL: Record<ResKey, string> = { food: 'cat food', soft: 'soft things', wood: 'wood', toy: 'toys', plant: 'plants', box: 'boxes', deco: 'decorations', house: 'a house', labor: 'labor' };
export const RES_EMOJI: Record<ResKey, string> = { food: '🐟', soft: '☁️', wood: '🌲', toy: '🎣', plant: '🌿', box: '📦', deco: '🏺', house: '🏠', labor: '⏳' };

// ── PERCEPTION ───────────────────────────────────────────────
export interface Perception {
  deficit: Record<NeedKey, number>;      // weighted average need deficit across cats (0..100)
  worstNeed: NeedKey;
  neediestCat: number;
  neglected: { catId: number; days: number; need: NeedKey } | null;
  avgHappiness: number;
  progress: number;
  expectedIncome: number;
  hoursToOfferings: number;
}

export function perceive(s: SimState): Perception {
  const deficit = Object.fromEntries(NEED_KEYS.map((k) => [k, 0])) as Record<NeedKey, number>;
  for (const k of NEED_KEYS) {
    let sum = 0, w = 0;
    for (const c of s.cats) { sum += (100 - c.needs[k]) * c.prefs[k]; w += c.prefs[k]; }
    deficit[k] = sum / w;
  }
  const worstNeed = NEED_KEYS.reduce((a, b) => (deficit[b] > deficit[a] ? b : a));
  const neediestCat = s.cats.reduce((a, c) => (c.happiness < s.cats[a].happiness ? c.id : a), 0);
  let neglected: Perception['neglected'] = null;
  for (const c of s.cats) {
    const days = s.daemon.memory.neglect[c.id] ?? 0;
    if (days > 0 && (!neglected || days > neglected.days)) {
      const need = NEED_KEYS.reduce((a, b) => ((100 - c.needs[b]) * c.prefs[b] > (100 - c.needs[a]) * c.prefs[a] ? b : a));
      neglected = { catId: c.id, days, need };
    }
  }
  const hist = s.daemon.memory.energyByDay.slice(-3).filter((x) => x !== undefined);
  const expectedIncome = hist.length ? hist.reduce((a, b) => a + b, 0) / hist.length : 90;
  const hoursToOfferings = s.hour < 19 ? 19 - s.hour : 0;
  return { deficit, worstNeed, neediestCat, neglected, avgHappiness: avgCatHappiness(s), progress: cityProgress(s), expectedIncome, hoursToOfferings };
}

// ── CANDIDATE ACTIONS ────────────────────────────────────────
interface Candidate {
  key: string;
  label: string;
  emoji: string;
  typeId?: string;
  site?: Site;
  energy: number;
  parts: Record<string, number>;
  raw: number;   // score without chaos
  score: number; // final score
  why: string;
}

function affordable(s: SimState, t: TransformType): boolean {
  return RES_KEYS.every((k) => (s.daemon.resources[k] ?? 0) >= (t.cost[k] ?? 0));
}

function countPlaced(s: SimState, typeId: string) {
  return s.placed.filter((p) => p.typeId === typeId).length;
}

/** Choose the best site for a type: near cats who need it, or extending networks. */
function chooseSite(s: SimState, t: TransformType, per: Perception): { site: Site; why: string } | null {
  let sites = SITES.filter((x) => x.kind === t.site && siteAvailable(s, x));
  if (t.site === 'house') {
    const q = s.daemon.houseQueue[0];
    sites = q ? sites.filter((x) => x.buildingId === q.houseId) : [];
  }
  if (!sites.length) return null;
  const primary = (Object.keys(t.needs) as NeedKey[]).reduce((a, b) => ((t.needs[b] ?? 0) * per.deficit[b] > (t.needs[a] ?? 0) * per.deficit[a] ? b : a));
  // the cat who suffers most from that need
  const cat = s.cats.reduce((a, c) => ((100 - c.needs[primary]) * c.prefs[primary] > (100 - a.needs[primary]) * a.prefs[primary] ? c : a));
  let best = sites[0], bestScore = -Infinity, why = '';
  for (const site of sites) {
    let sc = -Math.hypot(site.pos.x - cat.pos.x, site.pos.z - cat.pos.z) * 0.05;
    let w = `close to ${cat.name}, who needs ${NEED_LABEL[primary]}`;
    if (t.site === 'walkway' || t.site === 'bridge') {
      // Prefer to extend the existing elevated network.
      const connected = s.placed.some((p) => (p.typeId === 'walkway' || p.typeId === 'skyBridge') && p.a && p.b && site.a && site.b &&
        [p.a, p.b].some((e) => [site.a!, site.b!].some((f) => Math.hypot(e.x - f.x, e.z - f.z) < 1)));
      if (connected) { sc += 3; w = 'to extend the elevated cat network'; }
    }
    if (site.kind === 'roof' && site.buildingId && BUILDING_BY_ID[site.buildingId].kind !== 'house') sc += 0.4;
    sc += rand(s) * 0.4;
    if (sc > bestScore) { bestScore = sc; best = site; why = w; }
  }
  return { site: best, why };
}

function goalWeights(s: SimState, per: Perception) {
  const d = s.daemon;
  const avgDef = NEED_KEYS.reduce((a, k) => a + per.deficit[k], 0) / NEED_KEYS.length;
  // Energy forecast: what will be left when the evening offerings arrive?
  const decay = 1.3 * per.hoursToOfferings;
  const forecast = d.energy - decay;
  const survive = Math.max(0, Math.min(1.6, (32 - forecast) / 28)) + (d.energy < 20 ? 0.5 : 0);
  return {
    wellbeing: 0.7 + avgDef / 60,
    transform: 0.55 + (1 - per.progress) * 0.25,
    survive,
    whim: 0.5,
    fairness: per.neglected ? 0.35 + per.neglected.days * 0.2 : 0.15,
    novelty: 1,
    demand: 1,
  };
}

function scoreBuild(s: SimState, t: TransformType, per: Perception, W: ReturnType<typeof goalWeights>) {
  const wellbeing = NEED_KEYS.reduce((a, k) => a + (t.needs[k] ?? 0) * per.deficit[k], 0) / 60;
  let fairness = 0;
  if (per.neglected) fairness = (t.needs[per.neglected.need] ?? 0) * 1.2;
  const favCats = s.cats.filter((c) => c.favoriteTags.some((tg) => t.tags.includes(tg))).length;
  const parts: Record<string, number> = {
    wellbeing: W.wellbeing * (wellbeing + favCats * 0.06),
    transform: W.transform * (t.catness / 9),
    survive: -W.survive * (t.energy / 14) - (t.energy / 120),
    whim: W.whim * (t.tags.some((tg) => s.daemon.whim.tags.includes(tg)) ? 1 : 0),
    fairness: W.fairness * fairness,
    novelty: -0.32 * s.daemon.memory.recentTypes.filter((x) => x === t.id).length,
    demand: s.demand && !s.demand.fulfilled && s.demand.typeId === t.id ? W.demand * 1.1 : 0,
  };
  return parts;
}

export function buildCandidates(s: SimState, per: Perception, includeUnaffordable = false): Candidate[] {
  const W = goalWeights(s, per);
  const d = s.daemon;
  const out: Candidate[] = [];
  for (const t of TRANSFORM_TYPES) {
    if (t.max && countPlaced(s, t.id) >= t.max) continue;
    if (!includeUnaffordable && (!affordable(s, t) || d.energy < t.energy)) continue;
    const site = chooseSite(s, t, per);
    if (!site) continue;
    const parts = scoreBuild(s, t, per, W);
    const raw = Object.values(parts).reduce((a, b) => a + b, 0);
    out.push({ key: t.id, label: t.name, emoji: t.emoji, typeId: t.id, site: site.site, energy: t.energy, parts, raw, score: raw, why: site.why });
  }
  if (includeUnaffordable) return out;

  // Non-architectural actions.
  if (d.resources.food >= 1 && d.foodStock < 6) {
    const parts = { wellbeing: W.wellbeing * (per.deficit.hunger / 45), survive: -W.survive * 0.1,
      novelty: -0.25 * d.memory.recentTypes.filter((x) => x === 'feed').length };
    out.push({ key: 'feed', label: 'Fill the food bowls', emoji: '🐟', energy: 2, parts, raw: 0, score: 0, why: 'the bowls are running low' });
  }
  out.push({ key: 'rest', label: 'Hover quietly & save energy', emoji: '🧘', energy: 0,
    parts: { survive: W.survive * 0.75, base: 0.2 }, raw: 0, score: 0, why: 'conserving energy until the offerings' });
  if (d.dreamBoost === 0 && W.survive > 0.25 && d.energy > 8) {
    out.push({ key: 'dream', label: 'Whisper into the citizens’ dreams', emoji: '🌙', energy: 5,
      parts: { survive: W.survive * 0.7, novelty: 0 }, raw: 0, score: 0, why: 'hinting that I need more generous offerings' });
  }
  for (const c of out) if (!c.raw) c.raw = Object.values(c.parts).reduce((a, b) => a + b, 0);
  return out;
}

// ── DECISION ─────────────────────────────────────────────────
export function decide(s: SimState) {
  const d = s.daemon;
  const per = perceive(s);
  const cands = buildCandidates(s, per);
  const W = goalWeights(s, per);
  // Controlled randomness: "chaos" up to 0.35 makes it occasionally surprising.
  for (const c of cands) { c.parts.chaos = rand(s) * 0.35; c.score = c.raw + c.parts.chaos; }
  cands.sort((a, b) => b.score - a.score);
  const chosen = cands[0];
  const rational = [...cands].sort((a, b) => b.raw - a.raw)[0];
  const unexpected = chosen.key !== rational.key;

  const cat = s.cats[per.neediestCat];
  const lines: string[] = [
    `👁 I perceive: cats are ${Math.round(per.avgHappiness)}% happy. Biggest lack: ${NEED_LABEL[per.worstNeed]}. ${cat.name} looks the least content (${Math.round(cat.happiness)}%).`,
    `⚡ Energy ${Math.round(d.energy)}. From memory I expect ~${Math.round(per.expectedIncome)}⚡ of offerings tonight.`,
    `🧱 Materials: ${RES_KEYS.filter((k) => d.resources[k] > 0).map((k) => `${RES_EMOJI[k]}${d.resources[k]}`).join(' ') || 'none'}.`,
  ];
  if (per.neglected) lines.push(`📓 Memory: ${s.cats[per.neglected.catId].name} has felt neglected for ${per.neglected.days} day(s). I owe them ${NEED_LABEL[per.neglected.need]}.`);
  if (s.demand && !s.demand.fulfilled) lines.push(`📣 ${s.cats[s.demand.catId].name} ${s.demand.text}`);
  lines.push(`✨ Today I am ${d.whim.label} ${d.whim.emoji}.`);

  let title = '';
  if (chosen.typeId && chosen.site) {
    const t = TYPE_BY_ID[chosen.typeId];
    const topPart = Object.entries(chosen.parts).filter(([k]) => k !== 'chaos').sort((a, b) => b[1] - a[1])[0];
    const reasonMap: Record<string, string> = {
      wellbeing: `the cats badly need ${Object.keys(t.needs).map((k) => NEED_LABEL[k as NeedKey]).slice(0, 2).join(' & ')}`,
      transform: 'it makes the city far more feline', whim: `I am ${d.whim.label}`,
      fairness: per.neglected ? `${s.cats[per.neglected.catId].name} has been neglected` : 'fairness', demand: 'a cat demanded it (loudly)',
      survive: 'it is cheap', novelty: 'variety',
    };
    const reason = `${reasonMap[topPart[0]] ?? 'it feels right'}; placed ${chosen.why}`;
    title = `I will ${t.verb}.`;
    lines.push(`🎯 Decision: ${t.emoji} ${t.name} at ${siteLabel(chosen.site)} — because ${reason}.`);
    const used = s.placed.filter((p) => p.typeId === t.id).reduce((a, p) => a + p.uses, 0);
    if (used > 0) lines.push(`📓 Memory: my ${t.name.toLowerCase()}s were used ${used} times by cats. Good investment.`);
    if (unexpected) lines.push(`🎲 Unexpected! Logic said “${rational.label}”, but a spark of chaos ${d.whim.tags.some((tg) => t.tags.includes(tg)) ? 'and my whim ' : ''}pulled me here.`);
    for (const k of RES_KEYS) d.resources[k] -= t.cost[k] ?? 0;
    d.energy -= t.energy;
    d.pending = { typeId: t.id, siteId: chosen.site.id, reason, castAt: s.time + 0.5, doneAt: s.time + 0.9 };
    d.target = { x: chosen.site.pos.x, y: chosen.site.pos.y + 3.2, z: chosen.site.pos.z };
    d.mood = 'flying';
    d.nextDecision = s.time + 1.15 + rand(s) * 0.4;
  } else if (chosen.key === 'feed') {
    const portions = Math.min(d.resources.food, 2);
    d.resources.food -= portions;
    d.foodStock += portions * 4;
    d.energy -= chosen.energy;
    title = 'I will fill the cats’ food bowls.';
    lines.push(`🎯 Decision: 🐟 Turn ${portions} food offering(s) into ${portions * 4} cat-safe meals. Hunger deficit is ${Math.round(per.deficit.hunger)}.`);
    d.nextDecision = s.time + 0.8;
    fx(s, { kind: 'burst', to: { x: 1.2, y: 0.6, z: 2.2 }, color: '#7fc8f8', emoji: '🐟' });
  } else if (chosen.key === 'dream') {
    d.energy -= chosen.energy;
    d.dreamBoost = 0.35;
    title = 'Tonight I will whisper into their dreams.';
    lines.push('🎯 Decision: 🌙 My energy forecast is worrying. I will visit the citizens’ dreams so they bring richer offerings tomorrow.');
    d.nextDecision = s.time + 1.5;
  } else {
    title = 'I will hover quietly and save my energy.';
    lines.push(`🎯 Decision: 🧘 Rest. ${W.survive > 0.4 ? 'I must not fall asleep before the evening offerings.' : 'Nothing worth building with what I have.'}`);
    d.nextDecision = s.time + 1.2;
    d.mood = 'calm';
  }
  d.memory.recentTypes.push(chosen.key);
  if (d.memory.recentTypes.length > 6) d.memory.recentTypes.shift();
  d.memory.actionCounts[chosen.key] = (d.memory.actionCounts[chosen.key] ?? 0) + 1;

  const goals = Object.fromEntries(Object.entries(W).map(([k, v]) => [k, Math.round(v * 100) / 100]));
  think(s, {
    kind: 'decision', title, lines, unexpected, goals,
    candidates: cands.slice(0, 5).map((c) => ({ label: c.label, emoji: c.emoji, score: c.score, parts: c.parts, chosen: c === chosen })),
  });
}

/** Called each tick while a building action is in progress. */
export function updatePending(s: SimState) {
  const d = s.daemon;
  if (!d.pending) return;
  if (s.time >= d.pending.castAt && d.mood === 'flying') d.mood = 'casting';
  if (s.time >= d.pending.doneAt) {
    const { typeId, siteId, reason } = d.pending;
    d.pending = null;
    if (!siteAvailable(s, SITE_BY_ID[siteId])) { d.target = { ...DAEMON_HOME }; d.mood = 'calm'; return; }
    const p = applyTransformation(s, typeId, siteId, reason);
    const t = TYPE_BY_ID[typeId];
    d.mood = 'delighted';
    d.target = { ...DAEMON_HOME };
    const site = SITE_BY_ID[siteId];
    addEvent(s, 'transform', t.emoji, t.name, `The daemon ${t.verb} (${siteLabel(site)}).`, false, p.pos);
    onceEvent(s, 'firstTransform', 'firstTransform', '✨', 'The first transformation!',
      `With a puff of glitter, the daemon decided to ${t.verb}. The city will never be the same.`, p.pos);
    if (t.site === 'house') {
      const owner = CITIZEN_DEFS.findIndex((c) => c.homeId === site.buildingId);
      addEvent(s, 'houseTransform', t.emoji, `${BUILDING_BY_ID[site.buildingId!].name} is now a ${t.name}!`,
        `A former human home becomes ${t.id === 'catCastle' ? 'a turreted castle for cats' : 'a luxury hotel with a pillow menu'}. ${owner >= 0 ? s.citizens[owner].name + ' watches from the street.' : ''}`, true, p.pos);
    }
    if (s.demand && !s.demand.fulfilled && s.demand.typeId === typeId) {
      s.demand.fulfilled = true;
      const cat = s.cats[s.demand.catId];
      cat.needs.comfort = Math.min(100, cat.needs.comfort + 30);
      cat.needs.curiosity = Math.min(100, cat.needs.curiosity + 20);
      addEvent(s, 'demandMet', '😻', `${cat.name}’s demand fulfilled`, `${cat.name} got their ${t.name}. They will now pretend not to care.`, true, p.pos);
      fx(s, { kind: 'heart', to: { ...cat.pos, y: cat.pos.y + 1 } });
    }
    const pr = cityProgress(s);
    if (pr >= 0.5) onceEvent(s, 'half', 'utopia', '🐾', 'Half of the city now belongs to cats', 'Benches, rooftops and streets have tipped: the city is now more feline than human.');
    if (pr >= 0.9) onceEvent(s, 'utopia', 'utopia', '👑', 'CATOPIA achieved', 'The feline utopia is complete. Humans are now politely tolerated guests.');
  }
}

// ── OFFERINGS ────────────────────────────────────────────────
export function receiveOffering(s: SimState, citizenId: number, itemId: string, energyOverride?: number) {
  const d = s.daemon;
  const item = ITEMS[itemId];
  const wishMatch = (item.yields[d.wish] ?? 0) > 0;
  const energy = energyOverride ?? Math.round(item.energy * (wishMatch ? 1.4 : 1));
  const wasAsleep = !d.awake;
  d.energy = Math.min(100, d.energy + energy);
  for (const [k, v] of Object.entries(item.yields)) d.resources[k as ResKey] += v ?? 0;
  if (itemId === 'house' && citizenId >= 0) d.houseQueue.push({ houseId: s.citizens[citizenId].homeId, citizenId });
  const rec = { day: s.day, hour: s.hour, citizenId, itemId, energy, wishMatch };
  d.memory.offerings.push(rec);
  if (d.memory.offerings.length > 300) d.memory.offerings.shift();
  d.memory.energyByDay[s.day] = (d.memory.energyByDay[s.day] ?? 0) + energy;
  const tr = (d.memory.trust[citizenId] ??= { total: 0, count: 0, stingy: 0 });
  tr.total += item.price; tr.count++;
  if (item.price <= 2) tr.stingy++;

  const who = citizenId >= 0 ? s.citizens[citizenId].name.split(' ')[0] : 'A mysterious visitor (you)';
  const lines = [`${who} offered ${item.emoji} ${item.name}: +${energy}⚡${wishMatch ? ' (exactly what I wished for!)' : ''}.`];
  if (item.edible) lines.push('This is human food — not safe or suitable for cats. I will only absorb its warmth as energy.');
  else if (Object.keys(item.yields).length) lines.push(`I extract ${Object.entries(item.yields).map(([k, v]) => `${RES_EMOJI[k as ResKey]}${v} ${RES_LABEL[k as ResKey]}`).join(', ')}.`);
  if (tr.stingy >= 3 && item.price <= 2) lines.push(`📓 Memory: that is the ${tr.stingy}th cheap offering from ${who}. I am taking notes.`);
  think(s, { kind: 'offering', title: `${who} brings an offering`, lines });

  if (d.mood !== 'flying' && d.mood !== 'casting' && d.awake) d.mood = 'delighted';
  fx(s, { kind: 'heart', to: { ...d.pos } });

  onceEvent(s, 'firstOffering', 'firstOffering', '🎁', 'The first offering',
    `${who} places ${item.emoji} ${item.name} at the shrine. Something in the shrine stirs…`, { x: 0, y: 2, z: 0 });
  if (item.price >= 40 && citizenId >= 0 && itemId !== 'house') {
    addEvent(s, 'valuable', '💎', `${who} donates a ${item.name}!`, `A valuable possession (${item.price} coins) for the cats. The daemon is visibly moved.`, !s.flags.valuable, { x: 0, y: 2, z: 0 });
    s.flags.valuable = true;
  }

  if (wasAsleep && d.energy >= WAKE_THRESHOLD) wake(s);
}

export function wake(s: SimState) {
  const d = s.daemon;
  d.awake = true;
  d.mood = 'delighted';
  d.target = { ...DAEMON_HOME };
  d.nextDecision = s.time + 0.4;
  if (!s.flags.firstWake) {
    s.flags.firstWake = true;
    addEvent(s, 'wake', '👁️', 'The daemon wakes up!', 'Fed by offerings, the ancient cat-spirit opens its enormous eyes and looks at the city… and at the cats… and starts to plan.', true, DAEMON_HOME);
    think(s, { kind: 'wake', title: 'I am awake.', lines: ['Mmm. Offerings. I perceive ten humans, six cats, and a city made entirely for the wrong species.', 'My goals: keep the cats happy, reshape the city for them, and stay awake.'] });
  } else {
    addEvent(s, 'wakeAgain', '🌅', 'The daemon wakes again', 'New offerings rekindle the daemon. Construction resumes!', true, DAEMON_HOME);
    think(s, { kind: 'wake', title: 'I am awake again.', lines: [`I slept ${d.memory.sleeps} time(s) so far. I will remember to budget my energy better.`] });
  }
}

export function fallAsleep(s: SimState) {
  const d = s.daemon;
  d.awake = false;
  d.energy = 0;
  d.pending = null;
  d.mood = 'asleep';
  d.target = { x: 0, y: 2.9, z: 0 };
  d.memory.sleeps++;
  addEvent(s, 'sleep', '😴', 'The daemon falls asleep', 'Without enough offerings, the daemon curls up in its shrine. All transformations stop until the citizens bring more.', true, DAEMON_HOME);
  think(s, { kind: 'sleep', title: 'zzz…', lines: ['My energy is gone. The offerings were not enough.', 'I will sleep until someone feeds the shrine.'] });
}

// ── NIGHTLY REFLECTION ───────────────────────────────────────
export function reflect(s: SimState) {
  const d = s.daemon;
  const todays = d.memory.offerings.filter((o) => o.day === s.day);
  const energyIn = d.memory.energyByDay[s.day] ?? 0;
  d.memory.energyByDay[s.day] = energyIn;
  const lines: string[] = [];
  lines.push(`🎁 ${todays.length} offerings today (+${Math.round(energyIn)}⚡).`);
  const best = todays.reduce<typeof todays[number] | null>((a, o) => (!a || ITEMS[o.itemId].price > ITEMS[a.itemId].price ? o : a), null);
  if (best) lines.push(`💎 Most precious: ${ITEMS[best.itemId].emoji} ${ITEMS[best.itemId].name} from ${best.citizenId >= 0 ? s.citizens[best.citizenId].name.split(' ')[0] : 'the visitor'}.`);

  // Memory: neglected cats
  for (const c of s.cats) {
    const cur = d.memory.neglect[c.id] ?? 0;
    d.memory.neglect[c.id] = c.happiness < 48 ? cur + 1 : Math.max(0, cur - 1);
    if (d.memory.neglect[c.id] >= 1 && c.happiness < 48) lines.push(`😿 ${c.name} felt neglected (${d.memory.neglect[c.id]} day${d.memory.neglect[c.id] > 1 ? 's' : ''}). Tomorrow I prioritise them.`);
  }
  // Memory: citizens
  const fritz = s.citizens[LAZY_ID];
  if (!fritz.isServant && fritz.daysWithoutWork >= 2) lines.push(`🛋 ${fritz.name.split(' ')[0]} skipped work again (${fritz.daysWithoutWork} days). His possessions are dwindling. Interesting.`);
  const stingy = Object.entries(d.memory.trust).filter(([, t]) => t.stingy >= 3).map(([id]) => s.citizens[+id]?.name.split(' ')[0]).filter(Boolean);
  if (stingy.length) lines.push(`🧾 Noted: ${stingy.join(', ')} keep offering the cheapest things.`);

  // Tomorrow: whim + wish (the material missing for my most desired unaffordable plan)
  const per = perceive(s);
  const wishes = buildCandidates(s, per, true).filter((c) => c.typeId).sort((a, b) => b.raw - a.raw);
  let wish: ResKey = d.wish;
  for (const c of wishes) {
    const t = TYPE_BY_ID[c.typeId!];
    const missing = (Object.keys(t.cost) as ResKey[]).find((k) => k !== 'house' && d.resources[k] < (t.cost[k] ?? 0));
    if (missing) { wish = missing; break; }
  }
  d.wish = wish;
  const oldWhim = d.whim.id;
  d.whim = pick(s, WHIMS.filter((w) => w.id !== oldWhim));
  lines.push(`🔮 Tomorrow I wish for ${RES_EMOJI[wish]} ${RES_LABEL[wish]}. My whim: ${d.whim.label} ${d.whim.emoji}.`);

  // Decrees: the city starts to *operate* differently.
  const pr = cityProgress(s);
  const decree = (id: string, at: number, title: string, text: string) => {
    if (pr >= at && !d.decrees.some((x) => x.id === id)) {
      d.decrees.push({ id, title, text, day: s.day });
      addEvent(s, 'decree', '📜', title, text, true, DAEMON_HOME);
      lines.push(`📜 I proclaim: ${title}.`);
    }
  };
  decree('benches', 0.12, 'Decree I: Benches belong to cats', 'Humans may no longer nap on public benches. Fritz is devastated.');
  decree('rightOfWay', 0.28, 'Decree II: Cat right-of-way', 'Humans must walk 15% slower so cats can cross streets with dignity.');
  decree('siesta', 0.45, 'Decree III: The Great Siesta', 'Offices close 13:00–14:00 so that the city is quiet for napping cats. Wages −10%.');
  decree('fishFriday', 0.65, 'Decree IV: Fish Fridays', 'Every fifth day the grocery gifts each citizen a fish — for offering, obviously.');

  const journal = `Day ${s.day}: ${todays.length} offerings (+${Math.round(energyIn)}⚡), cats ${Math.round(per.avgHappiness)}% happy, city ${Math.round(pr * 100)}% feline.`;
  d.memory.journal.push({ day: s.day, text: journal });
  s.history.push({ day: s.day, progress: pr, catHappiness: per.avgHappiness, energy: d.energy });
  think(s, { kind: 'reflection', title: `Night reflection — Day ${s.day}`, lines });
}

// ── CAT DEMANDS ──────────────────────────────────────────────
export function maybeDemand(s: SimState) {
  if (s.demand && !s.demand.fulfilled && s.day - s.demand.day < 2) return;
  if (!chance(s, s.day === 1 ? 1 : 0.55)) return;
  const sorted = [...s.cats].sort((a, b) => a.happiness - b.happiness);
  for (const cat of sorted) {
    const trait = CAT_DEFS[cat.id].trait;
    const options = DEMANDS.filter((x) => x.catTrait === trait).filter((o) => {
      const t = TYPE_BY_ID[o.typeId];
      if (t.max && countPlaced(s, t.id) >= t.max) return false;
      if (t.site === 'house') return s.daemon.houseQueue.length > 0;
      return SITES.some((x) => x.kind === t.site && siteAvailable(s, x));
    });
    if (!options.length) continue;
    const o = pick(s, options);
    s.demand = { catId: cat.id, text: o.text, typeId: o.typeId, day: s.day, fulfilled: false };
    cat.activity = 'demanding';
    cat.thought = '❗';
    cat.activityUntil = s.time + 1.2;
    cat.path = [];
    addEvent(s, 'demand', '📣', `${cat.name} has a demand`, `${cat.name} ${o.text}`, !s.flags.firstDemand, { ...cat.pos });
    s.flags.firstDemand = true;
    return;
  }
}

