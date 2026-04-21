import type { MonsterId } from './floor';

export interface MonsterDefinition {
  id: MonsterId;
  name: string;
  hp: number;
  atk: number;
  def: number;
  gold: number;
  exp: number;
}

export interface BattleEstimate {
  playerHit: number;
  monsterHit: number;
  turns: number;
  damageTaken: number;
  fatal: boolean;
}

export const MONSTERS: Record<MonsterId, MonsterDefinition> = {
  zombie:   { id: 'zombie',   name: '僵尸',     hp: 25,   atk: 12,  def: 2,  gold: 5,  exp: 12 },
  skeleton: { id: 'skeleton', name: '骷髅',     hp: 50,   atk: 18,  def: 5,  gold: 10, exp: 20 },
  spider:   { id: 'spider',   name: '蝙蝠',     hp: 70,   atk: 22,  def: 8,  gold: 15, exp: 25 },
  creeper:  { id: 'creeper',  name: '棕巫师',   hp: 100,  atk: 28,  def: 12, gold: 20, exp: 35 },
  enderman: { id: 'enderman', name: '暗黑骑士', hp: 150,  atk: 36,  def: 16, gold: 30, exp: 50 },
  wither:   { id: 'wither',   name: '龙王',     hp: 1500, atk: 120, def: 55, gold: 0,  exp: 0  },
};

export function estimateBattle(playerHp: number, playerAtk: number, playerDef: number, monsterId: MonsterId): BattleEstimate {
  const monster = MONSTERS[monsterId];
  const playerHit = Math.max(1, playerAtk - monster.def);
  const monsterHit = Math.max(0, monster.atk - playerDef);
  const turns = Math.ceil(monster.hp / playerHit);
  const damageTaken = Math.max(0, turns - 1) * monsterHit;

  return {
    playerHit,
    monsterHit,
    turns,
    damageTaken,
    fatal: playerHp <= damageTaken,
  };
}
