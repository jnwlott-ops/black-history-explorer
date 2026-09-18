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

/** Draws a standing character, feet planted at the scene's ground line. */
export function drawCharacter(canvas: HTMLCanvasElement, archetype: CharacterArchetype, xFraction: number, groundLine: number): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const palette = CHAR_PALETTES[archetype];
  const rows = CHAR_GRID.length;
  const cols = CHAR_GRID[0].length;
  const spriteScale = (canvas.height * 0.42) / rows;
  const originX = canvas.width * xFraction - (cols * spriteScale) / 2;
  const originY = canvas.height * groundLine - rows * spriteScale;

  // Outline pass first, so the character reads clearly against any background.
  ctx.fillStyle = 'rgba(10, 8, 6, 0.9)';
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (CHAR_GRID[y][x] === '.') continue;
      ctx.fillRect(originX + x * spriteScale - 1, originY + y * spriteScale - 1, spriteScale + 2, spriteScale + 2);
    }
  }

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const key = CHAR_GRID[y][x];
      if (key === '.') continue;
      ctx.fillStyle = palette[key] ?? '#000';
      ctx.fillRect(originX + x * spriteScale, originY + y * spriteScale, spriteScale, spriteScale);
    }
  }
}

/** Draws a simple NES-tile-style landscape: sky gradient, ground, and flat silhouettes. */
export function drawLandscape(canvas: HTMLCanvasElement, config: SceneConfig): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;
  ctx.imageSmoothingEnabled = false;

  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, config.sky[0]);
  grad.addColorStop(1, config.sky[1]);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  if (config.accent) {
    ctx.fillStyle = config.accent.color;
    ctx.beginPath();
    ctx.arc(config.accent.x * w, config.accent.y * h, config.accent.r * w, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const s of config.silhouettes) {
    ctx.fillStyle = s.color;
    ctx.fillRect(s.x * w, s.y * h, s.w * w, s.h * h);
  }

  ctx.fillStyle = config.ground;
  ctx.fillRect(0, config.groundLine * h, w, h - config.groundLine * h);
}
