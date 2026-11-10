import type { NeedKey, ResKey, SiteKind } from '../simulation/types';

// Catalogue of architectural transformations the daemon can perform.
// `needs` = how strongly the result satisfies each cat need (0..1).
// `catness` = how much it shifts the city from human-centred to cat-centred.
export interface TransformType {
  id: string;
  name: string;
  emoji: string;
  site: SiteKind;
  cost: Partial<Record<ResKey, number>>;
  energy: number;
  needs: Partial<Record<NeedKey, number>>;
  catness: number;
  tags: string[];
  verb: string; // used in thoughts: "turn the bench into a giant cat bed"
  max?: number;
}

export const TRANSFORM_TYPES: TransformType[] = [
  { id: 'catBed', name: 'Giant Cat Bed', emoji: '🛏️', site: 'bench', cost: { soft: 1 }, energy: 5,
    needs: { rest: 0.8, comfort: 0.6 }, catness: 3, tags: ['soft', 'round', 'warm'], verb: 'melt a human bench into a giant cat bed' },
  { id: 'scratchPost', name: 'Scratching Post', emoji: '🌲', site: 'lamp', cost: { wood: 1 }, energy: 4,
    needs: { play: 0.6, curiosity: 0.2 }, catness: 2, tags: ['vertical'], verb: 'wrap a street lamp into a scratching post' },
  { id: 'rooftopPlayground', name: 'Rooftop Playground', emoji: '🎠', site: 'roof', cost: { wood: 2, toy: 1 }, energy: 12,
    needs: { play: 0.95, curiosity: 0.5 }, catness: 6, tags: ['high', 'play'], verb: 'replace a roof with a cat playground' },
  { id: 'cushionNest', name: 'Cloud Cushion Nest', emoji: '☁️', site: 'roof', cost: { soft: 2 }, energy: 8,
    needs: { rest: 0.75, comfort: 0.75, safety: 0.2 }, catness: 4, tags: ['soft', 'high', 'warm'], verb: 'pile a cloud of cushions onto a rooftop' },
  { id: 'climbingWall', name: 'Balcony Climbing Wall', emoji: '🧗', site: 'facade', cost: { wood: 1 }, energy: 7,
    needs: { play: 0.7, safety: 0.3, curiosity: 0.2 }, catness: 4, tags: ['high', 'vertical'], verb: 'grow climbing balconies on a facade' },
  { id: 'skyBridge', name: 'Rooftop Cat Bridge', emoji: '🌉', site: 'bridge', cost: { wood: 2 }, energy: 10,
    needs: { curiosity: 0.8, play: 0.4, safety: 0.2 }, catness: 6, tags: ['high', 'network'], verb: 'stitch two rooftops together with a cat bridge' },
  { id: 'catTunnel', name: 'Wall Tunnel', emoji: '🕳️', site: 'tunnel', cost: { soft: 1, box: 1 }, energy: 8,
    needs: { safety: 0.7, curiosity: 0.6 }, catness: 4, tags: ['round', 'hidden'], verb: 'bore a cosy tube tunnel through a wall' },
  { id: 'catDoor', name: 'Cat-sized Door', emoji: '🚪', site: 'door', cost: { wood: 1 }, energy: 3,
    needs: { safety: 0.35, curiosity: 0.35 }, catness: 2, tags: ['tiny'], verb: 'cut a cat-sized door into a wall' },
  { id: 'walkway', name: 'Elevated Cat Walkway', emoji: '🛤️', site: 'walkway', cost: { wood: 2 }, energy: 10,
    needs: { curiosity: 0.6, play: 0.35, safety: 0.4 }, catness: 7, tags: ['high', 'network'], verb: 'lift a cat walkway above the street' },
  { id: 'sleepingGarden', name: 'Soft Sleeping Garden', emoji: '🌸', site: 'plaza', cost: { soft: 2, plant: 1 }, energy: 15,
    needs: { rest: 0.95, comfort: 0.8 }, catness: 10, tags: ['soft', 'green', 'warm'], verb: 'turn the public square into a soft sleeping garden', max: 1 },
  { id: 'fishFountain', name: 'Fish Fountain', emoji: '⛲', site: 'fountain', cost: { food: 2 }, energy: 8,
    needs: { hunger: 1 }, catness: 5, tags: ['food', 'round'], verb: 'build a fountain that dispenses fish', max: 1 },
  { id: 'feedingStation', name: 'Feeding Pavilion', emoji: '🍽️', site: 'yard', cost: { food: 1, wood: 1 }, energy: 6,
    needs: { hunger: 0.9 }, catness: 3, tags: ['food'], verb: 'set up a feeding pavilion' },
  { id: 'boxFort', name: 'Cardboard Box Fort', emoji: '📦', site: 'yard', cost: { box: 2 }, energy: 5,
    needs: { safety: 0.75, play: 0.4 }, catness: 3, tags: ['hidden', 'boxes'], verb: 'stack a cardboard box fort' },
  { id: 'catnipGarden', name: 'Catnip Garden', emoji: '🌿', site: 'yard', cost: { plant: 1 }, energy: 6,
    needs: { play: 0.5, rest: 0.35, comfort: 0.3 }, catness: 3, tags: ['green'], verb: 'plant a catnip garden' },
  { id: 'sunDeck', name: 'Sunbathing Deck', emoji: '☀️', site: 'yard', cost: { soft: 1, wood: 1 }, energy: 7,
    needs: { rest: 0.85, comfort: 0.5 }, catness: 3, tags: ['warm', 'soft'], verb: 'build a warm sunbathing deck' },
  { id: 'hidingPods', name: 'Hiding Pods', emoji: '🥚', site: 'yard', cost: { soft: 1, box: 1 }, energy: 6,
    needs: { safety: 0.95, rest: 0.3 }, catness: 3, tags: ['hidden', 'round'], verb: 'grow round hiding pods' },
  { id: 'monument', name: 'Monument to the Supreme Cat', emoji: '🗿', site: 'yard', cost: { deco: 2 }, energy: 9,
    needs: { curiosity: 0.5, comfort: 0.15 }, catness: 4, tags: ['grand', 'whim'], verb: 'erect an absurd monument to the Supreme Cat', max: 2 },
  { id: 'catCastle', name: 'Cat Castle', emoji: '🏰', site: 'house', cost: { house: 1 }, energy: 18,
    needs: { play: 0.7, safety: 0.6, curiosity: 0.6, rest: 0.4 }, catness: 14, tags: ['grand', 'high'], verb: 'transform a human house into a cat castle' },
  { id: 'catHotel', name: 'Luxury Cat Hotel', emoji: '🏨', site: 'house', cost: { house: 1, soft: 1 }, energy: 20,
    needs: { comfort: 1, rest: 0.8, hunger: 0.3 }, catness: 14, tags: ['grand', 'luxury', 'soft'], verb: 'convert a human house into a luxurious cat hotel' },
];

