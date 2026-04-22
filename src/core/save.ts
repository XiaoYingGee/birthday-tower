import type { Cell, FloorDefinition } from '../data/floor';
import type { PlayerState } from '../entities/player';
import { TILE_SIZE } from '../render/sprite-atlas';

const SAVE_KEY = 'birthday-tower-save';
const SLOT_PREFIX = 'birthday-tower-slot-';

interface SaveData {
  version: 1;
  floorIndex: number;
  timestamp?: number;
  player: {
    x: number; y: number;
    hp: number; atk: number; def: number;
    gold: number; exp: number; level: number;
    yellowKeys: number; blueKeys: number; redKeys: number;
    dir: 'up' | 'down' | 'left' | 'right';
  };
  grids: Cell[][][];
}

function buildSaveData(floorIndex: number, player: PlayerState, floors: FloorDefinition[]): SaveData {
  return {
    version: 1,
    floorIndex,
    timestamp: Date.now(),
    player: {
      x: player.x, y: player.y,
      hp: player.hp, atk: player.atk, def: player.def,
      gold: player.gold, exp: player.exp, level: player.level,
      yellowKeys: player.yellowKeys, blueKeys: player.blueKeys, redKeys: player.redKeys,
      dir: player.dir,
    },
    grids: floors.map(f => f.grid),
  };
}

function applySaveData(data: SaveData, floors: FloorDefinition[], player: PlayerState): { floorIndex: number } {
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
}

// --- Auto save (current session) ---

export function saveGame(floorIndex: number, player: PlayerState, floors: FloorDefinition[]): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(buildSaveData(floorIndex, player, floors)));
  } catch { /* */ }
}

export function loadGame(floors: FloorDefinition[], player: PlayerState): { floorIndex: number } | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data: SaveData = JSON.parse(raw);
    if (data.version !== 1) return null;
    return applySaveData(data, floors, player);
  } catch { return null; }
}

export function clearSave(): void {
  localStorage.removeItem(SAVE_KEY);
}

// --- Manual save slots ---

export interface SlotInfo {
  exists: boolean;
  floorIndex?: number;
  level?: number;
  hp?: number;
  atk?: number;
  def?: number;
  timestamp?: number;
}

export function getSlotInfo(slot: number): SlotInfo {
  try {
    const raw = localStorage.getItem(SLOT_PREFIX + slot);
    if (!raw) return { exists: false };
    const data: SaveData = JSON.parse(raw);
    return {
      exists: true,
      floorIndex: data.floorIndex,
      level: data.player.level,
      hp: data.player.hp,
      atk: data.player.atk,
      def: data.player.def,
      timestamp: data.timestamp,
    };
  } catch { return { exists: false }; }
}

export function saveToSlot(slot: number, floorIndex: number, player: PlayerState, floors: FloorDefinition[]): void {
  try {
    localStorage.setItem(SLOT_PREFIX + slot, JSON.stringify(buildSaveData(floorIndex, player, floors)));
  } catch { /* */ }
}

export function loadFromSlot(slot: number, floors: FloorDefinition[], player: PlayerState): { floorIndex: number } | null {
  try {
    const raw = localStorage.getItem(SLOT_PREFIX + slot);
    if (!raw) return null;
    const data: SaveData = JSON.parse(raw);
    if (data.version !== 1) return null;
    return applySaveData(data, floors, player);
  } catch { return null; }
}
