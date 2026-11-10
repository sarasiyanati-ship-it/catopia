# CATOPIA — The City That Belongs to Cats

*An individual project for **Pandaemonium – Nonsense Daemon**, Bauhaus-Universität Weimar.*

A cute, playable 3D browser simulation of a miniature city that is slowly rebuilt — bench by bench, roof by roof — for its feline inhabitants by a daemon that lives on the offerings of its human citizens.

| | |
|---|---|
| **Theme 4** | The city is adapting to non-human users. |
| **Constraint 9** | Your daemon lives on offerings. Without them it falls asleep. |

---

## 1. Project concept

Ten citizens live, work, shop and eat in a toy-like diorama city. Six cats wander its streets. In the central shrine sleeps a dormant daemon — part cat spirit, part tiny urban god, part whimsical architect (it wears a skyline as a crown and is orbited by a golden compass and pencil).

Every citizen must bring one offering per day. The offerings wake the daemon, give it **energy**, and are broken down into **materials** (soft things, wood, toys, boxes, plants, cat food, decorations, whole houses, human labour). The daemon perceives what the cats need, remembers what happened, weighs competing goals and spends its energy transforming the city. Human benches become giant cat beds, roofs become playgrounds, streets acquire a second elevated circulation network for cats, and an abandoned house becomes a cat castle or luxury cat hotel.

If the offerings run dry, the daemon falls asleep — and the transformation of the city stops until someone feeds the shrine again.

Running through it all is the story of **Fritz Faulenzer**, the lazy citizen, who avoids work until he has sold or offered every possession, then his house, and finally offers his own time and labour — and is appointed the cats’ personal servant (cat costume mandatory).

## 2. The daemon

The daemon is a **transparent, simulated decision system** (a utility-based agent). It is *not* a language model or any real AI. Everything it “thinks” is computed locally by readable rules in [`src/daemon/brain.ts`](src/daemon/brain.ts) and is shown in the **Daemon Thoughts** panel.

### Perception
`perceive()` builds a snapshot of the world each time the daemon decides:
- every cat’s six needs (hunger, comfort, play, rest, safety, curiosity), weighted by that cat’s personality → an aggregated *need deficit* per need;
- the neediest cat and the cat that has been neglected longest (from memory);
- available materials and energy, the free building sites in the city, existing transformations;
- a forecast of tonight’s offering income (from memory).

### Memory
Stored in `daemon.memory` and visible in the *Memory* tab:
- every offering (who, what, when, energy, whether it matched the daemon’s wish);
- energy received per day → used to forecast future income;
- per-citizen trust (total value offered, “stingy” offerings counted);
- which cats felt neglected and for how many days;
- recent action types (to avoid repetition) and how often cats used each structure;
- a nightly journal and the number of times it fell asleep.

### Goals (weighted, recomputed for each decision)
| Goal | Grows when… |
|---|---|
| **wellbeing** | cats’ needs are unmet |
| **transform** | the city is still human-centred |
| **survive** (stay awake) | the energy forecast before the evening offerings looks too low |
| **whim** | always present — a strange daily personal preference (“obsessed with round things”, “deeply moved by cardboard”…) |
| **fairness** | a cat has been neglected for several days |
| **novelty** | (negative) the same action was chosen recently |
| **demand** | a cat has issued a ridiculous demand |

### Decision-making
For every possible action (≈20 architectural transformation types × available sites, plus *feed the cats*, *rest* and *whisper into citizens’ dreams*) the daemon computes

`score = Σ (goal weight × the action’s contribution to that goal) + chaos`

where **chaos** is a small seeded random term (0–0.35). The best-scoring affordable action wins. The panel shows the top five options as stacked bars, so you can see *why*. When chaos or the whim overturn the purely rational choice, the thought is flagged **🎲 surprise** and explained (“Logic said Wall Tunnel, but a spark of chaos pulled me here”).

Site choice is also reasoned: near the cat who suffers most from the relevant need, or — for walkways and bridges — connected to the existing elevated network.

### Actions
- transform architecture (see §4) — the daemon physically flies to the site, casts a beam and the geometry springs into existence;
- fill the food bowls (turns cat-safe food into meals);
- rest to save energy; whisper into dreams (citizens bring richer offerings tomorrow);
- appoint and command a human servant;
- proclaim **decrees** that change how the city operates (benches reserved for cats, humans walk slower to give cats right-of-way, an office siesta that lowers wages, Fish Fridays).

