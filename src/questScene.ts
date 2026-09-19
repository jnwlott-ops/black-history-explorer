import Phaser from 'phaser';
import type { QuestChapter } from './types';
import { renderBackdropCanvas, renderCharacterCanvas, renderCloudCanvas } from './scenes';

export const SCENE_KEY = 'quest-scene';
export const SCENE_WIDTH = 320;
export const SCENE_HEIGHT = 180;

let pendingChapter: QuestChapter | null = null;

/** Set before the Phaser.Game is constructed, so the first-booted scene has something to show. */
export function setPendingChapter(chapter: QuestChapter): void {
  pendingChapter = chapter;
}

interface CloudSprite {
  image: Phaser.GameObjects.Image;
  speed: number;
}

export class QuestSceneView extends Phaser.Scene {
  private chapter!: QuestChapter;
  private clouds: CloudSprite[] = [];

  constructor() {
    super(SCENE_KEY);
  }

  init(data: { chapter?: QuestChapter }): void {
    this.chapter = data?.chapter ?? pendingChapter!;
  }

  create(): void {
    this.clouds = [];
    this.buildBackdrop();
    this.buildAccent();
    this.buildTwinkles();
    this.buildWeather();
    this.buildCharacter();
  }

  update(_time: number, delta: number): void {
    for (const cloud of this.clouds) {
      cloud.image.x += cloud.speed * (delta / 16.6667);
      const halfWidth = cloud.image.displayWidth / 2;
      if (cloud.image.x - halfWidth > SCENE_WIDTH) {
        cloud.image.x = -halfWidth;
      }
    }
  }

  private replaceCanvasTexture(key: string, canvas: HTMLCanvasElement): void {
    if (this.textures.exists(key)) this.textures.remove(key);
    this.textures.addCanvas(key, canvas);
  }

  private buildBackdrop(): void {
    const canvas = renderBackdropCanvas(this.chapter.sceneConfig, SCENE_WIDTH, SCENE_HEIGHT);
    this.replaceCanvasTexture('backdrop', canvas);
    this.add.image(SCENE_WIDTH / 2, SCENE_HEIGHT / 2, 'backdrop');
  }

  private buildAccent(): void {
    const accent = this.chapter.sceneConfig.accent;
    if (!accent) return;
    const color = Phaser.Display.Color.HexStringToColor(accent.color).color;
    const arc = this.add.circle(accent.x * SCENE_WIDTH, accent.y * SCENE_HEIGHT, accent.r * SCENE_WIDTH, color);
    this.tweens.add({
      targets: arc,
      scale: { from: 1, to: 1.08 },
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private buildTwinkles(): void {
    const twinkles = this.chapter.sceneConfig.twinkles;
    if (!twinkles) return;
    for (const t of twinkles) {
      const color = Phaser.Display.Color.HexStringToColor(t.color).color;
      const arc = this.add.circle(t.x * SCENE_WIDTH, t.y * SCENE_HEIGHT, Math.max(1, t.r * SCENE_WIDTH), color);
      arc.setAlpha(0.4);
      this.tweens.add({
        targets: arc,
        alpha: { from: 0.35, to: 1 },
        duration: 1000,
        delay: t.phase * 300,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }

  private buildWeather(): void {
    if (this.chapter.sceneConfig.weather !== 'clouds') return;
    const specs = [
      { yFraction: 0.1, size: 22, speed: 0.12, alpha: 0.85, startX: 40 },
      { yFraction: 0.22, size: 16, speed: 0.2, alpha: 0.65, startX: 220 },
    ];
    specs.forEach((spec, i) => {
      const cloudCanvas = renderCloudCanvas(spec.size);
      const key = `cloud-${i}`;
      this.replaceCanvasTexture(key, cloudCanvas);
      const image = this.add.image(spec.startX, spec.yFraction * SCENE_HEIGHT, key);
      image.setAlpha(spec.alpha);
      this.clouds.push({ image, speed: spec.speed });
    });
  }

  private buildCharacter(): void {
    const tex = renderCharacterCanvas(this.chapter.character);
    this.replaceCanvasTexture('character', tex.canvas);
    const charWidth = tex.cols * tex.cellSize;
    const charHeight = tex.rows * tex.cellSize;
    const originX = SCENE_WIDTH * this.chapter.characterX;
    const feetY = SCENE_HEIGHT * this.chapter.sceneConfig.groundLine;
    const image = this.add.image(originX, feetY - charHeight / 2, 'character');
    image.setDisplaySize(charWidth, charHeight);

    this.tweens.add({
      targets: image,
      y: feetY - charHeight / 2 - 3,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    this.tweens.add({
      targets: image,
      angle: { from: -2, to: 2 },
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  /** A celebratory burst for the "what really happened" reveal. */
  celebrate(): void {
    if (!this.textures.exists('particle')) {
      const canvas = document.createElement('canvas');
      canvas.width = 4;
      canvas.height = 4;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 4, 4);
      this.textures.addCanvas('particle', canvas);
    }
    const emitter = this.add.particles(0, 0, 'particle', {
      speed: { min: 60, max: 160 },
      angle: { min: 0, max: 360 },
      scale: { start: 1.5, end: 0 },
      lifespan: 500,
      tint: [0x3fb27f, 0xf2b134],
    });
    emitter.explode(24, SCENE_WIDTH / 2, SCENE_HEIGHT / 2);
    this.cameras.main.flash(300, 63, 178, 127);
  }
}
