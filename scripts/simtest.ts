// Headless simulation test: runs N days and prints a daily summary.
// Usage: npm run simtest -- [days] [seed]
import { createInitialState, cityProgress, avgCatHappiness } from '../src/simulation/world';
import { step, STEP } from '../src/simulation/engine';
import { ITEMS } from '../src/data/items';

const days = Number(process.argv[2] ?? 10);
const seed = Number(process.argv[3] ?? 20261109);
const s = createInitialState(seed);
let minE = 100;
let lastDay = s.day;
let lastEvent = 0;
const t0 = Date.now();
while (s.day <= days) {
  step(s, STEP);
  s.fx.length = 0;
  if (s.daemon.awake) minE = Math.min(minE, s.daemon.energy);
  for (const e of s.events.slice(lastEvent)) if (e.important) console.log(`   [D${e.day} ${e.hour.toFixed(1)}] ${e.emoji} ${e.title}`);
  lastEvent = s.events.length;
  if (s.day !== lastDay) {
    const offers = s.daemon.memory.offerings.filter((o) => o.day === lastDay);
    const f = s.citizens[3];
    console.log(`Day ${lastDay}: offers=${offers.length} energyIn=${Math.round(s.daemon.memory.energyByDay[lastDay] ?? 0)} energy=${Math.round(s.daemon.energy)} minE=${Math.round(minE)} awake=${s.daemon.awake} built=${s.placed.length} progress=${Math.round(cityProgress(s) * 100)}% cats=${Math.round(avgCatHappiness(s))} food=${s.daemon.foodStock} res=${JSON.stringify(s.daemon.resources)} weather=${s.weather}`);
    console.log(`   Fritz: money=${f.money} inv=[${f.inventory.join(',')}] house=${f.ownsHouse} servant=${f.isServant} hunger=${Math.round(f.hunger)}`);
    console.log(`   offers: ${offers.map((o) => ITEMS[o.itemId].emoji).join('')}  money: ${s.citizens.map((c) => Math.round(c.money)).join(',')}  inv: ${s.citizens.map((c) => c.inventory.length).join(',')}`);
    console.log(`   cats: ${s.cats.map((c) => c.name.split(' ')[0] + ':' + Math.round(c.happiness)).join(' ')}`);
    minE = 100;
    lastDay = s.day;
  }
}
const types: Record<string, number> = {};
for (const p of s.placed) types[p.typeId] = (types[p.typeId] ?? 0) + 1;
console.log('built types', types);
console.log('actions', s.daemon.memory.actionCounts);
console.log('ms', Date.now() - t0);
