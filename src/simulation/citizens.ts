// ─────────────────────────────────────────────────────────────
// Citizens: schedules, work, wages, shopping, eating — and offerings.
// Each citizen is a small state machine whose choices are coloured by a
// personality vector (generosity, diligence, caution, ambition, anxiety…).
// ─────────────────────────────────────────────────────────────

import { LAZY_ID, SERVANT_TASKS } from '../data/characters';
import { BUILDING_BY_ID, DAEMON_HOME } from '../data/city';
import { GROCERY_STOCK, HOME_STOCK, ITEMS } from '../data/items';
import { receiveOffering, wake, WAKE_THRESHOLD } from '../daemon/brain';
import { addEvent, diary, fx, onceEvent, think } from './log';
import { advance, route } from './paths';
import { chance, rand, randRange, weightedPick } from './rng';
import type { Citizen, SimState, Vec2, Vec3 } from './types';
import { NEED_KEYS } from './types';
import { cityProgress, HOMELESS_SPOT } from './world';

const lane = (c: Citizen) => ((c.id % 5) - 2) * 0.5;
const edibleCount = (c: Citizen) => c.inventory.filter((i) => ITEMS[i]?.edible).length;
const hasDecree = (s: SimState, id: string) => s.daemon.decrees.some((d) => d.id === id);

export function homePoint(s: SimState, c: Citizen): Vec2 {
  if (c.ownsHouse) return BUILDING_BY_ID[c.homeId].door;
  if (c.isServant) return BUILDING_BY_ID[c.homeId].door; // sleeps in the castle's broom closet
  return HOMELESS_SPOT;
}

function workPoint(c: Citizen): Vec3 {
  const b = BUILDING_BY_ID[c.workplaceId];
  const side = ((c.id * 7) % 3) - 1;
  return { x: b.door.x + Math.cos(b.rot) * side * 0.9, y: 0, z: b.door.z - Math.sin(b.rot) * side * 0.9 };
}

function shrinePoint(c: Citizen): Vec3 {
  const a = (c.id / 10) * Math.PI * 2 + 0.3;
  return { x: Math.cos(a) * 2.9, y: 0, z: Math.sin(a) * 2.9 };
}

function walkTo(c: Citizen, to: Vec3 | Vec2) {
  const t: Vec3 = 'y' in to ? to : { x: to.x, y: 0, z: to.z };
  c.path = route(c.pos, t, lane(c));
  c.segFrom = null;
}

/** New day: each citizen plans their day (with personal randomness). */
export function planDay(s: SimState, c: Citizen) {
  const p = c.personality;
  const broke = c.money < 10 && edibleCount(c) === 0;
  let diligence = p.diligence + (broke && p.label !== 'lazy' ? 0.12 : 0);
  if (s.weather === 'rainy') diligence -= 0.05;
  const offerEarly = !c.isServant && (p.generosity >= 0.7 || p.anxiety >= 0.8);
  c.plan = {
    wake: 6 + rand(s) * 0.6,
    workStart: 8,
    workEnd: 15.6 + rand(s) * 0.9,
    offerHour: 18.4 + (1 - p.generosity) * 1.6 + rand(s) * 0.8,
    goesToWork: !c.isServant && rand(s) < diligence,
    shop: 'grocery', worked: false, offered: false, shopped: false, ate: false,
    servantNextTask: 8, offerEarly, extraStop: false, forgot: false,
  };
  // Weather and demo "forgetfulness" can make citizens skip their offering.
  if (s.skipOfferingsDay === s.day) c.plan.forgot = true;
  else if (s.weather === 'rainy' && rand(s) < (p.anxiety > 0.7 || p.generosity > 0.8 ? 0.25 : 0.65)) c.plan.forgot = true;
  if (c.plan.forgot) c.plan.offered = true;
  c.speed = hasDecree(s, 'rightOfWay') ? 11 : 13;
}