### Energy & sleep
Existing costs energy every hour (more at night, when it dreams), and every action costs energy. Offerings are the only income. At 0 energy the daemon falls asleep on its shrine cushion (eyes closed, Zzz’s, dimmed glow) and all transformations stop. It wakes once offerings bring it back to 30 energy. Sleep can happen naturally (e.g. a rainy day keeps citizens at home and breaks the daemon’s income forecast) or via the *Starve the daemon* demo.

### Night reflection
At 23:00 the daemon reflects: updates neglect memory, notes lazy or stingy citizens, decides tomorrow’s **whim** and **wish** (the material missing for its most desired unaffordable plan — citizens with ambition or anxiety will try to bring it), and proclaims decrees when thresholds are reached.

## 3. Citizen economy & offerings

Each citizen ([`src/simulation/citizens.ts`](src/simulation/citizens.ts), data in [`src/data/characters.ts`](src/data/characters.ts)) has a home, a job and wage, money, an inventory, hunger and happiness, a personality vector (generosity, diligence, caution, ambition, anxiety, cat-love, cheer), an offering history and a diary.

**Daily schedule:** wake at home → (early offerers visit the shrine first) → walk to work and earn wages *or* skip work → shop at the Corner Grocery or the Cozy Home Store → go home and eat → walk to the shrine and offer → sleep.

**Economy:** wages are paid at the end of a worked day; groceries keep hunger down; surplus money is spent according to personality (furniture for the selfish, cat-relevant goods for the generous, the daemon’s wished-for material for the ambitious). Purchases sometimes come in a free cardboard box. Broke citizens sell possessions at the home store for half price.

**Offering choice** is a per-item score: generous citizens prefer valuable things, selfish ones the cheapest; cat-loving citizens prefer items cats can use; ambitious citizens chase the daemon’s wish; anxious citizens give energy-rich items when the daemon looks sleepy; cautious citizens protect their food. With nothing left, a citizen offers their **house**, and after that their **time and labour**.

**Safety for cats:** human food (groceries, bread) is never turned into cat food — the daemon only absorbs its energy and says so. Cat food comes from boneless cooked fish, cat-safe treats and lactose-free cat milk.

Personalities: Hanna (generous), Otto (cheerful), Lotte (anxious), **Fritz (lazy)**, Klara (ambitious), Emil (cautious), Selma (selfish), Theo (dreamy), Ida (nature-loving), Paul (thrifty).

## 4. Cats

Six cats ([`src/simulation/cats.ts`](src/simulation/cats.ts)) — Mandarine (sleepy orange tabby), Pepper (playful black climber), Duchess Blanche (spoiled white Persian), Nebel (shy grey), Flicken (curious calico), Knödel (chunky, hungry tuxedo). Each need decays at a personal rate; a cat picks its most urgent need (weighted by personality, time of day and weather) and walks to the best place in the *current* city that satisfies it — at first only hard benches, trees and the shrine bowl; later beds, nests, forts, tunnels and walkways. Cats leap onto rooftops and walkways, inspect new structures (and fall in love with ones matching their favourite tags), sleep, play, hide, eat — and occasionally march to the shrine to issue a ridiculous demand that the daemon factors into its decisions.

## 5. Architectural transformations

Implemented as real procedural 3D geometry ([`src/world/Transformations.tsx`](src/world/Transformations.tsx)), with ~120 sites ([`src/data/city.ts`](src/data/city.ts)):

| Transformation | Replaces / where |
|---|---|
| Giant Cat Bed | public benches (bench disappears) |
| Scratching Post | street lamps |
| Rooftop Playground, Cloud Cushion Nest | roofs (roof is removed) |
| Balcony Climbing Wall | building facades |
| Wall Tunnel, Cat-sized Door | walls |
| Rooftop Cat Bridge | between neighbouring roofs |
| Elevated Cat Walkway | above every street segment — a second circulation network |
| Soft Sleeping Garden | the central public square |
| Fish Fountain | corner of the square |
| Feeding Pavilion, Box Fort, Catnip Garden, Sun Deck, Hiding Pods, Monument to the Supreme Cat | block yards |
| Cat Castle / Luxury Cat Hotel | an entire offered human house |

