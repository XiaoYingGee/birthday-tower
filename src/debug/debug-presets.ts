import { CONFIG } from '../data/config';

export interface FloorPreset {
  hp: number;
  atk: number;
  def: number;
  gold: number;
  exp: number;
  level: number;
  yellowKeys: number;
  blueKeys: number;
  redKeys: number;
}

export const FLOOR_PRESETS: Record<number, FloorPreset> = {
  0: {
    hp: CONFIG.player.hp,
    atk: CONFIG.player.atk,
    def: CONFIG.player.def,
    gold: CONFIG.player.gold,
    exp: CONFIG.player.exp,
    level: CONFIG.player.level,
    yellowKeys: CONFIG.player.yellowKeys,
    blueKeys: CONFIG.player.blueKeys,
    redKeys: CONFIG.player.redKeys,
  },
  1: { hp: 119, atk: 20, def: 17, gold: 136, exp: 24, level: 3, yellowKeys: 2, blueKeys: 0, redKeys: 1 },
  2: { hp: 169, atk: 33, def: 30, gold: 299, exp: 64, level: 5, yellowKeys: 0, blueKeys: 1, redKeys: 1 },
  3: { hp: 136, atk: 68, def: 52, gold: 49, exp: 72, level: 7, yellowKeys: 0, blueKeys: 0, redKeys: 1 },
};