// ── shopping ─────────────────────────────────────────────────
function shopFor(s: SimState, c: Citizen) {
  const p = c.personality;
  const reserve = 6 + p.caution * 30;
  const bought: string[] = [];
  const buy = (id: string) => {
    const it = ITEMS[id];
    if (c.money < it.price) return false;
    c.money -= it.price;
    c.inventory.push(id);
    bought.push(it.emoji);
    // Cats' favourite by-product of consumerism:
    if (it.shop === 'home' && it.price >= 10 && chance(s, 0.45)) { c.inventory.push('box'); bought.push('📦'); }
    return true;
  };
  const sold: string[] = [];

  if (c.plan.shop === 'grocery') {
    let n = 0;
    while (edibleCount(c) < 3 && n < 2 && c.money >= 8) { if (!buy(chance(s, 0.7) ? 'groceries' : 'bread')) break; n++; }
    // Cat-loving citizens buy something specifically to offer.
    const catItems = GROCERY_STOCK.filter((i) => !ITEMS[i].edible);
    if (c.money - reserve > 12 && rand(s) < p.generosity * 0.6 + p.catLove * 0.4 - 0.25) {
      const w = catItems.map((i) => 1 + (ITEMS[i].yields[s.daemon.wish] ? p.ambition * 4 : 0) + (i === 'plant' && c.name.startsWith('Ida') ? 4 : 0));
      buy(weightedPick(s, catItems, w));
    }
  } else {
    // The home store. The broke sell things here; others buy.
    if (c.money < 8 && edibleCount(c) === 0) {
      const sellable = c.inventory.filter((i) => ITEMS[i].price >= 10 && !ITEMS[i].edible);
      if (sellable.length) {
        const id = sellable.sort((a, b) => ITEMS[a].price - ITEMS[b].price)[0];
        c.inventory.splice(c.inventory.indexOf(id), 1);
        const gain = Math.round(ITEMS[id].price * 0.5);
        c.money += gain;
        sold.push(ITEMS[id].name);
        diary(s, c.id, `Sold my ${ITEMS[id].name} for ${gain} coins. Needed food.`);
      }
    } else if (c.money - reserve > 10) {
      const opts = HOME_STOCK.filter((i) => ITEMS[i].price <= c.money - reserve);
      if (opts.length) {
        const w = opts.map((i) => {
          const it = ITEMS[i];
          const catty = Object.keys(it.yields).some((k) => ['soft', 'toy', 'box', 'wood'].includes(k)) ? 1 : 0;
          return 0.5 + catty * (p.catLove + p.generosity) + (it.yields[s.daemon.wish] ? p.ambition * 3 : 0) + (it.furniture ? (1 - p.generosity) * 1.5 : 0);
        });
        buy(weightedPick(s, opts, w));
      }
    }
    if (edibleCount(c) < 1 && c.money >= 8) c.plan.extraStop = true;
  }
  if (bought.length) c.thought = bought.join('');
  if (bought.length) diary(s, c.id, `Bought ${bought.join(' ')} (${Math.round(c.money)} coins left).`);
  if (sold.length) {
    c.thought = '💸';
    if (c.id === LAZY_ID) addEvent(s, 'pawn', '💸', `${c.name.split(' ')[0]} sells his ${sold[0]}`, 'No job, no money, no snacks. Something had to go.', false, { ...c.pos });
  }
}

// ── offerings ────────────────────────────────────────────────
export function chooseOffering(s: SimState, c: Citizen): string {
  const p = c.personality;
  const unique = [...new Set(c.inventory)];
  if (!unique.length) return c.ownsHouse ? 'house' : 'labor';
  const d = s.daemon;
  const worried = !d.awake || d.energy < 30;
  let best = unique[0], bestScore = -Infinity;
  for (const id of unique) {
    const it = ITEMS[id];
    const v = it.price / 50;
    let sc = p.generosity * v * 1.3 - (1 - p.generosity) * v * 1.6;
    if (Object.keys(it.yields).length) sc += p.catLove * 0.45;
    if ((it.yields[d.wish] ?? 0) > 0) sc += 0.25 + p.ambition * 1.3;
    if (worried) sc += p.anxiety * (it.energy / 14);
    sc += d.dreamBoost * (it.energy / 15);
    if (it.edible) sc -= (edibleCount(c) <= 1 ? p.caution * 2 + 0.6 : 0.2) + (c.hunger > 35 ? 0.8 : 0);
    if (id === 'bed') sc -= 0.9;
    if (id === 'sofa' && unique.length > 2) sc -= 0.3;
    sc += rand(s) * 0.35;
    if (sc > bestScore) { bestScore = sc; best = id; }
  }
  return best;
}

