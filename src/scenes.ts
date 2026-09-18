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

/** Rows at and below this index sway during the idle shuffle; rows above stay planted. */
const LEG_ROW_START = 8;

const CHAR_PALETTES: Record<CharacterArchetype, Record<string, string>> = {
  mechanic: { C: '#2a2a2a', F: '#8d5524', T: '#5b6070', P: '#33363f', L: '#1a1206' },
  kid: { C: '#1a1206', F: '#8d5524', T: '#c9a86b', P: '#3a3f8f', L: '#1a1206' },
  soldier: { C: '#4a4a2a', F: '#8d5524', T: '#5a5a3a', P: '#4a4a2a', L: '#1a1206' },
  suit: { C: '#3a2a1a', F: '#e0ac69', T: '#2b2f6b', P: '#1a1206', L: '#1a1206' },
  ballplayer: { C: '#2b2f6b', F: '#e0ac69', T: '#f5f5f5', P: '#f5f5f5', L: '#1a1206' },
};

/** Draws a standing character with a small idle-shuffle animation, feet planted at the ground line. */
export function drawCharacter(
  canvas: HTMLCanvasElement,
  archetype: CharacterArchetype,
  xFraction: number,
  groundLine: number,
  timeMs = 0,
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const palette = CHAR_PALETTES[archetype];
  const rows = CHAR_GRID.length;
  const cols = CHAR_GRID[0].length;
  const spriteScale = (canvas.height * 0.42) / rows;
  const originX = canvas.width * xFraction - (cols * spriteScale) / 2;
  const bob = Math.sin(timeMs / 480) * spriteScale * 0.12;
  const originY = canvas.height * groundLine - rows * spriteScale + bob;
  const legShift = Math.sin(timeMs / 340) * spriteScale * 0.15;

  const cellX = (x: number, y: number) => originX + x * spriteScale + (y >= LEG_ROW_START ? legShift : 0);

  ctx.fillStyle = 'rgba(10, 8, 6, 0.9)';
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (CHAR_GRID[y][x] === '.') continue;
      ctx.fillRect(cellX(x, y) - 1, originY + y * spriteScale - 1, spriteScale + 2, spriteScale + 2);
    }
  }

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const key = CHAR_GRID[y][x];
      if (key === '.') continue;
      ctx.fillStyle = palette[key] ?? '#000';
      ctx.fillRect(cellX(x, y), originY + y * spriteScale, spriteScale, spriteScale);
    }
  }
}

/** A small blocky pixel-art cloud, drawn from three overlapping rects. */
function drawCloud(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y + size * 0.4, size * 2.4, size * 0.6);
  ctx.fillRect(x + size * 0.4, y, size * 1.4, size * 0.6);
  ctx.fillRect(x + size * 1.2, y + size * 0.15, size, size * 0.5);
}

/** Draws a simple NES-tile-style landscape: sky gradient, ground, silhouettes, and ambient motion. */
export function drawLandscape(canvas: HTMLCanvasElement, config: SceneConfig, timeMs = 0): void {
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

  if (config.twinkles) {
    for (const t of config.twinkles) {
      const alpha = 0.35 + 0.65 * Math.abs(Math.sin(timeMs / 900 + t.phase));
      ctx.fillStyle = t.color;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(t.x * w, t.y * h, t.r * w, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  if (config.accent) {
    const pulse = 1 + 0.08 * Math.sin(timeMs / 900);
    ctx.fillStyle = config.accent.color;
    ctx.beginPath();
    ctx.arc(config.accent.x * w, config.accent.y * h, config.accent.r * w * pulse, 0, Math.PI * 2);
    ctx.fill();
  }

  if (config.weather === 'clouds') {
    const cloudRows = [
      { yFraction: 0.08, size: w * 0.05, speed: 0.012, color: 'rgba(255,255,255,0.85)' },
      { yFraction: 0.18, size: w * 0.035, speed: 0.02, color: 'rgba(255,255,255,0.7)' },
    ];
    cloudRows.forEach((cloud, i) => {
      const span = w + cloud.size * 3;
      const x = (((timeMs * cloud.speed) / 10 + i * (span / 2)) % span) - cloud.size * 2;
      drawCloud(ctx, x, cloud.yFraction * h, cloud.size, cloud.color);
    });
  }

  for (const s of config.silhouettes) {
    ctx.fillStyle = s.color;
    ctx.fillRect(s.x * w, s.y * h, s.w * w, s.h * h);
  }

  ctx.fillStyle = config.ground;
  ctx.fillRect(0, config.groundLine * h, w, h - config.groundLine * h);
}
