export const SPRITE_SIZE = 32;

type SpriteName =
  | 'player'
  | 'wall'
  | 'floor'
  | 'stairUp'
  | 'stairDown'
  | 'doorYellow'
  | 'doorBlue'
  | 'doorRed'
  | 'keyYellow'
  | 'keyBlue'
  | 'keyRed'
  | 'redPotion'
  | 'bluePotion'
  | 'gem'
  | 'zombie'
  | 'skeleton'
  | 'spider'
  | 'creeper'
  | 'enderman'
  | 'wither';

type Matrix = number[][];

const palette = [
  'transparent',
  '#121212',
  '#2a2a2a',
  '#5c5c5c',
  '#8a8a8a',
  '#c8c8c8',
  '#f2d1b0',
  '#2f5db6',
  '#6f4bb9',
  '#163315',
  '#3f8f39',
  '#7fd863',
  '#ffffff',
  '#7b4b24',
  '#aa6d39',
  '#f0d65c',
  '#4b79ea',
  '#d65555',
  '#7bd8ff',
  '#64d6c5',
  '#762727',
  '#a85cff',
  '#d2ecff',
];

const COLORS = {
  black: 1,
  shadow: 2,
  darkGray: 3,
  gray: 4,
  lightGray: 5,
  skin: 6,
  shirt: 7,
  pants: 8,
  darkGreen: 9,
  green: 10,
  lightGreen: 11,
  white: 12,
  wood: 13,
  woodLight: 14,
  yellow: 15,
  blue: 16,
  red: 17,
  glass: 18,
  teal: 19,
  maroon: 20,
  purple: 21,
  eyeBlue: 22,
} as const;

function createMatrix(width: number, height: number): Matrix {
  return Array.from({ length: height }, () => Array.from({ length: width }, () => 0));
}

function fillRect(matrix: Matrix, x: number, y: number, w: number, h: number, color: number): void {
  for (let py = y; py < y + h; py += 1) {
    for (let px = x; px < x + w; px += 1) {
      if (matrix[py]?.[px] !== undefined) {
        matrix[py][px] = color;
      }
    }
  }
}

function setPixel(matrix: Matrix, x: number, y: number, color: number): void {
  if (matrix[y]?.[x] !== undefined) {
    matrix[y][x] = color;
  }
}

function fillCircle(matrix: Matrix, cx: number, cy: number, radius: number, color: number): void {
  for (let y = cy - radius; y <= cy + radius; y += 1) {
    for (let x = cx - radius; x <= cx + radius; x += 1) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= radius * radius) {
        setPixel(matrix, x, y, color);
      }
    }
  }
}

function buildFloor(): Matrix {
  const sprite = createMatrix(32, 32);
  fillRect(sprite, 0, 0, 32, 32, COLORS.green);
  for (let y = 1; y < 32; y += 6) {
    for (let x = (y % 12 === 1 ? 1 : 4); x < 32; x += 7) {
      fillRect(sprite, x, y, 2, 2, COLORS.darkGreen);
    }
  }
  fillRect(sprite, 0, 0, 32, 2, COLORS.lightGreen);
  return sprite;
}

function buildWall(): Matrix {
  const sprite = createMatrix(32, 32);
  fillRect(sprite, 0, 0, 32, 32, COLORS.gray);
  for (let y = 0; y < 32; y += 8) {
    fillRect(sprite, 0, y, 32, 1, COLORS.darkGray);
  }
  for (let x = 0; x < 32; x += 8) {
    fillRect(sprite, x, 0, 1, 32, COLORS.darkGray);
  }
  fillRect(sprite, 2, 2, 6, 3, COLORS.lightGray);
  fillRect(sprite, 14, 10, 7, 3, COLORS.lightGray);
  fillRect(sprite, 22, 20, 5, 4, COLORS.shadow);
  return sprite;
}

function buildStair(direction: 'up' | 'down'): Matrix {
  const sprite = buildFloor();
  const arrowColor = COLORS.white;
  const baseY = direction === 'up' ? 7 : 10;
  const shaftY = direction === 'up' ? 11 : 8;
  fillRect(sprite, 14, shaftY, 4, 12, arrowColor);
  for (let i = 0; i < 6; i += 1) {
    const y = baseY + i;
    const width = 2 + i * 2;
    const x = 16 - Math.floor(width / 2);
    fillRect(sprite, x, direction === 'up' ? y : 17 - i, width, 2, arrowColor);
  }
  return sprite;
}

function buildDoor(lockColor: number): Matrix {
  const sprite = createMatrix(32, 32);
  fillRect(sprite, 4, 2, 24, 28, COLORS.wood);
  fillRect(sprite, 6, 4, 20, 24, COLORS.woodLight);
  for (let y = 4; y < 28; y += 6) {
    fillRect(sprite, 6, y, 20, 1, COLORS.wood);
  }
  fillRect(sprite, 14, 10, 4, 8, lockColor);
  fillRect(sprite, 12, 16, 8, 6, lockColor);
  fillRect(sprite, 9, 29, 14, 2, COLORS.shadow);
  return sprite;
}

