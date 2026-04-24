import type { Cell, MonsterId } from '../data/floor';
import type { GameContext } from '../core/game-context';
import type { BattleEstimate } from '../entities/monster';
import type { BattleRenderState } from '../render/renderer';
import type { InputAction } from './input';
import { estimateBattle, MONSTERS } from '../entities/monster';
import { checkLevelUp } from '../entities/player';
import { clearSave } from '../core/save';
import { TILE_SIZE } from '../render/sprite-atlas';
import { CONFIG } from '../data/config';

export interface BattleAnimation {
  start: number;
  duration: number;
  gridX: number;
  gridY: number;
  monsterId: MonsterId;
  estimate: BattleEstimate;
  playerDashX: number;
  playerDashY: number;
  monsterShakeX: number;
  monsterShakeY: number;
  monsterFlashAlpha: number;
}

export interface BattleCallbacks {
  onVictory(): void;
  onDeath(monsterName: string): void;
  onCellArrival(): void;
  onPendingInput(): void;
}

const BATTLE_DURATION = CONFIG.timing.battleDuration;
const FLOAT_DURATION = CONFIG.timing.floatDuration;

function directionToVector(direction: InputAction): { dx: number; dy: number } {
  if (direction === 'up') return { dx: 0, dy: -1 };
  if (direction === 'down') return { dx: 0, dy: 1 };
  if (direction === 'left') return { dx: -1, dy: 0 };
  return { dx: 1, dy: 0 };
}

export function tryStartBattle(
  ctx: GameContext,
  cell: Cell,
  x: number,
  y: number,
  battleConfirm: HTMLElement,
): { type: 'pending'; cell: Cell; x: number; y: number } | { type: 'execute' } {
  const monsterId = cell.monster as MonsterId;
  const monster = MONSTERS[monsterId];
  const estimate = estimateBattle(ctx.player.hp, ctx.player.atk, ctx.player.def, monsterId);

  if (estimate.damageTaken > 0) {
    const hpAfter = Math.max(0, ctx.player.hp - estimate.damageTaken);
    const body = battleConfirm.querySelector('.confirm-body')!;
    body.innerHTML =
      `<div>对手：${monster.name}（HP${monster.hp}/攻${monster.atk}/防${monster.def}）</div>` +
      `<div>HP: <strong>${ctx.player.hp}</strong> → <strong style="color:${estimate.fatal ? '#ff5f56' : '#ffb3b3'}">${hpAfter}</strong></div>` +
      (estimate.fatal ? '<div style="color:#ff5f56;font-weight:700">⚠ 你会被击败！</div>' : '');
    battleConfirm.classList.add('visible');
    return { type: 'pending', cell, x, y };
  }

  return { type: 'execute' };
}

export function executeBattle(ctx: GameContext, cell: Cell, x: number, y: number, playerDir: InputAction): BattleAnimation {
  const monsterId = cell.monster as MonsterId;
  const estimate = estimateBattle(ctx.player.hp, ctx.player.atk, ctx.player.def, monsterId);

  const now = performance.now();
  const { dx, dy } = directionToVector(playerDir);

  ctx.addFloatingText(`-${estimate.playerHit}`, x * TILE_SIZE + TILE_SIZE / 2, y * TILE_SIZE + 10, '#ff5f56', now, FLOAT_DURATION);
  if (estimate.damageTaken > 0) {
    ctx.addFloatingText(`-${estimate.damageTaken}`, ctx.player.visualX + TILE_SIZE / 2, ctx.player.visualY - 4, '#ffb3b3', now, FLOAT_DURATION);
  }

  return {
    start: now,
    duration: BATTLE_DURATION,
    gridX: x,
    gridY: y,
    monsterId,
    estimate,
    playerDashX: dx * 6,
    playerDashY: dy * 6,
    monsterShakeX: 0,
    monsterShakeY: 0,
    monsterFlashAlpha: 0,
  };
}

export function updateBattleAnimation(battle: BattleAnimation, now: number, playerDir: InputAction): boolean {
  const progress = Math.min(1, (now - battle.start) / battle.duration);
  const dash = Math.sin(progress * Math.PI) * 6;
  const { dx, dy } = directionToVector(playerDir);
  battle.playerDashX = dx * dash;
  battle.playerDashY = dy * dash;
  battle.monsterShakeX = Math.round((Math.random() * 4 - 2) * 10) / 10;
  battle.monsterShakeY = Math.round((Math.random() * 4 - 2) * 10) / 10;
  battle.monsterFlashAlpha = Math.max(0, Math.sin(progress * Math.PI * 4)) * 0.45;
  return progress >= 1;
}

export function finishBattle(ctx: GameContext, battle: BattleAnimation, callbacks: BattleCallbacks): void {
  const cell = ctx.currentFloor.grid[battle.gridY]?.[battle.gridX];
  if (!cell?.monster) return;

  const monster = MONSTERS[battle.monsterId];
  ctx.player.hp -= battle.estimate.damageTaken;

  if (ctx.player.hp <= 0) {
    ctx.player.hp = 0;
    clearSave();
    callbacks.onDeath(monster.name);
    return;
  }

  ctx.player.gold += monster.gold;
  ctx.player.exp += monster.exp;
  cell.monster = undefined;

  ctx.player.x = battle.gridX;
  ctx.player.y = battle.gridY;
  ctx.player.visualX = battle.gridX * TILE_SIZE;
  ctx.player.visualY = battle.gridY * TILE_SIZE;

  const now = performance.now();
  ctx.addFloatingText(`+${monster.gold}G`, battle.gridX * TILE_SIZE + TILE_SIZE / 2, battle.gridY * TILE_SIZE + 2, '#f6d04d', now, 650);
  ctx.addFloatingText(`+${monster.exp}EXP`, battle.gridX * TILE_SIZE + TILE_SIZE / 2, battle.gridY * TILE_SIZE + 18, '#9be564', now, 650);
  ctx.showMessage(`击败${monster.name}！金币+${monster.gold} 经验+${monster.exp}`);

  const lvMsgs = checkLevelUp(ctx.player);
  for (const msg of lvMsgs) {
    ctx.addFloatingText('LEVEL UP!', ctx.player.visualX + TILE_SIZE / 2, ctx.player.visualY - 10, '#ffd700', now, 800);
    ctx.showMessage(msg);
    ctx.audio.playSFX('recovery');
  }

  ctx.save();

  if (battle.monsterId === 'wither') {
    callbacks.onVictory();
    return;
  }

  callbacks.onCellArrival();
  callbacks.onPendingInput();
}

export function getBattleRenderState(battle: BattleAnimation | undefined): BattleRenderState | undefined {
  if (!battle) return undefined;
  return {
    active: true,
    targetX: battle.gridX,
    targetY: battle.gridY,
    monsterId: battle.monsterId,
    playerDashX: battle.playerDashX,
    playerDashY: battle.playerDashY,
    monsterShakeX: battle.monsterShakeX,
    monsterShakeY: battle.monsterShakeY,
    monsterFlashAlpha: battle.monsterFlashAlpha,
  };
}
