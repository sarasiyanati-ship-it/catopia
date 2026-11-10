import type { NeedKey, Personality } from '../simulation/types';

export interface CitizenDef {
  name: string;
  job: string;
  workplaceId: string;
  homeId: string;
  wage: number;
  money: number;
  inventory: string[];
  personality: Personality;
  colors: { shirt: string; pants: string; hair: string; skin: string };
  bio: string;
}

const P = (label: string, generosity: number, diligence: number, caution: number, ambition: number, anxiety: number, catLove: number, cheer: number): Personality =>
  ({ label, generosity, diligence, caution, ambition, anxiety, catLove, cheer });

// The ten citizens of the city. Index 3 (Fritz) is the lazy one.
export const CITIZEN_DEFS: CitizenDef[] = [
  { name: 'Hanna Holzmann', job: 'Carpenter', workplaceId: 'workshop', homeId: 'h0', wage: 52, money: 60,
    inventory: ['groceries', 'groceries', 'wood', 'chair', 'bookshelf', 'blanket', 'sofa', 'bed'],
    personality: P('generous', 0.9, 0.95, 0.3, 0.3, 0.3, 0.85, 0.75),
    colors: { shirt: '#ff8fab', pants: '#5b6c8f', hair: '#8a4b2a', skin: '#f6d2b8' }, bio: 'Gives the daemon her best wood. Believes cats deserve good joinery.' },
  { name: 'Otto Ofenbach', job: 'Baker', workplaceId: 'bakery', homeId: 'h1', wage: 46, money: 45,
    inventory: ['bread', 'groceries', 'cushion', 'sofa', 'lamp', 'rug', 'bed'],
    personality: P('cheerful', 0.65, 0.9, 0.35, 0.25, 0.2, 0.75, 0.95),
    colors: { shirt: '#fff4e0', pants: '#c98b55', hair: '#2d2d2d', skin: '#e8b996' }, bio: 'Whistles while kneading. Thinks every offering is a party.' },
  { name: 'Lotte Leuchter', job: 'Office Clerk', workplaceId: 'office', homeId: 'h2', wage: 50, money: 70,
    inventory: ['groceries', 'groceries', 'blanket', 'lamp', 'bookshelf', 'sofa', 'bed', 'decoration'],
    personality: P('anxious', 0.55, 0.92, 0.6, 0.2, 0.95, 0.5, 0.45),
    colors: { shirt: '#9ad6e8', pants: '#4b4f6b', hair: '#e8c26a', skin: '#fbe0c8' }, bio: 'Worries the daemon might be angry. Offers more when it looks sleepy.' },
  { name: 'Fritz Faulenzer', job: 'Fish Market Assistant (in theory)', workplaceId: 'fishmarket', homeId: 'h4', wage: 40, money: 14,
    inventory: ['groceries', 'sock', 'gamepad', 'sofa', 'tv'],
    personality: P('lazy', 0.25, 0.03, 0.1, 0.05, 0.15, 0.4, 0.8),
    colors: { shirt: '#b8c7a6', pants: '#7a8aa6', hair: '#c46a2b', skin: '#f3cfb1' }, bio: 'Has perfected the art of the afternoon nap. Work is “a concept”.' },
  { name: 'Klara Kühn', job: 'Architect', workplaceId: 'office', homeId: 'h3', wage: 68, money: 110,
    inventory: ['groceries', 'groceries', 'decoration', 'wood', 'bookshelf', 'sofa', 'bed', 'lamp'],
    personality: P('ambitious', 0.6, 1.0, 0.45, 0.95, 0.3, 0.55, 0.65),
    colors: { shirt: '#3d405b', pants: '#2b2d42', hair: '#1d1d1d', skin: '#d9a07e' }, bio: 'Reads the daemon’s wishes like a client brief. Wants to be its favourite.' },
  { name: 'Emil Eckhart', job: 'Fishmonger', workplaceId: 'fishmarket', homeId: 'h5', wage: 44, money: 80,
    inventory: ['groceries', 'groceries', 'fish', 'box', 'chair', 'sofa', 'bed'],
    personality: P('cautious', 0.35, 0.9, 0.95, 0.25, 0.5, 0.5, 0.55),
    colors: { shirt: '#5fc6cf', pants: '#3a4a5a', hair: '#9a9a9a', skin: '#f1c9a5' }, bio: 'Never offers food he might need. Counts his coins twice.' },
  { name: 'Selma Sauer', job: 'Home Store Owner', workplaceId: 'homestore', homeId: 'h6', wage: 62, money: 140,
    inventory: ['groceries', 'groceries', 'sock', 'box', 'sofa', 'bed', 'tv', 'decoration'],
    personality: P('selfish', 0.05, 0.95, 0.8, 0.5, 0.25, 0.15, 0.5),
    colors: { shirt: '#a98bf0', pants: '#3b2f5e', hair: '#5b2a86', skin: '#f6d6c0' }, bio: 'Offers the cheapest thing she owns. Every. Single. Day.' },
  { name: 'Theo Träumer', job: 'Grocery Clerk', workplaceId: 'grocery', homeId: 'h7', wage: 42, money: 40,
    inventory: ['groceries', 'yarn', 'toy', 'cushion', 'sofa', 'bed'],
    personality: P('dreamy', 0.75, 0.75, 0.25, 0.15, 0.3, 0.95, 0.85),
    colors: { shirt: '#ffd166', pants: '#6d597a', hair: '#f4a261', skin: '#f9dcc4' }, bio: 'Writes poems for the cats. Prefers to offer toys.' },
  { name: 'Ida Immergrün', job: 'Baker’s Apprentice & Gardener', workplaceId: 'bakery', homeId: 'h8', wage: 40, money: 50,
    inventory: ['groceries', 'groceries', 'plant', 'plant', 'chair', 'sofa', 'bed'],
    personality: P('nature-loving', 0.7, 0.85, 0.4, 0.2, 0.2, 0.8, 0.8),
    colors: { shirt: '#7ccf7a', pants: '#4a5d3a', hair: '#3b2a1a', skin: '#c68c6b' }, bio: 'Grows catnip on every windowsill. Offers plants with ceremony.' },
  { name: 'Paul Pfennig', job: 'Accountant', workplaceId: 'office', homeId: 'h9', wage: 58, money: 120,
    inventory: ['groceries', 'groceries', 'box', 'chair', 'bookshelf', 'sofa', 'bed'],
    personality: P('thrifty', 0.3, 0.98, 0.85, 0.6, 0.35, 0.3, 0.55),
    colors: { shirt: '#e0e0e0', pants: '#4a4a4a', hair: '#6b4f3a', skin: '#f2d0b0' }, bio: 'Calculates the exchange rate between cardboard and divine favour.' },
];
export const LAZY_ID = 3;

