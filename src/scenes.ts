import type { SceneConfig } from './types';

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