function buildKey(color: number): Matrix {
  const sprite = createMatrix(32, 32);
  fillCircle(sprite, 12, 12, 6, color);
  fillCircle(sprite, 12, 12, 3, 0);
  fillRect(sprite, 15, 11, 10, 3, color);
  fillRect(sprite, 22, 14, 3, 4, color);
  fillRect(sprite, 18, 14, 3, 6, color);
  return sprite;
}

function buildPotion(liquidColor: number): Matrix {
  const sprite = createMatrix(32, 32);
  fillRect(sprite, 12, 3, 8, 5, COLORS.lightGray);
  fillRect(sprite, 10, 7, 12, 3, COLORS.glass);
  fillRect(sprite, 8, 10, 16, 16, COLORS.glass);
  fillRect(sprite, 10, 16, 12, 8, liquidColor);
  fillRect(sprite, 8, 26, 16, 2, COLORS.lightGray);
  return sprite;
}

function buildGem(): Matrix {
  const sprite = createMatrix(32, 32);
  fillRect(sprite, 14, 4, 4, 3, COLORS.teal);
  fillRect(sprite, 11, 7, 10, 4, COLORS.blue);
  fillRect(sprite, 8, 11, 16, 6, COLORS.teal);
  fillRect(sprite, 11, 17, 10, 5, COLORS.blue);
  fillRect(sprite, 14, 22, 4, 4, COLORS.teal);
  return sprite;
}

function buildPlayer(): Matrix {
  const sprite = createMatrix(32, 32);
  fillRect(sprite, 8, 2, 16, 12, COLORS.skin);
  fillRect(sprite, 8, 2, 16, 4, COLORS.black);
  fillRect(sprite, 6, 6, 20, 2, COLORS.black);
  fillRect(sprite, 11, 8, 3, 3, COLORS.white);
  fillRect(sprite, 18, 8, 3, 3, COLORS.white);
  fillRect(sprite, 12, 9, 1, 1, COLORS.eyeBlue);
  fillRect(sprite, 19, 9, 1, 1, COLORS.eyeBlue);
  fillRect(sprite, 11, 14, 10, 2, COLORS.skin);
  fillRect(sprite, 9, 14, 14, 9, COLORS.shirt);
  fillRect(sprite, 7, 15, 4, 7, COLORS.skin);
  fillRect(sprite, 21, 15, 4, 7, COLORS.skin);
  fillRect(sprite, 10, 23, 12, 5, COLORS.pants);
  fillRect(sprite, 10, 28, 4, 4, COLORS.black);
  fillRect(sprite, 18, 28, 4, 4, COLORS.black);
  fillRect(sprite, 14, 23, 1, 9, COLORS.black);
  fillRect(sprite, 17, 23, 1, 9, COLORS.black);
  return sprite;
}

function buildZombie(): Matrix {
  const sprite = createMatrix(32, 32);
  fillRect(sprite, 8, 2, 16, 12, COLORS.green);
  fillRect(sprite, 8, 2, 16, 3, COLORS.lightGreen);
  fillRect(sprite, 11, 8, 3, 3, COLORS.white);
  fillRect(sprite, 18, 8, 3, 3, COLORS.white);
  fillRect(sprite, 12, 9, 1, 1, COLORS.shadow);
  fillRect(sprite, 19, 9, 1, 1, COLORS.shadow);
  fillRect(sprite, 13, 12, 6, 2, COLORS.maroon);
  fillRect(sprite, 9, 14, 14, 9, COLORS.darkGreen);
  fillRect(sprite, 7, 15, 4, 7, COLORS.green);
  fillRect(sprite, 21, 15, 4, 7, COLORS.green);
  fillRect(sprite, 10, 23, 12, 5, COLORS.darkGreen);
  fillRect(sprite, 10, 28, 4, 4, COLORS.black);
  fillRect(sprite, 18, 28, 4, 4, COLORS.black);
  return sprite;
}

function buildSkeleton(): Matrix {
  const sprite = createMatrix(32, 32);
  fillRect(sprite, 9, 2, 14, 11, COLORS.white);
  fillRect(sprite, 10, 4, 12, 6, COLORS.lightGray);
  fillRect(sprite, 11, 7, 2, 2, COLORS.black);
  fillRect(sprite, 19, 7, 2, 2, COLORS.black);
  fillRect(sprite, 12, 11, 8, 2, COLORS.shadow);
  fillRect(sprite, 13, 14, 6, 10, COLORS.white);
  fillRect(sprite, 9, 15, 4, 10, COLORS.white);
  fillRect(sprite, 19, 15, 4, 10, COLORS.white);
  fillRect(sprite, 13, 24, 3, 8, COLORS.white);
  fillRect(sprite, 17, 24, 3, 8, COLORS.white);
  fillRect(sprite, 3, 14, 4, 12, COLORS.gray);
  fillRect(sprite, 5, 12, 3, 3, COLORS.gray);
  fillRect(sprite, 5, 25, 7, 2, COLORS.gray);
  return sprite;
}