export interface CatDef {
  name: string;
  breed: string;
  trait: 'sleepy' | 'playful' | 'spoiled' | 'shy' | 'curious' | 'hungry';
  description: string;
  prefs: Record<NeedKey, number>;
  decay: Record<NeedKey, number>;
  size: number;
  colors: { body: string; accent: string; eyes: string; pattern: 'solid' | 'calico' | 'tabby' | 'tux' };
  favoriteTags: string[];
  start: { x: number; z: number };
}

const N = (hunger: number, comfort: number, play: number, rest: number, safety: number, curiosity: number) =>
  ({ hunger, comfort, play, rest, safety, curiosity });

export const CAT_DEFS: CatDef[] = [
  { name: 'Mandarine', breed: 'Orange tabby', trait: 'sleepy', description: 'Sleepy. Follows the warmest spot in the city like a sunflower.',
    prefs: N(0.8, 1.1, 0.4, 1.6, 0.6, 0.4), decay: N(3, 3.5, 2, 5, 2, 1.5), size: 1.0,
    colors: { body: '#ffa552', accent: '#ffd29e', eyes: '#5a9e3a', pattern: 'tabby' }, favoriteTags: ['warm', 'soft'], start: { x: -3, z: -2 } },
  { name: 'Pepper', breed: 'Black shorthair', trait: 'playful', description: 'Playful climber. Believes the ground is lava.',
    prefs: N(0.8, 0.4, 1.6, 0.6, 0.6, 1.0), decay: N(3.5, 1.5, 5, 2.5, 2, 3), size: 0.92,
    colors: { body: '#2f2a3a', accent: '#4a4458', eyes: '#ffd23f', pattern: 'solid' }, favoriteTags: ['high', 'play'], start: { x: 9, z: 9 } },
  { name: 'Duchess Blanche', breed: 'White Persian', trait: 'spoiled', description: 'Spoiled. Accepts only luxurious furniture and velvet.',
    prefs: N(1.0, 1.7, 0.4, 1.0, 0.6, 0.4), decay: N(3, 5, 1.5, 3, 2, 1.5), size: 1.05,
    colors: { body: '#fbf8ff', accent: '#ffd6e8', eyes: '#6ab7ff', pattern: 'solid' }, favoriteTags: ['luxury', 'soft'], start: { x: 3, z: 3 } },
  { name: 'Nebel', breed: 'Gray Russian Blue', trait: 'shy', description: 'Shy. Needs hiding places, boxes and quiet corners.',
    prefs: N(0.8, 0.6, 0.5, 0.8, 1.8, 0.4), decay: N(3, 2, 1.5, 2.5, 5, 1.5), size: 0.9,
    colors: { body: '#9aa3b5', accent: '#c4cad8', eyes: '#8fe08a', pattern: 'solid' }, favoriteTags: ['hidden', 'boxes'], start: { x: -11, z: -11 } },
  { name: 'Flicken', breed: 'Calico', trait: 'curious', description: 'Curious explorer. Must inspect everything new, especially tunnels.',
    prefs: N(0.8, 0.5, 0.9, 0.5, 0.5, 1.7), decay: N(3.5, 1.5, 3, 2, 1.5, 5), size: 0.95,
    colors: { body: '#fffaf2', accent: '#f08c3a', eyes: '#c9a227', pattern: 'calico' }, favoriteTags: ['network', 'hidden', 'round'], start: { x: 11, z: -11 } },
  { name: 'Knödel', breed: 'Chunky British tuxedo', trait: 'hungry', description: 'Very chunky. Constantly, theatrically hungry.',
    prefs: N(1.9, 0.8, 0.3, 0.9, 0.5, 0.4), decay: N(6, 2, 1.5, 2.5, 1.5, 1.5), size: 1.3,
    colors: { body: '#3b3b46', accent: '#ffffff', eyes: '#f2b134', pattern: 'tux' }, favoriteTags: ['food'], start: { x: 0, z: 9 } },
];

