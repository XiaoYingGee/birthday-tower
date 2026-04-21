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
  gem: AtlasEntry;
  zombie: AtlasEntry;
  skeleton: AtlasEntry;
  spider: AtlasEntry;
  creeper: AtlasEntry;
  enderman: AtlasEntry;
  wither: AtlasEntry;
};

export const ATLAS: AtlasMap = {
  hero: { src: '/sprites/hero.png', frameW: 32, frameH: 48, dirs: { down: 0, left: 1, right: 2, up: 3 } },
  // terrains.png
  floor:     { src: '/sprites/terrains.png', x: 0, y: 0  * 32, w: 32, h: 32 }, // ground
  wall:      null, // 走 animates.png 的 yellowWall(10)/whiteWall(11)/blueWall(12) 任选；或者直接用 sWall* 系列。简单起见用 ground 反色或自己画一个深色矩形
  stairUp:   { src: '/sprites/terrains.png', x: 0, y: 6  * 32, w: 32, h: 32 }, // upFloor
  stairDown: { src: '/sprites/terrains.png', x: 0, y: 5  * 32, w: 32, h: 32 }, // downFloor
  // animates.png（门，取每一帧的第一帧 = x:0）
  doorYellow: { src: '/sprites/animates.png', x: 0, y: 4 * 32, w: 32, h: 32 },
  doorBlue:   { src: '/sprites/animates.png', x: 0, y: 5 * 32, w: 32, h: 32 },
  doorRed:    { src: '/sprites/animates.png', x: 0, y: 6 * 32, w: 32, h: 32 },
  // items.png
  keyYellow:  { src: '/sprites/items.png', x: 0, y: 0  * 32, w: 32, h: 32 },
  keyBlue:    { src: '/sprites/items.png', x: 0, y: 1  * 32, w: 32, h: 32 },
  keyRed:     { src: '/sprites/items.png', x: 0, y: 2  * 32, w: 32, h: 32 },
  redPotion:  { src: '/sprites/items.png', x: 0, y: 20 * 32, w: 32, h: 32 },
  bluePotion: { src: '/sprites/items.png', x: 0, y: 21 * 32, w: 32, h: 32 },
  gem:        { src: '/sprites/items.png', x: 0, y: 17 * 32, w: 32, h: 32 }, // blueGem
  // enemys.png（取左列 x:0，每个怪 32×32）
  zombie:    { src: '/sprites/enemys.png', x: 0, y: 12 * 32, w: 32, h: 32 },
  skeleton:  { src: '/sprites/enemys.png', x: 0, y: 8  * 32, w: 32, h: 32 },
  spider:    { src: '/sprites/enemys.png', x: 0, y: 4  * 32, w: 32, h: 32 }, // bat
  creeper:   { src: '/sprites/enemys.png', x: 0, y: 18 * 32, w: 32, h: 32 }, // brownWizard
  enderman:  { src: '/sprites/enemys.png', x: 0, y: 27 * 32, w: 32, h: 32 }, // darkKnight
  wither:    { src: '/sprites/enemys.png', x: 0, y: 56 * 32, w: 32, h: 32 }, // dragon (BOSS)
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
    frameOverride?: number,
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

    const sourceY = frameOverride === undefined ? entry.y : frameOverride * entry.h;
    ctx.drawImage(image, entry.x, sourceY, entry.w, entry.h, dx, dy, entry.w * scale, entry.h * scale);
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

    // 将 32x48 的角色等比缩进 32x32 格子内：
    // 跳过源图顶部 8px（多为头顶空白/装饰），保留 32x40 主体，再渲染为 32x32。
    const sourceX = frame * hero.frameW;
    const sourceY = hero.dirs[dir] * hero.frameH + 8;
    const sourceH = hero.frameH - 8; // 40
    const targetSize = TILE_SIZE * scale;
    ctx.drawImage(
      image,
      sourceX,
      sourceY,
      hero.frameW,
      sourceH,
      dx,
      dy,
      targetSize,
      targetSize,
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
