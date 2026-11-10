// Verifies the "starve the daemon" path: sleep, then wake from a visitor offering.
import { createInitialState } from '../src/simulation/world';
import { fastForward } from '../src/simulation/engine';
import { visitorOffer } from '../src/simulation/citizens';
const s = createInitialState(20261109);
fastForward(s, 24 * 2 + 4); // day 3, 04:00
s.skipOfferingsDay = s.day;
for (const c of s.citizens) { c.plan.forgot = true; c.plan.offered = true; }
s.daemon.energy = Math.min(s.daemon.energy, 5);
fastForward(s, 14, (x) => !x.daemon.awake);
console.log('asleep:', !s.daemon.awake, 'at day', s.day, 'hour', s.hour.toFixed(1));
const before = s.placed.length;
fastForward(s, 2);
console.log('no building while asleep:', s.placed.length === before);
visitorOffer(s, 'sofa'); visitorOffer(s, 'fish');
console.log('awake after visitor offerings:', s.daemon.awake, 'energy', Math.round(s.daemon.energy));
