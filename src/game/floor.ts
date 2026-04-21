export type DoorColor = 'yellow' | 'blue' | 'red';
export type ItemType = 'redPotion' | 'bluePotion' | 'redGem' | 'blueGem' | 'treasure' | 'yellowKey' | 'blueKey' | 'redKey';
export type MonsterId = 'zombie' | 'skeleton' | 'spider' | 'creeper' | 'enderman' | 'wither';
export type TerrainType = 'floor' | 'wall' | 'stair-up' | 'stair-down';

export interface Cell {
  terrain: TerrainType;
  item?: ItemType;
  door?: DoorColor;
  monster?: MonsterId;
  merchant?: boolean;
}

export interface FloorDefinition {
  id: number;
  name: string;
  grid: Cell[][];
  start: { x: number; y: number };
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
  Z: { terrain: 'floor', monster: 'zombie' },
  K: { terrain: 'floor', monster: 'skeleton' },
  F: { terrain: 'floor', monster: 'spider' },
  W: { terrain: 'floor', monster: 'creeper' },
  E: { terrain: 'floor', monster: 'enderman' },
  X: { terrain: 'floor', monster: 'wither' },
};

export function cloneFloor(floor: FloorDefinition): FloorDefinition {
  return {
    ...floor,
    start: { ...floor.start },
    grid: floor.grid.map((row) => row.map((cell) => ({ ...cell }))),
  };
}

export function parseFloor(id: number, name: string, rows: string[]): FloorDefinition {
  if (rows.length !== 13 || rows.some((row) => row.length !== 13)) {
    throw new Error(`Floor ${id} must be 13x13.`);
  }

  let start = { x: 1, y: 1 };
  const grid: Cell[][] = rows.map((row, y) =>
    row.split('').map((token, x) => {
      if (token === '@') {
        start = { x, y };
        return { terrain: 'floor' as const };
      }

      const cell = CELL_LOOKUP[token];
      if (!cell) {
        throw new Error(`Unknown token ${token} in floor ${id}.`);
      }

      return { ...cell };
    }),
  );

  return { id, name, grid, start };
}
