import type { MonsterId } from './floor';
import { CONFIG, type MonsterConfig } from './config';

export type MonsterDefinition = MonsterConfig & { id: MonsterId };

export interface BattleEstimate {
  playerHit: number;
  monsterHit: number;
  turns: number;
  damageTaken: number;
  fatal: boolean;
}

export const MONSTERS = CONFIG.monsters;

export function estimateBattle(playerHp: number, playerAtk: number, playerDef: number, monsterId: MonsterId): BattleEstimate {
  const monster = MONSTERS[monsterId];
  const playerHit = Math.max(CONFIG.battle.minPlayerHit, playerAtk - monster.def);
  const monsterHit = Math.max(CONFIG.battle.minMonsterHit, monster.atk - playerDef);
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
