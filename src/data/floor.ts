export type DoorColor = 'yellow' | 'blue' | 'red';
export type ItemType = 'redPotion' | 'bluePotion' | 'redGem' | 'blueGem' | 'treasure' | 'yellowKey' | 'blueKey' | 'redKey';
export type MonsterId = 'zombie' | 'skeleton' | 'spider' | 'creeper' | 'skeletonCaptain' | 'swordsman' | 'redWizard' | 'enderman' | 'wither';
export type TerrainType = 'floor' | 'wall' | 'stair-up' | 'stair-down';

export interface Cell {
  terrain: TerrainType;
  item?: ItemType;
  door?: DoorColor;
  monster?: MonsterId;
  merchant?: boolean;
  princess?: boolean;
}

export interface FloorDefinition {
  id: number;
  name: string;
  grid: Cell[][];
  start: { x: number; y: number };
  starts: { x: number; y: number }[];
  comeDowns: { x: number; y: number }[];
}

const CELL_LOOKUP: Record<string, Cell> = {
  '#': { terrain: 'wall' },
  '.': { terrain: 'floor' },
  U: { terrain: 'stair-up' },
  D: { terrain: 'stair-down' },
  Y: { terrain: 'floor', door: 'yellow' },
  B: { terrain: 'floor', door: 'blue' },
  R: { terrain: 'floor', door: 'red' },
  y: { terrain: 'floor', item: 'yellowKey' },
  b: { terrain: 'floor', item: 'blueKey' },
  r: { terrain: 'floor', item: 'redKey' },
  h: { terrain: 'floor', item: 'redPotion' },
  H: { terrain: 'floor', item: 'bluePotion' },
  a: { terrain: 'floor', item: 'redGem' },
  d: { terrain: 'floor', item: 'blueGem' },
  T: { terrain: 'floor', item: 'treasure' },
  S: { terrain: 'floor', merchant: true },
  P: { terrain: 'floor', princess: true },
  Z: { terrain: 'floor', monster: 'zombie' },
  K: { terrain: 'floor', monster: 'skeleton' },
  F: { terrain: 'floor', monster: 'spider' },
  W: { terrain: 'floor', monster: 'creeper' },
  C: { terrain: 'floor', monster: 'skeletonCaptain' },
  J: { terrain: 'floor', monster: 'swordsman' },
  M: { terrain: 'floor', monster: 'redWizard' },
  E: { terrain: 'floor', monster: 'enderman' },
  X: { terrain: 'floor', monster: 'wither' },
};

export function cloneFloor(floor: FloorDefinition): FloorDefinition {
  return {
    ...floor,
    start: { ...floor.start },
    starts: floor.starts.map((p) => ({ ...p })),
    comeDowns: floor.comeDowns.map((p) => ({ ...p })),
    grid: floor.grid.map((row) => row.map((cell) => ({ ...cell }))),
  };
}

export function parseFloor(id: number, name: string, rows: string[]): FloorDefinition {
  if (rows.length !== 13 || rows.some((row) => row.length !== 13)) {
    throw new Error(`Floor ${id} must be 13x13.`);
  }

  let start = { x: 1, y: 1 };
  const starts: { x: number; y: number }[] = [];
  const comeDowns: { x: number; y: number }[] = [];
  const grid: Cell[][] = rows.map((row, y) =>
    row.split('').map((token, x) => {
      if (token === '@') {
        start = { x, y };
        starts.push({ x, y });
        return { terrain: 'floor' as const };
      }

      if (token === '!') {
        comeDowns.push({ x, y });
        return { terrain: 'floor' as const };
      }

      const cell = CELL_LOOKUP[token];
      if (!cell) {
        throw new Error(`Unknown token ${token} in floor ${id}.`);
      }

      return { ...cell };
    }),
  );

  return { id, name, grid, start, starts, comeDowns };
}