The *City transformed* meter measures accumulated “catness”; the *History* panel lists every transformation by day with the daemon’s reason, a chart of transformation vs. cat happiness, and all story events.

## 6. Emergent narrative events

First offering · daemon wakes · first transformation · cat demands (and their fulfilment) · valuable donations · rainy days · the lazy citizen skipping work, selling things, running out of possessions, offering his house, becoming the servant (with seven absurd servant tasks: carrying a giant cat, being a human cat bed, waving a feather toy, building wobbly scratching towers, serving fish in a cat costume, pushing the royal stroller, cat massage) · house → castle/hotel · daemon falls asleep / wakes again · decrees · half the city feline · CATOPIA achieved.

None of these is scripted in a fixed order — they fire when the simulation state makes them true.

## 7. Running the project

Requirements: Node.js 18+.

```bash
cd catopia
npm install
npm run dev        # open http://localhost:5173
npm run build      # production build into dist/
npm run preview    # serve the production build
npm run simtest -- 12 20261109   # headless: run 12 days and print a daily log
```

**GitHub Pages:** the Vite `base` is `./`, so `dist/` works from any sub-path. A ready workflow is in `.github/workflows/deploy.yml` (enable *Pages → Source: GitHub Actions* in the repo settings).

**Controls:** drag to orbit · scroll to zoom · right-drag to pan · click citizens, cats, buildings or the daemon · `Space` play/pause · `1`/`2`/`5` speed · `N` next day · `T` toggle thoughts · `Esc` close.

**Demo menu (🎬):** *The lazy citizen’s downfall* (fast-forwards until Fritz becomes the servant, ~day 6), *Starve the daemon*, *Skip 3 days*, *Jump to CATOPIA*, and *restart with any seed*. Add `?seed=123` to the URL for a different but reproducible city. **Showreel** mode hides the panels and slowly orbits the camera.

## 8. Simulated vs. implemented

| Real, implemented | Simulated / faked |
|---|---|
| Full local simulation loop with fixed time-steps and deterministic seeded randomness | The daemon’s “intelligence” — it is a hand-written weighted-utility agent, not AI |
| Economy, schedules, inventories, offerings, cat needs, daemon energy | “Perception” reads the simulation state directly; no sensors or cameras |
| Procedural 3D city, characters, transformations, day/night & weather | The cats are behavioural agents, not models of real cat behaviour |
| Decision transparency: every score is displayed | No backend, network or paid API is used |

## 9. Technologies

Vite · TypeScript · React 19 · Three.js · React Three Fiber · Drei · Zustand. No external 3D assets or textures — everything is procedural geometry. Fonts: Baloo 2 & Nunito (Google Fonts; falls back to system fonts offline).

Project structure:

```
src/
  simulation/   pure-TS engine: types, RNG, paths, world, citizens, cats, engine, store
  daemon/       brain.ts (perception, memory, goals, decisions, reflection) + Daemon.tsx (3D)
  data/         items, city layout & sites, characters, transformation catalogue
  world/        3D scene: lighting/day cycle, island, buildings, transformations, effects, camera
  characters/   citizen & cat models, thought bubbles
  components/   React UI: HUD, control bar, panels
  styles/       global.css
scripts/        simtest.ts (headless simulation runner)
```

The simulation layer imports nothing from React/Three, so it can run headless.

## 10. Limitations

- Pathfinding is a simple street-graph router; characters can occasionally overlap each other or clip corners.
- Cats “teleport-leap” onto rooftops with a cartoon arc rather than climbing.
- Only the houses of citizens who run out of possessions get converted; in practice that is usually Fritz’s house.
- Balancing is tuned for a ~10–12 day arc; very long runs reach 100 % and plateau.
- `Html` thought bubbles are DOM elements; on very weak GPUs, lowering the browser zoom or closing panels helps.
- The UI is designed for desktop/laptop screens; mobile layout is basic.

## 11. Personal reflection

> *[Placeholder — to be written by the author.]*

## 12. Visitor narrative

> *[Placeholder — to be written by the author.]*
