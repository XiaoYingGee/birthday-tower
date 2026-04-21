import { createFloors } from './floors';
import type { Cell, FloorDefinition, MonsterId } from './floor';
import { InputManager, type InputAction } from './input';
import { estimateBattle, MONSTERS, type BattleEstimate } from './monster';
import { applyItem, consumeDoorKey, createPlayer, useInventoryItem, type PlayerState } from './player';
import { Renderer, type BattleRenderState, type FloatingTextRenderState } from './renderer';
import { TILE_SIZE, type SpriteLoader } from './sprite-atlas';
import { VictoryEffect } from './victory';

type Direction = Extract<InputAction, 'up' | 'down' | 'left' | 'right'>;

interface MoveAnimation {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  targetGridX: number;
  targetGridY: number;
  start: number;
  duration: number;
}

interface FloatingText {
  text: string;
  x: number;
  y: number;
  rise: number;
  color: string;
  start: number;
  duration: number;
}

interface BattleAnimation {
  start: number;
  duration: number;
  gridX: number;
  gridY: number;
  monsterId: MonsterId;
  estimate: BattleEstimate;
  moveIntoCell: boolean;
  playerDashX: number;
  playerDashY: number;
  monsterShakeX: number;
  monsterShakeY: number;
  monsterFlashAlpha: number;
}

export interface GameConfig {
  canvas: HTMLCanvasElement;
  controls: HTMLElement;
  shell: HTMLElement;
  messageEl: HTMLElement;
  playerName: string;
  playerAge: string;
  loader: SpriteLoader;
}

const MOVE_DURATION = 150;
const BATTLE_DURATION = 300;
const FLOAT_DURATION = 500;
const WALK_PATTERN: Array<0 | 1 | 2> = [0, 1, 0, 2];

export class GameEngine {
  private readonly renderer: Renderer;
  private readonly input: InputManager;
  private readonly victory: VictoryEffect;
  private floors: FloorDefinition[] = [];
  private floorIndex = 0;
  private player!: PlayerState;
  private message = '欢迎来到生日魔塔，先清理僵尸吧';
  private messageTimer?: number;
  private victoryShown = false;
  private pendingDirection?: Direction;
  private moveAnimation?: MoveAnimation;
  private battleAnimation?: BattleAnimation;
  private floatingTexts: FloatingText[] = [];
  private rafId = 0;
  private lastFrame = 0;

  constructor(config: GameConfig) {
    this.renderer = new Renderer(config.canvas, config.messageEl, config.loader);
    this.input = new InputManager(config.controls, (action) => this.handleAction(action));
    this.victory = new VictoryEffect(config.shell, config.playerName, config.playerAge, () => this.reset());

    this.reset();
    this.lastFrame = performance.now();
    this.rafId = requestAnimationFrame(this.loop);
  }

  destroy(): void {
    this.renderer.destroy();
    this.input.destroy();
    this.victory.destroy();
    if (this.messageTimer) {
      window.clearTimeout(this.messageTimer);
    }
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
  }

  private reset(): void {
    if (this.messageTimer) {
      window.clearTimeout(this.messageTimer);
      this.messageTimer = undefined;
    }

    this.floors = createFloors();
    this.floorIndex = 0;
    const start = this.floors[0].start;
    this.player = createPlayer(start.x, start.y);
    this.message = '欢迎来到生日魔塔，先清理僵尸吧';
    this.victoryShown = false;
    this.pendingDirection = undefined;
    this.moveAnimation = undefined;
    this.battleAnimation = undefined;
    this.floatingTexts = [];
  }

  private readonly loop = (now: number): void => {
    const delta = Math.min(40, now - this.lastFrame);
    this.lastFrame = now;

    this.update(now, delta);
    this.render(now);

    this.rafId = requestAnimationFrame(this.loop);
  };

  private update(now: number, delta: number): void {
    if (this.moveAnimation) {
      this.updateMovement(now, delta);
    }

    if (this.battleAnimation) {
      this.updateBattle(now);
    }

    this.floatingTexts = this.floatingTexts.filter((label) => now - label.start < label.duration);
  }