function makeOffering(s: SimState, c: Citizen) {
  const id = chooseOffering(s, c);
  const it = ITEMS[id];
  if (id === 'house') {
    c.ownsHouse = false;
    addEvent(s, 'houseOffer', '🏠', `${c.name.split(' ')[0]} offers his entire house!`,
      `With nothing else left, ${c.name} hands the daemon the keys to ${BUILDING_BY_ID[c.homeId].name}. The cats are already measuring the curtains.`, true, { ...c.pos });
    diary(s, c.id, 'Gave away my house. I will sleep in a cardboard box behind the square. It is surprisingly cosy.');
  } else if (id === 'labor') {
    becomeServant(s, c);
  } else {
    c.inventory.splice(c.inventory.indexOf(id), 1);
    diary(s, c.id, `Offered ${it.emoji} ${it.name} to the daemon.`);
  }
  c.offeringHistory.push({ day: s.day, hour: s.hour, citizenId: c.id, itemId: id, energy: it.energy, wishMatch: false });
  c.thought = it.emoji;
  fx(s, { kind: 'offering', from: { x: c.pos.x, y: 0.9, z: c.pos.z }, to: { ...s.daemon.pos }, emoji: it.emoji, color: it.color });
  receiveOffering(s, c.id, id);
  // The lazy storyline: running out of possessions.
  if (c.id === LAZY_ID && c.inventory.length === 0 && c.ownsHouse) {
    onceEvent(s, 'lazyBroke', 'lazyBroke', '🕳️', `${c.name.split(' ')[0]} has nothing left`,
      'No sofa. No TV. Not even a sock. Only his house remains… and the daemon has noticed.', { ...c.pos });
  }
}

function becomeServant(s: SimState, c: Citizen) {
  c.isServant = true;
  c.servantTask = null;
  addEvent(s, 'servant', '🐾', `${c.name.split(' ')[0]} becomes the cats’ servant`,
    `Owning nothing, ${c.name} offers the only thing left: his time and labour. The daemon solemnly appoints him Official Personal Servant to the Cats (unpaid, costume mandatory).`, true, { ...c.pos });
  think(s, { kind: 'servant', title: 'A human offers himself.', lines: [
    `${c.name} has offered his time. I perceive he has no possessions, no house, and remarkable stamina for lying down.`,
    'Decision: he shall serve the cats. Tasks will be assigned by whichever cat is least content.',
    'He will be fed (human food, from the daemon pantry). He will wear the costume.',
  ] });
  diary(s, c.id, 'I offered my time. They gave me cat ears. I think I have made a terrible mistake.');
}