function buildSpider(): Matrix {
  const sprite = createMatrix(32, 32);
  fillRect(sprite, 10, 12, 12, 8, COLORS.black);
  fillRect(sprite, 12, 8, 8, 5, COLORS.shadow);
  fillRect(sprite, 7, 10, 3, 4, COLORS.black);
  fillRect(sprite, 22, 10, 3, 4, COLORS.black);
  fillRect(sprite, 12, 13, 2, 2, COLORS.red);
  fillRect(sprite, 18, 13, 2, 2, COLORS.red);
  for (let i = 0; i < 4; i += 1) {
    fillRect(sprite, 4 + i * 2, 9 + i * 3, 5, 2, COLORS.black);
    fillRect(sprite, 23 - i * 2, 9 + i * 3, 5, 2, COLORS.black);
  }
  return sprite;
}

function buildCreeper(): Matrix {
  const sprite = createMatrix(32, 32);
  fillRect(sprite, 9, 2, 14, 16, COLORS.lightGreen);
  fillRect(sprite, 11, 6, 3, 4, COLORS.darkGreen);
  fillRect(sprite, 18, 6, 3, 4, COLORS.darkGreen);
  fillRect(sprite, 13, 10, 6, 4, COLORS.darkGreen);
  fillRect(sprite, 11, 14, 3, 6, COLORS.darkGreen);
  fillRect(sprite, 18, 14, 3, 6, COLORS.darkGreen);
  fillRect(sprite, 9, 18, 5, 12, COLORS.green);
  fillRect(sprite, 18, 18, 5, 12, COLORS.green);
  fillRect(sprite, 11, 24, 3, 6, COLORS.black);
  fillRect(sprite, 18, 24, 3, 6, COLORS.black);
  return sprite;
}

function buildEnderman(): Matrix {
  const sprite = createMatrix(32, 32);
  fillRect(sprite, 10, 2, 12, 10, COLORS.black);
  fillRect(sprite, 11, 7, 3, 2, COLORS.purple);
  fillRect(sprite, 18, 7, 3, 2, COLORS.purple);
  fillRect(sprite, 13, 12, 6, 8, COLORS.black);
  fillRect(sprite, 8, 12, 3, 11, COLORS.black);
  fillRect(sprite, 21, 12, 3, 11, COLORS.black);
  fillRect(sprite, 12, 20, 3, 12, COLORS.black);
  fillRect(sprite, 17, 20, 3, 12, COLORS.black);
  return sprite;
}

function buildWither(): Matrix {
  const sprite = createMatrix(64, 32);
  fillRect(sprite, 26, 8, 12, 8, COLORS.black);
  fillRect(sprite, 12, 9, 14, 10, COLORS.shadow);
  fillRect(sprite, 38, 9, 14, 10, COLORS.shadow);
  fillRect(sprite, 25, 3, 14, 10, COLORS.darkGray);
  fillRect(sprite, 11, 5, 14, 10, COLORS.darkGray);
  fillRect(sprite, 39, 5, 14, 10, COLORS.darkGray);
  fillRect(sprite, 15, 10, 3, 2, COLORS.purple);
  fillRect(sprite, 21, 10, 3, 2, COLORS.purple);
  fillRect(sprite, 29, 8, 3, 2, COLORS.purple);
  fillRect(sprite, 32, 8, 3, 2, COLORS.purple);
  fillRect(sprite, 43, 10, 3, 2, COLORS.purple);
  fillRect(sprite, 49, 10, 3, 2, COLORS.purple);
  fillRect(sprite, 29, 16, 6, 11, COLORS.black);
  fillRect(sprite, 21, 18, 6, 8, COLORS.black);
  fillRect(sprite, 37, 18, 6, 8, COLORS.black);
  fillRect(sprite, 25, 24, 4, 8, COLORS.black);
  fillRect(sprite, 35, 24, 4, 8, COLORS.black);
  return sprite;
}

const SPRITES: Record<SpriteName, Matrix> = {
  player: buildPlayer(),
  wall: buildWall(),
  floor: buildFloor(),
  stairUp: buildStair('up'),
  stairDown: buildStair('down'),
  doorYellow: buildDoor(COLORS.yellow),
  doorBlue: buildDoor(COLORS.blue),
  doorRed: buildDoor(COLORS.red),
  keyYellow: buildKey(COLORS.yellow),
  keyBlue: buildKey(COLORS.blue),
  keyRed: buildKey(COLORS.red),
  redPotion: buildPotion(COLORS.red),
  bluePotion: buildPotion(COLORS.blue),
  gem: buildGem(),
  zombie: buildZombie(),
  skeleton: buildSkeleton(),
  spider: buildSpider(),
  creeper: buildCreeper(),
  enderman: buildEnderman(),
  wither: buildWither(),
};

export function drawSprite(
  ctx: CanvasRenderingContext2D,
  name: SpriteName,
  x: number,
  y: number,
  scale: number,
): void {
  const sprite = SPRITES[name];

  for (let py = 0; py < sprite.length; py += 1) {
    for (let px = 0; px < sprite[py].length; px += 1) {
      const color = sprite[py][px];
      if (color === 0) {
        continue;
      }

      ctx.fillStyle = palette[color];
      ctx.fillRect(x + px * scale, y + py * scale, scale, scale);
    }
  }
}