/** Absurd jobs for a citizen who has offered their time and labour. */
export const SERVANT_TASKS: { id: string; title: string; emoji: string; need: NeedKey; text: string }[] = [
  { id: 'carry', title: 'Carrying a giant cat around the city', emoji: '🏋️', need: 'curiosity', text: 'must carry {cat} on a royal sightseeing tour. {cat} weighs approximately one sofa.' },
  { id: 'bed', title: 'Serving as a human cat bed', emoji: '🛌', need: 'rest', text: 'lies perfectly still while {cat} naps on his belly. Sneezing is forbidden.' },
  { id: 'feather', title: 'Waving a feather toy (for hours)', emoji: '🎣', need: 'play', text: 'waves a feather for {cat}. {cat} is “not in the mood”. Keep waving.' },
  { id: 'tower', title: 'Building a ridiculous scratching tower', emoji: '🗼', need: 'play', text: 'stacks a wobbly scratching tower for {cat}, who knocks it over. Again.' },
  { id: 'serve', title: 'Serving fish in a cat costume', emoji: '🍽️', need: 'hunger', text: 'serves {cat} boneless fish while wearing ears and a tail. {cat} sends it back.' },
  { id: 'stroller', title: 'Pushing the royal cat stroller', emoji: '👑', need: 'comfort', text: 'pushes {cat} through the city in a velvet stroller. Bumps cost one bow each.' },
  { id: 'massage', title: 'Official cat masseur', emoji: '💆', need: 'comfort', text: 'massages {cat}’s tiny shoulders. {cat} files a complaint about the pressure.' },
];
