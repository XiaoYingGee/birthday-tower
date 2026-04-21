import type { MonsterId } from './floor';

export interface MonsterConfig {
  name: string;
  hp: number;
  atk: number;
  def: number;
  gold: number;
  exp: number;
}

export const CONFIG = {
  player: {
    hp: 100,
    atk: 10,
    def: 10,
    gold: 0,
    exp: 0,
    level: 1,
    yellowKeys: 0,
    blueKeys: 0,
    redKeys: 0,
  },
  levelUp: {
    expRequired: 100,
    hpGain: 50,
    atkGain: 2,
    defGain: 2,
  },
  items: {
    redPotion: { hp: 50 },
    bluePotion: { hp: 150 },
    redGem: { atk: 3 },
    blueGem: { def: 3 },
    treasureMultiplier: 2,
  },
  shop: {
    hp: { cost: 30, gain: 100 },
    atk: { cost: 50, gain: 5 },
    def: { cost: 50, gain: 5 },
  },
  monsters: {
    zombie: { name: '僵尸', hp: 25, atk: 14, def: 3, gold: 5, exp: 10 },
    skeleton: { name: '骷髅', hp: 50, atk: 19, def: 3, gold: 8, exp: 12 },
    spider: { name: '蝙蝠', hp: 75, atk: 31, def: 10, gold: 10, exp: 14 },
    creeper: { name: '棕巫师', hp: 100, atk: 40, def: 20, gold: 15, exp: 16 },
    skeletonCaptain: { name: '骷髅队长', hp: 350, atk: 80, def: 40, gold: 30, exp: 30 },
    swordsman: { name: '剑士', hp: 450, atk: 110, def: 65, gold: 40, exp: 40 },
    redWizard: { name: '红巫师', hp: 600, atk: 150, def: 90, gold: 50, exp: 50 },
    enderman: { name: '暗黑骑士', hp: 200, atk: 55, def: 30, gold: 20, exp: 20 },
    wither: { name: '龙王', hp: 1500, atk: 120, def: 55, gold: 0, exp: 0 },
  } as Record<MonsterId, MonsterConfig>,
  battle: {
    minPlayerHit: 1,
    minMonsterHit: 0,
  },
  timing: {
    moveDuration: 150,
    battleDuration: 300,
    floatDuration: 500,
    messageDuration: 1800,
  },
};