// ── servant duties (the lazy citizen's absurd new career) ────
function servantStep(s: SimState, c: Citizen, dtH: number) {
  c.hunger = Math.max(0, c.hunger - 3 * dtH); // fed from the daemon pantry
  const h = s.hour;
  const working = h >= 7.5 && h < 20.5 && s.daemon.awake;
  if (!working) {
    releaseServantCat(s, c);
    if (c.activity !== 'goingHome' && c.activity !== 'sleeping' && c.activity !== 'resting') {
      walkTo(c, homePoint(s, c)); c.activity = 'goingHome'; c.thought = '😩';
    }
    if (c.activity === 'goingHome' && advance(c, dtH)) { c.activity = h >= 20.5 || h < 6 ? 'sleeping' : 'resting'; c.indoors = c.activity === 'sleeping'; }
    if (!s.daemon.awake && c.activity === 'resting') c.thought = '🙏';
    return;
  }
  c.indoors = false;
  if (c.activity !== 'servant' || s.time >= c.activityUntil) {
    releaseServantCat(s, c);
    // The daemon (via the least happy cat) picks the next ridiculous task.
    const cat = [...s.cats].filter((k) => k.activity !== 'demanding').sort((a, b) => a.happiness - b.happiness)[0] ?? s.cats[0];
    const need = NEED_KEYS.reduce((a, b) => ((100 - cat.needs[b]) * cat.prefs[b] > (100 - cat.needs[a]) * cat.prefs[a] ? b : a));
    const options = SERVANT_TASKS.filter((t) => t.need === need);
    const recent = c.servantTask;
    const pool = (options.length ? options : SERVANT_TASKS).filter((t) => t.id !== recent);
    const task = pool.length ? pool[Math.floor(rand(s) * pool.length)] : SERVANT_TASKS[0];
    c.activity = 'servant';
    c.servantTask = task.id;
    c.servantCatId = cat.id;
    c.activityUntil = s.time + randRange(s, 1.6, 2.4);
    c.thought = ['😩', '😵', '😓', '😰'][Math.floor(rand(s) * 4)];
    cat.activity = 'carried';
    cat.activityUntil = c.activityUntil;
    cat.path = [];
    cat.thought = '👑';
    const line = `${c.name.split(' ')[0]} ${task.text.replaceAll('{cat}', cat.name)}`;
    s.servantLog.push(`Day ${s.day} · ${task.emoji} ${line}`);
    addEvent(s, 'servantTask', task.emoji, task.title, line, !s.flags['task_' + task.id], { ...c.pos });
    s.flags['task_' + task.id] = true;
    if (task.id === 'carry' || task.id === 'stroller') {
      const loop: Vec3[] = [{ x: 7, y: 0, z: 7 }, { x: -7, y: 0, z: 7 }, { x: -7, y: 0, z: -7 }, { x: 7, y: 0, z: -7 }];
      const start = Math.floor(rand(s) * 4);
      c.path = [...route(c.pos, loop[start], 0), ...[1, 2, 3, 4].map((i) => loop[(start + i) % 4])];
    } else {
      const spots: Vec3[] = [{ x: -2.2, y: 0, z: -4.6 }, { x: 4.6, y: 0, z: 1.5 }, { x: -4.7, y: 0, z: -1.2 }, { x: 1.6, y: 0, z: 4.7 }];
      c.path = route(c.pos, spots[Math.floor(rand(s) * spots.length)], 0);
    }
    c.segFrom = null;
  }
  advance(c, dtH * (c.servantTask === 'carry' ? 0.55 : 0.8));
  // The cat rides along / is pampered.
  const cat = c.servantCatId !== null ? s.cats[c.servantCatId] : null;
  if (cat) {
    const t = SERVANT_TASKS.find((x) => x.id === c.servantTask)!;
    cat.needs[t.need] = Math.min(100, cat.needs[t.need] + 14 * dtH);
    cat.needs.comfort = Math.min(100, cat.needs.comfort + 4 * dtH);
    const fx_ = Math.sin(c.heading), fz = Math.cos(c.heading);
    const off: Record<string, Vec3> = {
      carry: { x: 0, y: 1.05, z: 0 }, bed: { x: 0, y: 0.38, z: 0 }, feather: { x: fx_ * 1.0, y: 0, z: fz * 1.0 },
      tower: { x: fx_ * 0.9, y: 1.6, z: fz * 0.9 }, serve: { x: fx_ * 0.9, y: 0, z: fz * 0.9 },
      stroller: { x: fx_ * 0.85, y: 0.42, z: fz * 0.85 }, massage: { x: fx_ * 0.75, y: 0.05, z: fz * 0.75 },
    };
    const o = off[c.servantTask!] ?? { x: 0, y: 0, z: 0 };
    cat.pos.x = c.pos.x + o.x; cat.pos.y = c.pos.y + o.y; cat.pos.z = c.pos.z + o.z;
    cat.heading = c.heading + (c.servantTask === 'feather' || c.servantTask === 'serve' || c.servantTask === 'massage' ? Math.PI : 0);
  }
  c.hunger = Math.min(100, c.hunger);
}

function releaseServantCat(s: SimState, c: Citizen) {
  if (c.servantCatId === null) return;
  const cat = s.cats[c.servantCatId];
  if (cat.activity === 'carried') { cat.activity = 'idle'; cat.activityUntil = s.time; cat.pos.y = 0; cat.thought = '😼'; }
  c.servantCatId = null;
}

