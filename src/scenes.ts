import type { CharacterArchetype, SceneConfig } from './types';

/** A small, generic standing figure — distinguished by role/attire, never a facial likeness. */
const CHAR_GRID = [
  '...CCCC...',
  '..CCCCCC..',
  '..FFFFFF..',
  '..FFFFFF..',
  '..TTTTTT..',
  '..TTTTTT..',
  '..TTTTTT..',
  '..PPPPPP..',
  '..PP..PP..',
  '..PP..PP..',
  '..PP..PP..',
  '..LL..LL..',
];

const CHAR_PALETTES: Record<CharacterArchetype, Record<string, string>> = {
  mechanic: { C: '#2a2a2a', F: '#8d5524', T: '#5b6070', P: '#33363f', L: '#1a1206' },
  kid: { C: '#1a1206', F: '#8d5524', T: '#c9a86b', P: '#3a3f8f', L: '#1a1206' },
  soldier: { C: '#4a4a2a', F: '#8d5524', T: '#5a5a3a', P: '#4a4a2a', L: '#1a1206' },
  suit: { C: '#3a2a1a', F: '#e0ac69', T: '#2b2f6b', P: '#1a1206', L: '#1a1206' },
  ballplayer: { C: '#2b2f6b', F: '#e0ac69', T: '#f5f5f5', P: '#f5f5f5', L: '#1a1206' },
};

export interface CharacterTexture {
  canvas: HTMLCanvasElement;
  cols: number;
  rows: number;
  cellSize: number;
}

/** Renders a standing character to its own small canvas, for use as a static Phaser texture. */
export function renderCharacterCanvas(archetype: CharacterArchetype, cellSize = 8): CharacterTexture {
  const palette = CHAR_PALETTES[archetype];
  const rows = CHAR_GRID.length;
  const cols = CHAR_GRID[0].length;
  const canvas = document.createElement('canvas');
  canvas.width = cols * cellSize;
  canvas.height = rows * cellSize;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  ctx.fillStyle = 'rgba(10, 8, 6, 0.9)';
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (CHAR_GRID[y][x] === '.') continue;
      ctx.fillRect(x * cellSize - 1, y * cellSize - 1, cellSize + 2, cellSize + 2);
    }
  }

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const key = CHAR_GRID[y][x];
      if (key === '.') continue;
      ctx.fillStyle = palette[key] ?? '#000';
      ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
    }
  }

  return { canvas, cols, rows, cellSize };
}

/** A small blocky pixel-art cloud, drawn from three overlapping rects. */
export function renderCloudCanvas(size: number, color = '#ffffff'): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(size * 2.4);
  canvas.height = Math.ceil(size);
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = color;
  ctx.fillRect(0, size * 0.4, size * 2.4, size * 0.6);
  ctx.fillRect(size * 0.4, 0, size * 1.4, size * 0.6);
  ctx.fillRect(size * 1.2, size * 0.15, size, size * 0.5);
  return canvas;
}

/** Renders the static sky/silhouettes/ground backdrop — everything that doesn't move on its own. */
export function renderBackdropCanvas(config: SceneConfig, width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  const grad = ctx.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0, config.sky[0]);
  grad.addColorStop(1, config.sky[1]);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  for (const s of config.silhouettes) {
    ctx.fillStyle = s.color;
    ctx.fillRect(s.x * width, s.y * height, s.w * width, s.h * height);
  }

  ctx.fillStyle = config.ground;
  ctx.fillRect(0, config.groundLine * height, width, height - config.groundLine * height);

  return canvas;
}
