import type { ItemDef } from '../simulation/types';

// Everything a citizen can own, buy, eat — and sacrifice.
// `yields` = which materials the daemon can extract.
// Human food is NEVER given to the cats: the daemon only absorbs its energy.
export const ITEMS: Record<string, ItemDef> = {
  groceries:  { id: 'groceries', name: 'Groceries', emoji: '🥕', price: 8, energy: 6, yields: {}, edible: 55, shop: 'grocery', color: '#ff9f6b',
                note: 'Human food. The daemon absorbs its energy but never feeds it to cats.' },
  bread:      { id: 'bread', name: 'Fresh Bread', emoji: '🍞', price: 6, energy: 5, yields: {}, edible: 40, shop: 'grocery', color: '#f2c37a',
                note: 'Human food — not for cats. Converted to pure energy.' },
  fish:       { id: 'fish', name: 'Cooked Fish (boneless)', emoji: '🐟', price: 11, energy: 12, yields: { food: 2 }, shop: 'grocery', color: '#7fc8f8' },
  treats:     { id: 'treats', name: 'Cat-safe Treats', emoji: '🍪', price: 7, energy: 9, yields: { food: 1 }, shop: 'grocery', color: '#d9a066' },
  catmilk:    { id: 'catmilk', name: 'Lactose-free Cat Milk', emoji: '🥛', price: 6, energy: 8, yields: { food: 1 }, shop: 'grocery', color: '#fdfdf5',
                note: 'Special cat milk — regular cow milk upsets cat tummies.' },
  plant:      { id: 'plant', name: 'Potted Catnip', emoji: '🌿', price: 10, energy: 10, yields: { plant: 2 }, shop: 'grocery', color: '#7ccf7a' },
  blanket:    { id: 'blanket', name: 'Fluffy Blanket', emoji: '🧣', price: 14, energy: 12, yields: { soft: 2 }, shop: 'home', color: '#ff9ec7' },
  cushion:    { id: 'cushion', name: 'Velvet Cushion', emoji: '🟪', price: 12, energy: 11, yields: { soft: 2 }, shop: 'home', color: '#b69cff' },
  fabric:     { id: 'fabric', name: 'Roll of Fabric', emoji: '🧵', price: 10, energy: 9, yields: { soft: 1, toy: 1 }, shop: 'home', color: '#ffb3a7' },
  box:        { id: 'box', name: 'Cardboard Box', emoji: '📦', price: 2, energy: 7, yields: { box: 2 }, shop: 'home', color: '#d6a36a' },
  wood:       { id: 'wood', name: 'Bundle of Wood', emoji: '🌲', price: 14, energy: 11, yields: { wood: 2 }, shop: 'home', color: '#b07a4a' },
  toy:        { id: 'toy', name: 'Feather Toy', emoji: '🎣', price: 8, energy: 10, yields: { toy: 2 }, shop: 'home', color: '#ffd166' },
  yarn:       { id: 'yarn', name: 'Ball of Yarn', emoji: '🧶', price: 5, energy: 8, yields: { toy: 1, soft: 1 }, shop: 'home', color: '#ef6f8f' },
  decoration: { id: 'decoration', name: 'Porcelain Figurine', emoji: '🏺', price: 18, energy: 13, yields: { deco: 2 }, shop: 'home', color: '#9ad6e8' },
  chair:      { id: 'chair', name: 'Wooden Chair', emoji: '💺', price: 25, energy: 15, yields: { wood: 2 }, shop: 'home', furniture: true, color: '#c98b55' },
  sofa:       { id: 'sofa', name: 'Plush Sofa', emoji: '🛋️', price: 48, energy: 24, yields: { soft: 3, wood: 1 }, shop: 'home', furniture: true, color: '#8ec5ff' },
  bookshelf:  { id: 'bookshelf', name: 'Bookshelf', emoji: '📚', price: 35, energy: 18, yields: { wood: 3 }, shop: 'home', furniture: true, color: '#a8744f' },
  lamp:       { id: 'lamp', name: 'Floor Lamp', emoji: '💡', price: 20, energy: 13, yields: { deco: 1, wood: 1 }, shop: 'home', furniture: true, color: '#ffe08a' },
  rug:        { id: 'rug', name: 'Woolly Rug', emoji: '🟫', price: 22, energy: 14, yields: { soft: 2 }, shop: 'home', furniture: true, color: '#e7a977' },
  bed:        { id: 'bed', name: 'Bed', emoji: '🛏️', price: 60, energy: 26, yields: { soft: 3, wood: 2 }, furniture: true, color: '#c2d8ff' },
  tv:         { id: 'tv', name: 'Old Television', emoji: '📺', price: 40, energy: 14, yields: { box: 1, deco: 1 }, furniture: true, color: '#606a85' },
  gamepad:    { id: 'gamepad', name: 'Game Console', emoji: '🎮', price: 45, energy: 15, yields: { toy: 2, box: 1 }, furniture: true, color: '#59607a' },
  sock:       { id: 'sock', name: 'Single Lonely Sock', emoji: '🧦', price: 1, energy: 4, yields: { toy: 1 }, color: '#d4d4d4' },
  // Special "offerings" that are not inventory items:
  house:      { id: 'house', name: 'An Entire House', emoji: '🏠', price: 400, energy: 70, yields: { house: 1, wood: 2, soft: 2 }, color: '#ffcf8a' },
  labor:      { id: 'labor', name: 'Time & Labor (forever)', emoji: '⏳', price: 0, energy: 30, yields: { labor: 1 }, color: '#c7f0d8' },
};

export const GROCERY_STOCK = Object.values(ITEMS).filter((i) => i.shop === 'grocery').map((i) => i.id);
export const HOME_STOCK = Object.values(ITEMS).filter((i) => i.shop === 'home').map((i) => i.id);

/** Items the visitor (user) can offer from the "Offer an Item" dialog. */
export const VISITOR_OFFERS = ['fish', 'treats', 'catmilk', 'plant', 'blanket', 'cushion', 'box', 'wood', 'toy', 'yarn', 'decoration', 'sofa', 'bread'];

export const isHumanFood = (id: string) => !!ITEMS[id]?.edible;