// ── the main per-tick update ─────────────────────────────────
export function updateCitizen(s: SimState, c: Citizen, dtH: number) {
  const h = s.hour;
  const p = c.personality;
  c.hunger = Math.min(100, c.hunger + (c.activity === 'sleeping' ? 0.7 : 2.2) * dtH);
  // Happiness drifts towards a personality- and situation-dependent target.
  const pr = cityProgress(s);
  const target = 25 + p.cheer * 50 - c.hunger * 0.35 + Math.min(c.money, 120) * 0.12 + (p.catLove - 0.45) * pr * 40
    + (c.ownsHouse ? 0 : -10) + (c.isServant ? -5 : 0);
  c.happiness += (Math.max(0, Math.min(100, target)) - c.happiness) * Math.min(1, dtH * 0.4);

  if (c.isServant) { servantStep(s, c, dtH); return; }

  switch (c.activity) {
    case 'sleeping': {
      if (h >= c.plan.wake && h < 20) {
        c.indoors = false;
        c.activity = 'waking';
        c.activityUntil = s.time + 0.35;
        c.thought = c.hunger > 60 ? '🍽️' : '☀️';
        const hp = homePoint(s, c);
        c.pos.x = hp.x; c.pos.z = hp.z; c.pos.y = 0;
      }
      break;
    }
    case 'waking': {
      if (s.time < c.activityUntil) break;
      if (c.plan.offerEarly && !c.plan.offered) { goOffer(s, c); break; }
      startDayAfterMorning(s, c);
      break;
    }
    case 'commuting': {
      if (advance(c, dtH)) { c.activity = 'working'; c.thought = '💼'; c.heading = BUILDING_BY_ID[c.workplaceId].rot + Math.PI; }
      break;
    }
    case 'working': {
      const siesta = hasDecree(s, 'siesta') && h >= 13 && h < 14;
      c.thought = siesta ? '😴' : '💼';
      if (h >= c.plan.workEnd) {
        const wage = Math.round(c.wage * (hasDecree(s, 'siesta') ? 0.9 : 1));
        c.money += wage;
        c.plan.worked = true;
        c.daysWithoutWork = 0;
        diary(s, c.id, `Worked as ${c.job}. Earned ${wage} coins.`);
        c.thought = '💰';
        goShop(s, c);
      }
      break;
    }
    case 'lazing': {
      if (c.path.length) { advance(c, dtH); break; }
      c.thought = ['💤', '🎮', '☁️', '🥱'][Math.floor(s.time * 0.7) % 4];
      if (h >= 15.5) {
        c.daysWithoutWork++;
        if (c.id === LAZY_ID && c.daysWithoutWork === 1 && !s.flags.lazyFirst) {
          s.flags.lazyFirst = true;
          addEvent(s, 'lazy', '🛋️', `${c.name.split(' ')[0]} skips work`, `While everyone works, ${c.name} has “a strategic rest”. His wallet is getting thin.`, true, { ...c.pos });
        }
        goShop(s, c);
      }
      break;
    }
    case 'toShop': {
      if (advance(c, dtH)) { c.activity = 'shopping'; c.activityUntil = s.time + 0.4; c.thought = '🛍️'; }
      break;
    }
    case 'shopping': {
      if (s.time < c.activityUntil) break;
      shopFor(s, c);
      c.plan.shopped = true;
      if (c.plan.extraStop && c.plan.shop === 'home') {
        c.plan.extraStop = false;
        c.plan.shop = 'grocery';
        walkTo(c, BUILDING_BY_ID.grocery.door);
        c.activity = 'toShop';
        break;
      }
      walkTo(c, homePoint(s, c));
      c.activity = 'goingHome';
      break;
    }
    case 'goingHome': {
      if (!advance(c, dtH)) break;
      if (!c.plan.ate) {
        c.activity = 'eating'; c.indoors = !!c.ownsHouse; c.activityUntil = s.time + 0.6; c.thought = '🍲';
      } else {
        c.activity = 'relaxing'; c.thought = '☕';
      }
      break;
    }
    case 'eating': {
      if (s.time < c.activityUntil) break;
      eat(s, c);
      c.plan.ate = true;
      c.indoors = false;
      c.activity = 'relaxing';
      break;
    }
    case 'relaxing': {
      if (!c.plan.offered && h >= c.plan.offerHour && h < 23) { goOffer(s, c); break; }
      if (h >= 22.2 || h < c.plan.wake - 0.5) { c.activity = 'sleeping'; c.indoors = c.ownsHouse; c.thought = '💤'; }
      else c.thought = c.plan.forgot && s.weather === 'rainy' ? '🌧️' : c.hunger > 70 ? '😣' : c.ownsHouse ? '☕' : '📦';
      break;
    }
    case 'toShrine': {
      if (c.plan.forgot) { c.thought = '🤔'; walkTo(c, homePoint(s, c)); c.activity = 'goingHome'; break; }
      if (advance(c, dtH)) {
        c.activity = 'offering';
        c.activityUntil = s.time + 0.45;
        c.heading = Math.atan2(-c.pos.x, -c.pos.z);
        c.thought = '🙏';
        makeOffering(s, c);
        c.plan.offered = true;
      }
      break;
    }
    case 'offering': {
      if (s.time < c.activityUntil) break;
      if (h < 12) startDayAfterMorning(s, c);
      else { walkTo(c, homePoint(s, c)); c.activity = 'goingHome'; }
      break;
    }
    case 'resting': {
      c.activity = 'relaxing';
      break;
    }
  }
  // Safety net: nobody should be stuck outside forever at night.
  if (h >= 23.6 && (c.activity === 'relaxing') ) { c.activity = 'sleeping'; c.indoors = c.ownsHouse; }
}

