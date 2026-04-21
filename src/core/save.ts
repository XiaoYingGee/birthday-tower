import type { Cell, FloorDefinition } from '../data/floor';
import type { PlayerState } from '../entities/player';
import { TILE_SIZE } from '../render/sprite-atlas';

const SAVE_KEY = 'birthday-tower-save';

interface SaveData {
  version: 1;
  floorIndex: number;
  player: {
    x: number; y: number;
    hp: number; atk: number; def: number;
    gold: number; exp: number; level: number;
    yellowKeys: number; blueKeys: number; redKeys: number;
    dir: 'up' | 'down' | 'left' | 'right';
  };
  grids: Cell[][][];
}

export function saveGame(floorIndex: number, player: PlayerState, floors: FloorDefinition[]): void {
  const data: SaveData = {
    version: 1,
    floorIndex,
    player: {
      x: player.x, y: player.y,
      hp: player.hp, atk: player.atk, def: player.def,
      gold: player.gold, exp: player.exp, level: player.level,
      yellowKeys: player.yellowKeys, blueKeys: player.blueKeys, redKeys: player.redKeys,
      dir: player.dir,
    },
    grids: floors.map(f => f.grid),
  };
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch { /* storage full or unavailable */ }
}

export function loadGame(floors: FloorDefinition[], player: PlayerState): { floorIndex: number } | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data: SaveData = JSON.parse(raw);
    if (data.version !== 1) return null;

    const p = data.player;
    player.x = p.x; player.y = p.y;
    player.visualX = p.x * TILE_SIZE; player.visualY = p.y * TILE_SIZE;
    player.hp = p.hp; player.atk = p.atk; player.def = p.def;
    player.gold = p.gold; player.exp = p.exp; player.level = p.level;
    player.yellowKeys = p.yellowKeys; player.blueKeys = p.blueKeys; player.redKeys = p.redKeys;
    player.dir = p.dir;

    for (let i = 0; i < floors.length && i < data.grids.length; i++) {
      floors[i].grid = data.grids[i];
    }

    return { floorIndex: data.floorIndex };
  } catch {
    return null;
  }
}

export function clearSave(): void {
  localStorage.removeItem(SAVE_KEY);
}