export const TYPE_BY_ID: Record<string, TransformType> = Object.fromEntries(TRANSFORM_TYPES.map((t) => [t.id, t]));

/** The daemon's possible daily whims — strange personal preferences. */
export const WHIMS = [
  { id: 'round', label: 'obsessed with round things', tags: ['round'], emoji: '🔵' },
  { id: 'high', label: 'longing for heights today', tags: ['high'], emoji: '⛰️' },
  { id: 'soft', label: 'craving softness', tags: ['soft'], emoji: '☁️' },
  { id: 'network', label: 'dreaming of connected rooftops', tags: ['network'], emoji: '🕸️' },
  { id: 'hidden', label: 'in a secretive mood', tags: ['hidden', 'tiny'], emoji: '🙈' },
  { id: 'grand', label: 'feeling monumental', tags: ['grand', 'whim'], emoji: '👑' },
  { id: 'green', label: 'nostalgic for meadows', tags: ['green'], emoji: '🌱' },
  { id: 'boxes', label: 'deeply moved by cardboard', tags: ['boxes'], emoji: '📦' },
];

/** Ridiculous demands the cats can issue. */
export const DEMANDS: { catTrait: string; text: string; typeId: string }[] = [
  { catTrait: 'hungry', text: 'demands a fountain that rains fish. Immediately.', typeId: 'fishFountain' },
  { catTrait: 'hungry', text: 'insists on a second breakfast pavilion "for emergencies".', typeId: 'feedingStation' },
  { catTrait: 'spoiled', text: 'requires a velvet bed the size of a bus. Nothing less.', typeId: 'catBed' },
  { catTrait: 'spoiled', text: 'demands a hotel with a pillow menu.', typeId: 'catHotel' },
  { catTrait: 'playful', text: 'wants a rooftop with at least seven things to knock over.', typeId: 'rooftopPlayground' },
  { catTrait: 'playful', text: 'declares the ground "lava" and requests walkways.', typeId: 'walkway' },
  { catTrait: 'shy', text: 'quietly requests a box. Then another box. Then a fort.', typeId: 'boxFort' },
  { catTrait: 'shy', text: 'wants a pod where nobody can perceive her.', typeId: 'hidingPods' },
  { catTrait: 'curious', text: 'demands a tunnel to "the other side of the wall" (any wall).', typeId: 'catTunnel' },
  { catTrait: 'curious', text: 'requests a bridge to the moon (a rooftop will do).', typeId: 'skyBridge' },
  { catTrait: 'sleepy', text: 'requires the sun to be moved closer. Settles for a sun deck.', typeId: 'sunDeck' },
  { catTrait: 'sleepy', text: 'demands the entire square become a pillow.', typeId: 'sleepingGarden' },
];