function startDayAfterMorning(s: SimState, c: Citizen) {
  if (c.plan.goesToWork) {
    walkTo(c, workPoint(c));
    c.activity = 'commuting';
    c.thought = '🚶';
    if (c.id === LAZY_ID && !s.flags.lazyWorks) {
      s.flags.lazyWorks = true;
      addEvent(s, 'lazyWorks', '😲', `${c.name.split(' ')[0]} goes to work?!`, 'Historians will remember this day. Do not get used to it.', false, { ...c.pos });
    }
  } else {
    // Lazy day: lounge on a public bench — unless benches now belong to cats.
    const spot = hasDecree(s, 'benches') || s.usedSites['bench-s3'] ? { x: homePoint(s, c).x + 0.8, z: homePoint(s, c).z + 0.6 } : { x: -14.5, z: 4.6 };
    walkTo(c, spot);
    c.activity = 'lazing';
    c.thought = '🥱';
  }
}

function goShop(s: SimState, c: Citizen) {
  const p = c.personality;
  if (c.money < 8 && edibleCount(c) === 0) c.plan.shop = 'home'; // need to sell something
  else if (edibleCount(c) < 2) c.plan.shop = 'grocery';
  else c.plan.shop = rand(s) < 0.45 + p.generosity * 0.2 ? 'home' : 'grocery';
  if (c.money < 8 && c.plan.shop === 'grocery') { walkTo(c, homePoint(s, c)); c.activity = 'goingHome'; return; }
  walkTo(c, BUILDING_BY_ID[c.plan.shop === 'grocery' ? 'grocery' : 'homestore'].door);
  c.activity = 'toShop';
  c.thought = '🛒';
}

function goOffer(s: SimState, c: Citizen) {
  walkTo(c, shrinePoint(c));
  c.activity = 'toShrine';
  c.thought = '🎁';
}

function eat(s: SimState, c: Citizen) {
  let meals = 0;
  while (c.hunger > 30 && meals < 2) {
    const idx = c.inventory.findIndex((i) => ITEMS[i]?.edible);
    if (idx < 0) break;
    const it = ITEMS[c.inventory[idx]];
    c.inventory.splice(idx, 1);
    c.hunger = Math.max(0, c.hunger - (it.edible ?? 0));
    meals++;
  }
  if (meals === 0 && c.hunger > 50) { c.thought = '😣'; diary(s, c.id, 'Nothing to eat tonight.'); }
}

/** The visitor (user) offers an item via the UI. */
export function visitorOffer(s: SimState, itemId: string) {
  const it = ITEMS[itemId];
  fx(s, { kind: 'offering', from: { x: 14, y: 9, z: 14 }, to: { ...s.daemon.pos }, emoji: it.emoji, color: it.color });
  receiveOffering(s, -1, itemId);
  if (!s.daemon.awake && s.daemon.energy >= WAKE_THRESHOLD) wake(s);
}

export { DAEMON_HOME };