  private render(now: number): void {
    this.renderer.render({
      now,
      floorNumber: this.floorIndex + 1,
      floorName: this.currentFloor.name,
      floor: this.currentFloor,
      player: this.player,
      message: this.message,
      floatingTexts: this.getFloatingTextRenderState(now),
      battle: this.getBattleRenderState(),
    });
  }

  private get currentFloor(): FloorDefinition {
    return this.floors[this.floorIndex];
  }

  private handleAction(action: InputAction): void {
    if (this.victoryShown) {
      return;
    }

    if (action === 'up' || action === 'down' || action === 'left' || action === 'right') {
      if (this.player.isMoving) {
        this.pendingDirection = action;
        return;
      }

      if (this.battleAnimation) {
        return;
      }

      this.tryMove(action);
      return;
    }

    if (this.player.isMoving || this.battleAnimation) {
      return;
    }

    if (action === 'attack') {
      this.attackForward();
      return;
    }

    this.showMessage(useInventoryItem(this.player));
  }

  private tryMove(direction: Direction): void {
    const { dx, dy } = this.directionToVector(direction);
    this.player.dir = direction;
    const nextX = this.player.x + dx;
    const nextY = this.player.y + dy;
    const cell = this.currentFloor.grid[nextY]?.[nextX];

    if (!cell) {
      return;
    }

    if (cell.terrain === 'wall') {
      this.showMessage('前面是墙');
      return;
    }

    if (cell.door) {
      const doorName = this.getDoorName(cell.door);
      const opened = consumeDoorKey(this.player, cell.door);
      if (!opened) {
        this.showMessage(`${doorName}还打不开`);
        return;
      }

      cell.door = undefined;
      this.showMessage(`${doorName}打开了`);
      return;
    }

    if (cell.monster) {
      this.startBattle(cell, nextX, nextY, true);
      return;
    }

    this.startMove(nextX, nextY, performance.now());
  }

  private attackForward(): void {
    const { x, y } = this.getFacingTarget();
    const cell = this.currentFloor.grid[y]?.[x];
    if (!cell?.monster) {
      this.showMessage('前方没有怪物');
      return;
    }

    this.startBattle(cell, x, y, false);
  }

  private startMove(targetGridX: number, targetGridY: number, now: number): void {
    this.moveAnimation = {
      fromX: this.player.visualX,
      fromY: this.player.visualY,
      toX: targetGridX * TILE_SIZE,
      toY: targetGridY * TILE_SIZE,
      targetGridX,
      targetGridY,
      start: now,
      duration: MOVE_DURATION,
    };
    this.player.isMoving = true;
    this.player.walkFrame = 0;
    this.player.walkFrameTimer = 0;
  }

  private updateMovement(now: number, delta: number): void {
    const move = this.moveAnimation;
    if (!move) {
      return;
    }

    const progress = Math.min(1, (now - move.start) / move.duration);
    const eased = easeInOutQuad(progress);
    this.player.visualX = move.fromX + (move.toX - move.fromX) * eased;
    this.player.visualY = move.fromY + (move.toY - move.fromY) * eased;
    this.player.walkFrameTimer += delta;
    this.player.walkFrame = WALK_PATTERN[Math.floor(this.player.walkFrameTimer / 40) % WALK_PATTERN.length];

    if (progress < 1) {
      return;
    }

    this.player.x = move.targetGridX;
    this.player.y = move.targetGridY;
    this.player.visualX = move.toX;
    this.player.visualY = move.toY;
    this.player.isMoving = false;
    this.player.walkFrame = 0;
    this.player.walkFrameTimer = 0;
    this.moveAnimation = undefined;

    const cell = this.currentFloor.grid[this.player.y][this.player.x];
    this.resolveCellArrival(cell);
    this.tryConsumePendingDirection();
  }

