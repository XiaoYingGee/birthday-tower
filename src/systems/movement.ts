import type { PlayerState } from '../entities/player';
import { TILE_SIZE } from '../render/sprite-atlas';
import { CONFIG } from '../data/config';

export interface MoveAnimation {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  targetGridX: number;
  targetGridY: number;
  start: number;
  duration: number;
}

const WALK_PATTERN: Array<0 | 1 | 2> = [0, 1, 0, 2];

export function startMove(player: PlayerState, targetGridX: number, targetGridY: number, now: number): MoveAnimation {
  player.isMoving = true;
  player.walkFrame = 0;
  player.walkFrameTimer = 0;
  return {
    fromX: player.visualX,
    fromY: player.visualY,
    toX: targetGridX * TILE_SIZE,
    toY: targetGridY * TILE_SIZE,
    targetGridX,
    targetGridY,
    start: now,
    duration: CONFIG.timing.moveDuration,
  };
}

export function updateMovement(player: PlayerState, move: MoveAnimation, now: number, delta: number): boolean {
  const progress = Math.min(1, (now - move.start) / move.duration);
  const eased = easeInOutQuad(progress);
  player.visualX = move.fromX + (move.toX - move.fromX) * eased;
  player.visualY = move.fromY + (move.toY - move.fromY) * eased;
  player.walkFrameTimer += delta;
  player.walkFrame = WALK_PATTERN[Math.floor(player.walkFrameTimer / 40) % WALK_PATTERN.length];

  if (progress < 1) return false;

  player.x = move.targetGridX;
  player.y = move.targetGridY;
  player.visualX = move.toX;
  player.visualY = move.toY;
  player.isMoving = false;
  player.walkFrame = 0;
  player.walkFrameTimer = 0;
  return true;
}

function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}
