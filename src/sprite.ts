import type { GearItem, GearSlot } from './types';

const TRANSPARENT = '.';

/** A generic, fictional 16x16 "time guide" — never a likeness of a real person. */
const BASE_SPRITE: string[] = [
  '................',
  '....KKKKKK......',
  '...KHHHHHHK.....',
  '..KHHHHHHHHK....',
  '..KHSSSSSSHK....',
  '..KHSEHHESHK....',
  '..KHSSHHSSHK....',
  '..KHSSSSSSHK....',
  '...KHHHHHHK.....',
  '..KRRRRRRRRK....',
  '.KRRRRRRRRRRK...',
  '.KRRRRRRRRRRK...',
  '.KRRRBBBBRRK....',
  '..KRR....RRK....',
  '..KKK....KKK....',
  '................',
];

const PALETTE: Record<string, string> = {
  K: '#1a1206',
  H: '#2b2f6b',
  S: '#e8b98a',
  E: '#f5f5f5',
  R: '#3a3f8f',
  B: '#5b3a21',
};

export const GEAR: GearItem[] = [
  {
    id: 'scarf',
    slot: 'scarf',
    name: 'Field Scarf',
    requiredLevel: 2,
    pixels: [
      [5, 8, '#e1553f'],
      [6, 8, '#e1553f'],
      [7, 8, '#e1553f'],
      [8, 8, '#e1553f'],
      [9, 8, '#e1553f'],
      [10, 8, '#e1553f'],
    ],
  },
  {
    id: 'hat',
    slot: 'hat',
    name: "Guide's Cap",
    requiredLevel: 3,
    pixels: [
      [4, 1, '#f2b134'],
      [5, 1, '#f2b134'],
      [6, 1, '#f2b134'],
      [7, 1, '#f2b134'],
      [8, 1, '#f2b134'],
      [9, 1, '#f2b134'],
      [3, 2, '#f2b134'],
      [10, 2, '#f2b134'],
    ],
  },
  {
    id: 'sash',
    slot: 'sash',
    name: 'Chronicle Sash',
    requiredLevel: 4,
    pixels: [
      [3, 9, '#3fb27f'],
      [4, 10, '#3fb27f'],
      [5, 10, '#3fb27f'],
      [6, 11, '#3fb27f'],
      [7, 11, '#3fb27f'],
      [8, 12, '#3fb27f'],
    ],
  },
  {
    id: 'cape',
    slot: 'cape',
    name: "Keeper's Cape",
    requiredLevel: 5,
    pixels: [
      [1, 11, '#8a4fff'],
      [1, 12, '#8a4fff'],
      [1, 13, '#8a4fff'],
      [12, 11, '#8a4fff'],
      [12, 12, '#8a4fff'],
      [12, 13, '#8a4fff'],
    ],
  },
];

export function gearForSlot(slot: GearSlot): GearItem[] {
  return GEAR.filter((g) => g.slot === slot);
}

/** Renders the base sprite plus any equipped gear onto a canvas, pixel by pixel. */
export function drawSprite(canvas: HTMLCanvasElement, equippedGearIds: string[]): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const size = BASE_SPRITE.length;
  const scale = canvas.width / size;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let y = 0; y < size; y++) {
    const row = BASE_SPRITE[y];
    for (let x = 0; x < row.length; x++) {
      const key = row[x];
      if (key === TRANSPARENT) continue;
      ctx.fillStyle = PALETTE[key] ?? '#000';
      ctx.fillRect(x * scale, y * scale, scale, scale);
    }
  }

  for (const gearId of equippedGearIds) {
    const gear = GEAR.find((g) => g.id === gearId);
    if (!gear) continue;
    for (const [x, y, color] of gear.pixels) {
      ctx.fillStyle = color;
      ctx.fillRect(x * scale, y * scale, scale, scale);
    }
  }
}

/** Starts a simple two-frame idle bob by toggling a class on the element. */
export function startIdleBob(el: HTMLElement): () => void {
  let up = false;
  const id = window.setInterval(() => {
    up = !up;
    el.style.transform = up ? 'translateY(-3px)' : 'translateY(0)';
  }, 450);
  return () => window.clearInterval(id);
}
