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
  zombie: { id: 'zombie', name: '僵尸', hp: 18, atk: 10, def: 2, gold: 5, exp: 3 },
  skeleton: { id: 'skeleton', name: '骷髅', hp: 26, atk: 14, def: 4, gold: 7, exp: 5 },
  spider: { id: 'spider', name: '蜘蛛', hp: 34, atk: 16, def: 5, gold: 9, exp: 6 },
  creeper: { id: 'creeper', name: '苦力怕', hp: 48, atk: 20, def: 8, gold: 12, exp: 8 },
  enderman: { id: 'enderman', name: '末影人', hp: 70, atk: 27, def: 12, gold: 16, exp: 10 },
  wither: { id: 'wither', name: '凋灵', hp: 170, atk: 34, def: 18, gold: 80, exp: 50 },
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