  private startBattle(cell: Cell, x: number, y: number, moveIntoCell: boolean): void {
    const monsterId = cell.monster as MonsterId;
    const monster = MONSTERS[monsterId];
    const estimate = estimateBattle(this.player.hp, this.player.atk, this.player.def, monsterId);

    if (estimate.fatal) {
      this.showMessage(`暂时打不过，挑战 ${monster.name} 需要承受 ${estimate.damageTaken} 点伤害`);
      return;
    }

    const now = performance.now();
    const { dx, dy } = this.directionToVector(this.player.dir);
    this.battleAnimation = {
      start: now,
      duration: BATTLE_DURATION,
      gridX: x,
      gridY: y,
      monsterId,
      estimate,
      moveIntoCell,
      playerDashX: 0,
      playerDashY: 0,
      monsterShakeX: 0,
      monsterShakeY: 0,
      monsterFlashAlpha: 0,
    };

    this.addFloatingText(`-${estimate.playerHit}`, x * TILE_SIZE + TILE_SIZE / 2, y * TILE_SIZE + 10, '#ff5f56', now, FLOAT_DURATION);
    this.addFloatingText(`-${estimate.damageTaken}`, this.player.visualX + TILE_SIZE / 2, this.player.visualY - 4, '#ffb3b3', now, FLOAT_DURATION);

    // 冲刺和回弹只影响渲染，不改逻辑坐标。
    this.battleAnimation.playerDashX = dx * 6;
    this.battleAnimation.playerDashY = dy * 6;
  }

  private updateBattle(now: number): void {
    const battle = this.battleAnimation;
    if (!battle) {
      return;
    }

    const progress = Math.min(1, (now - battle.start) / battle.duration);
    const dash = Math.sin(progress * Math.PI) * 6;
    const { dx, dy } = this.directionToVector(this.player.dir);
    battle.playerDashX = dx * dash;
    battle.playerDashY = dy * dash;
    battle.monsterShakeX = Math.round((Math.random() * 4 - 2) * 10) / 10;
    battle.monsterShakeY = Math.round((Math.random() * 4 - 2) * 10) / 10;
    battle.monsterFlashAlpha = Math.max(0, Math.sin(progress * Math.PI * 4)) * 0.45;

    if (progress < 1) {
      return;
    }

    this.finishBattle(battle);
  }

  private finishBattle(battle: BattleAnimation): void {
    const cell = this.currentFloor.grid[battle.gridY]?.[battle.gridX];
    if (!cell?.monster) {
      this.battleAnimation = undefined;
      return;
    }

    const monster = MONSTERS[battle.monsterId];
    this.player.hp -= battle.estimate.damageTaken;
    this.player.gold += monster.gold;
    this.player.exp += monster.exp;
    cell.monster = undefined;

    if (battle.moveIntoCell) {
      this.player.x = battle.gridX;
      this.player.y = battle.gridY;
      this.player.visualX = battle.gridX * TILE_SIZE;
      this.player.visualY = battle.gridY * TILE_SIZE;
    }

    const now = performance.now();
    this.addFloatingText(`+${monster.gold}G`, battle.gridX * TILE_SIZE + TILE_SIZE / 2, battle.gridY * TILE_SIZE + 2, '#f6d04d', now, 650);
    this.addFloatingText(`+${monster.exp}EXP`, battle.gridX * TILE_SIZE + TILE_SIZE / 2, battle.gridY * TILE_SIZE + 18, '#9be564', now, 650);
    this.showMessage(`击败${monster.name}，损失 ${battle.estimate.damageTaken} HP`);

    this.battleAnimation = undefined;

    if (battle.monsterId === 'wither') {
      this.victoryShown = true;
      window.setTimeout(() => this.victory.show(), 250);
      return;
    }

    if (battle.moveIntoCell) {
      this.resolveCellArrival(this.currentFloor.grid[this.player.y][this.player.x]);
    }

    this.tryConsumePendingDirection();
  }

