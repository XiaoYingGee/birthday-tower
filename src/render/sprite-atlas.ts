export const TILE_SIZE = 32;
export const HERO_FRAME_HEIGHT = 48;

type Direction = 'down' | 'left' | 'right' | 'up';

type AtlasEntry = {
  src: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

type HeroEntry = {
  src: string;
  frameW: number;
  frameH: number;
  dirs: Record<Direction, number>;
};

type AtlasMap = {
  hero: HeroEntry;
  floor: AtlasEntry;
  wall: null;
  stairUp: AtlasEntry;
  stairDown: AtlasEntry;
  doorYellow: AtlasEntry;
  doorBlue: AtlasEntry;
  doorRed: AtlasEntry;
  keyYellow: AtlasEntry;
  keyBlue: AtlasEntry;
  keyRed: AtlasEntry;
  redPotion: AtlasEntry;
  bluePotion: AtlasEntry;
  redGem: AtlasEntry;
  blueGem: AtlasEntry;
  treasure: AtlasEntry;
  merchant: AtlasEntry;
  princess: AtlasEntry;
  zombie: AtlasEntry;
  skeleton: AtlasEntry;
  spider: AtlasEntry;
  creeper: AtlasEntry;
  skeletonCaptain: AtlasEntry;
  swordsman: AtlasEntry;
  redWizard: AtlasEntry;
  enderman: AtlasEntry;
  wither: AtlasEntry;
};

export const ATLAS: AtlasMap = {
  hero: { src: '/sprites/hero.png', frameW: 32, frameH: 48, dirs: { down: 0, left: 1, right: 2, up: 3 } },
  floor:     { src: '/sprites/terrains.png', x: 0, y: 0  * 32, w: 32, h: 32 },
  wall:      null,
  stairUp:   { src: '/sprites/terrains.png', x: 0, y: 6  * 32, w: 32, h: 32 },
  stairDown: { src: '/sprites/terrains.png', x: 0, y: 5  * 32, w: 32, h: 32 },
  doorYellow: { src: '/sprites/animates.png', x: 0, y: 4 * 32, w: 32, h: 32 },
  doorBlue:   { src: '/sprites/animates.png', x: 0, y: 5 * 32, w: 32, h: 32 },
  doorRed:    { src: '/sprites/animates.png', x: 0, y: 6 * 32, w: 32, h: 32 },
  keyYellow:  { src: '/sprites/items.png', x: 0, y: 0  * 32, w: 32, h: 32 },
  keyBlue:    { src: '/sprites/items.png', x: 0, y: 1  * 32, w: 32, h: 32 },
  keyRed:     { src: '/sprites/items.png', x: 0, y: 2  * 32, w: 32, h: 32 },
  redPotion:  { src: '/sprites/items.png', x: 0, y: 20 * 32, w: 32, h: 32 },
  bluePotion: { src: '/sprites/items.png', x: 0, y: 21 * 32, w: 32, h: 32 },
  redGem:     { src: '/sprites/items.png', x: 0, y: 16 * 32, w: 32, h: 32 },
  blueGem:    { src: '/sprites/items.png', x: 0, y: 17 * 32, w: 32, h: 32 },
  treasure:   { src: '/sprites/items.png', x: 0, y: 11 * 32, w: 32, h: 32 },
  merchant:   { src: '/sprites/npcs.png', x: 0, y: 1 * 32, w: 32, h: 32 },
  princess:   { src: '/sprites/npcs.png', x: 0, y: 11 * 32, w: 32, h: 32 },
  zombie:    { src: '/sprites/enemys.png', x: 0, y: 12 * 32, w: 32, h: 32 },
  skeleton:  { src: '/sprites/enemys.png', x: 0, y: 8  * 32, w: 32, h: 32 },
  spider:    { src: '/sprites/enemys.png', x: 0, y: 4  * 32, w: 32, h: 32 },
  creeper:   { src: '/sprites/enemys.png', x: 0, y: 18 * 32, w: 32, h: 32 },
  skeletonCaptain: { src: '/sprites/enemys.png', x: 0, y: 10 * 32, w: 32, h: 32 },
  swordsman: { src: '/sprites/enemys.png', x: 0, y: 23 * 32, w: 32, h: 32 },
  redWizard: { src: '/sprites/enemys.png', x: 0, y: 19 * 32, w: 32, h: 32 },
  enderman:  { src: '/sprites/enemys.png', x: 0, y: 27 * 32, w: 32, h: 32 },
  wither:    { src: '/sprites/enemys.png', x: 0, y: 56 * 32, w: 32, h: 32 },
};

export type AtlasKey = Exclude<keyof AtlasMap, 'hero'>;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load sprite atlas: ${src}`));
    image.src = src;
  });
}

const ANIM_INTERVAL = 500;

export class SpriteLoader {
  private readonly images = new Map<string, HTMLImageElement>();

  async load(): Promise<void> {
    const sources = new Set<string>();
    for (const entry of Object.values(ATLAS)) {
      if (entry && 'src' in entry) {
        sources.add(entry.src);
      }
    }

    const loaded = await Promise.all(Array.from(sources, async (src) => [src, await loadImage(src)] as const));
    for (const [src, image] of loaded) {
      this.images.set(src, image);
    }
  }

  drawAt(
    ctx: CanvasRenderingContext2D,
    atlasKey: AtlasKey,
    dx: number,
    dy: number,
    scale: number,
    now?: number,
  ): void {
    const entry = ATLAS[atlasKey];
    if (!entry) {
      this.drawWall(ctx, dx, dy, scale);
      return;
    }

    const image = this.images.get(entry.src);
    if (!image) {
      return;
    }

    let sx = entry.x;
    if (now !== undefined && (entry.src.includes('enemys') || entry.src.includes('npcs'))) {
      const frame = Math.floor(now / ANIM_INTERVAL) % 2;
      sx = frame * 32;
    }

    ctx.drawImage(image, sx, entry.y, entry.w, entry.h, dx, dy, entry.w * scale, entry.h * scale);
  }

  drawHero(
    ctx: CanvasRenderingContext2D,
    dx: number,
    dy: number,
    scale: number,
    dir: Direction,
    frame: 0 | 1 | 2,
  ): void {
    const hero = ATLAS.hero;
    const image = this.images.get(hero.src);
    if (!image) {
      return;
    }

    const sourceX = frame * hero.frameW;
    const sourceY = hero.dirs[dir] * hero.frameH;
    const targetW = hero.frameW * scale;
    const targetH = hero.frameH * scale;
    ctx.drawImage(
      image,
      sourceX,
      sourceY,
      hero.frameW,
      hero.frameH,
      dx,
      dy - (hero.frameH - TILE_SIZE) * scale,
      targetW,
      targetH,
    );
  }

  private drawWall(ctx: CanvasRenderingContext2D, dx: number, dy: number, scale: number): void {
    const size = TILE_SIZE * scale;
    ctx.fillStyle = '#49515d';
    ctx.fillRect(dx, dy, size, size);
    ctx.fillStyle = '#6d7786';
    ctx.fillRect(dx, dy, size, 3 * scale);
    ctx.fillStyle = '#313842';
    for (let offset = 6; offset < TILE_SIZE; offset += 8) {
      ctx.fillRect(dx, dy + offset * scale, size, scale);
      ctx.fillRect(dx + offset * scale, dy, scale, size);
    }
  }
}