  private resolveCellArrival(cell: Cell): void {
    if (cell.item) {
      const item = cell.item;
      cell.item = undefined;
      this.showMessage(applyItem(this.player, item));
    }

    this.handleStair(cell);
  }

  private handleStair(cell: Cell): void {
    if (cell.terrain === 'stair-up') {
      if (this.floorIndex >= this.floors.length - 1) {
        this.showMessage('前方已经没有更高的楼层');
        return;
      }

      this.floorIndex += 1;
      const downStair = findStair(this.currentFloor, 'stair-down');
      this.placePlayer(downStair.x, downStair.y);
      this.pendingDirection = undefined;
      this.showMessage(`来到第 ${this.floorIndex + 1} 层：${this.currentFloor.name}`);
      return;
    }

    if (cell.terrain === 'stair-down') {
      if (this.floorIndex === 0) {
        this.showMessage('这里已经是第一层');
        return;
      }

      this.floorIndex -= 1;
      const upStair = findStair(this.currentFloor, 'stair-up');
      this.placePlayer(upStair.x, upStair.y);
      this.pendingDirection = undefined;
      this.showMessage(`回到第 ${this.floorIndex + 1} 层：${this.currentFloor.name}`);
    }
  }

  private placePlayer(x: number, y: number): void {
    this.player.x = x;
    this.player.y = y;
    this.player.visualX = x * TILE_SIZE;
    this.player.visualY = y * TILE_SIZE;
    this.player.walkFrame = 0;
    this.player.walkFrameTimer = 0;
    this.player.isMoving = false;
  }

  private tryConsumePendingDirection(): void {
    if (!this.pendingDirection || this.player.isMoving || this.battleAnimation || this.victoryShown) {
      return;
    }

    const nextDirection = this.pendingDirection;
    this.pendingDirection = undefined;
    this.tryMove(nextDirection);
  }

  private getFacingTarget(): { x: number; y: number } {
    const { dx, dy } = this.directionToVector(this.player.dir);
    return { x: this.player.x + dx, y: this.player.y + dy };
  }

  private directionToVector(direction: Direction): { dx: number; dy: number } {
    if (direction === 'up') {
      return { dx: 0, dy: -1 };
    }

    if (direction === 'down') {
      return { dx: 0, dy: 1 };
    }

    if (direction === 'left') {
      return { dx: -1, dy: 0 };
    }

    return { dx: 1, dy: 0 };
  }

  private getDoorName(color: 'yellow' | 'blue' | 'red'): string {
    if (color === 'yellow') {
      return '黄门';
    }

    if (color === 'blue') {
      return '蓝门';
    }

    return '红门';
  }

  private showMessage(text: string): void {
    this.message = text;
    if (this.messageTimer) {
      window.clearTimeout(this.messageTimer);
    }

    this.messageTimer = window.setTimeout(() => {
      this.message = '';
    }, 1800);
  }

  private addFloatingText(text: string, x: number, y: number, color: string, start: number, duration: number): void {
    this.floatingTexts.push({
      text,
      x,
      y,
      rise: 30,
      color,
      start,
      duration,
    });
  }

  private getFloatingTextRenderState(now: number): FloatingTextRenderState[] {
    return this.floatingTexts.map((label) => {
      const progress = Math.min(1, (now - label.start) / label.duration);
      return {
        text: label.text,
        x: label.x,
        y: label.y - label.rise * progress,
        color: label.color,
        alpha: 1 - progress,
      };
    });
  }

  private getBattleRenderState(): BattleRenderState | undefined {
    const battle = this.battleAnimation;
    if (!battle) {
      return undefined;
    }

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
}

function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function findStair(floor: FloorDefinition, terrain: 'stair-up' | 'stair-down'): { x: number; y: number } {
  for (let y = 0; y < floor.grid.length; y += 1) {
    for (let x = 0; x < floor.grid[y].length; x += 1) {
      if (floor.grid[y][x].terrain === terrain) {
        return { x, y };
      }
    }
  }

  throw new Error(`Failed to find ${terrain} on floor ${floor.id}.`);
}
